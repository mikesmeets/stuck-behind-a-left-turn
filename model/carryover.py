"""How often does a green open with a vehicle still on the block?

Prompted by a question about the animated replay: in traffic sample 6 at
700 veh/h the four-lane road already has a vehicle mid-block when the clock
starts.  The replay cuts into a simulation that has been running for twelve
minutes, so that vehicle is a leftover from the previous platoon, not a
spawning bug.  This measures how often that happens over full hours.
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim, WARMUP, SEG_LEN

LEVELS = [550, 700, 850]
SEEDS = [11, 22, 33, 44, 55, 66]


def run(a):
    cfg, vol, seed = a
    s = Sim(cfg, vol, seed)
    onsets, occupied, carried = 0, 0, 0
    prev = None
    while s.t < 3600 + WARMUP:
        s.step()
        g = s._sig_green("west")
        if prev is False and g is True and s.t > WARMUP:
            onsets += 1
            # vehicles still on the block, past the stop-bar discharge zone
            n = sum(1 for v in s.vehs[1] if 15 < v.x < SEG_LEN)
            if n:
                occupied += 1
                carried += n
        prev = g
    return cfg, vol, onsets, occupied, carried


if __name__ == "__main__":
    jobs = [(c, v, s) for c in ("4lane", "3lane")
            for v in LEVELS for s in SEEDS]
    with Pool(4) as p:
        out = p.map(run, jobs)

    agg = {}
    for cfg, vol, on, occ, car in out:
        a = agg.setdefault((cfg, vol), [0, 0, 0])
        a[0] += on
        a[1] += occ
        a[2] += car

    rows = []
    for (cfg, vol), (on, occ, car) in sorted(agg.items()):
        rows.append(dict(config=cfg, through_vph=vol, greens=on,
                         greens_with_leftover=occ, share=occ / on,
                         vehicles_carried_over=car))
        print(f"{cfg:6s} {vol:4d}  greens={on:4d}  "
              f"opening with a vehicle still on the block: {occ:4d} "
              f"({occ / on:5.1%})  vehicles carried over: {car}")

    json.dump(rows, open("/home/claude/carryover.json", "w"), indent=1)
    print("done")
