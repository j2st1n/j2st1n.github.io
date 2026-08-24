import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  formatDay,
  formatFullDate,
  formatMonth,
  formatYear,
} from "../src/utils/date.ts";
import clapsWorker from "../workers/claps/src/index.ts";
import { slugifyStr } from "../src/utils/slugify.ts";

const projectRoot = new URL("../", import.meta.url);

function createKv(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    env: {
      CLAPS_KV: {
        get: async key => values.get(key) ?? null,
        put: async (key, value) => values.set(key, value),
      },
    },
  };
}

test("date formatting honors the configured IANA timezone", () => {
  const date = new Date("2026-03-14T18:00:00.000Z");
  assert.equal(formatFullDate(date, "Asia/Shanghai"), "2026.03.15");
  assert.equal(formatYear(date, "Asia/Shanghai"), "2026");
  assert.equal(formatMonth(date, "Asia/Shanghai"), "3月");
  assert.equal(formatDay(date, "Asia/Shanghai"), "15日");
  assert.equal(formatFullDate(date, "America/New_York"), "2026.03.14");
});

test("slug formatting preserves current Latin and Chinese routes", () => {
  assert.equal(slugifyStr("Linux.do"), "linux.do");
  assert.equal(slugifyStr("TypeScript 5.0"), "typescript-5.0");
  assert.equal(slugifyStr("微信公众号"), "微信公众号");
  assert.equal(slugifyStr("南渡北归"), "南渡北归");
});

test("article client features are external, cached, and lifecycle-safe", async () => {
  const files = await Promise.all(
    ["theme", "article", "claps", "quote-share"].map(name =>
      readFile(new URL(`public/scripts/${name}.js`, projectRoot), "utf8")
    )
  );
  const [theme, article, claps, quoteShare] = files;

  assert.match(theme, /__binsThemeInstalled/);
  assert.match(article, /__binsArticleInstalled/);
  assert.match(article, /observer\?\.disconnect\(\)/);
  assert.match(claps, /__binsClapsInstalled/);
  assert.match(quoteShare, /__binsQuoteShareState/);
  for (const source of files) {
    assert.match(source, /astro:page-load/);
  }
});

test("favicon URLs carry the matching content fingerprint", async () => {
  const layout = await readFile(
    new URL("src/layouts/Layout.astro", projectRoot),
    "utf8"
  );
  const matches = [
    ...layout.matchAll(/href="\/(favicon(?:-dark)?-([a-f0-9]{8})\.svg)"/g),
  ];

  assert.equal(matches.length, 2);
  for (const [, filename, fingerprint] of matches) {
    const contents = await readFile(new URL(`public/${filename}`, projectRoot));
    const hash = createHash("sha256").update(contents).digest("hex");
    assert.equal(hash.slice(0, 8), fingerprint);
  }
});

test("claps worker reads and clamps increments through both protocols", async () => {
  const { env, values } = createKv({ "claps:hello-world": "4" });
  const origin = { Origin: "https://bins.blog" };

  const readResponse = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/claps?slug=hello-world", {
      headers: origin,
    }),
    env
  );
  assert.deepEqual(await readResponse.json(), {
    slug: "hello-world",
    claps: 4,
  });
  assert.equal(
    readResponse.headers.get("Access-Control-Allow-Origin"),
    origin.Origin
  );

  const getResponse = await clapsWorker.fetch(
    new Request(
      "https://claps.bins.blog/api/claps?slug=hello-world&action=clap&count=99",
      { headers: origin }
    ),
    env
  );
  assert.deepEqual(await getResponse.json(), {
    slug: "hello-world",
    claps: 14,
  });

  const postResponse = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/claps", {
      method: "POST",
      headers: { ...origin, "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "hello-world", count: 2 }),
    }),
    env
  );
  assert.deepEqual(await postResponse.json(), {
    slug: "hello-world",
    claps: 16,
  });
  assert.equal(values.get("claps:hello-world"), "16");
});

test("claps worker rejects invalid slugs and oversized payloads", async () => {
  const { env } = createKv();
  const invalidSlug = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/claps?slug=../../secret"),
    env
  );
  assert.equal(invalidSlug.status, 400);

  const oversized = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/claps", {
      method: "POST",
      headers: { "Content-Length": "1025" },
      body: "{}",
    }),
    env
  );
  assert.equal(oversized.status, 413);
});
