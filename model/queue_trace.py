"""Sample the upstream queue over the measured hour, for both cross-sections.

Averaged over the twelve simulated hours.

The sweep only reports the queue length at the final instant. The build-up
edition needs the whole hour, because the honest story at 1,000 veh/h is that
the three-lane queue never stops growing while the four-lane one hovers.

Writes queue.json: {"vols": [...], "t": [minutes], "q": {"4lane_1000": [...]}}
"""
import json
from multiprocessing import Pool
from roaddiet_sim import Sim, DT, WARMUP, SIM_TIME, MEASURED_DIR

SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]
VOLS = [400, 550, 700, 850, 1000]
SAMPLE_S = 30.0                       # one sample every half minute


def job(a):
    cfg, vph, seed = a
    s = Sim(cfg, vph, seed)
    n = int((WARMUP + SIM_TIME) / DT)
    every = int(SAMPLE_S / DT)
    out = []
    for i in range(n):
        s.step()
        if s.t >= WARMUP and i % every == 0:
            out.append(len(s.entry_queue[MEASURED_DIR]))
    # the sweep reports the queue at the final instant, so end there too and
    # the chart cannot disagree with the table
    out.append(len(s.entry_queue[MEASURED_DIR]))
    return cfg, vph, out


if __name__ == "__main__":
    jobs = [(c, v, s) for c in ("4lane", "3lane") for v in VOLS for s in SEEDS]
    bag = {}
    with Pool(4) as p:
        for cfg, vph, out in p.imap_unordered(job, jobs):
            bag.setdefault(f"{cfg}_{vph}", []).append(out)

    # Mean across the twelve hours, matching the sweep tables elsewhere. No
    # hour is an outlier at this cycle length, so the mean and the median sit
    # on top of each other and the chart cannot disagree with the numbers.
    q = {}
    for k, runs in bag.items():
        n = min(len(r) for r in runs)
        q[k] = [round(sum(r[i] for r in runs) / len(runs), 1) for i in range(n)]

    npts = min(len(v) for v in q.values())
    q = {k: v[:npts] for k, v in q.items()}
    t = [round(min(i * SAMPLE_S, SIM_TIME) / 60.0, 2) for i in range(npts)]

    # The raw series sawtooths with the signal: the queue builds on red and
    # empties on green. Averaging over one full cycle strips that out and
    # leaves the only thing that matters here -- whether the queue trends up.
    from roaddiet_sim import CYCLE
    win = max(1, int(round(CYCLE / SAMPLE_S)))
    qs = {}
    for k, v in q.items():
        qs[k] = [round(sum(v[max(0, i - win + 1):i + 1])
                       / len(v[max(0, i - win + 1):i + 1]), 1)
                 for i in range(len(v))]

    json.dump({"vols": VOLS, "t": t, "q": q, "qs": qs, "cycle_win_s": CYCLE},
              open("/home/claude/queue.json", "w"), separators=(",", ":"))

    for v in VOLS:
        a, b = q[f"4lane_{v}"], q[f"3lane_{v}"]
        print(f"{v:5d}  4lane end {a[-1]:6.1f} max {max(a):6.1f} | "
              f"3lane end {b[-1]:6.1f} max {max(b):6.1f}")
