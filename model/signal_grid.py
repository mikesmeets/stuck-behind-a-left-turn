"""Cycle length x green split, side by side.

The page assumes a 90-second cycle with 60% green. This asks what a
60-second cycle at 50% green does instead -- a shorter cycle, but noticeably
less green time for the mainline, which is the part that matters for a road
diet: one through lane at 1,800 vehicles an hour of saturation flow can only
discharge 1,800 x g/C.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim

LEVELS = [400, 550, 700, 850, 1000]
SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]

# (cycle seconds, green fraction)
PLANS = [(90.0, 0.60), (60.0, 0.60), (60.0, 0.50), (90.0, 0.50)]


def one(a):
    cfg, lv, sd, cyc, gc = a
    return (cyc, gc, cfg, lv), Sim(cfg, lv, sd, cycle_s=cyc,
                                   green_s=gc * cyc).run()


if __name__ == "__main__":
    jobs = [(c, l, s, cy, gc) for (cy, gc) in PLANS
            for c in ("4lane", "3lane") for l in LEVELS for s in SEEDS]
    with Pool(4) as p:
        bag = {}
        for key, r in p.map(one, jobs):
            bag.setdefault(key, []).append(r)

    rows = []
    for (cyc, gc) in PLANS:
        for cfg in ("4lane", "3lane"):
            for lv in LEVELS:
                runs = bag[(cyc, gc, cfg, lv)]
                m = lambda k: sum(r[k] for r in runs) / len(runs)
                rows.append(dict(cycle_s=cyc, g_over_c=gc, config=cfg,
                                 through_vph=lv,
                                 tt=m("travel_time_s"), p95=m("tt_p95"),
                                 spread=m("tt_p95") - m("travel_time_s"),
                                 held=m("pct_held_by_lt"),
                                 weaves=m("weaves_per_100"),
                                 ltwait=m("lt_wait_s"),
                                 entry=m("entry_delay_s"),
                                 served=m("throughput_vph"),
                                 queue=m("unserved")))
    json.dump(rows, open("/home/claude/signal_grid.json", "w"), indent=1)

    g = {(r["cycle_s"], r["g_over_c"], r["config"], r["through_vph"]): r
         for r in rows}
    for (cyc, gc) in PLANS:
        cap = 1800 * gc
        print(f"\n=== {cyc:.0f} s cycle, {gc*100:.0f}% green "
              f"-> {gc*cyc:.0f} s green, one lane can pass {cap:.0f} veh/h ===")
        print(f"{'':7s}{'vol':>5} | {'served':>7}{'queue':>7} | {'tt':>7}"
              f"{'p95':>7}{'spread':>8} | {'held%':>7}{'weave':>7}"
              f"{'ltwait':>8}")
        for cfg in ("4lane", "3lane"):
            for lv in LEVELS:
                r = g[(cyc, gc, cfg, lv)]
                print(f"{cfg:7s}{lv:>5} | {r['served']:7.0f}{r['queue']:7.0f} | "
                      f"{r['tt']:7.2f}{r['p95']:7.1f}{r['spread']:8.2f} | "
                      f"{r['held']:7.2f}{r['weaves']:7.2f}{r['ltwait']:8.1f}")
    print("\ndone")
