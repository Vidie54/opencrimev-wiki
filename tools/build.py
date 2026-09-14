#!/usr/bin/env python3
"""
build.py — validates the wiki and writes the dist/ the renderer reads.

    python tools/build.py              # validate + write dist/
    python tools/build.py --check      # validate only (the PR check)
    python tools/build.py --render     # also run every page through renderer/md.js (needs node)
    python tools/build.py --root X --out Y

Stdlib only. Exit code is non-zero on any error, so the workflow and the
oc-helpui sync tool can both rely on it.

Inputs
    wiki.json                 the tree (order + titles + icons) and site links
    content/**/*.md           one page per file, front matter: title, description, icon
    docs/wiki_vars.json       every {var:…} key with the value the gamemode dumped (/wikivars)
    docs/wiki_keys.json       every {key:…} name: INPUT_* controls and RegisterKeyMapping commands
    docs/wiki_commands.json   the player commands, rendered into controls/commands.md
Outputs
    dist/content.json  { site, tree, pages: { id: { title, description, icon, md, headings, path, updated } }, built, commit }
    dist/search.json   [ { id, title, category, headings, text } ]
    dist/keys.json     { keyboard: { INPUT_PICKUP: "E", open_help: "F4" }, gamepad: {…} }
    dist/vars.json     the vars dump, verbatim
    dist/commands.json the commands dump, verbatim
"""
import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RE_FRONT = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.S)
RE_PLACEHOLDER = re.compile(r"\{(\w+)(?::([^}]+))?\}")
RE_LINK = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
RE_IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
RE_HEADING = re.compile(r"^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$", re.M)
RE_FENCE = re.compile(r"```.*?```", re.S)
RE_HTML = re.compile(r"<!--.*?-->|</?[a-zA-Z][^<>]*>", re.S)
RE_GENERATED = re.compile(r"\{\{(\w+)(?::(\w+))?\}\}")

ALLOWED_FRONT = {"title", "description", "icon"}
PLACEHOLDER_KINDS = {"key", "kbd", "var", "money", "discord", "website", "repo"}


class Build:
    def __init__(self, root, out):
        self.root = root
        self.out = out
        self.errors = []
        self.warnings = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    # ------------------------------------------------------------------
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
        # mirrors md.js slugify so heading anchors agree between build and renderer
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
        clean = RE_FENCE.sub("", body)
        for m in RE_HEADING.finditer(clean):
            level = len(m.group(1))
            plain = self.heading_plain(m.group(2))
            base = self.slugify(plain)
            hid, k = base, 2
            while hid in seen:
                hid = f"{base}-{k}"
                k += 1
            seen.add(hid)
            out.append({"level": level, "text": plain, "id": hid})
        return out

    @staticmethod
    def strip_html(body):
        """Raw HTML removed everywhere except inside code spans and fences,
        where `<page>` is text, not markup."""
        out, i = [], 0
        for m in re.finditer(r"```.*?```|`[^`\n]*`", body, re.S):
            out.append(RE_HTML.sub("", body[i:m.start()]))
            out.append(m.group(0))
            i = m.end()
        out.append(RE_HTML.sub("", body[i:]))
        return "".join(out)

    @staticmethod
    def plain_text(body):
        t = RE_FENCE.sub(" ", body)
        t = RE_HTML.sub(" ", t)
        t = RE_IMAGE.sub(r"\1", t)
        t = RE_LINK.sub(r"\1", t)
        t = re.sub(r"\{key:([^}]+)\}", lambda m: m.group(1).replace("INPUT_", "").replace("_", " ").lower(), t)
        t = re.sub(r"\{kbd:([^}]+)\}", r"\1", t)
        t = re.sub(r"\{[^}]*\}", " ", t)
        t = re.sub(r"^\s{0,3}#{1,6}\s+", "", t, flags=re.M)
        t = re.sub(r"^\s{0,3}>\s?\[!\w+\]\s*", "", t, flags=re.M)
        t = re.sub(r"^\s{0,3}>\s?", "", t, flags=re.M)
        t = re.sub(r"^\s*[-*+]\s+(\[[ xX]\]\s+)?", "", t, flags=re.M)
        t = re.sub(r"^\s*\d+[.)]\s+", "", t, flags=re.M)
        t = re.sub(r"^\s*\|?\s*:?-+.*$", "", t, flags=re.M)
        t = re.sub(r"[|*_~`#\\]", " ", t)
        return re.sub(r"\s+", " ", t).strip()

    # ------------------------------------------------------------------
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

    def git_date(self, rel):
        try:
            r = subprocess.run(["git", "log", "-1", "--format=%cI", "--", rel], cwd=self.root,
                               capture_output=True, text=True, timeout=10)
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout.strip()
        except (OSError, subprocess.SubprocessError):
            pass
        p = self.path(rel)
        return dt.datetime.fromtimestamp(os.path.getmtime(p), dt.timezone.utc).isoformat(timespec="seconds")

    def git_commit(self):
        try:
            r = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=self.root, capture_output=True, text=True, timeout=10)
            if r.returncode == 0:
                return r.stdout.strip()
        except (OSError, subprocess.SubprocessError):
            pass
        return None

    # ------------------------------------------------------------------
    def commands_table(self, commands, group):
        if not commands:
            return "_No command list has been dumped yet (`/wikivars` on the server writes `docs/wiki_commands.json`)._"
        rows = [c for c in commands if (c.get("group") or "user") == group]
        if not rows:
            return f"_No `{group}` commands._"
        lines = ["| Command | Description |", "|---|---|"]
        for c in sorted(rows, key=lambda c: c["name"]):
            names = [c["name"]] + list(c.get("aliases") or [])
            cmd = " ".join(f"`/{n}`" for n in names)
            args = " ".join(f"`{a}`" for a in (c.get("args") or []))
            # `<id>` in a help text is an argument, not a tag — keep it out of the HTML strip
            help_ = re.sub(r"<([\w ]+)>", r"`<\1>`", str(c.get("help") or "").replace("|", "\\|"))
            lines.append(f"| {cmd}{' ' + args if args else ''} | {help_} |")
        return "\n".join(lines)

    def expand_generated(self, rel, body, commands):
        def sub(m):
            kind, arg = m.group(1), m.group(2)
            if kind == "commands":
                return self.commands_table(commands, arg or "user")
            self.error(f"{rel}: unknown generated block {{{{{kind}}}}}")
            return ""
        return RE_GENERATED.sub(sub, body)

    # ------------------------------------------------------------------
    def run(self, render=False):
        wiki = self.load_json("wiki.json")
        vars_ = self.load_json("docs/wiki_vars.json", required=False) or {}
        keys = self.load_json("docs/wiki_keys.json", required=False) or {}
        commands = self.load_json("docs/wiki_commands.json", required=False) or []
        if wiki is None:
            return None

        site = wiki.get("site") or {}
        tree = wiki.get("tree") or []
        if not isinstance(tree, list) or not tree:
            self.error("wiki.json: tree must be a non-empty list")
            return None

        known_keys = set((keys.get("controls") or {}).keys()) | set((keys.get("commands") or {}).keys())

        # 1. the tree -> ordered page ids
        page_ids, categories = [], {}
        for node in tree:
            if "page" in node:
                if not re.fullmatch(r"[a-z0-9-]+", node["page"]):
                    self.error(f"wiki.json: bad page id {node['page']!r}")
                page_ids.append(node["page"])
            elif "category" in node:
                cat = node["category"]
                if not re.fullmatch(r"[a-z0-9-]+", cat):
                    self.error(f"wiki.json: bad category id {cat!r}")
                if not node.get("title"):
                    self.error(f"wiki.json: category {cat!r} has no title")
                categories[cat] = node.get("title", cat)
                for p in node.get("pages") or []:
                    if not re.fullmatch(r"[a-z0-9-]+", p):
                        self.error(f"wiki.json: bad page id {p!r} in {cat}")
                    page_ids.append(f"{cat}/{p}")
            elif "link" in node:
                if not node.get("title"):
                    self.error(f"wiki.json: link {node['link']!r} has no title")
            else:
                self.error(f"wiki.json: node {node!r} is neither page, category nor link")
        dupes = {p for p in page_ids if page_ids.count(p) > 1}
        for d in dupes:
            self.error(f"wiki.json: page {d!r} listed twice")

        # 2. every page file
        pages, search = {}, []
        for pid in page_ids:
            rel = f"content/{pid}.md"
            p = self.path(rel)
            if not os.path.exists(p):
                self.error(f"{rel}: listed in wiki.json but missing")
                continue
            with open(p, encoding="utf-8") as f:
                src = f.read().replace("\r\n", "\n")
            meta, body = self.front_matter(rel, src)
            body = self.expand_generated(rel, body, commands)
            stripped = self.strip_html(body)
            if stripped != body:
                self.warn(f"{rel}: raw HTML stripped")
                body = stripped

            # placeholders
            for m in RE_PLACEHOLDER.finditer(RE_FENCE.sub("", body)):
                kind, name = m.group(1).lower(), (m.group(2) or "").strip()
                if kind not in PLACEHOLDER_KINDS:
                    continue  # plain braces in prose are fine, md.js leaves them alone
                if kind in ("var", "money") and vars_ and name not in vars_:
                    self.error(f"{rel}: unknown {{{kind}:{name}}} (not in docs/wiki_vars.json)")
                if kind == "key" and known_keys and name not in known_keys:
                    self.error(f"{rel}: unknown {{key:{name}}} (not in docs/wiki_keys.json)")
                if kind in ("discord", "website", "repo") and not site.get(kind):
                    self.error(f"{rel}: {{{kind}}} used but wiki.json site.{kind} is empty")

            heads = self.headings(body)
            cat = pid.split("/")[0] if "/" in pid else None
            pages[pid] = {
                "title": meta.get("title", pid),
                "description": meta.get("description", ""),
                "icon": meta.get("icon", ""),
                "md": body.strip() + "\n",
                "headings": heads,
                "path": rel,
                "updated": self.git_date(rel),
                "_links": [(m.group(2), m.group(1)) for m in RE_LINK.finditer(RE_FENCE.sub("", body))],
            }
            search.append({
                "id": pid,
                "title": pages[pid]["title"],
                "category": categories.get(cat, "") if cat else "",
                "headings": [h["text"] for h in heads if h["level"] in (2, 3)],
                "text": self.plain_text(body),
            })

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
            for href, text in page.pop("_links"):
                self.check_link(pid, href, pages)

        # 5. render every page through md.js
        if render:
            self.render_check(pages)

        built = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        content = {
            "site": site,
            "tree": tree,
            "pages": pages,
            "built": built,
            "commit": self.git_commit(),
        }
        keys_out = {
            "keyboard": {**{k: v.get("keyboard") if isinstance(v, dict) else v for k, v in (keys.get("controls") or {}).items()},
                         **{k: v.get("keyboard") if isinstance(v, dict) else v for k, v in (keys.get("commands") or {}).items()}},
            "gamepad": {k: v.get("gamepad") for k, v in (keys.get("controls") or {}).items() if isinstance(v, dict) and v.get("gamepad")},
        }
        return {"content": content, "search": search, "keys": keys_out, "vars": vars_, "commands": commands}

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
            self.error(f"content/{pid}.md: link to {target}#{anchor}, no such heading (have: {', '.join(h['id'] for h in pages[target]['headings'] if h['level'] > 1)})")

    def render_check(self, pages):
        node = shutil.which("node")
        if not node:
            self.warn("--render: node not found, skipping the md.js pass")
            return
        script = self.path("tools", "render_check.js")
        payload = json.dumps({pid: p["md"] for pid, p in pages.items()})
        try:
            r = subprocess.run([node, script], input=payload, capture_output=True, text=True, cwd=self.root, timeout=120, encoding="utf-8")
        except (OSError, subprocess.SubprocessError) as e:
            self.error(f"--render: could not run node ({e})")
            return
        if r.returncode != 0:
            self.error(f"--render: md.js failed:\n{r.stderr.strip() or r.stdout.strip()}")
            return
        try:
            report = json.loads(r.stdout or "{}")
        except json.JSONDecodeError:
            self.error(f"--render: unexpected output from render_check.js: {r.stdout[:300]}")
            return
        for pid, msg in (report.get("errors") or {}).items():
            self.error(f"content/{pid}.md: md.js threw: {msg}")
        for pid, ids in (report.get("headingIds") or {}).items():
            mine = [h["id"] for h in pages[pid]["headings"]]
            if ids != mine:
                self.error(f"content/{pid}.md: heading ids differ between build.py {mine} and md.js {ids}")

    # ------------------------------------------------------------------
    def write(self, result):
        os.makedirs(self.out, exist_ok=True)
        for name, data in (("content", result["content"]), ("search", result["search"]),
                           ("keys", result["keys"]), ("vars", result["vars"]), ("commands", result["commands"])):
            with open(os.path.join(self.out, f"{name}.json"), "w", encoding="utf-8", newline="\n") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
                f.write("\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=ROOT, help="wiki repo root (default: the parent of tools/)")
    ap.add_argument("--out", default=None, help="output directory (default: <root>/dist)")
    ap.add_argument("--check", action="store_true", help="validate only, write nothing")
    ap.add_argument("--render", action="store_true", help="also render every page with renderer/md.js under node")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    root = os.path.abspath(args.root)
    out = os.path.abspath(args.out or os.path.join(root, "dist"))
    b = Build(root, out)
    result = b.run(render=args.render)

    for w in b.warnings:
        print(f"warning: {w}")
    for e in b.errors:
        print(f"error: {e}", file=sys.stderr)
    if b.errors or result is None:
        print(f"\nbuild failed: {len(b.errors)} error(s)", file=sys.stderr)
        return 1

    if not args.check:
        b.write(result)
    n = len(result["content"]["pages"])
    if not args.quiet:
        where = "validated" if args.check else f"written to {os.path.relpath(out, os.getcwd())}"
        print(f"ok: {n} pages, {len(result['search'])} search docs, {len(b.warnings)} warning(s) — {where}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
