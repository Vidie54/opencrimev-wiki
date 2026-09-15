#!/usr/bin/env python3
"""
check.py — validates the wiki. This is the pull-request check.

    python tools/check.py            # the whole tree
    python tools/check.py --root X

Stdlib only, writes nothing. Exit code is non-zero on any error. There is no
build step: the website and the in-game wiki read wiki.json and content/
straight from this repo and assemble the pages themselves.

Checks
    wiki.json                 every node is a page, a category or a link; ids are [a-z0-9-];
                              nothing listed twice; every listed page exists
    content/**/*.md           front matter (title required; title/description/icon only),
                              raw HTML (stripped by the renderer — warned here),
                              links to other pages and to headings, {{generated}} blocks
    docs/wiki_vars.json       every {var:…} / {money:…} key must be in it
    docs/wiki_keys.json       every {key:…} name must be in it
    docs/wiki_commands.json   feeds {{commands:<group>}}
"""
import argparse
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RE_FRONT = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.S)
RE_PLACEHOLDER = re.compile(r"\{(\w+)(?::([^}]+))?\}")
RE_LINK = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
RE_HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$", re.M)
RE_FENCE = re.compile(r"```.*?```", re.S)
RE_HTML = re.compile(r"<!--.*?-->|</?[a-zA-Z][^<>]*>", re.S)
RE_GENERATED = re.compile(r"\{\{(\w+)(?::(\w+))?\}\}")

ALLOWED_FRONT = {"title", "description", "icon"}
PLACEHOLDER_KINDS = {"key", "kbd", "var", "money", "discord", "website", "repo"}
GENERATED_KINDS = {"commands"}


class Check:
    def __init__(self, root):
        self.root = root
        self.errors = []
        self.warnings = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def path(self, *parts):
        return os.path.join(self.root, *parts)

    def load_json(self, rel, required=True):
        p = self.path(rel)
        if not os.path.exists(p):
            if required:
                self.error(f"missing {rel}")
            return None
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            self.error(f"{rel}: invalid JSON ({e})")
            return None

    # ------------------------------------------------------------------
    @staticmethod
    def slugify(text):
        # mirrors the renderer's slugify so anchor links are checked the way they resolve
        t = unicodedata.normalize("NFD", str(text)).lower()
        t = "".join(c for c in t if not unicodedata.combining(c))
        t = re.sub(r"[^a-z0-9\s-]", "", t).strip()
        t = re.sub(r"[\s_]+", "-", t)
        t = re.sub(r"-+", "-", t)
        return t or "section"

    @staticmethod
    def heading_plain(text):
        t = re.sub(r"\{kbd:([^}]+)\}", r"\1", text)
        t = re.sub(r"\{[^}]*\}", "", t)
        t = re.sub(r"[*_`~\[\]!]", "", t)
        t = re.sub(r"\([^)]*\)", "", t)
        return t.strip()

    def headings(self, body):
        out, seen = [], set()
        for m in RE_HEADING.finditer(RE_FENCE.sub("", body)):
            base = self.slugify(self.heading_plain(m.group(2)))
            hid, k = base, 2
            while hid in seen:
                hid = f"{base}-{k}"
                k += 1
            seen.add(hid)
            out.append({"level": len(m.group(1)), "id": hid})
        return out

    @staticmethod
    def has_html(body):
        """Raw HTML anywhere outside code spans and fences, where `<page>` is text."""
        i = 0
        for m in re.finditer(r"```.*?```|`[^`\n]*`", body, re.S):
            if RE_HTML.search(body[i:m.start()]):
                return True
            i = m.end()
        return bool(RE_HTML.search(body[i:]))

    def front_matter(self, rel, src):
        m = RE_FRONT.match(src)
        if not m:
            self.error(f"{rel}: no front matter (--- title: … ---)")
            return {}, src
        meta = {}
        for line in m.group(1).splitlines():
            if not line.strip():
                continue
            kv = re.match(r"^([\w-]+):\s*(.*)$", line)
            if not kv:
                self.error(f"{rel}: bad front matter line {line!r}")
                continue
            key, val = kv.group(1), kv.group(2).strip().strip("\"'")
            if key not in ALLOWED_FRONT:
                self.error(f"{rel}: front matter key {key!r} is not one of {sorted(ALLOWED_FRONT)}")
            meta[key] = val
        if not meta.get("title"):
            self.error(f"{rel}: front matter needs a title")
        return meta, src[m.end():]

    # ------------------------------------------------------------------
    def run(self):
        wiki = self.load_json("wiki.json")
        vars_ = self.load_json("docs/wiki_vars.json", required=False) or {}
        keys = self.load_json("docs/wiki_keys.json", required=False) or {}
        commands = self.load_json("docs/wiki_commands.json", required=False)
        if wiki is None:
            return
        if commands is None:
            self.warn("docs/wiki_commands.json missing — {{commands}} tables will be empty")

        site = wiki.get("site") or {}
        tree = wiki.get("tree") or []
        if not isinstance(tree, list) or not tree:
            self.error("wiki.json: tree must be a non-empty list")
            return

        known_keys = set((keys.get("controls") or {}).keys()) | set((keys.get("commands") or {}).keys())

        # 1. the tree -> ordered page ids
        page_ids = []
        for node in tree:
            if not isinstance(node, dict):
                self.error(f"wiki.json: node {node!r} is not an object")
            elif "page" in node:
                if not re.fullmatch(r"[a-z0-9-]+", str(node["page"])):
                    self.error(f"wiki.json: bad page id {node['page']!r}")
                page_ids.append(node["page"])
            elif "category" in node:
                cat = node["category"]
                if not re.fullmatch(r"[a-z0-9-]+", str(cat)):
                    self.error(f"wiki.json: bad category id {cat!r}")
                if not node.get("title"):
                    self.error(f"wiki.json: category {cat!r} has no title")
                if not node.get("pages"):
                    self.warn(f"wiki.json: category {cat!r} lists no pages")
                for p in node.get("pages") or []:
                    if not re.fullmatch(r"[a-z0-9-]+", str(p)):
                        self.error(f"wiki.json: bad page id {p!r} in {cat}")
                    page_ids.append(f"{cat}/{p}")
            elif "link" in node:
                if not node.get("title"):
                    self.error(f"wiki.json: link {node['link']!r} has no title")
            else:
                self.error(f"wiki.json: node {node!r} is neither page, category nor link")
        dupes = {p for p in page_ids if page_ids.count(p) > 1}
        for d in sorted(dupes):
            self.error(f"wiki.json: page {d!r} listed twice")

        # 2. every page file
        pages = {}
        for pid in page_ids:
            rel = f"content/{pid}.md"
            p = self.path(rel)
            if not os.path.exists(p):
                self.error(f"{rel}: listed in wiki.json but missing")
                continue
            with open(p, encoding="utf-8") as f:
                src = f.read().replace("\r\n", "\n")
            meta, body = self.front_matter(rel, src)
            if not meta.get("description"):
                self.warn(f"{rel}: no description (shown under the title and in search)")

            for m in RE_GENERATED.finditer(body):
                if m.group(1) not in GENERATED_KINDS:
                    self.error(f"{rel}: unknown generated block {m.group(0)}")
            if self.has_html(body):
                self.warn(f"{rel}: raw HTML — the renderer strips it")

            for m in RE_PLACEHOLDER.finditer(RE_FENCE.sub("", body)):
                kind, name = m.group(1).lower(), (m.group(2) or "").strip()
                if kind not in PLACEHOLDER_KINDS:
                    continue  # plain braces in prose are fine, the renderer leaves them alone
                if kind in ("var", "money") and vars_ and name not in vars_:
                    self.error(f"{rel}: unknown {{{kind}:{name}}} (not in docs/wiki_vars.json)")
                if kind == "key" and known_keys and name not in known_keys:
                    self.error(f"{rel}: unknown {{key:{name}}} (not in docs/wiki_keys.json)")
                if kind in ("discord", "website", "repo") and not site.get(kind):
                    self.error(f"{rel}: {{{kind}}} used but wiki.json site.{kind} is empty")

            pages[pid] = {
                "headings": self.headings(body),
                "links": [m.group(2) for m in RE_LINK.finditer(RE_FENCE.sub("", body))],
            }

        # 3. content files nobody lists
        for dirpath, _, files in os.walk(self.path("content")):
            for fn in files:
                if not fn.endswith(".md"):
                    continue
                rel = os.path.relpath(os.path.join(dirpath, fn), self.path("content")).replace(os.sep, "/")
                pid = rel[:-3]
                if pid not in pages and pid not in dupes:
                    self.warn(f"content/{rel}: not in wiki.json, will not be reachable")

        # 4. links between pages
        for pid, page in pages.items():
            for href in page["links"]:
                self.check_link(pid, href, pages)

        return len(pages)

    def check_link(self, pid, href, pages):
        if href.startswith(("http://", "https://", "mailto:")):
            return
        anchor = ""
        if "#" in href:
            href, anchor = href.split("#", 1)
        target = pid if href == "" else href
        if target.startswith("wiki:"):
            target = target[5:]
        target = re.sub(r"\.md$", "", target)
        if target.startswith(("./", "../")):
            base = pid.split("/")[:-1]
            for seg in target.split("/"):
                if seg == "..":
                    if base:
                        base.pop()
                elif seg != ".":
                    base.append(seg)
            target = "/".join(base)
        elif "/" not in target and target not in pages:
            d = "/".join(pid.split("/")[:-1])
            if d and f"{d}/{target}" in pages:
                target = f"{d}/{target}"
        if target not in pages:
            self.error(f"content/{pid}.md: link to missing page {href!r}")
            return
        if anchor and anchor not in {h["id"] for h in pages[target]["headings"]}:
            have = ", ".join(h["id"] for h in pages[target]["headings"] if h["level"] > 1)
            self.error(f"content/{pid}.md: link to {target}#{anchor}, no such heading (have: {have})")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=ROOT, help="wiki repo root (default: the parent of tools/)")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    c = Check(os.path.abspath(args.root))
    n = c.run()

    for w in c.warnings:
        print(f"warning: {w}")
    for e in c.errors:
        print(f"error: {e}", file=sys.stderr)
    if c.errors or n is None:
        print(f"\ncheck failed: {len(c.errors)} error(s)", file=sys.stderr)
        return 1
    if not args.quiet:
        print(f"ok: {n} pages, {len(c.warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
