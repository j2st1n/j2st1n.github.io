/**
 * bins.blog lightweight engagement Worker.
 *
 * - Article claps stay in Workers KV.
 * - Short, moderated notes live in D1.
 */

type AppEnv = Env;

type NoteStatus = "pending" | "approved" | "rejected" | "hidden";

type PublicNoteRow = {
  id: string;
  body: string;
  nickname: string;
  createdAt: number;
};

type ReviewNoteRow = PublicNoteRow & {
  status: NoteStatus;
  isPublic: 0 | 1;
  reviewedAt: number | null;
  reviewNote: string | null;
};

type RecentSubmissionRow = {
  content_hash: string;
  created_at: number;
};

const ALLOWED_ORIGINS = new Set([
  "https://bins.blog",
  "https://j2st1n.github.io",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
]);
const DEFAULT_ORIGIN = "https://bins.blog";
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};
const PUBLIC_NOTE_LIMIT = 20;
const REVIEW_NOTE_LIMIT = 50;
const MAX_JSON_BYTES = 4096;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : DEFAULT_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(
  data: unknown,
  corsHeaders: HeadersInit,
  status = 200,
  cacheControl = JSON_HEADERS["Cache-Control"]
): Response {
  return Response.json(data, {
    status,
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": cacheControl,
      ...corsHeaders,
    },
  });
}

function isAllowedBrowserOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return /^[a-z0-9][a-z0-9/-]{0,199}$/.test(slug) ? slug : null;
}

function normalizeIncrement(value: unknown): number {
  const count =
    typeof value === "number" ? value : Number.parseInt(`${value}`, 10);
  if (!Number.isFinite(count)) return 1;
  return Math.min(Math.max(1, Math.trunc(count)), 10);
}

function normalizeText(
  value: unknown,
  maxLength: number,
  fallback = ""
): string | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return null;
  const text = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const length = Array.from(text).length;
  return length > 0 && length <= maxLength ? text : null;
}

function normalizeLimit(value: string | null, maximum: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return Math.min(PUBLIC_NOTE_LIMIT, maximum);
  return Math.min(Math.max(parsed, 1), maximum);
}

function normalizeStatus(value: unknown): NoteStatus | null {
  return value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "hidden"
    ? value
    : null;
}

function hasObviousSpam(body: string, honeypot: unknown): boolean {
  if (typeof honeypot === "string" && honeypot.trim()) return true;
  const links = body.match(/https?:\/\//giu)?.length ?? 0;
  return links > 2 || /(.)\1{23,}/u.test(body);
}

async function readBoundedJson(
  request: Request,
  maximumBytes = MAX_JSON_BYTES
): Promise<unknown> {
  const declaredLength = Number.parseInt(
    request.headers.get("Content-Length") || "0",
    10
  );
  if (declaredLength > maximumBytes) {
    throw new RangeError("Payload too large");
  }
  if (!request.body) throw new SyntaxError("Missing JSON payload");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalLength += value.byteLength;
      if (totalLength > maximumBytes) {
        await reader.cancel("Payload too large");
        throw new RangeError("Payload too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function digestHex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function verifySecret(
  provided: string,
  expected: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const subtleWithTiming = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (
      left: ArrayBuffer | ArrayBufferView,
      right: ArrayBuffer | ArrayBufferView
    ) => boolean;
  };
  if (typeof subtleWithTiming.timingSafeEqual === "function") {
    return subtleWithTiming.timingSafeEqual(providedHash, expectedHash);
  }

  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "local-development"
  );
}

function encodeCursor(note: PublicNoteRow): string {
  return `${note.createdAt}:${note.id}`;
}

function decodeCursor(
  value: string | null
): { createdAt: number; id: string } | null {
  if (!value) return null;
  const match = /^(\d{1,16}):([a-f0-9-]{36})$/i.exec(value);
  if (!match) return null;
  const createdAt = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(createdAt) ? { createdAt, id: match[2] } : null;
}

async function readClaps(env: AppEnv, slug: string): Promise<number> {
  const value = Number.parseInt(
    (await env.CLAPS_KV.get(`claps:${slug}`)) || "0",
    10
  );
  return Number.isFinite(value) ? value : 0;
}

async function incrementClaps(
  env: AppEnv,
  slug: string,
  count: unknown
): Promise<number> {
  const total = (await readClaps(env, slug)) + normalizeIncrement(count);
  await env.CLAPS_KV.put(`claps:${slug}`, String(total));
  return total;
}

async function handleClaps(
  request: Request,
  env: AppEnv,
  corsHeaders: Record<string, string>,
  url: URL
): Promise<Response> {
  if (request.method === "GET") {
    const slug = normalizeSlug(url.searchParams.get("slug"));
    if (!slug) {
      return json(
        { error: "Missing or invalid slug parameter" },
        corsHeaders,
        400
      );
    }

    const claps =
      url.searchParams.get("action") === "clap"
        ? await incrementClaps(env, slug, url.searchParams.get("count"))
        : await readClaps(env, slug);
    return json({ slug, claps }, corsHeaders);
  }

  if (request.method === "POST") {
    let body: unknown;
    try {
      body = await readBoundedJson(request, 1024);
    } catch (error) {
      return json(
        {
          error:
            error instanceof RangeError
              ? "Payload too large"
              : "Invalid JSON payload",
        },
        corsHeaders,
        error instanceof RangeError ? 413 : 400
      );
    }
    const payload = getRecord(body);
    const slug = normalizeSlug(payload?.slug);
    if (!slug) {
      return json({ error: "Missing or invalid slug" }, corsHeaders, 400);
    }
    const claps = await incrementClaps(env, slug, payload?.count);
    return json({ slug, claps }, corsHeaders);
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, POST, OPTIONS", ...corsHeaders },
  });
}

async function listPublicNotes(
  env: AppEnv,
  url: URL,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const limit = normalizeLimit(
    url.searchParams.get("limit"),
    PUBLIC_NOTE_LIMIT
  );
  const cursorValue = url.searchParams.get("before");
  const cursor = decodeCursor(cursorValue);
  if (cursorValue && !cursor) {
    return json({ error: "Invalid pagination cursor" }, corsHeaders, 400);
  }

  const filters = ["status = 'approved'", "is_public = 1"];
  const bindings: unknown[] = [];
  if (cursor) {
    filters.push("(created_at < ? OR (created_at = ? AND id < ?))");
    bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  bindings.push(limit);

  const result = await env.NOTES_DB.prepare(
    `SELECT id, body, nickname, created_at AS createdAt
    FROM notes
    WHERE ${filters.join(" AND ")}
    ORDER BY created_at DESC, id DESC
    LIMIT ?`
  )
    .bind(...bindings)
    .all<PublicNoteRow>();
  const nextCursor =
    result.results.length === limit
      ? encodeCursor(result.results[result.results.length - 1])
      : null;

  return json({ notes: result.results, nextCursor }, corsHeaders);
}

async function submitNote(
  request: Request,
  env: AppEnv,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!isAllowedBrowserOrigin(request)) {
    return json({ error: "Origin not allowed" }, corsHeaders, 403);
  }
  if (!env.RATE_LIMIT_SECRET) {
    return json({ error: "Notes service is not configured" }, corsHeaders, 503);
  }

  let value: unknown;
  try {
    value = await readBoundedJson(request);
  } catch (error) {
    return json(
      {
        error:
          error instanceof RangeError
            ? "Payload too large"
            : "Invalid JSON payload",
      },
      corsHeaders,
      error instanceof RangeError ? 413 : 400
    );
  }
  const payload = getRecord(value);
  const body = normalizeText(payload?.body, 120);
  const nickname = normalizeText(payload?.nickname, 24, "路过的人");
  const isPublic = payload?.isPublic === undefined ? true : payload.isPublic;
  if (!payload || !body || !nickname || typeof isPublic !== "boolean") {
    return json({ error: "Invalid note fields" }, corsHeaders, 400);
  }

  if (hasObviousSpam(body, payload.website)) {
    return json({ accepted: true, status: "pending" }, corsHeaders, 202);
  }

  const now = Date.now();
  const dayBucket = new Date(now).toISOString().slice(0, 10);
  const [authorHash, contentHash] = await Promise.all([
    digestHex(
      `${env.RATE_LIMIT_SECRET}\n${dayBucket}\n${getClientIp(request)}`
    ),
    digestHex(body.toLocaleLowerCase("zh-CN")),
  ]);
  const recent = await env.NOTES_DB.prepare(
    `SELECT content_hash, created_at
    FROM notes
    WHERE author_hash = ? AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 10`
  )
    .bind(authorHash, now - ONE_DAY_MS)
    .all<RecentSubmissionRow>();

  if (recent.results.some(note => note.content_hash === contentHash)) {
    return json(
      { accepted: true, status: "pending", duplicate: true },
      corsHeaders,
      202
    );
  }
  const submissionsInTenMinutes = recent.results.filter(
    note => note.created_at >= now - TEN_MINUTES_MS
  ).length;
  if (submissionsInTenMinutes >= 3 || recent.results.length >= 10) {
    return json(
      { error: "Rate limit exceeded", retryAfter: 600 },
      { ...corsHeaders, "Retry-After": "600" },
      429
    );
  }

  const id = crypto.randomUUID();
  await env.NOTES_DB.prepare(
    `INSERT INTO notes (
      id, body, nickname, status,
      author_hash, content_hash, created_at, is_public
    ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`
  )
    .bind(id, body, nickname, authorHash, contentHash, now, isPublic ? 1 : 0)
    .run();

  return json(
    { accepted: true, id, status: "pending", isPublic },
    corsHeaders,
    202
  );
}

async function verifyAdmin(
  request: Request,
  env: AppEnv,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  if (!env.ADMIN_TOKEN) {
    return json({ error: "Admin review is not configured" }, corsHeaders, 503);
  }
  const authorization = request.headers.get("Authorization") || "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!provided || !(await verifySecret(provided, env.ADMIN_TOKEN))) {
    return json({ error: "Unauthorized" }, corsHeaders, 401);
  }
  return null;
}

async function listReviewNotes(
  env: AppEnv,
  url: URL,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const status = normalizeStatus(url.searchParams.get("status") || "pending");
  if (!status) return json({ error: "Invalid status" }, corsHeaders, 400);
  const limit = normalizeLimit(
    url.searchParams.get("limit"),
    REVIEW_NOTE_LIMIT
  );
  const result = await env.NOTES_DB.prepare(
    `SELECT id, body, nickname, status,
      is_public AS isPublic,
      created_at AS createdAt,
      reviewed_at AS reviewedAt,
      review_note AS reviewNote
    FROM notes
    WHERE status = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?`
  )
    .bind(status, limit)
    .all<ReviewNoteRow>();
  return json({ notes: result.results }, corsHeaders);
}

async function updateReviewNote(
  request: Request,
  env: AppEnv,
  id: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    return json({ error: "Invalid note id" }, corsHeaders, 400);
  }
  let value: unknown;
  try {
    value = await readBoundedJson(request);
  } catch (error) {
    return json(
      {
        error:
          error instanceof RangeError
            ? "Payload too large"
            : "Invalid JSON payload",
      },
      corsHeaders,
      error instanceof RangeError ? 413 : 400
    );
  }
  const payload = getRecord(value);
  const status = normalizeStatus(payload?.status);
  const reviewNote = normalizeText(payload?.reviewNote, 120, "");
  if (!status || status === "pending" || reviewNote === null) {
    return json({ error: "Invalid review decision" }, corsHeaders, 400);
  }

  const result = await env.NOTES_DB.prepare(
    `UPDATE notes
    SET status = ?, reviewed_at = ?, review_note = ?
    WHERE id = ?`
  )
    .bind(status, Date.now(), reviewNote || null, id)
    .run();
  if (result.meta.changes === 0) {
    return json({ error: "Note not found" }, corsHeaders, 404);
  }
  return json({ id, status }, corsHeaders);
}

async function handleRequest(
  request: Request,
  env: AppEnv,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return isAllowedBrowserOrigin(request)
      ? new Response(null, { status: 204, headers: corsHeaders })
      : json({ error: "Origin not allowed" }, corsHeaders, 403);
  }

  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/api/claps") {
    return handleClaps(request, env, corsHeaders, url);
  }
  if (url.pathname === "/api/notes") {
    if (request.method === "GET") {
      return listPublicNotes(env, url, corsHeaders);
    }
    if (request.method === "POST") {
      return submitNote(request, env, corsHeaders);
    }
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, POST, OPTIONS", ...corsHeaders },
    });
  }
  if (
    url.pathname === "/api/admin/notes" ||
    url.pathname.startsWith("/api/admin/notes/")
  ) {
    const authError = await verifyAdmin(request, env, corsHeaders);
    if (authError) return authError;
    if (request.method === "GET" && url.pathname === "/api/admin/notes") {
      return listReviewNotes(env, url, corsHeaders);
    }
    if (request.method === "PATCH") {
      const id = url.pathname.slice("/api/admin/notes/".length);
      return updateReviewNote(request, env, id, corsHeaders);
    }
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, PATCH, OPTIONS", ...corsHeaders },
    });
  }
  return new Response("Not Found", { status: 404, headers: corsHeaders });
}

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);
    try {
      return await handleRequest(request, env, corsHeaders);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Engagement request failed",
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return json({ error: "Internal server error" }, corsHeaders, 500);
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: AppEnv
  ): Promise<void> {
    try {
      const result = await env.NOTES_DB.prepare(
        `DELETE FROM notes
        WHERE id IN (
          SELECT id FROM notes
          WHERE
            (status IN ('rejected', 'hidden') AND created_at < ?)
            OR (status = 'pending' AND created_at < ?)
          ORDER BY created_at ASC
          LIMIT 500
        )`
      )
        .bind(Date.now() - 30 * ONE_DAY_MS, Date.now() - 90 * ONE_DAY_MS)
        .run();
      if (result.meta.changes > 0) {
        console.warn(
          JSON.stringify({
            message: "Expired notes removed",
            count: result.meta.changes,
          })
        );
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Notes cleanup failed",
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  },
} satisfies ExportedHandler<AppEnv>;
