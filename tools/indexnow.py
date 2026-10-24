#!/usr/bin/env python3
"""
Tell search engines a page is new or changed, through IndexNow
(https://www.indexnow.org). One request reaches Bing, Yandex, Seznam,
Naver, and the others that share IndexNow submissions; Bing's index also
feeds DuckDuckGo and the search behind several AI assistants. Google
doesn't take IndexNow: for Google, the sitemap in Search Console is the
way in.

    python3 tools/indexnow.py                     every URL in sitemap.xml
    python3 tools/indexnow.py URL_OR_PATH ...     just these, e.g.
                                                  blog/new-post.html
    python3 tools/indexnow.py --dry-run ...       print, send nothing

The key proving this site is ours is the <32 hex characters>.txt file at
the repository root, served at the site root. Never rename or delete it
without making a new one. Run this after the change is live (Cloudflare
deploys main within a minute or two), since the engines fetch the page
soon after. Only public URLs on this site are ever sent.

SAME FILE in avclock-website and not-yet-privacy -- change both.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENDPOINT = "https://api.indexnow.org/indexnow"


def site_urls():
    text = (ROOT / "sitemap.xml").read_text()
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", text)


def find_key():
    keys = [p.stem for p in ROOT.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}", p.stem)
            and p.read_text().strip() == p.stem]
    if len(keys) != 1:
        sys.exit(f"Expected one IndexNow key file at the repository root, found {len(keys)}.")
    return keys[0]


def to_url(arg, base):
    if arg.startswith("https://"):
        return arg
    path = arg.lstrip("/")
    if path.endswith("index.html"):
        path = path[: -len("index.html")]
    elif path.endswith(".html"):
        path = path[: -len(".html")]
    return base + "/" + path


def main(argv):
    dry = "--dry-run" in argv
    args = [a for a in argv if a != "--dry-run"]
    known = site_urls()
    base = re.match(r"https://[^/]+", known[0]).group(0)
    host = base[len("https://"):]
    urls = [to_url(a, base) for a in args] if args else known
    for u in urls:
        if not u.startswith(base + "/") and u != base:
            sys.exit(f"Not a URL on {host}: {u}")
        if u not in known:
            print(f"Warning: not in sitemap.xml: {u}")
    key = find_key()
    body = {"host": host, "key": key, "keyLocation": f"{base}/{key}.txt", "urlList": urls}
    if dry:
        print(json.dumps(body, indent=2))
        return
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"IndexNow: {r.status} for {len(urls)} URL(s) on {host}.")
    except urllib.error.HTTPError as e:
        # 200 and 202 are success. 403 means the key file isn't live yet
        # (or doesn't match), 422 a URL that isn't on this host.
        sys.exit(f"IndexNow: {e.code} {e.reason}. {e.read().decode(errors='ignore')[:300]}")


if __name__ == "__main__":
    main(sys.argv[1:])
