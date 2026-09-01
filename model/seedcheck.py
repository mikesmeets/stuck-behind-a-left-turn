"""Does doubling the number of simulated hours move the published numbers?

Runs the sweep with 12 seeds instead of 6 and reports the 6-seed figures,
the 12-seed figures, and the difference.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim

LEVELS = [400, 550, 700, 850]
SEEDS6 = [11, 22, 33, 44, 55, 66]
SEEDS12 = SEEDS6 + [77, 88, 99, 110, 121, 132]


def one(job):
    cfg, lv, sd = job
    r = Sim(cfg, lv, sd).run()
    return (cfg, lv, sd, r)


if __name__ == "__main__":
    jobs = [(c, l, s) for c in ("4lane", "3lane")
            for l in LEVELS for s in SEEDS12]
    with Pool(8) as p:
        out = p.map(one, jobs)

    by = {}
    for cfg, lv, sd, r in out:
        by[(cfg, lv, sd)] = r

    KEYS = ["travel_time_s", "tt_p95", "throughput_vph", "pct_held_by_lt",
            "weaves_per_100", "lt_wait_s"]
    rows = []
    for cfg in ("4lane", "3lane"):
        for lv in LEVELS:
            def agg(seeds, k):
                return sum(by[(cfg, lv, s)][k] for s in seeds) / len(seeds)
            row = dict(config=cfg, through_vph=lv)
            for k in KEYS:
                row[k + "_6"] = agg(SEEDS6, k)
                row[k + "_12"] = agg(SEEDS12, k)
            row["spread_6"] = row["tt_p95_6"] - row["travel_time_s_6"]
            row["spread_12"] = row["tt_p95_12"] - row["travel_time_s_12"]
            # per-seed spread, to show how noisy a single hour is
            per = [by[(cfg, lv, s)]["tt_p95"] - by[(cfg, lv, s)]["travel_time_s"]
                   for s in SEEDS12]
            row["spread_min"], row["spread_max"] = min(per), max(per)
            rows.append(row)

    json.dump(rows, open("/home/claude/seedcheck.json", "w"), indent=1)

    hdr = f"{'cfg':6s} {'vol':>4s} | {'tt 6':>6s} {'tt 12':>6s} {'d':>6s} | " \
          f"{'p95 6':>6s} {'p95 12':>6s} {'d':>6s} | " \
          f"{'spr 6':>6s} {'spr12':>6s} {'d':>6s} | {'srv 6':>5s} {'srv12':>5s}"
    print(hdr)
    print("-" * len(hdr))
    for r in rows:
        print(f"{r['config']:6s} {r['through_vph']:4d} | "
              f"{r['travel_time_s_6']:6.2f} {r['travel_time_s_12']:6.2f} "
              f"{r['travel_time_s_12']-r['travel_time_s_6']:+6.2f} | "
              f"{r['tt_p95_6']:6.2f} {r['tt_p95_12']:6.2f} "
              f"{r['tt_p95_12']-r['tt_p95_6']:+6.2f} | "
              f"{r['spread_6']:6.2f} {r['spread_12']:6.2f} "
              f"{r['spread_12']-r['spread_6']:+6.2f} | "
              f"{r['throughput_vph_6']:5.0f} {r['throughput_vph_12']:5.0f}")

    print()
    print("per-seed spread range across the 12 individual hours:")
    for r in rows:
        print(f"  {r['config']:6s} {r['through_vph']:4d}  "
              f"{r['spread_min']:5.1f} .. {r['spread_max']:5.1f} s   "
              f"(12-seed mean {r['spread_12']:5.2f})")

    print()
    print("held-by-left-turn % and weaves/100:")
    for r in rows:
        print(f"  {r['config']:6s} {r['through_vph']:4d}  "
              f"held {r['pct_held_by_lt_6']:5.2f} -> {r['pct_held_by_lt_12']:5.2f}   "
              f"weave {r['weaves_per_100_6']:5.2f} -> {r['weaves_per_100_12']:5.2f}   "
              f"ltwait {r['lt_wait_s_6']:5.1f} -> {r['lt_wait_s_12']:5.1f}")
    print("done")
