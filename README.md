# Stuck behind a left turn

An animated microsimulation of what a center two-way left-turn lane is worth on
1,000 feet of arterial: a four-lane undivided cross-section and a three-lane
road diet, carrying the identical hour of traffic, side by side.

Built to support a road diet proposal on US-1 / Boston Post Road in
Larchmont–Mamaroneck, NY.

**This is an illustration of one mechanism, not a traffic study.** It is far
less sophisticated than the models a traffic engineer would use for a corridor
decision: no calibration to observed counts, no pedestrians, parking, buses or
heavy vehicles, no side-street traffic, and a single idealized block rather
than a corridor. Treat the numbers as an order of magnitude and an explanation
of the mechanism, not as a forecast.

## Pages

| URL | What it is |
|---|---|
| `/` | **The build-up walk** — 400 → 1,000 veh/h, with the corridor's real intersections plotted on the scale and the upstream queue over the hour. Also at `/buildup` |
| `/short` | The single-volume explainer: the replay, headline numbers, volume sweep, method note |
| `/full` | The same as `/short`, plus turn-share sensitivity and green-split analysis |
| `/writeup` | The written version |
| `/writeup-full` | The written version with the sensitivity sections |

## The finding, in one line

At 700 through vehicles per hour in each direction, both cross-sections serve
the same traffic in near enough the same average time. The difference is in the
spread: the four-lane road's 95th-percentile trip runs 10 seconds longer than
its average, the three-lane road's under 2, and that gap widens as the street
fills. About one four-lane driver in fourteen spends part of the trip stuck
behind somebody waiting to turn left. On the three-lane road, none do.

Safety is the reason to do a road diet — FHWA reports a 19–47% overall crash
reduction for 4-to-3 conversions. The operational numbers here exist to answer
the objection that it will cause gridlock, not to be the argument.

## Assumptions

1,000 ft between two signals · 35 mph free-flow · 60 s cycle, 60% green ·
three unsignalized driveways per direction · 10% of traffic turning left ·
400/550/700/850 through veh/h **per direction** (the build-up edition adds 1,000) · twelve independent simulated
hours averaged per point.

## Running it

```
npm start          # serves this directory on $PORT (default 3000)
```

No dependencies — `server.js` is Node standard library only. Railway builds it
with Nixpacks and runs `npm start`.

## The model

Everything in `model/` is the simulation itself, and it is all reproducible.

| File | What it does |
|---|---|
| `roaddiet_sim.py` | The microsimulation: IDM car-following, MOBIL lane changing, HCM critical-gap acceptance for left turns, platooned arrivals from a signal at each end |
| `analyze.py` | The volume sweep, left-turn isolation runs and green-split sensitivity |
| `turnshare.py` | 5% / 10% / 15% turn-share sweep |
| `greensplit.py`, `cyclelen.py` | Sensitivity to the green split and the cycle length |
| `seedcheck.py`, `carryover.py` | Robustness checks |
| `make_trace.py` | Dumps the vehicle traces the animation replays |
| `queue_trace.py` | Samples the queue waiting upstream over the measured hour, for the build-up edition's queue chart |
| `signal_grid.py`, `threshold.py`, `headroom.py` | Cycle length x green split, and where the three-lane road runs out of capacity at each split |
| `order_seeds.py` | Scores and orders the traffic samples by when their left turns arrive |
| `refresh_data.py`, `build_pages.py`, `build_writeups.py` | Rebuild the pages from the results, in both editions |
| `make_chart.py`, `make_turnshare_chart.py`, `make_gif.py` | The figures and the video |
| `make_sumo.py` | Generates equivalent SUMO networks, for cross-checking in a real traffic simulator |
| `*.json` | Every number the pages quote |

To rebuild after changing an assumption:

```
python3 model/analyze.py        # the sweep
python3 model/make_trace.py     # the animation traces
python3 model/refresh_data.py   # push the numbers into the template
python3 model/build_pages.py    # write index.html and full.html
```

`model/explainer_template.html` is the single source for both editions; the
sections only the full edition carries are fenced with `COMPLEX-ONLY` comments.

## Media

`media/` holds an MP4 and a GIF of the replay and a still frame, for use in
email and slides — email clients disable JavaScript, so the live page will not
animate as an attachment.

## License

The simulation code and the page are free to reuse. The FHWA crash-reduction
figures are from
[FHWA's Road Diet Informational Guide](https://highways.dot.gov/safety/other/road-diets/road-diet-informational-guide/executive-summary),
citing *Evaluation of Lane Reduction "Road Diet" Measures on Crashes*
(FHWA-HRT-10-053).
