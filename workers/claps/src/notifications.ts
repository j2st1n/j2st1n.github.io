const DAY_MS = 24 * 60 * 60 * 1000;
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;

type OutboxRow = {
  id: string;
  subject: string;
  text_body: string;
  attempts: number;
};

export function notificationsEnabled(env: Env): boolean {
  return (
    String(env.NOTIFICATIONS_ENABLED) === "true" &&
    Boolean(
      env.NOTIFICATION_EMAIL && env.NOTIFICATION_FROM && env.NOTIFICATION_TO
    )
  );
}

function chinaDay(time: number): string {
  return new Date(time + CHINA_OFFSET_MS).toISOString().slice(0, 10);
}

export function noteNotificationStatement(
  env: Env,
  note: {
    id: string;
    body: string;
    nickname: string;
    isPublic: boolean;
    createdAt: number;
  }
): D1PreparedStatement {
  const text = [
    "bins.blog 收到一张新纸条，等待审核。",
    `署名：${note.nickname}`,
    `时间：${new Date(note.createdAt + CHINA_OFFSET_MS).toISOString().replace("T", " ").slice(0, 19)}（北京时间）`,
    `公开意愿：${note.isPublic ? "愿意公开，仍需审核" : "仅站长可见"}`,
    "",
    note.body,
    "",
    "审核入口：https://bins.blog/notes/review/",
    "邮件不包含审核令牌，请在审核页面自行输入。",
  ].join("\n");
  return env.NOTES_DB.prepare(
    `INSERT INTO notification_outbox (id, subject, text_body, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(`note:${note.id}`, "[bins.blog] 收到新纸条", text, note.createdAt);
}

export async function recordClapNotification(
  env: Env,
  slug: string,
  count: number,
  now = Date.now()
): Promise<void> {
  if (!notificationsEnabled(env)) return;
  try {
    await env.NOTES_DB.prepare(
      `INSERT INTO clap_notification_counts (day, slug, count) VALUES (?, ?, ?)
       ON CONFLICT (day, slug) DO UPDATE SET count = count + excluded.count`
    )
      .bind(chinaDay(now), slug, count)
      .run();
  } catch {
    // A notification failure must not turn a successful KV write into a retry.
    console.error(
      JSON.stringify({ message: "Clap notification count failed" })
    );
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

export async function deliverNotification(env: Env, id: string): Promise<void> {
  if (!notificationsEnabled(env)) return;
  const now = Date.now();
  const leaseToken = crypto.randomUUID();
  const row = await env.NOTES_DB.prepare(
    `UPDATE notification_outbox
     SET lease_until = ?, lease_token = ?, attempts = attempts + 1
     WHERE id = ? AND sent_at IS NULL AND lease_until <= ? AND next_attempt_at <= ?
     RETURNING id, subject, text_body, attempts`
  )
    .bind(now + LEASE_MS, leaseToken, id, now, now)
    .first<OutboxRow>();
  if (!row) return;

  try {
    await env.NOTIFICATION_EMAIL.send({
      from: { email: env.NOTIFICATION_FROM, name: "bins.blog" },
      to: env.NOTIFICATION_TO,
      subject: row.subject,
      text: row.text_body,
      html: `<div style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(row.text_body)}</div>`,
    });
    await env.NOTES_DB.prepare(
      `UPDATE notification_outbox SET sent_at = ?, lease_until = 0, lease_token = NULL,
       text_body = '' WHERE id = ? AND lease_token = ?`
    )
      .bind(Date.now(), id, leaseToken)
      .run();
  } catch {
    // Provider acceptance followed by a lost D1 acknowledgement can cause a
    // duplicate email on retry. Delivery is at-least-once, not exactly-once.
    const retryMs = Math.min(
      6 * 60 * 60 * 1000,
      60000 * 2 ** Math.min(row.attempts, 9)
    );
    await env.NOTES_DB.prepare(
      `UPDATE notification_outbox SET next_attempt_at = ?, lease_until = 0,
       lease_token = NULL WHERE id = ? AND lease_token = ?`
    )
      .bind(Date.now() + retryMs, id, leaseToken)
      .run();
    console.error(
      JSON.stringify({ message: "Email notification deferred", id })
    );
  }
}

export async function enqueueClapDigests(env: Env, now: number): Promise<void> {
  if (!notificationsEnabled(env)) return;
  // Before 09:00 Beijing, the immediately preceding day is not due yet.
  const cutoff = chinaDay(now - 9 * 60 * 60 * 1000);
  const days = await env.NOTES_DB.prepare(
    `SELECT day, SUM(count) AS total, COUNT(*) AS articles
     FROM clap_notification_counts c
     WHERE day < ? AND NOT EXISTS (
       SELECT 1 FROM notification_outbox n WHERE n.id = 'claps:' || c.day
     ) GROUP BY day ORDER BY day LIMIT 7`
  )
    .bind(cutoff)
    .all<{ day: string; total: number; articles: number }>();
  for (const day of days.results) {
    const top = await env.NOTES_DB.prepare(
      `SELECT slug, count FROM clap_notification_counts
       WHERE day = ? ORDER BY count DESC, slug LIMIT 50`
    )
      .bind(day.day)
      .all<{ slug: string; count: number }>();
    const text = [
      `${day.day}（北京时间）点赞汇总`,
      `新增 ${day.total} 次点赞，涉及 ${day.articles} 篇文章。`,
      "",
      ...top.results.map(
        row => `${row.count} 次 · https://bins.blog/posts/${row.slug}/`
      ),
      ...(day.articles > 50 ? ["仅列出点赞最多的 50 篇文章。"] : []),
      "",
      "以上为点击次数，同一读者可以多次点赞，不代表独立人数。",
    ].join("\n");
    await env.NOTES_DB.prepare(
      `INSERT OR IGNORE INTO notification_outbox (id, subject, text_body, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(
        `claps:${day.day}`,
        `[bins.blog] ${day.day} 点赞汇总（${day.total} 次）`,
        text,
        now
      )
      .run();
  }
}

export async function runNotifications(env: Env, now: number): Promise<void> {
  if (!notificationsEnabled(env)) return;
  await enqueueClapDigests(env, now);
  // Seven catch-up days use at most 16 D1 calls. Ten deliveries use at most
  // 30 more calls (claim, send, acknowledge), staying below Free's 50 cap.
  const pending = await env.NOTES_DB.prepare(
    `SELECT id FROM notification_outbox
     WHERE sent_at IS NULL AND next_attempt_at <= ? AND lease_until <= ?
     ORDER BY created_at, id LIMIT 10`
  )
    .bind(Date.now(), Date.now())
    .all<{ id: string }>();
  for (const row of pending.results) {
    await deliverNotification(env, row.id);
  }
}

export async function cleanupNotifications(env: Env): Promise<void> {
  if (!notificationsEnabled(env)) return;
  await env.NOTES_DB.batch([
    env.NOTES_DB.prepare(
      `DELETE FROM clap_notification_counts WHERE day < ? AND (day < ? OR EXISTS (
        SELECT 1 FROM notification_outbox n
        WHERE n.id = 'claps:' || clap_notification_counts.day AND n.sent_at IS NOT NULL
      ))`
    ).bind(
      chinaDay(Date.now() - 30 * DAY_MS),
      chinaDay(Date.now() - 90 * DAY_MS)
    ),
    env.NOTES_DB.prepare(
      `DELETE FROM notification_outbox WHERE id IN (
        SELECT id FROM notification_outbox
        WHERE sent_at < ? OR (sent_at IS NULL AND created_at < ?) LIMIT 500
      )`
    ).bind(Date.now() - 30 * DAY_MS, Date.now() - 90 * DAY_MS),
  ]);
}
