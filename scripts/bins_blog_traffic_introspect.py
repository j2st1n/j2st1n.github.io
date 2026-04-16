#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

API_URL = "https://api.cloudflare.com/client/v4/graphql"
DEFAULT_ENV_FILE = "/home/j2/secrets/cloudflare.env"
DEFAULT_HOST = "bins.blog"


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
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
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


INTROSPECT_QUERY = """
query IntrospectAdaptiveGroupFields {
  __type(name: "ZoneHttpRequestsAdaptiveGroups") {
    name
    fields {
      name
      type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
  __type2: __type(name: "ZoneHttpRequestsAdaptiveGroupsSum") {
    name
    fields {
      name
      type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
  __type3: __type(name: "ZoneHttpRequestsAdaptiveGroupsDimensions") {
    name
    fields {
      name
      type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
}
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect Cloudflare GraphQL types for bins.blog traffic script development")
    parser.add_argument("--env-file", default=DEFAULT_ENV_FILE)
    args = parser.parse_args()
    token, _zone_id = get_credentials(args.env_file)
    data = graphql_request(token, INTROSPECT_QUERY, {})
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
