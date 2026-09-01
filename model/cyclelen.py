"""What would a 90-second cycle do instead of the 60 the corridor runs?

Same green fraction (60%), so 54 s of green in 90 rather than 36 in 60.
A longer cycle means longer reds, longer queues and bigger platoons -- and
a bigger platoon is what traps a driver behind somebody waiting to turn.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim

LEVELS = [400, 550, 700, 850, 1000]
SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]
CYCLES = [60.0, 90.0]
GC = 0.60


def one(a):
    cfg, lv, sd, cyc = a
    return (cfg, lv, cyc), Sim(cfg, lv, sd, cycle_s=cyc,
                               green_s=GC * cyc).run()


if __name__ == "__main__":
    jobs = [(c, l, s, cy) for cy in CYCLES for c in ("4lane", "3lane")
            for l in LEVELS for s in SEEDS]
    with Pool(4) as p:
        bag = {}
        for key, r in p.map(one, jobs):
            bag.setdefault(key, []).append(r)

    rows = []
    for cyc in CYCLES:
        for cfg in ("4lane", "3lane"):
            for lv in LEVELS:
                runs = bag[(cfg, lv, cyc)]
                m = lambda k: sum(r[k] for r in runs) / len(runs)
                rows.append(dict(cycle_s=cyc, config=cfg, through_vph=lv,
                                 tt=m("travel_time_s"), p95=m("tt_p95"),
                                 spread=m("tt_p95") - m("travel_time_s"),
                                 held=m("pct_held_by_lt"),
                                 weaves=m("weaves_per_100"),
                                 ltwait=m("lt_wait_s"),
                                 served=m("throughput_vph"),
                                 queue=m("unserved")))
    json.dump(rows, open("/home/claude/cyclelen.json", "w"), indent=1)

    g = {(r["cycle_s"], r["config"], r["through_vph"]): r for r in rows}
    print(f"{'':6s}{'vol':>5} | {'served 60':>10}{'served 90':>10} | "
          f"{'tt 60':>7}{'tt 90':>7} | {'p95 60':>8}{'p95 90':>8} | "
          f"{'spr 60':>8}{'spr 90':>8} | {'held 60':>8}{'held 90':>8}")
    for cfg in ("4lane", "3lane"):
        for lv in LEVELS:
            a, b = g[(60.0, cfg, lv)], g[(90.0, cfg, lv)]
            print(f"{cfg:6s}{lv:>5} | {a['served']:10.0f}{b['served']:10.0f} | "
                  f"{a['tt']:7.2f}{b['tt']:7.2f} | {a['p95']:8.1f}{b['p95']:8.1f} | "
                  f"{a['spread']:8.2f}{b['spread']:8.2f} | "
                  f"{a['held']:8.2f}{b['held']:8.2f}")
    print("done")
