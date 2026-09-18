# Stuck behind a left turn — project notes for Claude

An animated microsimulation arguing for a road diet (4-lane undivided → 3-lane
with a centre two-way left-turn lane) on US-1 / Boston Post Road in
Larchmont–Mamaroneck, NY. Built for Michael Smeets to put in front of the
village and NYSDOT.

Deployed on Railway from this repo; `git push` redeploys. No build step.

## The argument, and how to keep it honest

**Safety is the reason; traffic is the rebuttal.** The FHWA figure (19–47%
fewer crashes after a 4-to-3 conversion) is the case. Everything this repo
measures — delay, reliability, throughput — exists to answer *"it will cause
gridlock"*, not to be the argument. Do not let the operational numbers become
the headline.

**The finding is about spread, not speed.** At 700 veh/h both cross-sections
serve the same traffic in near enough the same average time. The four-lane
road's 95th-percentile trip runs ~13 s longer than its average; the three-lane
road's ~2 s. That gap widens as the street fills. About one four-lane driver in
nine spends part of the trip stuck behind somebody waiting to turn; on the
three-lane road, none do.

**Report results that do not flatter the case.** This has come up repeatedly and
Michael values it. Past examples: doubling the seeds made the four-lane road
look slightly worse than first reported; a shorter signal cycle is a genuine
partial fix for the four-lane road and is labelled as such; at a 5% turn share
the four-lane road is faster on average; at 1,000 veh/h the road diet itself
breaks. All of these stayed in.

**It is an illustration, not a traffic study.** Say so. No calibration to
observed counts, no pedestrians, parking, buses or heavy vehicles, no
side-street traffic, one idealized block rather than a corridor.

## Assumptions

| | |
|---|---|
| Block | 1,000 ft between two signals, 3 unsignalized driveways per direction |
| Speed | 35 mph free-flow |
| Signals | **90 s cycle, 60% green** (54 s), both signals released together |
| Turns | 10% turning left |
| Volumes | 400 / 550 / 700 / 850 / 1,000 through veh/h **per direction** |
| Samples | 12 independent simulated hours averaged per point |

### Two open questions — do not quietly resolve either

1. **Cycle length.** Michael said at one point that the corridor runs 60-second
   cycles and that 90 s was an inherited default; he then chose to keep the
   model at 90 s. The pages state 90 s as an assumption, which is a factual
   claim someone could check. The 60 s results are kept in
   `model/results_60s_previous.json` so switching back is a re-run, not a
   rediscovery. If he confirms the real timing, change `CYCLE` and re-run.
2. **Green split.** 60% is an assumption, never confirmed. It matters far more
   than cycle length: at 50% the three-lane road tops out near 754 through
   veh/h, and Delancey's real peak of 831 is already over that. At 60% the
   ceiling is around 900. See `model/threshold.json` and `model/headroom.json`.

## Corridor facts

- Busiest intersections (Alden, Hommocks, Richbell) carry ~700 through
  vehicles at PM peak. The 700 column is the realistic busy case.
- The single busiest movement anywhere is **831 southbound at Delancey Ave**.
  The 850 column stands in for it. **Keep these two numbers consistent** —
  the prose and `CORRIDOR` in `build_pages.py` disagreed once.
- NYSDOT has called out Delancey/Orienta as problematic and is exploring a
  roundabout there.
- All 17 signalized intersections and their PM peak volumes are in `CORRIDOR`
  in `model/build_pages.py`, plotted on the build-up page's hoverable scale.

## Layout

```
index.html     the build-up walk, 400 → 1,000 veh/h          (also /buildup)
short.html     single-volume explainer                        (/short, /public)
full.html      the same plus sensitivity sections             (/full)
writeup-*.md   written versions                               (/writeup*)
server.js      Node stdlib only, gzip, path-traversal guard
model/         the simulation and everything that builds the pages
media/         GIF, MP4, still, charts — for email and slides
```

Three editions are built from **one** template, `model/explainer_template.html`,
so they cannot drift. Sections only some editions carry are fenced:

```html
<!--COMPLEX-ONLY-START--> ... <!--COMPLEX-ONLY-END-->
<!--BUILDUP-ONLY-START--> ... <!--BUILDUP-ONLY-END-->
```

`build_pages.py` writes two files per edition: `road_diet_weaving_<ed>.html`
(no `<head>` — this is what gets published as an artifact, the host supplies
the skeleton) and `..._standalone.html` (full document with `<meta charset>` —
this is what Michael emails and what you should screenshot).

## The model

`model/roaddiet_sim.py` — IDM car-following, MOBIL lane changing with a
3-second manoeuvre, HCM critical-gap acceptance for left turns, platooned
arrivals from a signal at each end. Key constants at the top: `CYCLE`, `GREEN`,
`V0`, `WEAVE_REACH`, `H_SAT`, `WARMUP`, `SIM_TIME`.

Needs Python 3.11+ with `numpy`, `matplotlib`, `pillow`, `playwright`
(`playwright install chromium`), and `ffmpeg` on PATH for the MP4.

### Rebuilding after any assumption change

```bash
python3 model/analyze.py        # the sweep, isolation runs, green split
python3 model/make_trace.py     # replay traces, 550/700/850
python3 model/extend_1000.py    # adds the 400 and 1,000 traces + sweep row
python3 model/queue_trace.py    # upstream queue over the hour
python3 model/turnshare.py      # 5/10/15% turn share
python3 model/greensplit.py     # 60% vs 65%
python3 model/cyclelen.py       # 60 s vs 90 s
python3 model/order_seeds.py    # re-ranks the samples  <-- see warning below
python3 model/refresh_data.py   # pushes results into the template
python3 model/build_pages.py    # writes the three editions
python3 model/build_writeups.py
python3 model/make_chart.py model/make_turnshare_chart.py model/make_gif.py
```

Then copy the outputs over `index.html` / `short.html` / `full.html` and the
`media/` files, and commit.

## Traps that have bitten, in order of how much time they cost

**1. ~142 hand-typed numbers in the prose.** The narrative in `STEPS`
(`build_pages.py`) and the tables and paragraphs in `explainer_template.html`
carry figures that are *not* generated. Change an assumption and they silently
become lies. After any re-run, grep the built pages for the old values before
shipping. Michael has caught stale figures more than once. **Wiring these to
`results.json` is the single highest-value refactor left in this repo** and he
has been offered it.

`refresh_data.py` already regenerates the `RES`, `SHARE` and `TILES` blocks —
extend that pattern rather than adding more literals.

**2. `order_seeds.py` renumbers the samples.** `ORDER` is the 12 seeds sorted
by when their left turns arrive. `PICKS` (short edition, three hours per
volume) and `BUILDUP_PICK` (build-up, one per volume) are **positions in
ORDER**, not seeds. Re-running `order_seeds.py` silently repoints them at
different hours.

Michael hand-chose the short edition's hours. They are seeds **121/66/77** at
550, **110/99/55** at 700, **77/22/99** at 850. After any re-ordering, map
those seeds back to their new positions and update `PICKS`. Do not let them
drift.

`BUILDUP_PICK` follows a rule instead: **the 9th-busiest of the twelve hours
for drivers held up behind a left turn**, at every volume. Same rank at every
step, so the ladder rises because the traffic rises and not because the samples
were hand-sorted. It currently gives 2 / 6 / 11 / 18 / 33 held up across
400→1,000. Verify by playing each volume through in a browser and reading the
on-screen tallies, not by arithmetic.

**3. The 1,000 veh/h story depends on the cycle length.** At 90 s the four-lane
road clears reliably in all twelve hours (~1,008 served) and the three-lane
road fails in all twelve (~927 served, ~108 queued). At 60 s the four-lane road
gridlocks in one hour of twelve — a real failure mode, but one hour, and
reporting the mean there hid it inside a misleading average. If the cycle
changes, re-check the per-seed spread before writing that narrative.

**4. iOS Mail disables JavaScript in HTML attachments.** The live page will not
animate when emailed as a `.html` file. This is not fixable in the file. Send
`media/road_diet_replay.gif` or the MP4 instead. Michael hit this on an
iPhone 14 Pro and it cost a round of debugging before the cause was clear.

**5. Screenshot the `_standalone.html` build, not the artifact-ready one.** The
latter has no `<meta charset>`, so headless Chromium renders em dashes as
mojibake and you will chase a bug that is not there.

## Editorial voice

Set by Michael over many rounds. Em dashes, plain words, no hedging, no
exclamation. Numbers carry the argument; adjectives do not. "Boring is the
point" — the three-lane road's monotony *is* the safety case, and the page says
so in its own box below the replay. Keep the framing that variability and the
crash record are two readings of one thing.

## Deploying

```bash
git push        # Railway redeploys; no build step, no env vars
```

Repo: `github.com/mikesmeets/stuck-behind-a-left-turn`.
`DEPLOY.md` has the Railway details and the URL table.
