# OpenCrimeV Wiki

The player manual for [OpenCrimeV](https://www.opencrimev.com), a cops & robbers freeroam
server on FiveM. This repo is **the content only** — Markdown pages, the page tree and a
few images. Two readers draw it:

- **on the web** — <https://wiki.opencrimev.com> reads this repo from GitHub on every visit
- **in game** — `F4` / `/help <page>`, the `oc-helpui` resource reads the same files when
  the player opens the wiki

There is no build and nothing to deploy: merge a change here and both show it within a few
minutes. Nothing is written twice.

## Editing a page

Every page is a Markdown file under `content/`. To fix or add something:

1. Fork the repo (or use **Edit this page on GitHub** at the bottom of any page — it opens
   the right file).
2. Edit `content/<category>/<page>.md`. Keep the front matter (`title`, `description`,
   `icon`) and stay under ~1 200 words; split rather than scroll.
3. Open a pull request. The check runs `python tools/check.py`; it fails on a missing page,
   a broken link or anchor, or an unknown `{var:…}` / `{key:…}` placeholder. Fix what it
   names and push again.

A maintainer merges, and that is it.

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
same category (`[text](police)`). Images: `![alt](assets/name.webp)`, webp, ≤ 300 KB.

The three `docs/wiki_*.json` files are **dumped by the gamemode** (`/wikivars` on the server)
and committed here; do not edit them by hand — a new number in the game means a new dump.

## Check locally

```sh
python tools/check.py
```

Stdlib only. To *see* a page you need the website shell, which is a separate (private)
repo; maintainers run it against a checkout of this one.

## Layout

```
wiki.json            the tree: order, titles, icons, site links
content/**/*.md      the pages
assets/              images (webp, ≤ 300 KB each)
docs/wiki_*.json     the gamemode's dumps (vars, keys, commands)
tools/check.py       the pull-request check
```

## License

MIT — see [LICENSE](LICENSE). Game names and marks belong to their owners.
