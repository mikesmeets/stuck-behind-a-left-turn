"""Sensitivity of the result to the left-turn share."""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

D = json.load(open("/home/claude/turnshare.json"))
get = lambda sh, lv, cfg, k: next(
    r[k] for r in D if r["share"] == sh and r["through_vph"] == lv
    and r["config"] == cfg)

SHARES = [0.05, 0.10, 0.15]
LEVELS = [550, 700, 850]
S1, S2 = "#2a78d6", "#eb6834"
INK, INK2, INK3, GRID = "#16150f", "#565248", "#8b8579", "#e1ddd1"

fig, axes = plt.subplots(1, 3, figsize=(11.4, 3.9), facecolor="#fbfaf6")
fig.subplots_adjust(left=.055, right=.985, top=.70, bottom=.235, wspace=.28)
x = np.arange(len(SHARES))
w = 0.34
top = max(get(s, l, "4lane", "spread") for s in SHARES for l in LEVELS) * 1.24

for ax, lv in zip(axes, LEVELS):
    a = [get(s, lv, "4lane", "spread") for s in SHARES]
    b = [get(s, lv, "3lane", "spread") for s in SHARES]
    ax.set_facecolor("#fbfaf6")
    ax.bar(x - w/2, a, w, color=S1, zorder=3, label="4 lanes, no turn lane")
    ax.bar(x + w/2, b, w, color=S2, zorder=3, label="3 lanes + centre turn lane")
    for xi, (va, vb) in enumerate(zip(a, b)):
        ax.text(xi - w/2, va + top*.025, f"+{va:.1f}", ha="center", va="bottom",
                fontsize=8, color=INK2, fontweight="semibold")
        ax.text(xi + w/2, vb + top*.025, f"+{vb:.1f}", ha="center", va="bottom",
                fontsize=8, color=INK2, fontweight="semibold")
    ax.set_ylim(0, top)
    ax.set_xticks(x, [f"{int(s*100)}%" for s in SHARES], fontsize=9, color=INK3)
    ax.set_title(f"{lv:,} through veh/h", fontsize=11, color=INK,
                 fontweight="bold", loc="left", pad=22)
    ax.text(0, 1.035, "seconds", transform=ax.transAxes, fontsize=8.5,
            color=INK3)
    ax.set_xlabel("share of traffic turning left", fontsize=8, color=INK3,
                  labelpad=8)
    ax.grid(axis="y", color=GRID, lw=.8, zorder=0)
    ax.set_axisbelow(True)
    for sp in ("top", "right", "left"):
        ax.spines[sp].set_visible(False)
    ax.spines["bottom"].set_color("#c9c4b6")
    ax.tick_params(axis="y", labelsize=8, colors=INK3, length=0)
    ax.tick_params(axis="x", length=0)

h, l = axes[0].get_legend_handles_labels()
fig.legend(h, l, loc="upper right", bbox_to_anchor=(0.985, 0.985), frameon=False,
           fontsize=9.5, ncol=2, labelcolor=INK2, handlelength=1.0,
           handleheight=1.0, columnspacing=1.6)
fig.text(0.055, 0.94, "How much the unlucky driver loses", ha="left",
         fontsize=13.5, color=INK, fontweight="bold")
fig.text(0.055, 0.90,
         "Gap between the 95th-percentile trip and the average trip, by how "
         "much of the traffic turns left  ·  1,000 ft, 35 mph, 60% green",
         ha="left", fontsize=9, color=INK3)
fig.text(0.055, 0.028,
         "The three-lane road barely notices the turn share: its spread stays "
         "under 2.5 s everywhere, and tightens as the street fills. The "
         "four-lane road's spread grows with both.\n"
         "Eight independent simulated hours averaged per point. Through volume "
         "is held constant; turners are additional traffic. Illustrative only "
         "\u2014 not a traffic study.",
         fontsize=7.5, color=INK3, va="bottom", linespacing=1.6)
fig.savefig("/home/claude/turn_share_sensitivity.png", dpi=200,
            facecolor="#fbfaf6")
print("saved")
