import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

test("font chunks preserve the frozen partition and match their fingerprints", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("src/generated/kami-fonts.json", root), "utf8")
  );
  const partition = JSON.parse(
    await readFile(new URL("scripts/fonts/kami-groups.json", root), "utf8")
  );
  const styles = await readFile(
    new URL("src/styles/kami-fonts.css", root),
    "utf8"
  );
  assert.equal(manifest.chunks.length, partition.groups.length);
  const points = partition.groups.flatMap(g => Array.from(g.characters));
  assert.equal(new Set(points).size, manifest.codepoints);
  assert.equal(points.length, manifest.codepoints);
  for (const chunk of manifest.chunks) {
    const bytes = await readFile(new URL(`public${chunk.url}`, root));
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
    assert.equal(bytes.length, chunk.bytes);
    assert.ok(
      chunk.url.includes(
        createHash("sha256").update(bytes).digest("hex").slice(0, 12)
      )
    );
    const declared = new Set(
      chunk.unicodeRange.split(",").flatMap(range => {
        const [start, end = start] = range.trim().slice(2).split("-");
        const first = Number.parseInt(start, 16);
        const last = Number.parseInt(end, 16);
        return Array.from({ length: last - first + 1 }, (_, i) => first + i);
      })
    );
    const group = partition.groups.find(group => group.id === chunk.id);
    assert.deepEqual(
      declared,
      new Set(Array.from(group.characters, char => char.codePointAt(0)))
    );
    const face = [...styles.matchAll(/@font-face\s*\{([^}]+)\}/g)]
      .map(match => match[1])
      .find(
        face =>
          face.includes('font-family: "TsangerJinKai02";') &&
          face.includes(chunk.url)
      );
    assert.ok(face);
    assert.equal(
      face.match(/unicode-range:\s*([^;]+);/)[1].replace(/\s/g, ""),
      chunk.unicodeRange.replace(/\s/g, "")
    );
  }
  const original = await readFile(new URL("public/fonts/kami-cn.woff2", root));
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    manifest.sourceSha256
  );
  const base = manifest.chunks.find(chunk => chunk.id === "base");
  assert.ok(base.bytes < manifest.sourceBytes / 5);
});

test("quote card loads its text and fixed labels before canvas rendering", async () => {
  const source = await readFile(
    new URL("public/scripts/quote-share.js", root),
    "utf8"
  );
  const helper = source.match(
    /async function waitForCardFont\(quoteText\) \{[\s\S]*?\n    \}/
  )?.[0];
  assert.ok(helper);
  const calls = [];
  const context = vm.createContext({
    postTitle: "繁體字與生僻字",
    document: {
      fonts: {
        load(font, text) {
          calls.push({ font, text });
          return Promise.resolve([]);
        },
      },
    },
    window: { setTimeout: () => 0 },
  });
  await vm.runInContext(`${helper}; waitForCardFont("节选正文")`, context);
  assert.equal(calls.length, 1);
  for (const text of [
    "节选正文",
    "繁體字與生僻字",
    "摘自",
    "摸鱼时刻",
    "偶有所得",
    "❝",
  ]) {
    assert.ok(calls[0].text.includes(text));
  }
  assert.match(source, /await waitForCardFont\(quoteText\)/);
});
