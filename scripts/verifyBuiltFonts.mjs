import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addUnicodeRanges, uncoveredHan } from "./fonts/coverage.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const manifest = JSON.parse(
  await readFile(path.join(root, "src/generated/kami-fonts.json"), "utf8")
);
const base = manifest.chunks.find(chunk => chunk.id === "base");
const quoteSource = await readFile(
  path.join(root, "public/scripts/quote-share.js")
);
assert.ok(base);
const covered = new Set();
for (const chunk of manifest.chunks) {
  addUnicodeRanges(covered, chunk.unicodeRange);
  const data = await readFile(path.join(dist, chunk.url));
  assert.equal(data.length, chunk.bytes);
  assert.ok(
    chunk.url.includes(
      createHash("sha256").update(data).digest("hex").slice(0, 12)
    )
  );
}

const extraCss = await readFile(
  path.join(root, "src/styles/kami-extra.css"),
  "utf8"
);
const [, extraUrl, extraHash] = extraCss.match(
  /url\("(\/fonts\/kami-extra-([a-f0-9]{12})\.woff2)"\)/
);
const extraData = await readFile(path.join(dist, extraUrl));
assert.equal(
  createHash("sha256").update(extraData).digest("hex").slice(0, 12),
  extraHash
);
const supplemental = new Set();
addUnicodeRanges(supplemental, extraCss.match(/unicode-range:\s*([^;]+);/)[1]);
for (const point of supplemental) {
  assert.ok(
    !covered.has(point),
    "Supplement overlaps the original font chunks"
  );
  covered.add(point);
}

let pages = 0;
const missing = new Set();
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (file.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => m[0]);
      assert.ok(
        links.every(link => !link.includes(extraUrl)),
        `Supplement must load only when used: ${file}`
      );
      assert.ok(
        links.some(
          link =>
            link.includes(`href="${base.url}"`) &&
            link.includes('rel="preload"') &&
            link.includes('as="font"') &&
            link.includes('crossorigin="anonymous"')
        ),
        `Missing base font preload: ${file}`
      );
      if (html.includes('id="quote-share-root"')) {
        const script = html.match(/src="([^"]*quote-share\.[^"/]+\.js)"/);
        assert.ok(script, `Missing fingerprinted quote script: ${file}`);
        assert.deepEqual(
          await readFile(path.join(dist, script[1])),
          quoteSource,
          `Stale quote script: ${file}`
        );
      }
      for (const point of uncoveredHan(html, covered)) missing.add(point);
      pages++;
    }
  }
}
await inspect(dist);
assert.ok(pages > 0);
process.stdout.write(
  `Font build check passed: ${pages} pages, ${manifest.chunks.length} original chunks and one on-demand supplement\n`
);
if (missing.size) {
  const codes = Array.from(missing).sort((a, b) => a - b);
  const hex = codes.map(point => point.toString(16).toUpperCase());
  const labels = codes.map(
    (point, index) => `${String.fromCodePoint(point)} (U+${hex[index]})`
  );
  process.stdout.write(
    `字体覆盖提醒，以下汉字将尝试使用备用字体：${labels.join("、")}\n`
  );
  process.stdout.write(`KAMI_FONT_FALLBACK ${hex.join(",")}\n`);
}
