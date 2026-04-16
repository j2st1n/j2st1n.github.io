#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

BASE = Path("/home/j2/sites/blog/j2st1n.github.io/scripts/bins_blog_traffic.py")
HOSTS = [
    ("bins.blog", "🧱 主站"),
    ("xiuxian.bins.blog", "🗡️ 修仙站"),
]


def fetch(host: str, hours: int, end_hours_ago: int = 0) -> dict:
    cmd = [
        "python3", str(BASE), "--hours", str(hours), "--end-hours-ago", str(end_hours_ago),
        "--limit", "5", "--host", host, "--json"
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(proc.stdout)


def delta_arrow(cur: int, prev: int) -> str:
    if cur > prev:
        return "↗️"
    if cur < prev:
        return "↘️"
    return "➡️"


def delta_text(cur: int, prev: int) -> str:
    arrow = delta_arrow(cur, prev)
    diff = cur - prev
    sign = "+" if diff > 0 else ""
    return f"{arrow}{sign}{diff}"


def compact_paths(rows: list[dict]) -> str:
    if not rows:
        return "无"
    parts = []
    for row in rows[:3]:
        path = ((row.get("dimensions") or {}).get("clientRequestPath") or "?")
        count = row.get("count") or 0
        if len(path) > 34:
            path = path[:31] + "..."
        parts.append(f"{path}:{count}")
    return "，".join(parts)


def compact_countries(rows: list[dict]) -> str:
    if not rows:
        return "无"
    return "，".join(f"{((r.get('dimensions') or {}).get('clientCountryName') or '?')}:{r.get('count') or 0}" for r in rows[:3])


def render_block(label: str, cur: dict, prev: dict) -> str:
    ct = cur.get("totals") or {}
    pt = prev.get("totals") or {}
    req = ct.get("requests", 0)
    visits = ct.get("visits", 0)
    human = ct.get("likely_human_requests", 0)
    monitor = ct.get("monitor_requests", 0)
    suspicious = ct.get("suspicious_requests", 0)
    background = ct.get("background_requests", 0)

    if req >= 1000:
        mood = "🔥"
    elif req >= 300:
        mood = "🌤️"
    else:
        mood = "🌙"

    lines = [
        f"{label} {mood}",
        f"- 总请求 {req} {delta_text(req, pt.get('requests', 0))} / 访问 {visits} {delta_text(visits, pt.get('visits', 0))}",
        f"- 估算真人 {human} {delta_text(human, pt.get('likely_human_requests', 0))}",
        f"- 监控 {monitor} / 扫描 {suspicious} / 背景 {background}",
        f"- Top路径 {compact_paths(cur.get('top_paths') or [])}",
        f"- 可疑 {compact_paths(cur.get('suspicious_paths') or [])}",
        f"- 国家 {compact_countries(cur.get('top_countries') or [])}",
    ]
    return "\n".join(lines)


def main() -> None:
    current = []
    total_req = total_human = total_suspicious = 0
    prev_req = prev_human = 0

    for host, label in HOSTS:
        cur = fetch(host, 23, 0)
        prev = fetch(host, 23, 23)
        current.append((label, cur, prev))
        ct = cur.get("totals") or {}
        pt = prev.get("totals") or {}
        total_req += ct.get("requests", 0)
        total_human += ct.get("likely_human_requests", 0)
        total_suspicious += ct.get("suspicious_requests", 0)
        prev_req += pt.get("requests", 0)
        prev_human += pt.get("likely_human_requests", 0)

    out = [
        "📮 bins 系站近24h日报",
        f"- 全站总请求 {total_req} {delta_text(total_req, prev_req)}",
        f"- 估算真人请求 {total_human} {delta_text(total_human, prev_human)}",
        f"- 可疑扫描请求 {total_suspicious}",
        "",
    ]

    for i, (label, cur, prev) in enumerate(current):
        if i:
            out.append("")
        out.append(render_block(label, cur, prev))

    print("\n".join(out))


if __name__ == "__main__":
    main()
