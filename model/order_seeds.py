"""Order the traffic samples by WHEN the left turns happen in the replay.

The replay is three minutes -- two signal cycles.  For each hour, take every
vehicle that becomes a visible left-turner (waiting or executing) at any point
in the window, pooled across both cross-sections and all three volumes so that
one fixed order serves every button, and score it:

    balance = (turns in the first 90 s - turns in the second 90 s) / turns

+1 is entirely front-loaded, -1 entirely back-loaded, 0 is evenly split
between the two cycles.  Sorting descending therefore gives exactly the
ordering asked for: the hours that show their left turns earliest come first,
the ones that save them for the second cycle come last, and the evenly spread
hours land in the middle, because even IS the midpoint of that axis.
"""
import json

T = json.load(open("/home/claude/trace.json"))
NF = len(T["scen"][f"4lane_{T['vols'][0]}_{T['seeds'][0]}"])
HALF = NF / 2


def turn_frames(cfg, vol, seed):
    """Frame at which each vehicle first becomes a visible left-turner."""
    first = {}
    for i, (vehs, _, _, _) in enumerate(T["scen"][f"{cfg}_{vol}_{seed}"]):
        for v in vehs:
            if v[4] in (2, 3) and v[0] not in first:
                first[v[0]] = i
    return list(first.values())


rows = []
for sd in T["seeds"]:
    fr = []
    for vol in T["vols"]:
        for cfg in ("4lane", "3lane"):
            fr += turn_frames(cfg, vol, sd)
    a = sum(1 for i in fr if i < HALF)
    b = len(fr) - a
    rows.append(dict(seed=sd, turns=len(fr), first_half=a, second_half=b,
                     balance=(a - b) / len(fr),
                     mean_pos=sum(fr) / len(fr) / (NF - 1)))

rows.sort(key=lambda r: -r["balance"])

print(f"{'#':>3} {'seed':>5} {'turns':>6} {'1st half':>9} {'2nd half':>9} "
      f"{'balance':>8} {'mean pos':>9}")
for j, r in enumerate(rows, 1):
    tag = "  <- evenly split" if abs(r["balance"]) < 0.08 else ""
    print(f"{j:>3} {r['seed']:>5} {r['turns']:>6} {r['first_half']:>9} "
          f"{r['second_half']:>9} {r['balance']:>+8.3f} "
          f"{r['mean_pos']:>9.3f}{tag}")

order = [r["seed"] for r in rows]
print()
print("const PUBLIC_SEEDS = [" + ", ".join(str(s) for s in order) + "];")
json.dump(rows, open("/home/claude/seed_order.json", "w"), indent=1)
