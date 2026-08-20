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

const ALLOWED_ORIGINS = [
  "https://bins.blog",
  "https://j2st1n.github.io",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
];

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://bins.blog";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    // 处理 OPTIONS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 路由：/api/claps 或 /
    if (url.pathname === "/api/claps" || url.pathname === "/") {
      // 1. GET: 读取点赞数
      if (request.method === "GET") {
        const slug = url.searchParams.get("slug");
        if (!slug) {
          return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const rawCount = await env.CLAPS_KV.get(`claps:${slug}`);
        const count = rawCount ? parseInt(rawCount, 10) : 0;

        return new Response(JSON.stringify({ slug, claps: count }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=10, s-maxage=30",
            ...corsHeaders,
          },
        });
      }

      // 2. POST: 增量盖印
      if (request.method === "POST") {
        try {
          const body = (await request.json()) as { slug?: string; count?: number };
          const slug = body.slug?.trim();
          const count = typeof body.count === "number" ? body.count : 1;

          if (!slug) {
            return new Response(JSON.stringify({ error: "Missing slug" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          // 防刷安全上限：单次提交最多加 10 印
          const safeIncrement = Math.min(Math.max(1, count), 10);

          const rawCount = await env.CLAPS_KV.get(`claps:${slug}`);
          const prevTotal = rawCount ? parseInt(rawCount, 10) : 0;
          const newTotal = prevTotal + safeIncrement;

          await env.CLAPS_KV.put(`claps:${slug}`, String(newTotal));

          return new Response(JSON.stringify({ slug, claps: newTotal }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
