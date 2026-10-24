import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import worker from "../workers/claps/src/index.ts";
import {
  cleanupNotifications,
  deliverNotification,
  enqueueClapDigests,
  recordClapNotification,
  runNotifications,
} from "../workers/claps/src/notifications.ts";

async function fixture(t) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  for (const name of [
    "0001_create_notes.sql",
    "0002_add_note_visibility.sql",
    "0003_email_notifications.sql",
  ]) {
    db.exec(
      await readFile(
        new URL(`../workers/claps/migrations/${name}`, import.meta.url),
        "utf8"
      )
    );
  }
  const prepared = (sql, bindings = []) => ({
    bind: (...values) => prepared(sql, values),
    first: async () => db.prepare(sql).get(...bindings) ?? null,
    all: async () => ({
      success: true,
      results: db.prepare(sql).all(...bindings),
      meta: {},
    }),
    run: async () => ({
      success: true,
      results: [],
      meta: { changes: Number(db.prepare(sql).run(...bindings).changes) },
    }),
  });
  const sent = [];
  const waits = [];
  const kv = new Map();
  const env = {
    NOTES_DB: {
      prepare: prepared,
      batch: async statements => {
        db.exec("BEGIN");
        try {
          const result = [];
          for (const statement of statements)
            result.push(await statement.run());
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
    CLAPS_KV: {
      get: async key => kv.get(key) ?? null,
      put: async (key, value) => kv.set(key, value),
    },
    NOTIFICATIONS_ENABLED: "true",
    NOTIFICATION_FROM: "notifications@example.com",
    NOTIFICATION_TO: "owner@example.com",
    NOTIFICATION_EMAIL: {
      send: async message => {
        sent.push(message);
        return { messageId: "test" };
      },
    },
    ADMIN_TOKEN: "test-admin",
    RATE_LIMIT_SECRET: "test-rate-secret",
  };
  return {
    db,
    env,
    sent,
    kv,
    ctx: { waitUntil: promise => waits.push(promise) },
    flush: () => Promise.all(waits),
  };
}

function noteRequest(body, extra = {}) {
  return new Request("https://claps.bins.blog/api/notes", {
    method: "POST",
    headers: {
      Origin: "https://bins.blog",
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.8",
    },
    body: JSON.stringify({
      body,
      nickname: "<读者>",
      isPublic: false,
      ...extra,
    }),
  });
}

test("new private note sends only to the configured owner, with escaped HTML and no credentials", async t => {
  const f = await fixture(t);
  const response = await worker.fetch(
    noteRequest('<script>alert("hi")</script>'),
    f.env,
    f.ctx
  );
  assert.equal(response.status, 202);
  await f.flush();
  assert.equal(f.sent.length, 1);
  const mail = f.sent[0];
  assert.equal(mail.to, "owner@example.com");
  assert.match(mail.text, /仅站长可见/);
  assert.match(mail.text, /https:\/\/bins.blog\/notes\/review\//);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.doesNotMatch(mail.text, /test-admin|test-rate-secret|203\.0\.113\.8/);
  const row = f.db
    .prepare("SELECT sent_at, text_body FROM notification_outbox")
    .get();
  assert.ok(row.sent_at);
  assert.equal(row.text_body, "");
  const publicNotes = await worker.fetch(
    new Request("https://claps.bins.blog/api/notes"),
    f.env
  );
  assert.deepEqual((await publicNotes.json()).notes, []);
});

test("duplicate, spam, rejected origin and invalid notes do not create additional notifications", async t => {
  const f = await fixture(t);
  await worker.fetch(noteRequest("一张正常的纸条"), f.env, f.ctx);
  const duplicate = await worker.fetch(
    noteRequest("一张正常的纸条"),
    f.env,
    f.ctx
  );
  assert.equal((await duplicate.json()).duplicate, true);
  await worker.fetch(noteRequest("蜜罐测试", { website: "bot" }), f.env, f.ctx);
  const invalid = await worker.fetch(noteRequest(""), f.env, f.ctx);
  assert.equal(invalid.status, 400);
  const foreign = noteRequest("外部来源");
  foreign.headers.set("Origin", "https://example.org");
  assert.equal((await worker.fetch(foreign, f.env, f.ctx)).status, 403);
  await f.flush();
  assert.equal(f.sent.length, 1);
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM notification_outbox").get().n,
    1
  );
});

test("email failure keeps an accepted note and retries durably without concurrent duplicate sends", async t => {
  const f = await fixture(t);
  f.env.NOTIFICATION_EMAIL.send = async () => {
    throw new Error("offline");
  };
  assert.equal(
    (await worker.fetch(noteRequest("邮件暂时不可用"), f.env, f.ctx)).status,
    202
  );
  await f.flush();
  const row = f.db.prepare("SELECT * FROM notification_outbox").get();
  assert.equal(row.sent_at, null);
  assert.ok(row.next_attempt_at > Date.now());
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM notes").get().n, 1);
  f.env.NOTIFICATION_EMAIL.send = async mail => {
    f.sent.push(mail);
    return { messageId: "retry" };
  };
  f.db.prepare("UPDATE notification_outbox SET next_attempt_at = 0").run();
  await Promise.all([
    deliverNotification(f.env, row.id),
    deliverNotification(f.env, row.id),
  ]);
  await runNotifications(f.env, Date.now());
  assert.equal(f.sent.length, 1);
  assert.ok(
    f.db.prepare("SELECT sent_at FROM notification_outbox").get().sent_at
  );
});

test("note and outbox insertion roll back together if durable enqueue fails", async t => {
  const f = await fixture(t);
  f.db.exec(
    "CREATE TRIGGER fail_enqueue BEFORE INSERT ON notification_outbox BEGIN SELECT RAISE(ABORT, 'test failure'); END"
  );
  const response = await worker.fetch(
    noteRequest("入库事务测试"),
    f.env,
    f.ctx
  );
  assert.equal(response.status, 500);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM notes").get().n, 0);
  assert.equal(f.sent.length, 0);
});

test("daily clap digest respects Beijing midnight, 09:00 delivery, no-activity silence and replay deduplication", async t => {
  const f = await fixture(t);
  await recordClapNotification(
    f.env,
    "yesterday",
    3,
    Date.parse("2026-10-23T15:59:59Z")
  );
  await recordClapNotification(
    f.env,
    "yesterday",
    2,
    Date.parse("2026-10-23T15:59:59Z")
  );
  await recordClapNotification(
    f.env,
    "today",
    1,
    Date.parse("2026-10-23T16:00:00Z")
  );
  await enqueueClapDigests(f.env, Date.parse("2026-10-24T00:59:59Z"));
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM notification_outbox").get().n,
    0
  );
  await runNotifications(f.env, Date.parse("2026-10-24T01:00:00Z"));
  assert.equal(f.sent.length, 1);
  assert.match(f.sent[0].subject, /2026-10-23.*5 次/);
  assert.match(f.sent[0].text, /涉及 1 篇/);
  assert.match(f.sent[0].text, /https:\/\/bins.blog\/posts\/yesterday\//);
  assert.doesNotMatch(f.sent[0].text, /\/posts\/today\//);
  await runNotifications(f.env, Date.parse("2026-10-24T01:10:00Z"));
  assert.equal(f.sent.length, 1);
  await runNotifications(f.env, Date.parse("2026-10-25T01:00:00Z"));
  assert.equal(f.sent.length, 2);
  await runNotifications(f.env, Date.parse("2026-10-26T01:00:00Z"));
  assert.equal(f.sent.length, 2);
});

test("both clap protocols record clamped increments; reads never notify; counting failure preserves KV success", async t => {
  const f = await fixture(t);
  await worker.fetch(
    new Request("https://claps.bins.blog/api/claps?slug=hello-world"),
    f.env
  );
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM clap_notification_counts").get().n,
    0
  );
  await worker.fetch(
    new Request(
      "https://claps.bins.blog/api/claps?slug=hello-world&action=clap&count=99"
    ),
    f.env
  );
  await worker.fetch(
    new Request("https://claps.bins.blog/api/claps", {
      method: "POST",
      body: JSON.stringify({ slug: "hello-world", count: 2 }),
    }),
    f.env
  );
  assert.equal(
    f.db.prepare("SELECT count FROM clap_notification_counts").get().count,
    12
  );
  assert.equal(f.kv.get("claps:hello-world"), "12");
  assert.equal(f.sent.length, 0);
  f.db.exec("DROP TABLE clap_notification_counts");
  const response = await worker.fetch(
    new Request(
      "https://claps.bins.blog/api/claps?slug=hello-world&action=clap"
    ),
    f.env
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).claps, 13);
});

test("expired notification leases are reclaimed and a digest backlog is caught up", async t => {
  const f = await fixture(t);
  await recordClapNotification(
    f.env,
    "old-post",
    4,
    Date.parse("2026-10-20T04:00:00Z")
  );
  await enqueueClapDigests(f.env, Date.parse("2026-10-24T01:00:00Z"));
  f.db
    .prepare(
      "UPDATE notification_outbox SET lease_until = ?, lease_token = 'crashed-worker'"
    )
    .run(Date.now() - 1);
  await runNotifications(f.env, Date.parse("2026-10-24T01:00:00Z"));
  assert.equal(f.sent.length, 1);
  assert.match(f.sent[0].subject, /2026-10-20.*4 次/);
});

test("disabled notifications preserve legacy behavior without requiring migrated tables", async t => {
  const f = await fixture(t);
  f.env.NOTIFICATIONS_ENABLED = "false";
  f.db.exec(
    "DROP TABLE notification_outbox; DROP TABLE clap_notification_counts"
  );
  assert.equal(
    (await worker.fetch(noteRequest("未启用通知"), f.env, f.ctx)).status,
    202
  );
  assert.equal(
    (
      await worker.fetch(
        new Request(
          "https://claps.bins.blog/api/claps?slug=hello-world&action=clap"
        ),
        f.env
      )
    ).status,
    200
  );
  await runNotifications(f.env, Date.now());
  await f.flush();
  assert.equal(f.sent.length, 0);
});

test("retention removes delivered historical counters without deleting recent pending mail", async t => {
  const f = await fixture(t);
  const old = Date.now() - 40 * 24 * 60 * 60 * 1000;
  const day = new Date(old).toISOString().slice(0, 10);
  f.db
    .prepare("INSERT INTO clap_notification_counts VALUES (?, 'old-post', 1)")
    .run(day);
  f.db
    .prepare(
      "INSERT INTO notification_outbox (id, subject, text_body, created_at, sent_at) VALUES (?, 'old', '', ?, ?)"
    )
    .run(`claps:${day}`, old, old);
  await worker.fetch(noteRequest("保留尚未发送的纸条"), f.env);
  await cleanupNotifications(f.env);
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM clap_notification_counts").get().n,
    0
  );
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM notification_outbox").get().n,
    1
  );
  assert.equal(
    f.db.prepare("SELECT sent_at FROM notification_outbox").get().sent_at,
    null
  );
});

test("expired undelivered mail and clap counters expire together after 90 days", async t => {
  const f = await fixture(t);
  const old = Date.now() - 92 * 24 * 60 * 60 * 1000;
  const day = new Date(old).toISOString().slice(0, 10);
  f.db
    .prepare(
      "INSERT INTO clap_notification_counts VALUES (?, 'expired-post', 1)"
    )
    .run(day);
  f.db
    .prepare(
      "INSERT INTO notification_outbox (id, subject, text_body, created_at) VALUES (?, 'expired', 'private', ?)"
    )
    .run(`claps:${day}`, old);
  await cleanupNotifications(f.env);
  await enqueueClapDigests(f.env, Date.now());
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM clap_notification_counts").get().n,
    0
  );
  assert.equal(
    f.db.prepare("SELECT COUNT(*) AS n FROM notification_outbox").get().n,
    0
  );
});

test("a mail backlog drains across bounded batches without resending completed records", async t => {
  const f = await fixture(t);
  for (let i = 0; i < 11; i++) {
    f.db
      .prepare(
        "INSERT INTO notification_outbox (id,subject,text_body,created_at) VALUES (?, 'test', 'synthetic', ?)"
      )
      .run(`bounded:${i}`, Date.now());
  }
  await runNotifications(f.env, Date.now());
  assert.equal(f.sent.length, 10);
  assert.equal(
    f.db
      .prepare(
        "SELECT COUNT(*) AS n FROM notification_outbox WHERE sent_at IS NULL"
      )
      .get().n,
    1
  );
  await runNotifications(f.env, Date.now());
  assert.equal(f.sent.length, 11);
  assert.equal(
    f.db
      .prepare(
        "SELECT COUNT(*) AS n FROM notification_outbox WHERE sent_at IS NULL"
      )
      .get().n,
    0
  );
});
