#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://api.cloudflare.com/client/v4/graphql"
DEFAULT_ENV_FILE = "/home/j2/secrets/cloudflare.env"
DEFAULT_HOST = "bins.blog"
MONITOR_UA_HINTS = ["uptime-kuma", "healthcheck", "statuscake", "better stack", "pingdom"]
SUSPICIOUS_HINTS = [
    ".php", "wp-", "xmlrpc", ".env", ".git", "phpmyadmin", "cgi-bin",
    "boaform", "login", "admin", "shell", "vendor/phpunit", "autodiscover", "/api/",
]
SAFE_PATH_HINTS = ["/robots.txt", "/sitemap", "/cdn-cgi/", "/_astro/", "/favicon", "/rss.xml"]


def load_env_file(path: str) -> dict:
    env = {}
    if not path or not os.path.exists(path):
        return env
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def get_credentials(env_file: str) -> tuple[str, str]:
    env = load_env_file(env_file)
    token = os.environ.get("CF_API_TOKEN") or os.environ.get("CLOUDFLARE_API_TOKEN") or env.get("CF_API_TOKEN") or env.get("CLOUDFLARE_API_TOKEN")
    zone_id = os.environ.get("CF_ZONE_ID") or env.get("CF_ZONE_ID")
    if not token or not zone_id:
        raise SystemExit(
            "Missing Cloudflare credentials. Need CF_API_TOKEN and CF_ZONE_ID "
            f"from env or {env_file}."
        )
    return token, zone_id


def graphql_request(token: str, query: str, variables: dict) -> dict:
    payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"Cloudflare API HTTP {e.code}: {body}")
    except urllib.error.URLError as e:
        raise SystemExit(f"Cloudflare API request failed: {e}")
    if data.get("errors"):
        raise SystemExit("Cloudflare GraphQL error: " + json.dumps(data["errors"], ensure_ascii=False))
    return data["data"]


QUERY = """
query ZoneTraffic($zoneTag: string, $host: string!, $datetimeStart: Time!, $datetimeEnd: Time!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      paths: httpRequestsAdaptiveGroups(limit: 1000, filter: { clientRequestHTTPHost: $host, datetime_geq: $datetimeStart, datetime_lt: $datetimeEnd }) {
        dimensions { clientRequestPath clientRequestHTTPMethodName }
        count
        sum { visits }
      }
      countries: httpRequestsAdaptiveGroups(limit: 1000, filter: { clientRequestHTTPHost: $host, datetime_geq: $datetimeStart, datetime_lt: $datetimeEnd }) {
        dimensions { clientCountryName }
        count
        sum { visits }
      }
      ips: httpRequestsAdaptiveGroups(limit: 1000, filter: { clientRequestHTTPHost: $host, datetime_geq: $datetimeStart, datetime_lt: $datetimeEnd }) {
        dimensions { clientIP }
        count
        sum { visits }
      }
      agents: httpRequestsAdaptiveGroups(limit: 1000, filter: { clientRequestHTTPHost: $host, datetime_geq: $datetimeStart, datetime_lt: $datetimeEnd }) {
        dimensions { userAgent }
        count
        sum { visits }
      }
      status: httpRequestsAdaptiveGroups(limit: 1000, filter: { clientRequestHTTPHost: $host, datetime_geq: $datetimeStart, datetime_lt: $datetimeEnd }) {
        dimensions { edgeResponseStatus }
        count
        sum { visits }
      }
      security: httpRequestsAdaptiveGroups(limit: 1000, filter: { clientRequestHTTPHost: $host, datetime_geq: $datetimeStart, datetime_lt: $datetimeEnd }) {
        dimensions { securityAction }
        count
      }
    }
  }
}
"""


def iso_utc_hours_ago(hours: int) -> str:
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=hours)).replace(microsecond=0).isoformat()


def adaptive_hours(hours: int) -> int:
    return min(max(hours, 1), 23)


def row_requests(row: dict) -> int:
    return row.get("count") or 0


def row_visits(row: dict) -> int:
    return ((row.get("sum") or {}).get("visits") or 0)


def sort_rows(rows: list[dict]) -> list[dict]:
    return sorted(rows, key=lambda r: row_requests(r), reverse=True)


def is_monitor_ua(ua: str) -> bool:
    u = (ua or "").lower()
    return any(h in u for h in MONITOR_UA_HINTS)


def is_suspicious_path(path: str) -> bool:
    p = (path or "").lower()
    return any(h in p for h in SUSPICIOUS_HINTS)


def is_background_path(path: str) -> bool:
    p = (path or "").lower()
    return any(h in p for h in SAFE_PATH_HINTS)


def split_paths(rows: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    suspicious, background, normal = [], [], []
    for row in rows:
        path = ((row.get("dimensions") or {}).get("clientRequestPath") or "")
        if is_suspicious_path(path):
            suspicious.append(row)
        elif is_background_path(path):
            background.append(row)
        else:
            normal.append(row)
    return sort_rows(suspicious), sort_rows(background), sort_rows(normal)


def compact_top(rows: list[dict], dim_key: str, limit: int) -> list[str]:
    out = []
    for row in rows[:limit]:
        label = ((row.get("dimensions") or {}).get(dim_key) or "?")
        out.append(f"{label}:{row_requests(row)}")
    return out


def build_result(host: str, requested_hours: int, effective_hours: int, limit: int, zone: dict, datetime_start: str, datetime_end: str, end_hours_ago: int) -> dict:
    paths = sort_rows(zone.get("paths") or [])
    countries = sort_rows(zone.get("countries") or [])
    ips = sort_rows(zone.get("ips") or [])
    agents = sort_rows(zone.get("agents") or [])
    status = sort_rows(zone.get("status") or [])
    security = sort_rows(zone.get("security") or [])
    suspicious_paths, background_paths, normal_paths = split_paths(paths)

    total_requests = sum(row_requests(r) for r in paths)
    total_visits = sum(row_visits(r) for r in paths)
    monitor_requests = sum(row_requests(r) for r in agents if is_monitor_ua((r.get("dimensions") or {}).get("userAgent", "")))
    suspicious_requests = sum(row_requests(r) for r in suspicious_paths)
    background_requests = sum(row_requests(r) for r in background_paths)
    likely_human_requests = max(total_requests - monitor_requests - suspicious_requests - background_requests, 0)

    return {
        "host": host,
        "requested_hours": requested_hours,
        "effective_hours": effective_hours,
        "end_hours_ago": end_hours_ago,
        "datetime_start_utc": datetime_start,
        "datetime_end_utc": datetime_end,
        "totals": {
            "requests": total_requests,
            "visits": total_visits,
            "monitor_requests": monitor_requests,
            "suspicious_requests": suspicious_requests,
            "background_requests": background_requests,
            "likely_human_requests": likely_human_requests,
        },
        "top_paths": paths[:limit],
        "suspicious_paths": suspicious_paths[:limit],
        "background_paths": background_paths[:limit],
        "top_normal_paths": normal_paths[:limit],
        "top_countries": countries[:limit],
        "top_ips": ips[:limit],
        "top_agents": agents[:limit],
        "status_codes": status[:limit],
        "security_actions": security[:limit],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Query bins.blog traffic from Cloudflare GraphQL")
    parser.add_argument("--hours", type=int, default=24)
    parser.add_argument("--end-hours-ago", type=int, default=0, help="End of window, hours ago from now")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--env-file", default=DEFAULT_ENV_FILE)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--daily", action="store_true")
    args = parser.parse_args()

    token, zone_id = get_credentials(args.env_file)
    effective_hours = adaptive_hours(args.hours)
    end_hours_ago = max(args.end_hours_ago, 0)
    datetime_end = iso_utc_hours_ago(end_hours_ago)
    datetime_start = iso_utc_hours_ago(end_hours_ago + effective_hours)

    data = graphql_request(token, QUERY, {
        "zoneTag": zone_id,
        "host": args.host,
        "datetimeStart": datetime_start,
        "datetimeEnd": datetime_end,
    })
    zones = (((data.get("viewer") or {}).get("zones") or []))
    if not zones:
        raise SystemExit("No zone data returned from Cloudflare.")
    result = build_result(args.host, args.hours, effective_hours, args.limit, zones[0], datetime_start, datetime_end, end_hours_ago)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.daily:
        t = result["totals"]
        print(f"bins.blog 近24h")
        print(f"总请求 {t['requests']} / 访问 {t['visits']}")
        print(f"监控 {t['monitor_requests']} / 扫描 {t['suspicious_requests']} / 背景 {t['background_requests']}")
        print(f"估算真人请求 {t['likely_human_requests']}")
        print("Top路径 " + "，".join(compact_top(result["top_paths"], "clientRequestPath", min(args.limit, 5))))
        print("可疑路径 " + ("，".join(compact_top(result["suspicious_paths"], "clientRequestPath", min(args.limit, 5))) if result["suspicious_paths"] else "无"))
        print("国家 " + "，".join(compact_top(result["top_countries"], "clientCountryName", min(args.limit, 5))))
        print("状态码 " + "，".join(compact_top(result["status_codes"], "edgeResponseStatus", min(args.limit, 5))))
        return

    t = result["totals"]
    print("bins.blog Cloudflare traffic summary")
    print(f"host={args.host} | requested_hours={args.hours} | effective_hours={result['effective_hours']} | start={datetime_start} | end={datetime_end}")
    print(f"totals=requests:{t['requests']} visits:{t['visits']} monitor:{t['monitor_requests']} suspicious:{t['suspicious_requests']} background:{t['background_requests']} likely_human:{t['likely_human_requests']}")

    def print_table(title: str, rows: list[dict], fields: list[tuple[str, str]], limit: int) -> None:
        print(f"\n[{title}]")
        if not rows:
            print("(empty)")
            return
        for idx, row in enumerate(rows[:limit], 1):
            dims = row.get("dimensions") or {}
            sums = row.get("sum") or {}
            parts = []
            for label, key in fields:
                val = row.get("count") if key == "count" else dims.get(key)
                if val is None:
                    val = sums.get(key)
                parts.append(f"{label}={val}")
            print(f"{idx}. " + " | ".join(parts))

    print_table("Top paths", result["top_paths"], [("path", "clientRequestPath"), ("method", "clientRequestHTTPMethodName"), ("requests", "count"), ("visits", "visits")], args.limit)
    print_table("Likely suspicious paths", result["suspicious_paths"], [("path", "clientRequestPath"), ("requests", "count")], args.limit)
    print_table("Background paths", result["background_paths"], [("path", "clientRequestPath"), ("requests", "count")], args.limit)
    print_table("Top normal paths", result["top_normal_paths"], [("path", "clientRequestPath"), ("requests", "count"), ("visits", "visits")], args.limit)
    print_table("Top countries", result["top_countries"], [("country", "clientCountryName"), ("requests", "count"), ("visits", "visits")], args.limit)
    print_table("Top IPs", result["top_ips"], [("ip", "clientIP"), ("requests", "count"), ("visits", "visits")], args.limit)
    print_table("Top user agents", result["top_agents"], [("ua", "userAgent"), ("requests", "count"), ("visits", "visits")], args.limit)
    print_table("Status codes", result["status_codes"], [("status", "edgeResponseStatus"), ("requests", "count"), ("visits", "visits")], args.limit)
    print_table("Security actions", result["security_actions"], [("action", "securityAction"), ("requests", "count")], args.limit)


if __name__ == "__main__":
    main()
