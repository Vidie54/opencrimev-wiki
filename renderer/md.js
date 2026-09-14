/*
 * md.js — the wiki's Markdown renderer.
 *
 * A CommonMark subset, no dependencies, same file in the browser (window.MD)
 * and in Node (module.exports) so tools/build.py can run every page through
 * it. Raw HTML in the source is stripped — the content is public and edited
 * by anyone with a GitHub account, so the parser only ever emits its own
 * markup and every piece of source text goes through escape().
 *
 * Supported:
 *   # headings (1-6), paragraphs, hard breaks (two spaces / backslash)
 *   **bold** *em* _em_ ~~strike~~ `code`
 *   [text](url "title")  ![alt](src)  <https://autolink>
 *   - lists, 1. lists, nesting by indentation, [ ] / [x] task items
 *   > blockquotes, > [!TIP] / [!NOTE] / [!WARNING] / [!POLICE] callouts
 *   | tables | with a header row
 *   ``` fenced code, --- rules, --- front matter (skipped)
 *
 * Placeholders, emitted as tagged elements the host fills in at draw time:
 *   {key:INPUT_PICKUP}      <kbd class="key" data-key="INPUT_PICKUP">
 *   {kbd:F4}                <kbd class="key">F4</kbd>          (literal keycap)
 *   {var:respawn.deathFee}  <span class="var" data-var="…">
 *   {money:respawn.deathFee}  the same, drawn as "$1,000"
 *   {discord} {website} {repo}  <a class="site" data-site="discord">
 *
 * Links:
 *   wiki:jobs/police#ranks   another page (also ../jobs/police.md, police.md)
 *   #ranks                   a heading on this page
 *   https://…                external
 * opts.resolveLink(href, kind) may rewrite any of them; opts.assetBase is
 * prefixed to relative image paths.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MD = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  const CALLOUTS = { TIP: "tip", NOTE: "note", INFO: "note", WARNING: "warning", DANGER: "warning", POLICE: "police" };
  const CALLOUT_TITLES = { tip: "Tip", note: "Note", warning: "Warning", police: "Police" };

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-") || "section";
  }

  // Only schemes a wiki page has any business linking to.
  function safeUrl(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^javascript:/i.test(u)) return "";
    if (/^(https?:|mailto:|wiki:|#|\.{0,2}\/)/i.test(u)) return u;
    if (/^[a-z0-9_\-]+(\/[a-z0-9_\-]+)*(\.md)?(#[\w-]*)?$/i.test(u)) return u;
    return "";
  }

  // ---------------------------------------------------------------------
  // Inline
  // ---------------------------------------------------------------------

  function makeInline(ctx) {
    const { opts } = ctx;

    function link(href, text, title) {
      const url = safeUrl(href);
      if (!url) return text;
      let kind = "external";
      if (url.startsWith("#")) kind = "anchor";
      else if (url.startsWith("wiki:") || /\.md(#[\w-]*)?$/i.test(url) || !/^[a-z]+:/i.test(url)) kind = "page";
      const r = opts.resolveLink ? opts.resolveLink(url, kind) : { href: url, kind };
      if (!r) return text;
      const attrs = [`href="${escape(r.href)}"`, `data-link="${r.kind || kind}"`];
      if (title) attrs.push(`title="${escape(title)}"`);
      if ((r.kind || kind) === "external") attrs.push('rel="noopener"');
      return `<a ${attrs.join(" ")}>${text}</a>`;
    }

    function image(src, alt, title) {
      let url = safeUrl(src);
      if (!url) return "";
      if (!/^(https?:)?\/\//i.test(url) && opts.assetBase) {
        url = opts.assetBase.replace(/\/?$/, "/") + url.replace(/^\.?\//, "");
      }
      const t = title ? ` title="${escape(title)}"` : "";
      return `<img src="${escape(url)}" alt="${escape(alt)}" loading="lazy"${t}>`;
    }

    function placeholder(body) {
      const m = /^(\w+)(?::([^}]+))?$/.exec(body);
      if (!m) return null;
      const kind = m[1].toLowerCase(), name = (m[2] || "").trim();
      switch (kind) {
        case "key": return name ? `<kbd class="key" data-key="${escape(name)}" title="${escape(name)}">…</kbd>` : null;
        case "kbd": return name ? `<kbd class="key">${escape(name)}</kbd>` : null;
        case "var": return name ? `<span class="var" data-var="${escape(name)}">…</span>` : null;
        case "money": return name ? `<span class="var money" data-var="${escape(name)}" data-money="">…</span>` : null;
        case "discord": case "website": case "repo":
          return `<a class="site" data-site="${kind}" data-link="external" rel="noopener" href="#">${escape(name || kind)}</a>`;
        default: return null;
      }
    }

    // Parses inline text into an HTML string. `text` is raw source.
    function inline(text) {
      let out = "";
      let i = 0;
      const n = text.length;

      while (i < n) {
        const c = text[i];

        // backslash escape
        if (c === "\\" && i + 1 < n) {
          const nx = text[i + 1];
          if (nx === "\n") { out += "<br>"; i += 2; continue; }
          if (/[\\`*_{}\[\]()#+\-.!~<>|]/.test(nx)) { out += escape(nx); i += 2; continue; }
        }

        // code span
        if (c === "`") {
          let ticks = 1;
          while (text[i + ticks] === "`") ticks++;
          const fence = "`".repeat(ticks);
          const end = text.indexOf(fence, i + ticks);
          if (end !== -1) {
            let code = text.slice(i + ticks, end);
            if (code.startsWith(" ") && code.endsWith(" ") && code.trim()) code = code.slice(1, -1);
            out += `<code>${escape(code)}</code>`;
            i = end + ticks;
            continue;
          }
        }

        // placeholder {key:…}
        if (c === "{") {
          const end = text.indexOf("}", i);
          if (end !== -1 && end - i < 80) {
            const html = placeholder(text.slice(i + 1, end));
            if (html) { out += html; i = end + 1; continue; }
          }
        }

        // image / link
        if (c === "!" && text[i + 1] === "[") {
          const r = readLink(text, i + 1);
          if (r) { out += image(r.url, r.text, r.title); i = r.end; continue; }
        }
        if (c === "[") {
          const r = readLink(text, i);
          if (r) { out += link(r.url, inline(r.text), r.title); i = r.end; continue; }
        }

        // autolink <https://…>
        if (c === "<") {
          const m = /^<((?:https?:|mailto:)[^\s<>]+)>/i.exec(text.slice(i));
          if (m) { out += link(m[1], escape(m[1].replace(/^mailto:/i, ""))); i += m[0].length; continue; }
          // raw HTML tag or comment: stripped
          const tag = /^<!--[\s\S]*?-->|^<\/?[a-zA-Z][^<>]*>/.exec(text.slice(i));
          if (tag) { i += tag[0].length; continue; }
        }

        // emphasis
        if (c === "*" || c === "_" || c === "~") {
          const r = readEmphasis(text, i);
          if (r) { out += `<${r.tag}>${inline(r.inner)}</${r.tag}>`; i = r.end; continue; }
        }

        // hard break: two spaces before newline
        if (c === "\n") {
          if (out.endsWith("  ")) { out = out.replace(/ +$/, "") + "<br>"; }
          else out += "\n";
          i++;
          continue;
        }

        out += escape(c);
        i++;
      }

      return out;
    }

    return inline;
  }

  // Reads [text](url "title") starting at text[i] === "[". Returns {text,url,title,end} or null.
  function readLink(text, i) {
    let depth = 0, j = i;
    for (; j < text.length; j++) {
      const ch = text[j];
      if (ch === "\\") { j++; continue; }
      if (ch === "[") depth++;
      else if (ch === "]") { depth--; if (depth === 0) break; }
    }
    if (j >= text.length || text[j + 1] !== "(") return null;
    const label = text.slice(i + 1, j);
    let k = j + 2, pdepth = 1;
    for (; k < text.length; k++) {
      const ch = text[k];
      if (ch === "\\") { k++; continue; }
      if (ch === "(") pdepth++;
      else if (ch === ")") { pdepth--; if (pdepth === 0) break; }
      else if (ch === "\n") return null;
    }
    if (k >= text.length) return null;
    const body = text.slice(j + 2, k).trim();
    const m = /^(<[^>]*>|\S+)(?:\s+(?:"([^"]*)"|'([^']*)'))?$/.exec(body);
    if (!m && body !== "") return null;
    const url = m ? m[1].replace(/^<|>$/g, "") : "";
    return { text: label, url, title: m ? (m[2] || m[3] || "") : "", end: k + 1 };
  }

  function readEmphasis(text, i) {
    const c = text[i];
    const runs = { "*": ["**", "*"], "_": ["__", "_"], "~": ["~~"] }[c];
    for (const d of runs) {
      if (!text.startsWith(d, i)) continue;
      const after = text[i + d.length];
      if (!after || /\s/.test(after)) continue;
      // find the closing delimiter that is not followed by the same char and not preceded by whitespace
      let j = i + d.length;
      while (j < text.length) {
        j = text.indexOf(d, j);
        if (j === -1) break;
        const before = text[j - 1], nx = text[j + d.length];
        if (before && !/\s/.test(before) && nx !== c && !(c === "_" && nx && /\w/.test(nx))) {
          const inner = text.slice(i + d.length, j);
          if (!inner.includes("\n\n")) {
            const tag = d === "~~" ? "s" : d.length === 2 ? "strong" : "em";
            return { tag, inner, end: j + d.length };
          }
        }
        j += d.length;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Block
  // ---------------------------------------------------------------------

  function stripFrontMatter(src) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
    if (!m) return { meta: {}, body: src };
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) {
      const kv = /^([\w-]+):\s*(.*)$/.exec(line);
      if (kv) meta[kv[1]] = kv[2].trim().replace(/^["'](.*)["']$/, "$1");
    }
    return { meta, body: src.slice(m[0].length) };
  }

  function isBlank(line) { return /^\s*$/.test(line); }

  const RE = {
    heading: /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/,
    fence: /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/,
    hr: /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/,
    ul: /^( {0,3})([-*+])\s+(.*)$/,
    ol: /^( {0,3})(\d{1,9})[.)]\s+(.*)$/,
    quote: /^ {0,3}>\s?(.*)$/,
    tableSep: /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,
    callout: /^\[!(\w+)\]\s*(.*)$/,
  };

  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
    const cells = [];
    let cur = "", inCode = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "\\" && s[i + 1] === "|") { cur += "|"; i++; continue; }
      if (ch === "`") inCode = !inCode;
      if (ch === "|" && !inCode) { cells.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  }

  function parseBlocks(lines, ctx) {
    const inline = ctx.inline;
    let out = "";
    let i = 0;

    const paragraphFlush = (buf) => {
      if (!buf.length) return;
      const text = buf.join("\n").trim();
      if (!text) return;
      // a paragraph that is only one image becomes a figure
      const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(text);
      if (img) {
        const html = inline(text);
        out += `<figure>${html}${img[1] ? `<figcaption>${escape(img[1])}</figcaption>` : ""}</figure>\n`;
        return;
      }
      out += `<p>${inline(text)}</p>\n`;
    };

    let para = [];

    while (i < lines.length) {
      const line = lines[i];

      if (isBlank(line)) { paragraphFlush(para); para = []; i++; continue; }

      // fenced code
      let m = RE.fence.exec(line);
      if (m) {
        paragraphFlush(para); para = [];
        const fence = m[1], lang = m[2];
        const buf = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
        i++;
        const cls = lang ? ` class="lang-${escape(lang)}"` : "";
        out += `<pre><code${cls}>${escape(buf.join("\n"))}</code></pre>\n`;
        continue;
      }

      // heading
      m = RE.heading.exec(line);
      if (m) {
        paragraphFlush(para); para = [];
        const level = m[1].length;
        const html = inline(m[2]);
        const plain = m[2].replace(/\{kbd:([^}]+)\}/g, "$1").replace(/\{[^}]*\}/g, "").replace(/[*_`~\[\]!]/g, "").replace(/\([^)]*\)/g, "").trim();
        let id = slugify(plain);
        let k = 2;
        while (ctx.ids.has(id)) id = `${slugify(plain)}-${k++}`;
        ctx.ids.add(id);
        ctx.headings.push({ level, text: plain, id });
        out += `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${html}</h${level}>\n`;
        i++;
        continue;
      }

      // hr
      if (RE.hr.test(line) && !RE.ul.test(line)) {
        paragraphFlush(para); para = [];
        out += "<hr>\n";
        i++;
        continue;
      }

      // blockquote / callout
      if (RE.quote.test(line)) {
        paragraphFlush(para); para = [];
        const buf = [];
        while (i < lines.length && (RE.quote.test(lines[i]) || (!isBlank(lines[i]) && buf.length && !RE.heading.test(lines[i]) && !RE.fence.test(lines[i])))) {
          const q = RE.quote.exec(lines[i]);
          buf.push(q ? q[1] : lines[i]);
          i++;
        }
        let kind = null, title = null;
        const c = RE.callout.exec(buf[0] || "");
        if (c && CALLOUTS[c[1].toUpperCase()]) {
          kind = CALLOUTS[c[1].toUpperCase()];
          title = c[2] || CALLOUT_TITLES[kind];
          buf.shift();
        }
        const inner = parseBlocks(buf, ctx);
        if (kind) {
          out += `<div class="callout callout-${kind}" role="note"><div class="callout-title"><svg class="icon" aria-hidden="true"><use href="#i-${kind}"></use></svg>${escape(title)}</div><div class="callout-body">${inner}</div></div>\n`;
        } else {
          out += `<blockquote>${inner}</blockquote>\n`;
        }
        continue;
      }

      // list
      if (RE.ul.exec(line) || RE.ol.exec(line)) {
        paragraphFlush(para); para = [];
        const r = parseList(lines, i, ctx);
        out += r.html;
        i = r.next;
        continue;
      }

      // table: header row + separator
      if (line.includes("|") && i + 1 < lines.length && RE.tableSep.test(lines[i + 1])) {
        paragraphFlush(para); para = [];
        const header = splitRow(line);
        const aligns = splitRow(lines[i + 1]).map((s) => {
          const l = s.startsWith(":"), r = s.endsWith(":");
          return l && r ? "center" : r ? "right" : l ? "left" : "";
        });
        i += 2;
        const rows = [];
        while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) rows.push(splitRow(lines[i++]));
        const td = (cells, tag) => cells.map((cell, idx) => {
          const a = aligns[idx] ? ` style="text-align:${aligns[idx]}"` : "";
          return `<${tag}${a}>${inline(cell)}</${tag}>`;
        }).join("");
        out += `<div class="table-wrap"><table><thead><tr>${td(header, "th")}</tr></thead><tbody>`;
        for (const row of rows) {
          while (row.length < header.length) row.push("");
          out += `<tr>${td(row.slice(0, header.length), "td")}</tr>`;
        }
        out += "</tbody></table></div>\n";
        continue;
      }

      para.push(line);
      i++;
    }

    paragraphFlush(para);
    return out;
  }

  function leading(l) { return l.length - l.replace(/^\s+/, "").length; }

  // Lists: items at the same indent, continuation lines indented past the marker.
  function parseList(lines, start, ctx) {
    const ordered = !!RE.ol.exec(lines[start]);
    const first = ordered ? RE.ol.exec(lines[start]) : RE.ul.exec(lines[start]);
    const indent = first[1].length;
    const startNo = ordered ? parseInt(first[2], 10) : 1;
    const items = [];
    let i = start;

    while (i < lines.length) {
      const line = lines[i];
      const m = ordered ? RE.ol.exec(line) : RE.ul.exec(line);
      if (m && m[1].length === indent) {
        const markerWidth = line.length - m[3].length; // text column
        const buf = [m[3]];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (isBlank(l)) {
            let j = i;
            while (j < lines.length && isBlank(lines[j])) j++;
            if (j < lines.length && /^\s/.test(lines[j]) && leading(lines[j]) >= Math.min(markerWidth, indent + 2)) { buf.push(""); i++; continue; }
            break;
          }
          const lead = leading(l);
          if (lead >= markerWidth) { buf.push(l.slice(markerWidth)); i++; continue; }
          if (lead > indent && (RE.ul.test(l) || RE.ol.test(l))) { buf.push(l.slice(lead)); i++; continue; }
          break;
        }
        items.push(buf);
        continue;
      }
      if (isBlank(line)) {
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j++;
        const nm = j < lines.length && (ordered ? RE.ol.exec(lines[j]) : RE.ul.exec(lines[j]));
        if (nm && nm[1].length === indent) { i = j; continue; }
      }
      break;
    }

    const tag = ordered ? "ol" : "ul";
    const startAttr = ordered && startNo !== 1 ? ` start="${startNo}"` : "";
    let html = `<${tag}${startAttr}>`;
    for (const buf of items) {
      const task = /^\[([ xX])\]\s+(.*)$/.exec(buf[0]);
      if (task) {
        const body = [task[2], ...buf.slice(1)];
        const done = task[1] !== " ";
        html += `<li class="task${done ? " done" : ""}"><span class="check${done ? " checked" : ""}" aria-hidden="true"></span>${renderItem(body, ctx)}</li>`;
      } else {
        html += `<li>${renderItem(buf, ctx)}</li>`;
      }
    }
    html += `</${tag}>\n`;
    return { html, next: i };
  }

  // A list item: tight (one paragraph, no <p>) or loose (blocks).
  function renderItem(buf, ctx) {
    const hasBlank = buf.some(isBlank);
    const hasBlock = buf.slice(1).some((l) => RE.ul.test(l) || RE.ol.test(l) || RE.fence.test(l) || RE.quote.test(l));
    if (!hasBlank && !hasBlock) return ctx.inline(buf.join("\n").trim());
    let html = parseBlocks(buf, ctx);
    if (!hasBlank) html = html.replace(/^<p>([\s\S]*?)<\/p>\n/, "$1");
    return html;
  }

  // ---------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------

  /**
   * Render Markdown to HTML.
   * @param {string} src
   * @param {object} [opts] resolveLink(href, kind) -> {href, kind} | null, assetBase
   * @returns {{ html: string, headings: {level:number,text:string,id:string}[], meta: object }}
   */
  function render(src, opts) {
    const { meta, body } = stripFrontMatter(String(src || "").replace(/\r\n?/g, "\n"));
    const ctx = { opts: opts || {}, headings: [], ids: new Set() };
    ctx.inline = makeInline(ctx);
    const html = parseBlocks(body.split("\n"), ctx);
    return { html, headings: ctx.headings, meta };
  }

  /** The text a search index sees: markup and placeholders removed. */
  function plainText(src) {
    const { body } = stripFrontMatter(String(src || "").replace(/\r\n?/g, "\n"));
    return body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^<>]*>/g, " ")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\{key:([^}]+)\}/g, (_, k) => k.replace(/^INPUT_/, "").replace(/_/g, " ").toLowerCase())
      .replace(/\{kbd:([^}]+)\}/g, "$1")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?\[!\w+\]\s*/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/^\s*\|?\s*:?-{2,}.*$/gm, "")
      .replace(/[|*_~`#\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return { render, plainText, slugify, escape, stripFrontMatter };
});
