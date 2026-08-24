/**
 * bins.blog Claps (印章点赞) Edge Worker
 * Runtime: Cloudflare Workers + KV
 */

export interface Env {
  CLAPS_KV: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string) => Promise<void>;
  };
}

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

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : DEFAULT_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(
  data: Record<string, string | number>,
  corsHeaders: HeadersInit,
  status = 200
) {
  return Response.json(data, {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders },
  });
}

function normalizeSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const slug = value.trim();
  return /^[a-z0-9][a-z0-9/-]{0,199}$/.test(slug) ? slug : null;
}

function normalizeIncrement(value: unknown) {
  const count =
    typeof value === "number" ? value : Number.parseInt(`${value}`, 10);
  if (!Number.isFinite(count)) return 1;
  return Math.min(Math.max(1, Math.trunc(count)), 10);
}

async function readClaps(env: Env, slug: string) {
  const value = Number.parseInt(
    (await env.CLAPS_KV.get(`claps:${slug}`)) || "0",
    10
  );
  return Number.isFinite(value) ? value : 0;
}

async function incrementClaps(env: Env, slug: string, count: unknown) {
  const total = (await readClaps(env, slug)) + normalizeIncrement(count);
  await env.CLAPS_KV.put(`claps:${slug}`, String(total));
  return total;
}

async function handleRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  if (url.pathname !== "/api/claps" && url.pathname !== "/") {
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }

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
    const contentLength = Number.parseInt(
      request.headers.get("Content-Length") || "0",
      10
    );
    if (contentLength > 1024) {
      return json({ error: "Payload too large" }, corsHeaders, 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, corsHeaders, 400);
    }
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid JSON payload" }, corsHeaders, 400);
    }

    const payload = body as { slug?: unknown; count?: unknown };
    const slug = normalizeSlug(payload.slug);
    if (!slug) {
      return json({ error: "Missing or invalid slug" }, corsHeaders, 400);
    }
    const claps = await incrementClaps(env, slug, payload.count);
    return json({ slug, claps }, corsHeaders);
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, POST, OPTIONS", ...corsHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);
    try {
      return await handleRequest(request, env, corsHeaders);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Claps request failed",
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return json({ error: "Internal server error" }, corsHeaders, 500);
    }
  },
};
