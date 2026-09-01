"""Where does the three-lane road run out of room at 50% green?

The entry lane carries the through traffic and the left-turners together, so
the through volume it can serve is roughly 1,800 x g/C x (1 - turn share).
This finds the actual number by sweeping.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim

SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]
LEVELS = [700, 750, 775, 800, 825, 850]
PLANS = [(60.0, 0.50), (60.0, 0.55), (60.0, 0.60)]

def one(a):
    cfg, lv, sd, cyc, gc = a
    return (cyc, gc, cfg, lv), Sim(cfg, lv, sd, cycle_s=cyc, green_s=gc*cyc).run()

if __name__ == "__main__":
    jobs = [("3lane", l, s, cy, gc) for (cy, gc) in PLANS
            for l in LEVELS for s in SEEDS]
    with Pool(4) as p:
        bag = {}
        for k, r in p.map(one, jobs):
            bag.setdefault(k, []).append(r)
    out = []
    for (cy, gc) in PLANS:
        print(f"\n=== 3 lanes, {cy:.0f} s cycle, {gc*100:.0f}% green ===")
        print(f"{'demand':>7}{'served':>8}{'queue':>7}{'shortfall':>11}")
        for lv in LEVELS:
            runs = bag[(cy, gc, "3lane", lv)]
            m = lambda k: sum(r[k] for r in runs)/len(runs)
            sv, q = m("throughput_vph"), m("unserved")
            out.append(dict(cycle_s=cy, g_over_c=gc, through_vph=lv,
                            served=sv, queue=q))
            print(f"{lv:>7}{sv:>8.0f}{q:>7.0f}{lv-sv:>11.0f}")
    json.dump(out, open("/home/claude/threshold.json","w"), indent=1)
