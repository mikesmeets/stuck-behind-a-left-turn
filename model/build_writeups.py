"""Build the public and complex editions of the write-up from one source.

The complex edition is the whole document.  The public edition drops the
sections that answer questions a general reader did not ask -- the turn-share
sensitivity, the green-split analysis, the seed-count robustness check, the
left-turn isolation runs -- keeping the argument, the numbers behind it, the
method and the caveats.
"""
import re

SRC = "/home/claude/road_diet_weaving_writeup_20260830_2315.md"

DROP_FOR_PUBLIC = [
    "How much of it depends on the turning percentage",
    "What the diet needs from the signals",
    "Does the answer depend on which hours you simulate?",
    "A note on isolating the left turns",
]

src = open(SRC).read()
heads = [(m.start(), m.group(1))
         for m in re.finditer(r"^## (.+)$", src, re.M)]


def cut(text, titles):
    for t in titles:
        i = text.index(f"## {t}")
        nxt = re.search(r"^## ", text[i + 3:], re.M)
        j = i + 3 + nxt.start() if nxt else len(text)
        text = text[:i] + text[j:]
    return text


pub = cut(src, DROP_FOR_PUBLIC)
pub = pub.replace(
    "**A toy microsimulation of 1,000 ft of roadway between two signals, "
    "4 lanes vs. 3 lanes**",
    "**A toy microsimulation of 1,000 ft of roadway between two signals, "
    "4 lanes vs. 3 lanes**  \n*Short edition — the fuller version adds the "
    "turn-share sensitivity, the green-split analysis and the robustness "
    "checks.*")

# the public edition's file list should not advertise figures it does not show
pub = "\n".join(
    l for l in pub.split("\n")
    if "full edition only" not in l)

for name, text in (("public", pub), ("complex", src)):
    out = f"/home/claude/road_diet_weaving_writeup_{name}.md"
    open(out, "w").write(text)
    kept = re.findall(r"^## (.+)$", text, re.M)
    print(f"{name:8s} {len(text):6d} bytes  {len(kept)} sections")
    for k in kept:
        print("           -", k)
