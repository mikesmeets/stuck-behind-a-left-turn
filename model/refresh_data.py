"""Rewrite the RES / SHARE data blocks and the stat tiles in the template
from the current results.json and turnshare.json, so the page can never
drift away from the numbers the model actually produced."""
import json
import re

R = json.load(open("/home/claude/results.json"))
T = json.load(open("/home/claude/turnshare.json"))
tpl = open("/home/claude/explainer_template.html").read()

VOLS = [400, 550, 700, 850]
CFGS = ("4lane", "3lane")
row = {(r["config"], r["through_vph"]): r for r in R["sweep"]}

def series(key, nd):
    return {c: [round(row[(c, v)][key], nd) for v in VOLS] for c in CFGS}

res = {
    "vols": VOLS,
    "tt": series("travel_time_s", 2),
    "p95": series("tt_p95", 2),
    "held": series("pct_held_by_lt", 2),
    "weaves": series("weaves_per_100", 2),
    "ltwait": series("lt_wait_s", 1),
    "served": series("throughput_vph", 0),
    "spread": {c: [round(row[(c, v)]["tt_p95"] - row[(c, v)]["travel_time_s"], 2)
                   for v in VOLS] for c in CFGS},
    "demand": [round(row[("4lane", v)]["demand_vph"]) for v in VOLS],
    "gc": [[g["config"], g["g_over_c"], round(g["throughput_vph"]),
            round(g["travel_time_s"], 1), round(g["tt_p95"], 1),
            round(g["upstream_queue"])] for g in R["green_sensitivity"]],
}

share = {}
for r in T:
    k = f"{r['config']}_{int(r['share']*100)}_{r['through_vph']}"
    share[k] = {"tt": round(r["tt"], 2), "p95": round(r["p95"], 1),
                "spread": round(r["spread"], 2), "held": round(r["held"], 2),
                "weaves": round(r["weaves"], 2),
                "ltwait": round(r["ltwait"], 1),
                "served": round(r["served"])}


def swap(text, name, obj):
    start = text.index(f"const {name} = {{")
    end = text.index("\n};\n", start) + len("\n};\n")
    return (text[:start] + f"const {name} = "
            + json.dumps(obj, indent=1) + ";\n" + text[end:])


tpl = swap(tpl, "RES", res)
tpl = swap(tpl, "SHARE", share)

# ---- stat tiles, at the headline volume ------------------------------------
V = 700
a, b = row[("4lane", V)], row[("3lane", V)]
tiles = [
    ("Through vehicles served per hour",
     f"{a['throughput_vph']:.0f}", f"{b['throughput_vph']:.0f}",
     "Identical. At this signal timing the road diet costs no capacity at "
     "all \\u2014 the same traffic gets through."),
    ("Travel time over the 1,000 ft",
     f"{a['travel_time_s']:.1f} s", f"{b['travel_time_s']:.1f} s",
     f"{a['travel_time_s'] - b['travel_time_s']:.1f} s to the road diet "
     "\\u2014 close enough that the average driver cannot tell the two roads "
     "apart."),
    ("The unlucky trip \\u2014 95th percentile",
     f"{a['tt_p95']:.1f} s", f"{b['tt_p95']:.1f} s",
     f"{a['tt_p95'] - b['tt_p95']:.0f} seconds. This is where the two roads "
     "actually part company, and it is the whole story."),
    ("Through drivers held up behind a left-turning vehicle",
     f"{a['pct_held_by_lt']:.1f}%", f"{b['pct_held_by_lt']:.0f}%",
     f"About one driver in {round(100 / a['pct_held_by_lt'])}, on this block "
     f"alone \\u2014 roughly {a['pct_held_by_lt'] / 100 * V:.0f} an hour."),
]
block = "const TILES = [\n" + ",\n".join(
    f'  {{ lab:"{l}",\n    from:"{f}", to:"{t}",\n    note:"{n}" }}'
    for l, f, t, n in tiles) + "\n];\n"
start = tpl.index("const TILES = [")
end = tpl.index("\n];\n", start) + len("\n];\n")
tpl = tpl[:start] + block + tpl[end:]

open("/home/claude/explainer_template.html", "w").write(tpl)
print("tiles:", [(t[1], t[2]) for t in tiles])
print("res 700:", res["tt"]["4lane"][2], res["tt"]["3lane"][2],
      res["p95"]["4lane"][2], res["p95"]["3lane"][2])
print("share keys:", len(share))
