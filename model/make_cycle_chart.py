"""What a 60-second cycle buys, at the same 60% green split."""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

G = {(r["cycle_s"], r["g_over_c"], r["config"], r["through_vph"]): r
     for r in json.load(open("/home/claude/signal_grid.json"))}
V = [400, 550, 700, 850]

S1, S2 = "#2a78d6", "#eb6834"
INK, INK2, INK3, GRID = "#16150f", "#565248", "#8b8579", "#e1ddd1"
BG = "#fbfaf6"

def get(cy, cfg, key):
    return [G[(cy, 0.60, cfg, v)][key] for v in V]

panels = [
    ("The unlucky trip", "95th-percentile seconds over 1,000 ft", "p95", "{:.0f}"),
    ("Held up behind a left turn", "% of through drivers", "held", "{:.1f}"),
    ("Waiting to turn left", "seconds, average", "ltwait", "{:.1f}"),
]

fig, axes = plt.subplots(1, 3, figsize=(11.8, 3.75), facecolor=BG)
fig.subplots_adjust(left=.055, right=.985, top=.615, bottom=.155, wspace=.30)
x = np.arange(len(V))
w = 0.20

for ax, (title, sub, key, fmt) in zip(axes, panels):
    ax.set_facecolor(BG)
    series = [
        ("4 lanes, 90 s", get(90.0, "4lane", key), S1, 1.0, ""),
        ("4 lanes, 60 s", get(60.0, "4lane", key), S1, 0.42, "//"),
        ("3 lanes, 90 s", get(90.0, "3lane", key), S2, 1.0, ""),
        ("3 lanes, 60 s", get(60.0, "3lane", key), S2, 0.42, "//"),
    ]
    top = max(max(s[1]) for s in series) or 1
    for i, (lab, vals, col, alpha, hatch) in enumerate(series):
        off = (i - 1.5) * w
        ax.bar(x + off, vals, w * 0.92, color=col, alpha=alpha, zorder=3,
               hatch=hatch, edgecolor=col, linewidth=0,
               label=lab if ax is axes[0] else None)
        for xi, v in enumerate(vals):
            ax.text(xi + off, v + top * .035, fmt.format(v), ha="center",
                    va="bottom", fontsize=6.4, color=INK2)
    ax.set_title(title, fontsize=11.5, color=INK, fontweight="bold",
                 loc="left", pad=15)
    ax.text(0, 1.045, sub, transform=ax.transAxes, fontsize=8.6, color=INK3)
    ax.set_xticks(x); ax.set_xticklabels([f"{v:,}" for v in V], fontsize=8.6,
                                         color=INK2)
    ax.set_ylim(0, top * 1.30)
    ax.grid(axis="y", color=GRID, linewidth=.8, zorder=0)
    ax.set_axisbelow(True)
    for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(axis="y", labelsize=7.6, colors=INK3, length=0)
    ax.tick_params(axis="x", length=0)

fig.text(.055, .945, "A 60-second cycle at the same 60% green",
         fontsize=15.5, color=INK, fontweight="bold")
fig.text(.055, .875,
         "Shorter reds mean shorter platoons and smaller queues. The green "
         "share is unchanged, so capacity is unchanged — this is a "
         "reliability gain, not a capacity one.",
         fontsize=9.2, color=INK2)
h, l = axes[0].get_legend_handles_labels()
fig.legend(h, l, loc="upper right", bbox_to_anchor=(.985, .995), fontsize=8.4,
           frameon=False, ncol=2, handlelength=1.2, columnspacing=1.2,
           labelspacing=.35)
fig.text(.5, .028, "THROUGH VEHICLES PER HOUR, EACH DIRECTION", ha="center",
         fontsize=8, color=INK3)
fig.savefig("/home/claude/cycle_length_60s.png", dpi=190, facecolor=BG)
print("written")
