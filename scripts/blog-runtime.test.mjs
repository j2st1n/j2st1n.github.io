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

function createD1(initial = []) {
  const notes = initial.map(note => ({ ...note }));

  function statement(sql) {
    let bindings = [];
    return {
      bind: (...values) => {
        bindings = values;
        return statementWithBindings(sql, bindings);
      },
      all: async () => ({ success: true, results: [], meta: {} }),
      run: async () => ({
        success: true,
        results: [],
        meta: { changes: 0 },
      }),
    };
  }

  function statementWithBindings(sql, bindings) {
    return {
      bind: (...values) => statementWithBindings(sql, values),
      all: async () => {
        if (sql.includes("SELECT content_hash")) {
          const [authorHash, since] = bindings;
          return {
            success: true,
            results: notes
              .filter(
                note =>
                  note.author_hash === authorHash && note.created_at >= since
              )
              .sort((a, b) => b.created_at - a.created_at)
              .slice(0, 10)
              .map(note => ({
                content_hash: note.content_hash,
                created_at: note.created_at,
              })),
            meta: {},
          };
        }

        if (sql.includes("reviewed_at AS reviewedAt")) {
          const [status, limit] = bindings;
          return {
            success: true,
            results: notes
              .filter(note => note.status === status)
              .sort((a, b) => b.created_at - a.created_at)
              .slice(0, limit)
              .map(note => ({
                id: note.id,
                body: note.body,
                nickname: note.nickname,
                status: note.status,
                isPublic: note.is_public,
                createdAt: note.created_at,
                reviewedAt: note.reviewed_at ?? null,
                reviewNote: note.review_note ?? null,
              })),
            meta: {},
          };
        }

        if (sql.includes("FROM notes") && sql.includes("status = 'approved'")) {
          const limit = bindings.at(-1);
          return {
            success: true,
            results: notes
              .filter(
                note => note.status === "approved" && note.is_public === 1
              )
              .sort((a, b) => b.created_at - a.created_at)
              .slice(0, limit)
              .map(note => ({
                id: note.id,
                body: note.body,
                nickname: note.nickname,
                createdAt: note.created_at,
              })),
            meta: {},
          };
        }

        return { success: true, results: [], meta: {} };
      },
      run: async () => {
        if (sql.includes("INSERT INTO notes")) {
          const [
            id,
            body,
            nickname,
            authorHash,
            contentHash,
            createdAt,
            isPublic,
          ] = bindings;
          notes.push({
            id,
            body,
            nickname,
            status: "pending",
            author_hash: authorHash,
            content_hash: contentHash,
            created_at: createdAt,
            is_public: isPublic,
          });
          return {
            success: true,
            results: [],
            meta: { changes: 1 },
          };
        }

        if (sql.includes("UPDATE notes")) {
          const [status, reviewedAt, reviewNote, id] = bindings;
          const note = notes.find(item => item.id === id);
          if (note) {
            note.status = status;
            note.reviewed_at = reviewedAt;
            note.review_note = reviewNote;
          }
          return {
            success: true,
            results: [],
            meta: { changes: note ? 1 : 0 },
          };
        }

        return {
          success: true,
          results: [],
          meta: { changes: 0 },
        };
      },
    };
  }

  return {
    notes,
    database: {
      prepare: sql => statement(sql),
    },
  };
}

function createEngagementEnv() {
  const { env, values } = createKv();
  const { database, notes } = createD1();
  return {
    values,
    notes,
    env: {
      ...env,
      NOTES_DB: database,
      ADMIN_TOKEN: "test-admin-token",
      RATE_LIMIT_SECRET: "test-rate-limit-secret",
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
    ["theme", "article", "claps", "quote-share", "notes"].map(name =>
      readFile(new URL(`public/scripts/${name}.js`, projectRoot), "utf8")
    )
  );
  const [theme, article, claps, quoteShare, notes] = files;

  assert.match(theme, /__binsThemeInstalled/);
  assert.match(article, /__binsArticleInstalled/);
  assert.match(article, /observer\?\.disconnect\(\)/);
  assert.match(claps, /__binsClapsInstalled/);
  assert.match(quoteShare, /__binsQuoteShareState/);
  assert.match(notes, /__binsNotesInstalled/);
  assert.match(notes, /activeControllers\.clear\(\)/);
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

test("code typography resolves CJK before the generated monospace fallback", async () => {
  const styles = await readFile(
    new URL("src/styles/global.css", projectRoot),
    "utf8"
  );

  assert.match(
    styles,
    /font-family: "TsangerJinKai02 Code CJK";[\s\S]*?unicode-range:[\s\S]*?U\+4E00-9FFF/
  );
  assert.match(
    styles,
    /--font-code:\s*"TsangerJinKai02 Code CJK", var\(--font-google-sans-code\)/
  );
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

test("notes stay private until an authenticated review approves them", async () => {
  const { env, notes } = createEngagementEnv();
  const origin = "https://bins.blog";
  const submitResponse = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/notes", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.10",
      },
      body: JSON.stringify({
        body: "这篇文章让我想起了一件小事。",
        nickname: "一位读者",
        isPublic: true,
        website: "",
      }),
    }),
    env
  );
  assert.equal(submitResponse.status, 202);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].status, "pending");
  assert.equal(notes[0].is_public, 1);
  assert.equal("ip" in notes[0], false);
  assert.match(notes[0].author_hash, /^[a-f0-9]{64}$/);

  const privateList = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/notes", {
      headers: { Origin: origin },
    }),
    env
  );
  assert.deepEqual((await privateList.json()).notes, []);

  const unauthorized = await clapsWorker.fetch(
    new Request(`https://claps.bins.blog/api/admin/notes/${notes[0].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    }),
    env
  );
  assert.equal(unauthorized.status, 401);

  const approveResponse = await clapsWorker.fetch(
    new Request(`https://claps.bins.blog/api/admin/notes/${notes[0].id}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer test-admin-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "approved" }),
    }),
    env
  );
  assert.equal(approveResponse.status, 200);

  const publicList = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/notes", {
      headers: { Origin: origin },
    }),
    env
  );
  const publicPayload = await publicList.json();
  assert.equal(publicPayload.notes.length, 1);
  assert.equal(publicPayload.notes[0].body, "这篇文章让我想起了一件小事。");
  assert.equal(publicPayload.notes[0].author_hash, undefined);
});

test("private notes remain visible only to the reviewer after approval", async () => {
  const { env, notes } = createEngagementEnv();
  const submitResponse = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/notes", {
      method: "POST",
      headers: {
        Origin: "https://bins.blog",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.11",
      },
      body: JSON.stringify({
        body: "这张纸条只给主人看。",
        isPublic: false,
      }),
    }),
    env
  );
  assert.equal(submitResponse.status, 202);
  assert.equal(notes[0].is_public, 0);

  const reviewList = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/admin/notes?status=pending", {
      headers: { Authorization: "Bearer test-admin-token" },
    }),
    env
  );
  const reviewPayload = await reviewList.json();
  assert.equal(reviewPayload.notes[0].isPublic, 0);

  const approveResponse = await clapsWorker.fetch(
    new Request(`https://claps.bins.blog/api/admin/notes/${notes[0].id}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer test-admin-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "approved" }),
    }),
    env
  );
  assert.equal(approveResponse.status, 200);

  const publicList = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/notes"),
    env
  );
  assert.deepEqual((await publicList.json()).notes, []);
});

test("notes apply silent spam dropping and indexed per-visitor rate limits", async () => {
  const { env, notes } = createEngagementEnv();

  const submit = body =>
    clapsWorker.fetch(
      new Request("https://claps.bins.blog/api/notes", {
        method: "POST",
        headers: {
          Origin: "https://bins.blog",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "203.0.113.20",
        },
        body: JSON.stringify({
          body,
        }),
      }),
      env
    );

  for (const body of ["第一张", "第二张", "第三张"]) {
    assert.equal((await submit(body)).status, 202);
  }
  assert.equal((await submit("第四张")).status, 429);
  assert.equal(notes.length, 3);

  const spam = await clapsWorker.fetch(
    new Request("https://claps.bins.blog/api/notes", {
      method: "POST",
      headers: {
        Origin: "https://bins.blog",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.21",
      },
      body: JSON.stringify({
        body: "看起来正常",
        website: "https://spam.example",
      }),
    }),
    env
  );
  assert.equal(spam.status, 202);
  assert.equal(notes.length, 3);
});
