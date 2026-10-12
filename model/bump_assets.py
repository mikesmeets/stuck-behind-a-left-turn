"""Stamp every page's /site/ style and script links, and the replay data URL,
with a version taken from each file's own contents, so browsers fetch fresh
copies after a deploy instead of mixing cached old files with new pages.  Run
before publishing any change to site/.

    python model/bump_assets.py        (from the repo root)

The version is a hash of the asset, not a timestamp, so a page is only rewritten
when something it actually loads has changed.  That matters because the three
generated simulation pages are several megabytes each: a timestamp restamped
them on every publish, and git stored a fresh copy of each one every time.
"""
import glob
import hashlib
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

_seen = {}


def ver(site_path):
    """Ten hex characters of the asset's own content."""
    if site_path not in _seen:
        full = os.path.join(ROOT, site_path.lstrip("/").replace("/", os.sep))
        with open(full, "rb") as f:
            _seen[site_path] = hashlib.sha256(f.read()).hexdigest()[:10]
    return _seen[site_path]


# The replay data URL lives inside sim-steps.js, so stamp it before hashing the
# scripts -- otherwise sim-steps.js changes after the pages have been written.
js = os.path.join(ROOT, "site", "sim-steps.js")
s = open(js, encoding="utf-8").read()
t = re.sub(r'(/site/data/sim-steps\.json)\?v=\w+', rf'\1?v={ver("/site/data/sim-steps.json")}', s)
if t != s:
    open(js, "w", encoding="utf-8", newline="\n").write(t)

link = re.compile(r'((?:src|href)="(/site/[^"?]+\.(?:css|js)))(?:\?v=[\w]+)?"')
changed, pages = 0, 0
for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
    s = open(path, encoding="utf-8").read()
    t = link.sub(lambda m: f'{m.group(1)}?v={ver(m.group(2))}"', s)
    pages += 1
    if t != s:
        open(path, "w", encoding="utf-8", newline="\n").write(t)
        changed += 1

print(f"{changed} of {pages} pages restamped "
      f"({', '.join(f'{k.rsplit('/', 1)[-1]} {v}' for k, v in sorted(_seen.items()))})")
