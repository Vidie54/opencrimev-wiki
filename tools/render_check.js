// Used by build.py --render: reads { id: markdown } on stdin, renders every
// page through renderer/md.js and reports parser exceptions and heading ids
// that disagree with the ones build.py computed (the search index and deep
// links depend on the two agreeing).
const path = require("path");
const MD = require(path.join(__dirname, "..", "renderer", "md.js"));

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const pages = JSON.parse(input || "{}");
  const errors = {}, headings = {};
  for (const [id, md] of Object.entries(pages)) {
    try {
      const r = MD.render(md, { resolveLink: (h, k) => ({ href: h, kind: k }) });
      if (!r.html && md.trim()) errors[id] = "rendered to nothing";
      headings[id] = r.headings.map((h) => h.id);
    } catch (e) {
      errors[id] = String(e && e.stack || e);
    }
  }
  process.stdout.write(JSON.stringify({ errors, headingIds: headings }));
});
