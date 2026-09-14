/*
 * wiki.js — the shared OpenCrimeV wiki renderer.
 *
 * One file, two hosts: the website shell (web/index.html) and the in-game NUI
 * (oc-helpui/html/index.html). Vanilla ES2020, no framework, no CDN. Needs
 * md.js loaded first (window.MD).
 *
 *   Wiki.mount(rootEl, {
 *     content,        // dist/content.json  { site, tree, pages: { id: { title, description, md, headings, path, updated } }, built }
 *     search,         // dist/search.json   [ { id, title, category, headings[], text } ]
 *     host: "nui" | "web",
 *     resolveKeys,    // (names[]) -> map | Promise<map>   {key:…} placeholders (live bindings)
 *     keyDefaults,    // { INPUT_PICKUP: "E", … }  drawn at once, and the answer for names resolveKeys skips
 *     vars,           // { "respawn.deathFee": 1000, … }   {var:…} placeholders
 *     assetBase,      // where content images live ("assets/" or "content/assets/")
 *     onClose,        // NUI: ESC / close button
 *     onExternal,     // NUI: an external link was clicked (url)
 *     initialRoute,   // "jobs/police#ranks"
 *     sourceLabel,    // footer tag: "bundled snapshot" / "GitHub, 2026-09-14"
 *   });
 *   Wiki.navigate("crime/wanted-level#losing-stars");
 *   Wiki.setContent(content, search, { sourceLabel });   // live refresh
 *   Wiki.setVars(vars);
 *
 * Routes are "category/page" or a top-level page id ("index", "faq"); an
 * optional "#heading" scrolls to it. The hash router uses "#/route#heading"
 * in both hosts so deep links are the same call everywhere.
 */
(function (root) {
  "use strict";

  const MD = root.MD;
  const esc = MD.escape;

  // ---------------------------------------------------------------------
  // Icon sprite — inline so nothing is fetched. Feather-style 24×24 strokes.
  // ---------------------------------------------------------------------
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.5 3.3 6.7 6.4 7a3.4 3.4 0 0 0-.9 2.6V22"/>',
    discord: '<path d="M8.5 15.5c1 .7 2.2 1 3.5 1s2.5-.3 3.5-1M5 6.5A15 15 0 0 1 9 5l.6 1.3a12 12 0 0 1 4.8 0L15 5a15 15 0 0 1 4 1.5c2 3.5 2.6 7 2.2 10.3a15 15 0 0 1-4.7 2.2l-1-1.7c1-.4 1.5-.7 2-1.1-3.6 1.6-7.4 1.6-11 0 .5.4 1 .7 2 1.1l-1 1.7A15 15 0 0 1 2.8 16.8C2.4 13.5 3 10 5 6.5Z"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    tip: '<path d="M9 18h6m-5 3h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>',
    note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>',
    warning: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01"/>',
    police: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    "arrow-left": '<path d="M19 12H5m7-7-7 7 7 7"/>',
    "arrow-right": '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v19"/>',
    gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10m2-6 7 7M9 7l7 7M3 22h9"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M2 12h20"/>',
    skull: '<path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 4.6 3 6v4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-4c1.5-1.4 3-3 3-6a8 8 0 0 0-8-8Z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 21v-3m4 3v-3"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    car: '<path d="M5 17H3v-5l2-6h14l2 6v5h-2M5 17a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4M9 17h6M4 12h16"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM9 22V12h6v10"/>',
    trophy: '<path d="M8 21h8m-4-4v4M6 3h12v6a6 6 0 0 1-12 0ZM6 5H3a3 3 0 0 0 3 5M18 5h3a3 3 0 0 1-3 5"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>',
    question: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  };

  function sprite() {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">';
    for (const [id, body] of Object.entries(ICONS)) {
      s += `<symbol id="i-${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`;
    }
    return s + "</svg>";
  }

  const icon = (name, cls) => `<svg class="icon${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${ICONS[name] ? name : "book"}"></use></svg>`;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const S = {
    root: null,
    opts: {},
    content: null,
    search: [],
    order: [],          // flat page ids in sidebar order
    byId: {},           // id -> { id, title, category, categoryTitle, icon }
    route: null,
    keyCache: {},
    openCats: new Set(),
    el: {},
    resultIndex: -1,
    results: [],
    spy: null,
    toast: null,
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window / disabled */ } },
  };

  // ---------------------------------------------------------------------
  // Tree helpers
  // ---------------------------------------------------------------------
  function indexTree(content) {
    S.order = [];
    S.byId = {};
    for (const node of content.tree || []) {
      if (node.page) {
        S.order.push(node.page);
        S.byId[node.page] = { id: node.page, title: node.title, icon: node.icon, category: null, categoryTitle: null };
      } else if (node.category) {
        for (const p of node.pages || []) {
          const id = `${node.category}/${p}`;
          const page = content.pages[id];
          S.order.push(id);
          S.byId[id] = { id, title: page ? page.title : p, icon: node.icon, category: node.category, categoryTitle: node.title };
        }
      }
    }
  }

  function parseRoute(str) {
    let s = String(str || "").trim();
    if (s.startsWith("#")) s = s.slice(1);
    if (s.startsWith("/")) s = s.slice(1);
    const hash = s.indexOf("#");
    let route = hash === -1 ? s : s.slice(0, hash);
    const anchor = hash === -1 ? "" : s.slice(hash + 1);
    route = route.replace(/\.md$/, "").replace(/\/+$/, "");
    if (!route) route = "index";
    return { route, anchor };
  }

  function pageFor(route) {
    if (S.content.pages[route]) return route;
    // fuzzy: last segment match ("police" -> "jobs/police"), first in tree order
    const tail = route.split("/").pop().toLowerCase();
    for (const id of S.order) if (id.split("/").pop() === tail) return id;
    for (const id of S.order) if (id.includes(tail)) return id;
    return null;
  }

  // ---------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------
  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function buildShell() {
    const isNui = S.opts.host === "nui";
    const site = S.content.site || {};
    S.root.classList.add("wiki");
    S.root.dataset.host = S.opts.host || "web";
    S.root.innerHTML = `
      ${sprite()}
      <header class="wk-header">
        <button class="wk-iconbtn wk-burger" type="button" aria-label="Open navigation" aria-expanded="false">${icon("menu")}</button>
        <a class="wk-brand" href="#/" aria-label="${esc(site.name || "Wiki")} home"><span class="wk-brand-a">OPENCRIME</span><span class="wk-brand-v">V</span><span class="wk-brand-b">WIKI</span></a>
        <div class="wk-search" role="search">
          ${icon("search", "wk-search-icon")}
          <input class="wk-search-input" type="search" placeholder="Search the wiki…" aria-label="Search the wiki" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="wk-results" aria-autocomplete="list">
          <kbd class="wk-search-key" aria-hidden="true">/</kbd>
          <div class="wk-results" id="wk-results" role="listbox" hidden></div>
        </div>
        <nav class="wk-links" aria-label="External links">
          ${site.discord ? `<a class="wk-iconbtn" href="${esc(site.discord)}" data-link="external" rel="noopener" title="Discord" aria-label="Discord">${icon("discord")}</a>` : ""}
          ${site.website ? `<a class="wk-iconbtn" href="${esc(site.website)}" data-link="external" rel="noopener" title="Website" aria-label="Website">${icon("globe")}</a>` : ""}
          ${site.repo && !isNui ? `<a class="wk-iconbtn" href="${esc(site.repo)}" data-link="external" rel="noopener" title="GitHub" aria-label="GitHub">${icon("github")}</a>` : ""}
          ${!isNui ? `<button class="wk-iconbtn wk-theme" type="button" title="Toggle theme" aria-label="Toggle light / dark theme">${icon("sun", "i-sun")}${icon("moon", "i-moon")}</button>` : ""}
          ${isNui ? `<button class="wk-iconbtn wk-close" type="button" title="Close (Esc)" aria-label="Close">${icon("close")}</button>` : ""}
        </nav>
      </header>
      <div class="wk-body">
        <div class="wk-backdrop" hidden></div>
        <nav class="wk-sidebar" aria-label="Pages"></nav>
        <main class="wk-main" tabindex="-1">
          <div class="wk-page">
            <nav class="wk-breadcrumb" aria-label="Breadcrumb"></nav>
            <article class="wk-article"></article>
            <nav class="wk-pagenav" aria-label="Previous and next page"></nav>
            <footer class="wk-meta"></footer>
          </div>
        </main>
        <aside class="wk-toc" aria-label="On this page">
          <div class="wk-toc-title">On this page</div>
          <ul class="wk-toc-list"></ul>
        </aside>
      </div>
      <div class="wk-toast" role="status" aria-live="polite" hidden></div>`;

    const q = (sel) => S.root.querySelector(sel);
    S.el = {
      burger: q(".wk-burger"), sidebar: q(".wk-sidebar"), backdrop: q(".wk-backdrop"),
      main: q(".wk-main"), article: q(".wk-article"), crumb: q(".wk-breadcrumb"),
      pagenav: q(".wk-pagenav"), meta: q(".wk-meta"), toc: q(".wk-toc"), tocList: q(".wk-toc-list"),
      search: q(".wk-search-input"), results: q(".wk-results"), theme: q(".wk-theme"), close: q(".wk-close"),
      toast: q(".wk-toast"),
    };
  }

  // ---------------------------------------------------------------------
  // Sidebar
  // ---------------------------------------------------------------------
  function buildSidebar() {
    const tree = S.content.tree || [];
    let html = '<ul class="wk-nav">';
    for (const node of tree) {
      if (node.page) {
        html += `<li><a class="wk-nav-link wk-nav-top" href="#/${esc(node.page)}" data-page="${esc(node.page)}">${icon(node.icon || "book")}<span>${esc(node.title)}</span></a></li>`;
      } else if (node.category) {
        const open = S.openCats.has(node.category);
        html += `<li class="wk-cat${open ? " open" : ""}" data-cat="${esc(node.category)}">
          <button class="wk-cat-btn" type="button" aria-expanded="${open}">${icon(node.icon || "book")}<span>${esc(node.title)}</span>${icon("chevron", "wk-chev")}</button>
          <ul class="wk-cat-pages">`;
        for (const p of node.pages || []) {
          const id = `${node.category}/${p}`;
          const page = S.content.pages[id];
          html += `<li><a class="wk-nav-link" href="#/${esc(id)}" data-page="${esc(id)}"><span>${esc(page ? page.title : p)}</span></a></li>`;
        }
        html += "</ul></li>";
      } else if (node.link) {
        html += `<li><a class="wk-nav-link wk-nav-top wk-nav-ext" href="${esc(node.link)}" data-link="external" rel="noopener">${icon(node.icon || "external")}<span>${esc(node.title)}</span>${icon("external", "wk-ext")}</a></li>`;
      }
    }
    html += "</ul>";
    S.el.sidebar.innerHTML = html;
  }

  function markCurrent() {
    S.el.sidebar.querySelectorAll(".wk-nav-link").forEach((a) => {
      const cur = a.dataset.page === S.route;
      a.classList.toggle("current", cur);
      if (cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    const info = S.byId[S.route];
    if (info && info.category) openCat(info.category, true);
    const cur = S.el.sidebar.querySelector(".wk-nav-link.current");
    if (cur && typeof cur.scrollIntoView === "function") {
      const r = cur.getBoundingClientRect(), s = S.el.sidebar.getBoundingClientRect();
      if (r.top < s.top || r.bottom > s.bottom) cur.scrollIntoView({ block: "nearest" });
    }
  }

  function openCat(cat, open) {
    const li = S.el.sidebar.querySelector(`.wk-cat[data-cat="${CSS.escape(cat)}"]`);
    if (!li) return;
    li.classList.toggle("open", open);
    li.querySelector(".wk-cat-btn").setAttribute("aria-expanded", String(open));
    if (open) S.openCats.add(cat); else S.openCats.delete(cat);
    store.set("wiki.open", JSON.stringify([...S.openCats]));
  }

  function setDrawer(open) {
    S.root.classList.toggle("drawer-open", open);
    S.el.backdrop.hidden = !open;
    S.el.burger.setAttribute("aria-expanded", String(open));
  }

  // ---------------------------------------------------------------------
  // Article
  // ---------------------------------------------------------------------
  function resolveLink(href, kind) {
    if (kind === "anchor") return { href: `#/${S.route}${href}`, kind: "anchor" };
    if (kind === "page") {
      let target = href.replace(/^wiki:/, "");
      let anchor = "";
      const hi = target.indexOf("#");
      if (hi !== -1) { anchor = target.slice(hi); target = target.slice(0, hi); }
      target = target.replace(/\.md$/, "");
      // relative to the current page's folder: "police" from "jobs/overview" -> "jobs/police"
      if (target.startsWith("./") || target.startsWith("../")) {
        const base = S.route.split("/").slice(0, -1);
        for (const seg of target.split("/")) {
          if (seg === "..") base.pop(); else if (seg !== ".") base.push(seg);
        }
        target = base.join("/");
      } else if (!target.includes("/") && !S.content.pages[target]) {
        const dir = S.route.split("/").slice(0, -1).join("/");
        if (dir && S.content.pages[`${dir}/${target}`]) target = `${dir}/${target}`;
      }
      return { href: `#/${target}${anchor}`, kind: "page" };
    }
    return { href, kind: "external" };
  }

  function fmtVar(v) {
    if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (Array.isArray(v)) return v.map(fmtVar).join(", ");
    if (v && typeof v === "object") return Object.values(v).map(fmtVar).join(", ");
    return String(v);
  }

  function fillPlaceholders(scope) {
    const vars = S.opts.vars || {};
    scope.querySelectorAll("[data-var]").forEach((el) => {
      const k = el.dataset.var;
      if (vars[k] === undefined || vars[k] === null) {
        el.textContent = "?";
        el.classList.add("missing");
        el.title = `unknown value ${k}`;
        console.warn(`[wiki] unknown {var:${k}}`);
      } else {
        el.textContent = (el.dataset.money !== undefined ? "$" : "") + fmtVar(vars[k]);
        el.classList.remove("missing");
      }
    });

    const site = S.content.site || {};
    scope.querySelectorAll("[data-site]").forEach((el) => {
      const url = site[el.dataset.site];
      if (!url) { el.replaceWith(document.createTextNode(el.textContent)); return; }
      el.href = url;
      if (el.textContent === el.dataset.site) el.textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    });

    const keyEls = [...scope.querySelectorAll("kbd[data-key]")];
    if (!keyEls.length) return;
    const names = [...new Set(keyEls.map((e) => e.dataset.key))];
    // Defaults draw at once; the live binding (a round trip in the NUI)
    // overwrites them when it lands. "?" only for a name nobody knows.
    const defaults = S.opts.keyDefaults || {};
    const apply = (map, final) => keyEls.forEach((e) => {
      const k = e.dataset.key;
      const label = map[k] || defaults[k];
      if (label) { e.textContent = label; e.classList.remove("missing"); }
      else if (final) { e.textContent = "?"; e.classList.add("missing"); console.warn(`[wiki] unknown {key:${k}}`); }
      else e.textContent = "…";
    });
    const missing = names.filter((n) => S.keyCache[n] === undefined);
    if (!missing.length) return apply(S.keyCache, true);
    apply(S.keyCache, false);
    const r = S.opts.resolveKeys ? S.opts.resolveKeys(missing) : {};
    Promise.resolve(r).then((map) => {
      map = map || {};
      for (const n of missing) S.keyCache[n] = map[n] || S.keyCache[n] || null;
      apply(S.keyCache, true);
    }).catch((e) => console.warn("[wiki] resolveKeys failed", e));
  }

  function renderPage(id, anchor, replaceHistory) {
    const page = S.content.pages[id];
    if (!page) return renderMissing(id);
    S.route = id;
    const info = S.byId[id] || { title: page.title };

    const { html, headings } = MD.render(page.md, { resolveLink, assetBase: S.opts.assetBase || "assets/" });
    const site = S.content.site || {};

    // breadcrumb
    let crumb = `<a href="#/index">Wiki</a>`;
    if (info.categoryTitle) crumb += `<span class="sep">›</span><span>${esc(info.categoryTitle)}</span>`;
    crumb += `<span class="sep">›</span><span aria-current="page">${esc(page.title)}</span>`;
    S.el.crumb.innerHTML = crumb;

    // article: title from front matter unless the body starts with an h1
    const hasH1 = headings.length && headings[0].level === 1;
    const subs = headings.filter((x) => x.level === 2 || x.level === 3);
    const contents = subs.length >= 2
      ? `<details class="wk-contents"><summary>${icon("list")} Contents</summary><ul>${subs.map((x) => `<li class="l${x.level}"><a href="#/${esc(id)}#${esc(x.id)}">${esc(x.text)}</a></li>`).join("")}</ul></details>`
      : "";
    S.el.article.innerHTML =
      (hasH1 ? "" : `<h1>${esc(page.title)}</h1>`) +
      (page.description ? `<p class="wk-lead">${esc(page.description)}</p>` : "") +
      contents + html;
    fillPlaceholders(S.el.article);

    // prev / next
    const idx = S.order.indexOf(id);
    const prev = idx > 0 ? S.order[idx - 1] : null;
    const next = idx >= 0 && idx < S.order.length - 1 ? S.order[idx + 1] : null;
    const navLink = (pid, dir) => {
      if (!pid) return '<span class="wk-pagenav-empty"></span>';
      const p = S.byId[pid];
      return `<a class="wk-pagenav-link ${dir}" href="#/${esc(pid)}">${dir === "prev" ? icon("arrow-left") : ""}<span><small>${dir === "prev" ? "Previous" : "Next"}</small>${esc(p.title)}</span>${dir === "next" ? icon("arrow-right") : ""}</a>`;
    };
    S.el.pagenav.innerHTML = navLink(prev, "prev") + navLink(next, "next");

    // meta
    const editUrl = site.repo && page.path ? `${site.repo.replace(/\/$/, "")}/blob/${site.branch || "main"}/${page.path}` : null;
    const updated = page.updated ? `<span>${icon("clock")} Updated ${esc(String(page.updated).slice(0, 10))}</span>` : "";
    const src = S.opts.sourceLabel ? `<span class="wk-source">${esc(S.opts.sourceLabel)}</span>` : "";
    S.el.meta.innerHTML =
      (editUrl ? `<a href="${esc(editUrl)}" data-link="external" rel="noopener">${icon("edit")} Edit this page on GitHub</a>` : "") +
      updated + src;

    // toc
    S.el.tocList.innerHTML = subs.map((x) => `<li class="l${x.level}"><a href="#/${esc(id)}#${esc(x.id)}" data-h="${esc(x.id)}">${esc(x.text)}</a></li>`).join("");
    S.el.toc.hidden = subs.length < 2;
    watchHeadings();

    markCurrent();
    setDrawer(false);
    closeResults();

    if (S.opts.host !== "nui") {
      document.title = `${page.title} · ${site.name || "Wiki"}`;
      const m = document.querySelector('meta[name="description"]');
      if (m) m.content = page.description || site.name || "";
    }

    if (anchor) scrollToHeading(anchor);
    else S.el.main.scrollTop = 0;

    if (typeof S.opts.onNavigate === "function") S.opts.onNavigate(id, anchor);
  }

  function renderMissing(id) {
    S.route = id;
    S.el.crumb.innerHTML = `<a href="#/index">Wiki</a><span class="sep">›</span><span>Not found</span>`;
    S.el.article.innerHTML = `<h1>Page not found</h1><p>There is no page at <code>${esc(id)}</code>. Try the search, or go back to the <a href="#/index">welcome page</a>.</p>`;
    S.el.pagenav.innerHTML = "";
    S.el.meta.innerHTML = "";
    S.el.tocList.innerHTML = "";
    S.el.toc.hidden = true;
    markCurrent();
  }

  function scrollToHeading(id) {
    const el = S.el.article.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top - S.el.main.getBoundingClientRect().top + S.el.main.scrollTop - 16;
    S.el.main.scrollTop = top;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1200);
  }

  function watchHeadings() {
    if (S.spy) S.spy.disconnect();
    const links = [...S.el.tocList.querySelectorAll("a[data-h]")];
    if (!links.length || typeof IntersectionObserver === "undefined") return;
    const byId = Object.fromEntries(links.map((a) => [a.dataset.h, a]));
    const visible = new Map();
    S.spy = new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null);
      let best = null, bestTop = Infinity;
      for (const [hid, top] of visible) if (top !== null && top < bestTop) { best = hid; bestTop = top; }
      if (!best) return;
      links.forEach((a) => a.classList.toggle("active", a === byId[best]));
    }, { root: S.el.main, rootMargin: "0px 0px -70% 0px", threshold: 0 });
    S.el.article.querySelectorAll("h2[id], h3[id]").forEach((hd) => { if (byId[hd.id]) S.spy.observe(hd); });
  }

  // ---------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------
  const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function tokens(q) { return fold(q).split(/[^a-z0-9]+/).filter((t) => t.length > 1); }

  function scoreDoc(doc, toks, full) {
    let score = 0;
    const title = fold(doc.title), heads = (doc.headings || []).map(fold), text = doc._text || (doc._text = fold(doc.text));
    if (title === full) score += 100;
    else if (title.startsWith(full)) score += 60;
    else if (title.includes(full)) score += 40;
    if (heads.some((x) => x.includes(full))) score += 25;
    if (full.length > 2 && text.includes(full)) score += 15;
    for (const t of toks) {
      const wb = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
      if (wb.test(title)) score += 20;
      if (heads.some((x) => wb.test(x))) score += 10;
      let m = text.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));
      if (m) score += Math.min(m.length, 5) * 2;
      else return 0; // every token must hit somewhere
    }
    return score;
  }

  function snippet(doc, full, toks) {
    const text = doc.text || "";
    const lower = fold(text);
    let pos = lower.indexOf(full);
    if (pos === -1) for (const t of toks) { pos = lower.indexOf(t); if (pos !== -1) break; }
    if (pos === -1) pos = 0;
    const start = Math.max(0, pos - 50), end = Math.min(text.length, pos + 90);
    let s = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    return highlight(esc(s), [full, ...toks]);
  }

  function highlight(html, terms) {
    for (const t of terms.filter((x) => x && x.length > 1).sort((a, b) => b.length - a.length)) {
      html = html.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
    }
    return html;
  }

  function headingHit(doc, full, toks) {
    for (const hd of doc.headings || []) {
      const f = fold(hd);
      if (f.includes(full) || toks.some((t) => f.includes(t))) return hd;
    }
    return null;
  }

  function runSearch(q) {
    const full = fold(q).trim();
    const toks = tokens(q);
    if (!full || (!toks.length && full.length < 2)) return closeResults();
    const hits = [];
    for (const doc of S.search) {
      const sc = scoreDoc(doc, toks, full);
      if (sc > 0) hits.push({ doc, sc });
    }
    hits.sort((a, b) => b.sc - a.sc || a.doc.title.localeCompare(b.doc.title));
    S.results = hits.slice(0, 8).map(({ doc }) => {
      const hd = headingHit(doc, full, toks);
      const page = S.content.pages[doc.id];
      const anchor = hd && page ? (page.headings || []).find((x) => x.text === hd) : null;
      return { id: doc.id, title: doc.title, category: doc.category, heading: hd, anchor: anchor ? anchor.id : "", snip: snippet(doc, full, toks) };
    });
    S.resultIndex = S.results.length ? 0 : -1;
    drawResults(full, toks);
  }

  function drawResults(full, toks) {
    if (!S.results.length) {
      S.el.results.innerHTML = `<div class="wk-result-empty">No results for “${esc(full)}”.</div>`;
    } else {
      S.el.results.innerHTML = S.results.map((r, i) => `
        <a class="wk-result${i === S.resultIndex ? " active" : ""}" role="option" aria-selected="${i === S.resultIndex}" href="#/${esc(r.id)}${r.anchor ? "#" + esc(r.anchor) : ""}" data-i="${i}">
          <span class="wk-result-cat">${esc(r.category || "Wiki")}</span>
          <span class="wk-result-title">${highlight(esc(r.title), [full, ...toks])}${r.heading ? ` <span class="wk-result-h">› ${highlight(esc(r.heading), [full, ...toks])}</span>` : ""}</span>
          <span class="wk-result-snip">${r.snip}</span>
        </a>`).join("");
    }
    S.el.results.hidden = false;
    S.el.search.setAttribute("aria-expanded", "true");
  }

  function moveResult(delta) {
    if (!S.results.length) return;
    S.resultIndex = (S.resultIndex + delta + S.results.length) % S.results.length;
    S.el.results.querySelectorAll(".wk-result").forEach((a, i) => {
      a.classList.toggle("active", i === S.resultIndex);
      a.setAttribute("aria-selected", String(i === S.resultIndex));
      if (i === S.resultIndex) a.scrollIntoView({ block: "nearest" });
    });
  }

  function closeResults() {
    S.el.results.hidden = true;
    S.el.results.innerHTML = "";
    S.el.search.setAttribute("aria-expanded", "false");
    S.results = [];
    S.resultIndex = -1;
  }

  // ---------------------------------------------------------------------
  // Theme (web only)
  // ---------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    store.set("wiki.theme", theme);
  }

  function initTheme() {
    if (S.opts.host === "nui") { document.documentElement.dataset.theme = "dark"; return; }
    const saved = store.get("wiki.theme");
    const prefersLight = root.matchMedia && root.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(saved || (prefersLight ? "light" : "dark"));
  }

  // ---------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------
  function toast(msg, ms) {
    S.el.toast.textContent = msg;
    S.el.toast.hidden = false;
    clearTimeout(S.toast);
    S.toast = setTimeout(() => { S.el.toast.hidden = true; }, ms || 3500);
  }

  function onClick(e) {
    const a = e.target.closest("a");
    if (a) {
      const href = a.getAttribute("href") || "";
      if (a.dataset.link === "external" || /^https?:\/\//i.test(href)) {
        if (S.opts.host === "nui") {
          e.preventDefault();
          if (typeof S.opts.onExternal === "function") S.opts.onExternal(a.href);
          else toast(`Open in your browser: ${a.href}`);
          return;
        }
        a.target = "_blank";
        return;
      }
      if (href.startsWith("#") && !href.startsWith("#/")) {
        // a heading anchor emitted by md.js: keep the route in front of it
        e.preventDefault();
        navigate(`${S.route}${href}`);
        return;
      }
      if (href.startsWith("#/")) {
        // same route + anchor: hashchange will not fire, scroll by hand
        const { route, anchor } = parseRoute(href);
        if (route === S.route && location.hash === href) { e.preventDefault(); if (anchor) scrollToHeading(anchor); }
        return;
      }
    }

    const cat = e.target.closest(".wk-cat-btn");
    if (cat) {
      const li = cat.closest(".wk-cat");
      openCat(li.dataset.cat, !li.classList.contains("open"));
      return;
    }
    if (e.target.closest(".wk-burger")) { setDrawer(!S.root.classList.contains("drawer-open")); return; }
    if (e.target.closest(".wk-backdrop")) { setDrawer(false); return; }
    if (e.target.closest(".wk-theme")) { applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"); return; }
    if (e.target.closest(".wk-close")) { if (S.opts.onClose) S.opts.onClose(); return; }
    if (!e.target.closest(".wk-search")) closeResults();
  }

  function onKey(e) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
    if (e.key === "Escape") {
      if (!S.el.results.hidden) { closeResults(); S.el.search.blur(); e.preventDefault(); return; }
      if (S.root.classList.contains("drawer-open")) { setDrawer(false); e.preventDefault(); return; }
      if (typing && e.target === S.el.search) { S.el.search.blur(); e.preventDefault(); return; }
      if (S.opts.onClose) { S.opts.onClose(); e.preventDefault(); }
      return;
    }
    if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      S.el.search.focus();
      S.el.search.select();
      return;
    }
    if (e.target === S.el.search) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveResult(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveResult(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const r = S.results[S.resultIndex];
        if (r) { navigate(`${r.id}${r.anchor ? "#" + r.anchor : ""}`); S.el.search.blur(); }
      }
    }
  }

  function onHash() {
    const { route, anchor } = parseRoute(location.hash);
    const id = pageFor(route);
    if (id) renderPage(id, anchor); else renderMissing(route);
  }

  // ---------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------
  function navigate(route) {
    const { route: r, anchor } = parseRoute(route);
    const id = pageFor(r) || r;
    const hash = `#/${id}${anchor ? "#" + anchor : ""}`;
    if (location.hash === hash) onHash();
    else location.hash = hash;
  }

  function setContent(content, search, extra) {
    if (!content || !content.pages) throw new Error("wiki: content.json has no pages");
    S.content = content;
    S.search = Array.isArray(search) ? search : [];
    if (extra && extra.sourceLabel !== undefined) S.opts.sourceLabel = extra.sourceLabel;
    indexTree(content);
    buildSidebar();
    if (S.route) onHash();
  }

  function setVars(vars) {
    S.opts.vars = vars || {};
    if (S.route) fillPlaceholders(S.el.article);
  }

  function setKeys(resolver) {
    S.opts.resolveKeys = resolver;
    S.keyCache = {};
    if (S.route) fillPlaceholders(S.el.article);
  }

  function mount(rootEl, opts) {
    S.root = rootEl;
    S.opts = Object.assign({ host: "web" }, opts || {});
    S.content = opts.content;
    S.search = Array.isArray(opts.search) ? opts.search : [];
    if (!S.content || !S.content.pages) throw new Error("wiki: content.json has no pages");

    try { S.openCats = new Set(JSON.parse(store.get("wiki.open") || "[]")); } catch (e) { S.openCats = new Set(); }

    initTheme();
    indexTree(S.content);
    buildShell();
    buildSidebar();

    S.root.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    root.addEventListener("hashchange", onHash);
    S.el.search.addEventListener("input", () => runSearch(S.el.search.value));
    S.el.search.addEventListener("focus", () => { if (S.el.search.value) runSearch(S.el.search.value); });

    if (S.opts.initialRoute) navigate(S.opts.initialRoute);
    else if (location.hash.startsWith("#/")) onHash();
    else navigate("index");
  }

  function destroy() {
    if (!S.root) return;
    S.root.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
    root.removeEventListener("hashchange", onHash);
    if (S.spy) S.spy.disconnect();
    S.root.innerHTML = "";
    S.root = null;
    S.route = null;
  }

  root.Wiki = { mount, navigate, setContent, setVars, setKeys, destroy, toast, get route() { return S.route; } };
})(window);
