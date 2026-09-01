"""How much does the left-turn share matter?  5% / 10% / 15%."""
import json
from roaddiet_sim import Sim

SHARES = [0.05, 0.10, 0.15]
LEVELS = [550, 700, 850]
SEEDS = [11, 22, 33, 44, 55, 66, 77, 88]
out = []

def job(a):
    share, lv, cfg, sd = a
    return (share, lv, cfg), Sim(cfg, lv, sd, left_share=share).run()


from multiprocessing import Pool
if __name__ == "__main__":
  with Pool(4) as p:
    bag = {}
    for key, r in p.map(job, [(sh, lv, cfg, sd) for sh in SHARES
                              for lv in LEVELS
                              for cfg in ("4lane", "3lane")
                              for sd in SEEDS]):
        bag.setdefault(key, []).append(r)
  for share in SHARES:
    for lv in LEVELS:
        for cfg in ("4lane", "3lane"):
            runs = bag[(share, lv, cfg)]
            m = lambda k: sum(r[k] for r in runs) / len(runs)
            row = dict(share=share, through_vph=lv, config=cfg,
                       tt=m("travel_time_s"), p95=m("tt_p95"),
                       spread=m("tt_p95") - m("travel_time_s"),
                       held=m("pct_held_by_lt"), weaves=m("weaves_per_100"),
                       ltwait=m("lt_wait_s"), served=m("throughput_vph"),
                       demand=m("demand_vph"))
            out.append(row)
            print(f"{share:.0%} {lv:4d} {cfg:6s} tt={row['tt']:5.2f} "
                  f"p95={row['p95']:5.1f} spread={row['spread']:5.2f} "
                  f"held={row['held']:5.2f} weave={row['weaves']:5.2f} "
                  f"ltw={row['ltwait']:5.1f} served={row['served']:4.0f}",
                  flush=True)

json.dump(out, open("/home/claude/turnshare.json", "w"), indent=1)
print("done")
