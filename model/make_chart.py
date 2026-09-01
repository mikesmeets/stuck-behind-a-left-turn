"""Static results figure for the write-up."""
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

R = json.load(open("/home/claude/results.json"))
sweep = {(s["config"], s["through_vph"]): s for s in R["sweep"]}
iso = {i["through_vph"]: i for i in R["isolation"]}
V = [400, 550, 700, 850]

S1, S2 = "#2a78d6", "#eb6834"
INK, INK2, INK3, GRID = "#16150f", "#565248", "#8b8579", "#e1ddd1"

panels = [
    ("Travel time", "seconds over the 1,000 ft",
     [sweep[("4lane", v)]["travel_time_s"] for v in V],
     [sweep[("3lane", v)]["travel_time_s"] for v in V], "{:.1f}"),
    ("The unlucky trip", "95th-percentile seconds",
     [sweep[("4lane", v)]["tt_p95"] for v in V],
     [sweep[("3lane", v)]["tt_p95"] for v in V], "{:.0f}"),
    ("Held up by a left turn", "% of through drivers",
     [sweep[("4lane", v)]["pct_held_by_lt"] for v in V],
     [sweep[("3lane", v)]["pct_held_by_lt"] for v in V], "{:.1f}"),
]

fig, axes = plt.subplots(1, 3, figsize=(11.4, 3.9), facecolor="#fbfaf6")
fig.subplots_adjust(left=.05, right=.985, top=.70, bottom=.27, wspace=.28)
x = np.arange(len(V))
w = 0.40

for ax, (title, sub, a, b, fmt) in zip(axes, panels):
    ax.set_facecolor("#fbfaf6")
    ax.bar(x - w/2, a, w, color=S1, zorder=3, label="4 lanes, no turn lane")
    ax.bar(x + w/2, b, w, color=S2, zorder=3, label="3 lanes + centre turn lane")
    top = max(max(a), max(b)) or 1
    for xi, (va, vb) in enumerate(zip(a, b)):
        ax.text(xi - w/2, va + top*.04, fmt.format(va), ha="center", va="bottom",
                fontsize=7.5, color=INK2, fontweight="semibold")
        ax.text(xi + w/2, vb + top*.04, fmt.format(vb), ha="center", va="bottom",
                fontsize=7.5, color=INK2, fontweight="semibold")
    ax.set_ylim(0, top*1.28)
    ax.set_xticks(x, [f"{v:,}" for v in V], fontsize=9, color=INK3)
    ax.set_title(title, fontsize=11, color=INK, fontweight="bold", loc="left", pad=22)
    ax.text(0, 1.035, sub, transform=ax.transAxes, fontsize=8.5, color=INK3)
    ax.set_xlabel("through vehicles per hour, each direction", fontsize=8, color=INK3, labelpad=8)
    ax.grid(axis="y", color=GRID, lw=.8, zorder=0)
    ax.set_axisbelow(True)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color("#c9c4b6")
    ax.tick_params(axis="y", labelsize=8, colors=INK3, length=0)
    ax.tick_params(axis="x", length=0)

h, l = axes[0].get_legend_handles_labels()
fig.legend(h, l, loc="upper right", bbox_to_anchor=(0.985, 0.985), frameon=False,
           fontsize=9.5, ncol=2, labelcolor=INK2, handlelength=1.0, handleheight=1.0,
           columnspacing=1.6)
fig.text(0.048, 0.94,
         "What a centre two-way left-turn lane is worth",
         ha="left", fontsize=13.5, color=INK, fontweight="bold")
fig.text(0.048, 0.90,
         "1,000 ft between two coordinated signals  \u00b7  three unsignalized driveways "
         "each direction  \u00b7  10% turning left  \u00b7  35 mph, 60 s cycle, 60% green",
         ha="left", fontsize=9, color=INK3)
fig.text(0.048, 0.022,
         "Toy microsimulation: IDM car-following, MOBIL lane changing with a 3-second "
         "manoeuvre, HCM critical-gap acceptance, platooned arrivals from a signal at each end "
         "which does not hold traffic on the way out.\n"
         "Twelve independent simulated hours averaged per point. Volumes are through vehicles per "
         "hour in each direction.\n"
         "Illustrative only \u2014 this is not a traffic study and is far less sophisticated "
         "than the models used for corridor decisions.",
         fontsize=7.5, color=INK3, va="bottom", linespacing=1.6)
fig.savefig("/home/claude/road_diet_weaving_results_20260830_2315.png", dpi=200,
            facecolor="#fbfaf6")
print("saved")
