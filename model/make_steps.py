"""Traces for the Traffic page's scroll-driven replay (site/sim-steps.js).

Same recording as make_trace.py -- cold start on red, the window opens at the
first green, three minutes -- with one addition: each frame also carries the
number of vehicles waiting upstream of each end of the block (the entry
queue), so the page can show the line that isn't getting in.

One hour per volume.  550 and 1,000 are the build-up edition's
hours. 400 is seed 44, whose first weave comes 12.5 seconds in. 700 is seed 77,
chosen because one four-lane driver is stuck behind a
left-turner for about 20 seconds; 850 is seed 88, a middling hour in which the
road diet leaves cars at the light when a green ends (the four-lane road clears).

The hour-long queue curves come from simulation.html's QUEUE block, which
queue_trace.py writes, so the chart matches the build-up page.

    python model/make_steps.py      (from the repo root)
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from roaddiet_sim import Sim, DT, SEG_LEN, DRIVEWAYS, DRIVEWAYS_OPP, CYCLE, GREEN  # noqa: E402

WIN, STRIDE = 180.0, 2
START = CYCLE - GREEN
PICKS = {400: 44, 550: 44, 700: 77, 850: 88, 1000: 77}
ROOT = os.path.join(os.path.dirname(__file__), "..")


def trace(cfg, vph, seed):
    s = Sim(cfg, vph, seed, warmup=0.0, start_red=True)
    frames, wcount, pending, base = [], {}, [], 0
    for i in range(int((START + WIN) / DT)):
        s.step()
        if s.t < START:
            base = s.crossed[1] + s.crossed[-1]
            continue
        for d in (1, -1):
            for v in s.vehs[d]:
                if v.weave_changes > wcount.get(v.vid, 0):
                    wcount[v.vid] = v.weave_changes
                    pending.append(v.vid)
        if i % STRIDE:
            continue
        f = []
        for d in (1, -1):
            for v in s.vehs[d]:
                if -12 < v.x < SEG_LEN + 12:
                    kind = 3 if v.turning else 2 if v.turn_at is not None else 1 if s.is_held(v) else 0
                    f.append([v.vid, 1 if d == 1 else 0, round(v.x * 10), round(v.latpos * 100), kind])
        frames.append([f, pending,
                       1 if s._sig_green("west") else 0, 1 if s._sig_green("east") else 0,
                       s.crossed[1] + s.crossed[-1] - base,
                       len(s.entry_queue[1]) + len(s.entry_queue[-1])])
        pending = []
    return frames


def main():
    sim = open(os.path.join(ROOT, "simulation.html"), encoding="utf-8").read()
    q = re.search(r"const QUEUE = (\{.*?\});\n", sim, re.S)
    queue = json.loads(q.group(1))
    out = {"seg": round(SEG_LEN, 2), "dwA": [round(x, 2) for x in DRIVEWAYS],
           "dwB": [round(x, 2) for x in DRIVEWAYS_OPP], "dt": DT * STRIDE, "win": WIN,
           "cycle": CYCLE, "vols": list(PICKS), "seeds": PICKS, "scen": {},
           "hour": {"t": queue["t"], "q": {}, "qs": {}}}
    for vol, seed in PICKS.items():
        for cfg in ("4lane", "3lane"):
            fr = trace(cfg, vol, seed)
            out["scen"][f"{cfg}_{vol}"] = fr
            held = {v[0] for f in fr for v in f[0] if v[4] == 1}
            print(f"{cfg} {vol} seed {seed}: served {fr[-1][4]}, held {len(held)}, "
                  f"queue end {fr[-1][5]}, max {max(f[5] for f in fr)}", flush=True)
            for k in ("q", "qs"):
                out["hour"][k][f"{cfg}_{vol}"] = [round(x, 1) for x in queue[k][f"{cfg}_{vol}"]]
    path = os.path.join(ROOT, "site", "data", "sim-steps.json")
    json.dump(out, open(path, "w"), separators=(",", ":"))
    print("wrote", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
