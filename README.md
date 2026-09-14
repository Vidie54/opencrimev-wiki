# OpenCrimeV Wiki

The player manual for [OpenCrimeV](https://www.opencrimev.com), a cops & robbers freeroam
server on FiveM. The same pages are served two ways:

- **in game** — `F4` / `/help <page>`, rendered by the `oc-helpui` resource from a bundled
  snapshot of this repo, refreshed from GitHub when the client has internet
- **on the web** — <https://wiki.opencrimev.com>, built from this repo by GitHub Actions

One renderer, one content tree, two shells. Nothing is written twice.

## Editing a page

Every page is a Markdown file under `content/`. To fix or add something:

1. Fork the repo (or use **Edit this page on GitHub** at the bottom of any page — it opens
   the right file).
2. Edit `content/<category>/<page>.md`. Keep the front matter (`title`, `description`,
   `icon`) and stay under ~1 200 words; split rather than scroll.
3. Open a pull request. The check runs `python tools/build.py --check --render`; it fails on
   a missing page, a broken link or anchor, an unknown `{var:…}` / `{key:…}` placeholder, or a
   parser error. Fix what it names and push again.

A maintainer merges, the site rebuilds, and the next `oc-helpui` release (or the live refresh)
takes it in game.

### Adding a page

Create the file, then list it in `wiki.json` under its category — order in the file is order
in the sidebar. A page not in `wiki.json` is not reachable.

### What you can write

CommonMark basics: headings, paragraphs, **bold**, *italic*, `code`, lists, tables, images,
fenced code, and callouts:

```md
> [!TIP] Optional title
> Body.
```

`TIP`, `NOTE`, `WARNING`, `POLICE`. Raw HTML is stripped.

**Placeholders**, resolved when the page is drawn, so the wiki never states a number the
server no longer has:

| Write | Shows |
|---|---|
| `{var:respawn.deathFee}` | the value the server dumped into `docs/wiki_vars.json` — every key in that file is allowed, nothing else |
| `{money:respawn.deathFee}` | the same value drawn as money (`$1,000`) |
| `{key:INPUT_PICKUP}` | the player's own binding in game, the default on the web (`docs/wiki_keys.json`) |
| `{key:open_help}` | a key-mapping command (F4 by default) |
| `{kbd:F4}` | a literal keycap |
| `{discord}` `{website}` `{repo}` | links from `wiki.json` |
| `{{commands:user}}` | the generated command table (`docs/wiki_commands.json`) |

Links between pages: `[text](wiki:jobs/police#ranks)`, or a sibling by name from inside the
same category (`[text](police)`).

The three `docs/wiki_*.json` files are **dumped by the gamemode** (`/wikivars` on the server)
and committed here; do not edit them by hand — a new number in the game means a new dump.

## Preview locally

```sh
python tools/build.py            # validates, writes dist/
python -m http.server 8000       # from the repo root
# open http://localhost:8000/web/
```

`--render` additionally runs every page through `renderer/md.js` under Node.

## Layout

```
wiki.json            the tree: order, titles, icons, site links
content/**/*.md      the pages
assets/              images (webp, ≤ 300 KB each)
renderer/            the shared renderer: md.js, wiki.js, wiki.css, fonts/
web/index.html       the website shell
tools/build.py       validation + dist/ (stdlib only)
docs/wiki_*.json     the gamemode's dumps (vars, keys, commands)
dist/                build output, not committed
```

`renderer/` is copied verbatim into `oc-helpui` by its sync tool; a change here ships to
both hosts.

## License

MIT — see [LICENSE](LICENSE). Game names and marks belong to their owners.
