import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
for (const chunk of manifest.chunks) {
  const data = await readFile(path.join(dist, chunk.url));
  assert.equal(data.length, chunk.bytes);
  assert.ok(
    chunk.url.includes(
      createHash("sha256").update(data).digest("hex").slice(0, 12)
    )
  );
}

let pages = 0;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (file.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => m[0]);
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
      pages++;
    }
  }
}
await inspect(dist);
assert.ok(pages > 0);
process.stdout.write(
  `Font build check passed: ${pages} pages, ${manifest.chunks.length} chunks\n`
);
