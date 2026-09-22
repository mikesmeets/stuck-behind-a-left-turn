"""Stamp every page's /site/ style and script links, and the replay data URL,
with one new version, so browsers fetch fresh copies after a deploy instead of
mixing cached old files with new pages.  Run before publishing any change to
site/.

    python model/bump_assets.py        (from the repo root)
"""
import glob
import os
import re
import time

ROOT = os.path.join(os.path.dirname(__file__), "..")
V = time.strftime("%Y%m%d%H%M")

link = re.compile(r'((?:src|href)="/site/[^"?]+\.(?:css|js))(?:\?v=[\w]+)?"')
n = 0
for path in glob.glob(os.path.join(ROOT, "*.html")):
    s = open(path, encoding="utf-8").read()
    t = link.sub(lambda m: f'{m.group(1)}?v={V}"', s)
    if t != s:
        open(path, "w", encoding="utf-8", newline="\n").write(t)
        n += 1
js = os.path.join(ROOT, "site", "sim-steps.js")
s = open(js, encoding="utf-8").read()
open(js, "w", encoding="utf-8", newline="\n").write(
    re.sub(r'(/site/data/sim-steps\.json)\?v=\w+', rf'\1?v={V}', s))
print(f"version {V}: {n} pages updated, replay data URL stamped")
