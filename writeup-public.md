# Left turns, weaving, and what a center turn lane is worth

**A toy microsimulation of 1,000 ft of roadway between two signals, 4 lanes vs. 3 lanes**  
*Short edition — the fuller version adds the turn-share sensitivity, the green-split analysis and the robustness checks.*
Prepared 30 August 2026

---

> **What this is, and what it is not.** This is an illustration of one mechanism, built to show
> *why* a center turn lane helps and roughly how much. It is not a traffic study. It is far less
> sophisticated than the models a traffic engineer would use for a corridor decision — no
> calibration to observed counts, no pedestrians, parking, buses or heavy vehicles, no side-street
> traffic, and a single idealized block rather than a corridor. Treat the numbers as an order of
> magnitude and an explanation of the mechanism, not as a forecast.

> ⚠️ **Safety is the reason. Traffic is the rebuttal.** The case for a road diet is safety first.
> The FHWA recognizes 4-to-3 lane conversions as a **Proven Safety Countermeasure**, citing an
> **overall crash reduction of 19% to 47%**. By narrowing crossings, lowering speeds and reducing
> conflict points, these redesigns cut down on rear-end, left-turn, right-angle and sideswipe
> collisions.
>
> Everything in this document is about **traffic operations** — delay, reliability, throughput.
> That matters because *"it will cause gridlock"* is the objection a road diet actually has to
> survive at a public meeting, and the operational findings below are the answer to it. But they
> are not the reason to do it. Lead with the safety number; use these to show that the cost people
> fear does not show up. There are real traffic benefits too — the left-turn delay disappears and
> the corridor becomes markedly more predictable — but they are the secondary argument, not the
> headline.
>
> Source: FHWA, [Road Diet Informational
> Guide](https://highways.dot.gov/safety/other/road-diets/road-diet-informational-guide/executive-summary)
> and the Proven Safety Countermeasures fact sheet, citing *Evaluation of Lane Reduction "Road
> Diet" Measures on Crashes* (FHWA-HRT-10-053).

## The question

On a four-lane undivided street, a driver waiting to turn left into a driveway or parking space
stops in a travel lane. Everyone behind them either stops too or has to weave around them — the
maneuver traffic engineers call weaving. Add a center turn lane and that vehicle steps out of the
way entirely, and traffic flows smoothly and predictably. This toy simulation illustrates that
difference.

This is a deliberately small, transparent test of what that is worth: 1,000 feet of straight road
between two coordinated signals, three unsignalized driveways per direction, 700 vehicles per
hour going straight **in each direction**, and 10% of all traffic turning left.

## Where these volumes come from

The 700 figure is not arbitrary. On the corridor this was built for, the busiest intersections —
**Alden, Hommocks and Richbell** — carry roughly **700 through vehicles** in their PM peak. So the
700 column is the realistic busy case, and 400 and 550 are the rest of the day.

The single busiest movement anywhere on the corridor is **821 vehicles, southbound in the PM peak
at Delancey Avenue**. That is what the 850 column stands in for — deliberately a little above the
worst observed number, so the comparison does not rest on the corridor's quietest assumptions.

Delancey is worth naming for a second reason: **NYSDOT has identified the Delancey/Orienta
intersection as problematic**, and it is one of the reasons the department is exploring a
roundabout there.

## The setup

| | |
|---|---|
| Roadway | 1,000 ft (304.8 m), straight, 35 mph free-flow |
| Cross-section A | 4 lanes undivided — 2 through lanes per direction, no turn lane |
| Cross-section B | 3 lanes — 1 through lane per direction + center two-way left-turn lane |
| Driveways | 3 per direction, unsignalized, offset side to side: eastbound turns left at 250 / 500 / 750 ft, westbound at 375 / 625 / 875 ft |
| Signals | One at each end. 90 s cycle, 54 s effective green (g/C = 0.60), **released simultaneously**. Each signal releases one direction into the block; **neither holds traffic on the way out**, so travel time is pure block traversal with no signal delay folded in |
| Traffic | Vehicles arrive at the upstream signal at random, queue on red, discharge on green at a 2.0 s saturation headway per lane — so they enter the block in **platoons** |
| Turn split | 10% turn left, spread evenly over that direction's three driveways |
| Through volumes tested | 400, 550, 700 and 850 veh/h **per direction** (about 800 veh/h per direction in total at the 700 level, ~1,600 two-way) |
| Runs | Twelve independent simulated hours per point, averaged, after a six-minute warm-up. The animation is separate and deliberately fixed: it replays one specific hour, selectable from twelve, always starting from an empty street at the first green, and never reshuffles |

Both directions carry the same volume, because a left-turner's wait is governed by the oncoming
stream — modeling one direction alone would understate the problem badly.

**On the signal offset.** Because nothing is held on the way out, a progression offset would have
nothing left to do — it would only stagger when the two directions are released, with no
downstream green for anyone to catch. So both signals run together and both directions start at
the same moment. That also makes the two directions symmetric: statistics are taken from one of
them, but either would give the same answer.

## How it was modeled

Car-following is the **Intelligent Driver Model** (desired headway 1.2 s, comfortable
deceleration 2.0 m/s², standstill gap 2.5 m). Lane changing is **MOBIL**. Left turns use
**HCM-style critical-gap acceptance** against the opposing stream: 4.3 s to cross two opposing
through lanes, 4.1 s to cross one, with driver-to-driver variation of 0.8 s.

**Free-flow speed is 35 mph**, and it is the same on both cross-sections. That is a deliberately
conservative choice: real 4-to-3 conversions usually *lower* operating speeds, which is part of
where their crash reduction comes from, and none of that credit is taken here. Nobody achieves
35 mph over the block anyway, because every trip starts from a stop bar — a car that never left
35 mph would cross the 1,000 ft in 19.5 s, and the modeled averages are:

| Effective average speed over the 1,000 ft | 400 | 550 | 700 | 850 |
|---|---:|---:|---:|---:|
| 4 lanes, no turn lane | 29.5 mph | 28.7 mph | 27.1 mph | 25.1 mph |
| 3 lanes + center turn lane | 29.8 mph | 29.2 mph | 28.2 mph | 27.5 mph |

Acceleration is capped at 1.5 m/s² and comfortable braking at 2.0 m/s². A queue discharges through
a 2.0 s saturation headway with the first five vehicles released at 2.0, 4.2, 6.4, 8.6 and
10.8 m/s. A vehicle executing a left turn crosses at 1.6 m/s of forward progress over 2.5 s, and a
driver mid-lane-change targets 95% of desired speed.

**A driver does not oscillate between lanes.** After completing a change they settle for six
seconds before considering another, and will not move back into the lane they just left for
fourteen seconds after that. Without those two rules a blocked driver flickers between lanes,
because whichever lane they are not in keeps looking marginally better from one instant to the
next. Drivers released from the stop bar also hold their lane for the first four seconds or
25 meters, since nobody discharges from a queue and immediately goes lane-shopping.

**A forced lane change is counted when the driver is actually escaping a left-turner.** The test:
the driver is in the inside lane, is being slowed (braking, or already crawling), and there is a
left-turner within 200 ft ahead in that lane that has dropped below 13 mph. The turner does not
have to be the immediate leader — once one stops in a travel lane the whole queue behind it is
held up by it, and the fourth driver back is as stuck as the first. An earlier version looked only
one vehicle ahead and so counted the first driver behind a turner while missing everybody queued
behind them, which undercounted forced lane changes by about half. Widening the 200 ft to 300 ft
would raise the count by a further fifth; 200 ft is the conservative choice.

**A lane change is not free.** It takes three seconds, during which the driver does not
accelerate and the vehicle intrudes into both lanes — it is a leader for followers in the lane it
is leaving as well as the one it is entering. When the intrusion starts and stops comes from
geometry, not a guess: a 6 ft vehicle crossing an 11 ft lane begins overlapping the target lane
once its center has moved 2.5 ft, and stops overlapping the old lane once its center has moved
8.5 ft. So a weaving maneuver costs the traffic around it, not just the driver making it. This
matters a great deal — an earlier version of this model treated lane changes as instantaneous and
consequently flattered the four-lane cross-section.

**"Held up" means slowed by a left-turner, not merely slow.** A vehicle released from the stop bar
is below 3 m/s for a second or two as well, so a speed test on its own scores drivers who are
simply accelerating away from a green. The measure here also requires the driver not to be
accelerating — which removed about a fifth of what an earlier version was counting.

**A left turn takes time to execute, and needs somewhere to go.** Once a driver accepts a gap they
swing across the opposing lanes into the driveway over 2.5 seconds, holding their own lane until
they have cleared it. They will not start unless the strip of opposing roadway they must cross is
physically empty — a standing queue is not a gap, however long it has been standing. That matters
more than it sounds: with a signal at each end, the opposing stream is stopped for a third of
every cycle, and an earlier version of this model scored a stationary queue as "no traffic arriving" and
sent turners straight through it. Opposing drivers also brake for a vehicle already part-way
through its turn.

The two cross-sections differ in exactly two ways:

1. **Where a left-turner waits.** On four lanes, in the left through lane. On three, in the
   center lane, which it enters 200 ft ahead of its driveway.
2. **How many lanes through traffic has.** Two, or one.

Everything else — arrival times, driver behavior, turn rates, driveway locations, signal timing
— is identical.

Two honest details are built in rather than assumed away. First, the center turn lane is
**shared**: if an opposing left-turner already occupies that stretch of it, the arriving driver
cannot enter, must slow in the through lane, and holds up traffic exactly as they would on four
lanes. Second, on four lanes through drivers **can** escape into the right lane when a gap
allows, so the model is not stacking the deck by trapping them.

## Results at 700 through vehicles per hour, each direction

![Results](road_diet_weaving_results_20260831_1800.png)

| | 4 lanes | 3 lanes + TWLTL |
|---|---:|---:|
| Through vehicles served | 711 veh/h | 711 veh/h |
| Travel time over 1,000 ft | 25.2 s | 24.2 s |
| **95th-percentile travel time** | **38.3 s** | **26.3 s** |
| **Through drivers held up behind a left turn** | **11.0%** | **0%** |
| **Forced lane changes per 100 through vehicles** | **11.1** | **0** |
| Left-turn wait | 6.0 s | 11.2 s |

**The same number of vehicles get through, in all but the same average time** — the road diet is
a second quicker, which is close to nothing. If you stood at the curb with a stopwatch and
timed a random car, you could not tell the two roads apart. Capacity is not the trade being made here — at least not at a signal timing this
street could plausibly have.

What differs is the spread. Take the gap between the typical trip and the unlucky one, and watch
what happens as the road fills:

| Gap between the 95th-percentile trip and the average trip | 400 | 550 | 700 | 850 |
|---|---:|---:|---:|---:|
| 4 lanes, no turn lane | +4.9 s | +9.3 s | +13.1 s | +17.1 s |
| 3 lanes + center turn lane | +2.2 s | +2.2 s | +2.1 s | +1.9 s |

The three-lane road's spread barely moves as it fills — about 2.2 seconds at every volume, easing
to 1.9 at the busiest. The four-lane road's more than triples, from 4.9 to 17.1, because the busier the street the
harder it is to get around somebody waiting to turn. Both roads are carrying the same traffic at
the same average speed the whole way. One of them delivers that average to almost everybody; the
other delivers it on average, while handing one driver in six something much worse.

That is the honest shape of this trade, and it is a better argument than a speed claim, because it
is the delay people actually notice. Nobody complains about a trip that takes the time it usually
takes.

**Boring is the point.** The three-lane road is monotonous: the same trip, every trip, whatever the
traffic is doing. That is not just a nicer drive — it is the same property that makes it the safer
road. A driver who is never surprised by a stopped car in a live travel lane never has to make the
sudden decision that a late brake or a swerve into the next lane is, and those are precisely the
maneuvers behind the rear-end and sideswipe crashes the conversion removes. The four-lane road's
variability and its crash record are two readings of one thing.

**This is the conservative version of the comparison.** Traffic is released from a signal but not
held at the far end, so these are pure block-traversal times. On a real corridor the driver who
loses eleven seconds mid-block is the one who reaches the next signal just after it turns red and
pays for it again with a whole cycle. None of that is counted here.

In absolute terms, on this one block and in one direction, per hour:

- about **77 drivers** who would have been held up behind a left-turner are not,
- about **77 forced weaving maneuvers** do not happen.

## Across the volume range

| Measure | 400 | | 550 | | 700 | | 850 | |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| | 4 ln | 3 ln | 4 ln | 3 ln | 4 ln | 3 ln | 4 ln | 3 ln |
| Through vehicles served (veh/h) | 405 | 405 | 556 | 556 | 711 | 711 | 858 | 859 |
| Travel time, 1,000 ft (s) | 23.1 | 22.8 | 23.7 | 23.4 | 25.2 | 24.2 | 27.2 | 24.8 |
| 95th-percentile travel time (s) | 28.0 | 25.1 | 33.0 | 25.6 | 38.3 | 26.3 | 44.2 | 26.7 |
| Spread (95th − average, s) | +4.9 | +2.2 | +9.3 | +2.2 | +13.1 | +2.1 | +17.1 | +1.9 |
| Held up behind a left turn (%) | 3.1 | 0.0 | 5.9 | 0.0 | 11.0 | 0.0 | 17.3 | 0.0 |
| Forced lane changes per 100 veh | 4.3 | 0.0 | 6.9 | 0.0 | 11.1 | 0.0 | 15.7 | 0.0 |
| Left-turn wait (s) | 2.7 | 4.7 | 4.3 | 7.6 | 6.0 | 11.2 | 8.5 | 14.6 |

**Throughput is identical at every volume tested.** Average travel times differ by at most 2.4
seconds, and the three-lane road is the quicker of the two at every volume — though by a margin
(0.3 to 1.0 s) that nobody would notice below 850. The row that separates them properly is the
spread, and it separates them by more, the busier the street gets.

Note also the last row, which is a genuine cost of the diet and should be stated: **left-turning
drivers wait longer on the three-lane road** — 11.2 seconds against 6.0 at the 700 level — because
they are crossing a single busier opposing lane rather than picking through two. They just do that
waiting somewhere harmless.

As volume rises, escaping a blocked lane gets harder, and the four-lane road's worst trips come
apart while the three-lane road's stay flat at about 26 seconds — within two and a quarter seconds
of its own average, at every volume tested.

At 850 — the busiest case tested — both cross-sections still clear their demand: about 858 through
vehicles an hour each, with a residual queue of a handful of cars behind the stop bar. Nothing is
running out of road. What has happened by then is that on the four-lane road about one driver in
six spends part of the trip stuck behind somebody waiting to turn, and the spread has grown to
seventeen seconds.

## How the replay window is chosen

Every replay starts from the same place, deliberately. The simulation opens with an **empty street
and the signal on red**. Traffic arrives and accumulates at the stop bar for one full red — 36 s
of the 90 s cycle — and the replay window opens at the instant that first green turns, on both
cross-sections at once. So at 0:00 the block is clear, a queue is about to be released, and what
follows is one platoon running into an empty block and a second one behind it. Same starting
conditions in every sample, at every volume, on both roads.

That replaces an earlier scheme that opened the window twelve minutes into a running simulation.
It was defensible — the traffic was fully developed — but it meant each sample caught the street in
a different state, and occasionally a left-turner carried over from the previous green was already
sitting mid-block when the clock started, which read as a car appearing from nowhere.

**Left-turners are amber for their whole trip**, from the stop bar to the driveway, rather than
only once they start slowing for it. It makes the replay easier to follow: you can see which car
is going to cause the blockage before it causes it, and watch where it sits in the platoon.

The measured statistics are a separate thing entirely: full hours with a six-minute warm-up
discarded, unaffected by any of this.

**The samples are ordered, not shuffled.** In the full edition the twelve buttons are not in seed
order: each hour is scored by where its left turns fall in the three-minute, two-cycle window —
`(turns in the first 90 s − turns in the second 90 s) ÷ turns` — and sorted from most front-loaded
to most back-loaded, so samples 1–4 show their turns early, 8–12 hold them back to the second
cycle, and 5–7 split them evenly. `order_seeds.py` recomputes it.

The public edition offers three of those hours per volume rather than all twelve, labelled a, b
and c — at 700 veh/h they are samples 8, 10 and 3 — and switching volume keeps the letter while
swapping the hour underneath it. The published
figures average all twelve hours in both editions — the sample buttons choose what the replay
shows, not what the numbers are built from.

### The carry-over that prompted the change

Counting every green in six full simulated hours per volume — 240 greens each — and asking whether
any vehicle is still on the block when the next platoon is released:

| Green opens with a vehicle still on the block | 550 | 700 | 850 |
|---|---:|---:|---:|
| 4 lanes, no turn lane | 0.8% | 2.1% | **12.1%** |
| 3 lanes + center turn lane | 0.0% | 0.0% | 0.4% |

At 850 veh/h the four-lane road fails to clear the block before the next green about one cycle in
eight, carrying 64 vehicles over across those 240 greens; the three-lane road does it once. That is the same mechanism the rest of this document measures, seen at
the cycle level rather than the trip level: a driver waiting to turn left can hold a 1,000-foot
block for an entire signal cycle when there is no center lane to wait in.

## Cross-checked in SUMO

The same geometry, demand and signal timing were rebuilt in **Eclipse SUMO 1.27** — the
open-source microsimulator DOTs and consultants use — and run independently. SUMO builds its own
network from the node/edge/connection files, runs its own car-following and lane-change models,
and knows nothing about the Python model's results.

**These SUMO runs are of an earlier configuration**: 15% left turns, 50% green, 30 mph, and
traffic held at the far signal. They are kept because that is the harder test — the one where a driver delayed mid-block
can miss the downstream green — and because they were run before that configuration changed. The
SUMO input files in this folder have since been updated to 10% turns and 35 mph to match;
re-running `RUN_SUMO_BUILD.bat` will regenerate them against the current settings.

![SUMO cross-check](sumo_crosscheck_20260831_1800.png)

It reproduces the finding the case rests on. 95th-percentile delay on the progressed direction:

| Through veh/h | 4 lanes | 3 lanes |
|---|---:|---:|
| 400 | 43 s | 44 s |
| 550 | 49 s | 48 s |
| 700 | **86 s** | **57 s** |
| 850 | **117 s** | **57 s** |

The three-lane tail is flat across the whole range; the four-lane tail runs away above 550. Two
simulators, different code, same conclusion.

**It also puts a harder number on the capacity ceiling.** Induction loops on the two stop bars
measured the single through lane passing about **800 vehicles per hour**, not the 900 the flat
headway calculation suggests. At 850 demand the three-lane road served 680 eastbound through
vehicles; the four-lane road served 917.

**Where the two models differ, it is a measurement boundary, not a disagreement.** SUMO's routes
begin 150 m upstream of the signal, so its delay figures include the queue at the stop bar; the
Python model measures stop bar to stop bar and reports that queue separately. With one lane at
roughly 90% of capacity that queue is exactly where the cost lands, which is why SUMO's *mean*
delay is slightly worse for the three-lane section until 850, where the four-lane road overtakes
it. Both models agree on the summary: **inside the block the road diet is faster and far more
reliable; at the stop bar it needs enough green.**

## What this is not

- **It is not a safety analysis** — and safety is the main argument, as the warning at the top
  says. The 19–47% overall crash reduction FHWA reports comes from before-and-after field studies
  of real conversions, not from simulation. What this
  model does contribute is the count of the maneuvers behind a good share of those crashes:
  roughly 77 forced lane changes per hour per direction on 1,000 feet of four-lane street, going
  to zero.
- **It assumes the signalized approaches keep their capacity.** A diet that narrows the
  intersection approach as well as the midblock section would add intersection delay this does
  not show. Keeping the approach wide is standard road-diet design practice for exactly that
  reason.
- **It is not a corridor model.** No pedestrians, no on-street parking, no buses, no heavy
  vehicles, no grades, no curve, no side-street traffic. Any of those would make the four-lane
  case worse, not better — a stopped bus or a double-parked van blocks a through lane on four
  lanes and a turn lane on three.
- **Queues are modeled as blocking driveways.** A standing queue across a driveway mouth stops a
  left-turner using it, with no allowance for the courtesy gap drivers often leave. That is
  conservative for both cross-sections, but it bites the four-lane road harder, because its
  left-turners do their waiting in a travel lane.
- **It is not calibrated to Boston Post Road.** The volumes, driveway spacing, turn percentage
  and signal timing are assumptions. A corridor-specific model would use surveyed driveway
  locations, turning counts and the real signal timing plan.

## Files

| File | What it is |
|---|---|
| `road_diet_weaving_explainer_public_20260831_1800.html` | Animated explainer, public edition — the replay, the headline numbers and the reliability finding |
| `road_diet_weaving_explainer_complex_20260831_1800.html` | Animated explainer, full edition — adds the turn-share sensitivity and the green-split analysis |
| `road_diet_weaving_writeup_public_20260831_1800.md` | This document, public edition |
| `road_diet_weaving_writeup_complex_20260831_1800.md` | This document, full edition |
| `road_diet_weaving_results_20260831_1800.png` | The results figure above |
| `sumo_crosscheck_20260831_1800.png` | The SUMO cross-check figure above |
| `roaddiet_sim_20260831_1800.py` | The microsimulation |
| `analyze_20260831_1800.py` | Volume sweep, left-turn isolation runs and green-split sensitivity, over twelve seeds |
| `turnshare_20260831_1800.py` | The 5 / 10 / 15% turn-share sweep, over eight seeds |
| `seedcheck_20260831_1800.py` | The six-versus-twelve-hour robustness check |
| `build_pages_20260831_1800.py`, `build_writeups_20260831_1800.py` | Produce the public and complex editions from the single source |
| `carryover_20260831_1800.py` | The block-clearance check |
| `greensplit_20260831_2030.py`, `greensplit_20260831_2030.json` | The full sweep at 60% vs 65% green |
| `cyclelen.py`, `cyclelen.json` | The full sweep at a 60 s vs 90 s cycle |
| `order_seeds_20260831_1800.py` | Scores and orders the twelve traffic samples by when their left turns arrive |
| `make_trace_20260831_1800.py` | Dumps the vehicle traces the animation replays, for all twelve hours |
| `make_chart_20260831_1800.py`, `make_turnshare_chart_20260831_1800.py`, `make_sumo_chart_20260831_1800.py` | Build the figures |
| `refresh_data_20260831_1800.py` | Rewrites the explainer's embedded numbers from the result files |
| `build_pages_20260831_1800.py`, `build_writeups_20260831_1800.py` | Produce the public and complex editions from the single source |
| `make_sumo_20260831_1800.py` | Generates the SUMO networks below |
| `results_20260831_1800.json`, `turnshare_20260831_1800.json`, `carryover_20260831_1800.json`, `seed_order_20260831_1800.json` | All numbers in this document |
| `results_30mph_previous.json` | The same sweep at the earlier 30 mph assumption, kept for comparison |
| `RUN_SUMO_BUILD.bat` | Builds both SUMO networks and runs all four volumes, logging to `build_log.txt` |
| `sumo/4lane/`, `sumo/3lane/` | SUMO models of both cross-sections, signals included. Run `build.bat` then `sumo-gui -c run_700.sumocfg`, or `run_all.bat` for all volumes headless. |

The SUMO models have been built and run — `netconvert` succeeds on both networks, the coordinated
signal plans come out at 45 / 4 / 37 / 4 with 26 s of offset, and all four volumes run clean. Lane
changing uses SUMO's sublane model, so vehicles slide across the lane line rather than jumping.
To watch it, run `build.bat` in either folder then `sumo-gui -c run_700.sumocfg`, and set street
coloring to "by speed" and vehicle coloring to "by waiting time" — the drivers stuck behind a
left-turner light up.
