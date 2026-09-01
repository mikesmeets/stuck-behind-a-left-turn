"""Run the full experiment set and dump results.json."""
import json
from multiprocessing import Pool
from roaddiet_sim import (Sim, SEG_LEN, DRIVEWAYS, DRIVEWAYS_OPP,
                          CYCLE, GREEN, OFFSET, LC_DUR)

LEVELS = [400, 550, 700, 850]
# The published figures average twelve independent hours of traffic, so a
# single unlucky hour cannot drive a conclusion.  Doubling from six to twelve
# moved every headline figure by less than a second (see seedcheck.py).  The
# animation is separate: it always replays one specific, fixed hour, so the
# picture never changes underneath you.
SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]
ISO_SEEDS = SEEDS[:8]
GC = [0.50, 0.60, 0.65]


def agg_of(runs):
    return {k: (sum(r[k] for r in runs) / len(runs)
                if isinstance(runs[0][k], (int, float)) else runs[0][k])
            for k in runs[0]}


def sweep_job(a):
    cfg, lv, sd = a
    s = Sim(cfg, lv, sd)
    s.run()
    return cfg, lv, sd, s.results(), [round(x, 1) for x in s.tt_all]


def iso_job(a):
    cfg, lv, sd, ls, total = a
    s = Sim(cfg, total if ls == 0.0 else lv, sd, left_share=ls)
    s.run()
    return cfg, lv, ls, s.tt_all


def gc_job(a):
    cfg, gc, sd = a
    return cfg, gc, Sim(cfg, 850, sd, green_s=gc * CYCLE).run()


if __name__ == "__main__":
    sweep, dists, iso, gc_rows = [], {}, [], []

    with Pool(4) as pool:
        jobs = [(c, l, s) for c in ("4lane", "3lane")
                for l in LEVELS for s in SEEDS]
        res = {}
        for cfg, lv, sd, r, tts in pool.map(sweep_job, jobs):
            res.setdefault((cfg, lv), ([], []))
            res[(cfg, lv)][0].append(r)
            res[(cfg, lv)][1].extend(tts)

        for cfg in ("4lane", "3lane"):
            for lv in LEVELS:
                runs, tts = res[(cfg, lv)]
                a = agg_of(runs)
                a["config"], a["through_vph"] = cfg, lv
                a["held_per_hour"] = a["pct_held_by_lt"] / 100.0 * lv
                a["weaves_per_hour"] = a["weaves_per_100"] / 100.0 * lv
                a["served_share"] = a["throughput_vph"] / lv
                sweep.append(a)
                dists[f"{cfg}_{lv}"] = tts
                print("sweep", cfg, lv, round(a["travel_time_s"], 2),
                      round(a["tt_p95"], 1), round(a["throughput_vph"]),
                      flush=True)

        # Left turns isolated.  The control has the SAME number of vehicles
        # arriving at the stop bar -- the 10% that would have turned left go
        # straight instead -- so the only thing that changes is whether they
        # turn, not how many there are.
        jobs = []
        for lv in LEVELS:
            total = lv / 0.90
            for cfg in ("4lane", "3lane"):
                for ls in (0.0, 0.10):
                    for sd in ISO_SEEDS:
                        jobs.append((cfg, lv, sd, ls, total))
        bag = {}
        for cfg, lv, ls, tts in pool.map(iso_job, jobs):
            bag.setdefault((cfg, lv, ls), []).extend(tts)

        for lv in LEVELS:
            row = {"through_vph": lv, "total_vph": round(lv / 0.90)}
            for cfg in ("4lane", "3lane"):
                for ls, tag in ((0.0, "base"), (0.10, "left")):
                    t = bag[(cfg, lv, ls)]
                    row[f"{cfg}_{tag}"] = sum(t) / len(t)
                row[f"{cfg}_penalty"] = row[f"{cfg}_left"] - row[f"{cfg}_base"]
            iso.append(row)
            print("iso", lv, round(row["4lane_penalty"], 2),
                  round(row["3lane_penalty"], 2), flush=True)

        # how much green the single through lane needs
        jobs = [(c, g, s) for g in GC for c in ("4lane", "3lane")
                for s in ISO_SEEDS]
        bag = {}
        for cfg, gc, r in pool.map(gc_job, jobs):
            bag.setdefault((cfg, gc), []).append(r)
        for gc in GC:
            for cfg in ("4lane", "3lane"):
                a = agg_of(bag[(cfg, gc)])
                gc_rows.append(dict(config=cfg, g_over_c=gc, through_vph=850,
                                    throughput_vph=a["throughput_vph"],
                                    travel_time_s=a["travel_time_s"],
                                    tt_p95=a["tt_p95"],
                                    upstream_queue=a["unserved"]))
                print("gc", cfg, gc, round(a["throughput_vph"]),
                      round(a["travel_time_s"], 1), flush=True)

    json.dump(dict(meta=dict(segment_m=SEG_LEN, segment_ft=1000,
                             driveways_dir_a_m=DRIVEWAYS,
                             driveways_dir_b_m=DRIVEWAYS_OPP,
                             left_share=0.10, seeds=SEEDS, sim_hours=1,
                             cycle_s=CYCLE, green_s=GREEN, offset_s=OFFSET,
                             lane_change_s=LC_DUR,
                             note="volumes are through vehicles per hour PER "
                                  "DIRECTION; both directions carry the same "
                                  "load; statistics are measured on the "
                                  "progressed direction"),
                   sweep=sweep, isolation=iso, green_sensitivity=gc_rows),
              open("/home/claude/results.json", "w"), indent=1)
    json.dump(dists, open("/home/claude/tt_dists.json", "w"))
    print("done")
