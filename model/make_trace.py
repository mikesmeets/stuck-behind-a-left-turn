"""Dump compact vehicle traces for the animated explainer.

Every replay begins the same way, on purpose.  The simulation starts with an
empty street and the signal on RED.  Traffic arrives and accumulates at the
stop bar for one full red -- 31.5 s of a 90 s cycle -- and the replay window
opens at the instant that first green turns, on both cross-sections at once.
So the clock starts with a queue about to be released and nothing else on the
block, in every sample, at every volume, which makes the samples comparable
with each other rather than each catching the street in a different state.

Nothing is hunted for after that: whatever happens in the three minutes
following that first green is what you see.  The measured statistics are a
separate thing entirely -- full hours with a six-minute warm-up discarded.
"""
import json
from roaddiet_sim import (Sim, DT, WARMUP, SEG_LEN, DRIVEWAYS, DRIVEWAYS_OPP,
                          CYCLE, GREEN, OFFSET)

WIN = 180.0          # seconds of animation -- two full signal cycles
STRIDE = 2           # record every 2nd step -> 0.5 s frames
VOLS = [550, 700, 850]
SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]

# The signal opens red; the first green -- and the replay -- begins here.
START = CYCLE - GREEN             # 31.5 s of accumulation, then release


def trace(cfg, vph, seed, start):
    s = Sim(cfg, vph, seed, warmup=0.0, start_red=True)
    frames, held, seen = [], 0, set()
    wcount, pending, nweave = {}, [], 0
    for i in range(int((start + WIN) / DT)):
        s.step()
        if s.t < start:
            continue
        for d in (1, -1):
            for v in s.vehs[d]:
                if (s.is_held(v) and v.vid not in seen):
                    seen.add(v.vid)
                    held += 1
                if v.weave_changes > wcount.get(v.vid, 0):
                    wcount[v.vid] = v.weave_changes
                    pending.append(v.vid)
                    nweave += 1
        if i % STRIDE:
            continue
        f = []
        for d in (1, -1):
            for v in s.vehs[d]:
                if -12 < v.x < SEG_LEN + 12:
                    # Left-turners are amber for the whole trip, from the stop
                    # bar to the driveway -- not only once they start slowing.
                    # It is easier to follow: you can see which car is going to
                    # cause the blockage before it causes it, and watch where it
                    # sits in the platoon.
                    if v.turning:
                        kind = 3
                    elif v.turn_at is not None:
                        kind = 2
                    elif s.is_held(v):
                        kind = 1
                    else:
                        kind = 0
                    f.append([v.vid, 1 if d == 1 else 0, round(v.x * 10),
                              round(v.latpos * 100), kind])
        # Vehicles still behind each upstream stop bar, waiting to be let into
        # the block.  Direction 1 is released by the west signal, -1 by the
        # east one, so each count belongs to the stop bar it is drawn beside.
        frames.append([f, pending,
                       1 if s._sig_green("west") else 0,
                       1 if s._sig_green("east") else 0,
                       len(s.entry_queue[1]), len(s.entry_queue[-1])])
        pending = []
    return frames, held, nweave


out = {"seg": round(SEG_LEN, 2),
       "dwA": [round(x, 2) for x in DRIVEWAYS],
       "dwB": [round(x, 2) for x in DRIVEWAYS_OPP],
       "dt": DT * STRIDE, "win": WIN,
       "cycle": CYCLE, "green": GREEN, "offset": OFFSET,
       "vols": VOLS, "seeds": SEEDS, "start": START, "scen": {}}


def trace_job(a):
    cfg, vph, seed = a
    fr, h, w = trace(cfg, vph, seed, START)
    return cfg, vph, seed, fr, h, w


if __name__ == "__main__":
    from multiprocessing import Pool
    with Pool(2) as p:
        jobs = [(c, v, s) for v in VOLS for s in SEEDS
                for c in ("4lane", "3lane")]
        for cfg, vph, seed, fr, h, w in p.imap(trace_job, jobs):
            out["scen"][f"{cfg}_{vph}_{seed}"] = fr
            print(f"{cfg:6s} {vph} seed {seed}: {len(fr)} frames, "
                  f"{h} held up, {w} weaves", flush=True)

    json.dump(out, open("/home/claude/trace.json", "w"),
              separators=(",", ":"))
    import os
    print("bytes", os.path.getsize("/home/claude/trace.json"))
