"""How much room is left above the corridor's busiest movement?

Delancey's peak is 831 through vehicles an hour. This finds where the
three-lane road actually runs out, at the current 90 s cycle and at a 60 s
one, both at 60% green.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim

SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]
LEVELS = [850, 875, 900, 925, 950, 1000]
PLANS = [(90.0, 0.60), (60.0, 0.60)]

def one(a):
    cfg, lv, sd, cy, gc = a
    return (cy, cfg, lv), Sim(cfg, lv, sd, cycle_s=cy, green_s=gc*cy).run()

if __name__ == "__main__":
    jobs = [(c, l, s, cy, gc) for (cy, gc) in PLANS
            for c in ("3lane", "4lane") for l in LEVELS for s in SEEDS]
    with Pool(4) as p:
        bag = {}
        for k, r in p.map(one, jobs):
            bag.setdefault(k, []).append(r)
    out = []
    for cy, _ in PLANS:
        for cfg in ("3lane", "4lane"):
            print(f"\n=== {cfg}, {cy:.0f} s cycle, 60% green ===")
            print(f"{'demand':>7}{'served':>8}{'queue':>7}{'short':>7}")
            for lv in LEVELS:
                runs = bag[(cy, cfg, lv)]
                m = lambda k: sum(r[k] for r in runs)/len(runs)
                sv, q = m("throughput_vph"), m("unserved")
                out.append(dict(cycle_s=cy, config=cfg, through_vph=lv,
                                served=sv, queue=q))
                print(f"{lv:>7}{sv:>8.0f}{q:>7.0f}{lv-sv:>7.0f}")
    json.dump(out, open("/home/claude/headroom.json","w"), indent=1)
