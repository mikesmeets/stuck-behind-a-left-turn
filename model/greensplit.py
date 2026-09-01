"""What changes if the arterial gets 60% of the cycle instead of 65%?

Runs the whole volume sweep at both splits, twelve seeds each, and reports
them side by side.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim, CYCLE

LEVELS = [400, 550, 700, 850]
SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]
SPLITS = [0.60, 0.65]


def one(a):
    cfg, lv, sd, gc = a
    return (cfg, lv, gc), Sim(cfg, lv, sd, green_s=gc * CYCLE).run()


if __name__ == "__main__":
    jobs = [(c, l, s, g) for g in SPLITS for c in ("4lane", "3lane")
            for l in LEVELS for s in SEEDS]
    with Pool(4) as p:
        bag = {}
        for key, r in p.map(one, jobs):
            bag.setdefault(key, []).append(r)

    rows = []
    for gc in SPLITS:
        for cfg in ("4lane", "3lane"):
            for lv in LEVELS:
                runs = bag[(cfg, lv, gc)]
                m = lambda k: sum(r[k] for r in runs) / len(runs)
                rows.append(dict(g_over_c=gc, config=cfg, through_vph=lv,
                                 tt=m("travel_time_s"), p95=m("tt_p95"),
                                 spread=m("tt_p95") - m("travel_time_s"),
                                 held=m("pct_held_by_lt"),
                                 weaves=m("weaves_per_100"),
                                 served=m("throughput_vph"),
                                 queue=m("unserved")))
    json.dump(rows, open("/home/claude/greensplit.json", "w"), indent=1)

    g = {(r["g_over_c"], r["config"], r["through_vph"]): r for r in rows}
    print(f"{'':6s}{'vol':>5} | {'served 60':>10}{'served 65':>10} | "
          f"{'tt 60':>7}{'tt 65':>7} | {'p95 60':>8}{'p95 65':>8} | "
          f"{'spr 60':>8}{'spr 65':>8} | {'queue 60':>9}")
    for cfg in ("4lane", "3lane"):
        for lv in LEVELS:
            a, b = g[(0.60, cfg, lv)], g[(0.65, cfg, lv)]
            print(f"{cfg:6s}{lv:>5} | {a['served']:10.0f}{b['served']:10.0f} | "
                  f"{a['tt']:7.2f}{b['tt']:7.2f} | {a['p95']:8.1f}{b['p95']:8.1f} | "
                  f"{a['spread']:8.2f}{b['spread']:8.2f} | {a['queue']:9.0f}")
    print("done")
