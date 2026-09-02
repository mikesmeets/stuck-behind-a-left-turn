"""Build both editions of the explainer from one template.

  public  -- the argument only: the replay, the headline numbers, the volume
             sweep, the reliability spread, the method note.
  complex -- everything, including the turn-share sensitivity and the
             green-split analysis.

The two extra sections are fenced in the template with
<!--COMPLEX-ONLY-START--> / <!--COMPLEX-ONLY-END-->, so there is one source
of truth and the public page can never drift away from the complex one.
"""
import json
import re

TPL = "/home/claude/explainer_template.html"
TRACE = "/home/claude/trace.json"

# Upstream queue over the measured hour, from queue_trace.py. Only the
# build-up edition plots it; the other two get null and the block no-ops.
QUEUE = json.load(open("/home/claude/queue.json"))
def fence(tag):
    return re.compile(f"<!--{tag}-ONLY-START-->.*?<!--{tag}-ONLY-END-->", re.S)


COMPLEX_ONLY = fence("COMPLEX")
BUILDUP_ONLY = fence("BUILDUP")

# Every signalized intersection on the corridor, at its PM peak through volume
# in the busier direction.  The build-up edition plots these against the
# simulated volumes so a reader can see where the real street sits on the
# ladder -- and that nothing on it is near the volume that breaks the diet.
CORRIDOR = [
    ("The Pkwy & Harrison Avenue", 416),
    ("Larchmont Avenue", 445),
    ("Greenhaven Road & Sterling Avenue", 461),
    ("Beach Avenue", 481),
    ("Deane Place & Winans Street", 521),
    ("Lorenzen Street & Pine Ridge Road", 526),
    ("Monroe Avenue & Chatsworth Avenue", 558),
    ("N Barry Avenue", 571),
    ("Mamaroneck Avenue", 575),
    ("Hommocks Road & Weaver Street", 640),
    ("Dubois Avenue", 650),
    ("Orienta Avenue", 670),
    ("Old Post Road & Richbell Road", 687),
    ("Mamaroneck High School Driveway", 777),
    ("Fenimore Road", 796),
    ("Alden Road", 808),
    ("Delancey Avenue", 831),
]

# The walk-through. One panel per volume, shown under the replay.
STEPS = {
    400: {
        "eyebrow": "400 veh/h · most of the day",
        "head": "Barely a difference worth arguing about",
        "body": [
            "A left-turner still stops in a travel lane on the four-lane road, and drivers still go around. But the street is empty enough that going around costs nothing: there is a gap in the next lane whenever you want one, and plenty of green left to catch.",
            "Three drivers in a hundred get held up, and the unlucky trip runs <b>4.9 seconds</b> longer than the average against the three-lane road’s 2.2. If this were the whole picture, the road diet would be a safety project with no traffic argument attached either way."
        ]
    },
    550: {
        "eyebrow": "550 veh/h · a normal busy hour",
        "head": "Still comfortable, but the gap opens",
        "body": [
            "Same story, more of it. Six drivers in a hundred are now held up behind somebody waiting to turn, and about seven per hundred have to change lanes to get past.",
            "The four-lane road’s spread has nearly doubled to <b>9.3 seconds</b>. The three-lane road has not moved: still 2.2. That divergence is the whole build-up in miniature — one road is starting to feel the traffic and the other is not."
        ]
    },
    700: {
        "eyebrow": "700 veh/h · the busy intersections",
        "head": "The benefit shows up",
        "body": [
            "There is a real amount of weaving now — <b>eleven forced lane changes per hundred vehicles</b>, and eleven percent of drivers spending part of the trip stuck behind a left turn. On the three-lane road, neither happens at all.",
            "Both roads still get everybody through, in the same average time. The difference is entirely in the spread: <b>13.1 seconds</b> against 2.1 — six times as much. This is the volume most of the corridor’s busier intersections actually run at."
        ]
    },
    850: {
        "eyebrow": "850 veh/h · the busiest movement on the corridor",
        "head": "The weaving benefit gets large — and the headroom starts to go",
        "body": [
            "A driver in six is now held up, sixteen per hundred are forced to weave, and the four-lane road’s unlucky trip runs <b>17.1 seconds</b> past its average. The three-lane road is still flat at 1.9.",
            "Both roads still serve the hour, and both leave a handful of vehicles at the stop bar when the green ends. But in the chart below the three-lane queue is starting to run heavier than the four-lane one and to take longer to clear — still flat over the hour, but no longer identical. The diet is at its most useful here and beginning to run out of room — which is what the next step is about."
        ]
    },
    1000: {
        "eyebrow": "1,000 veh/h · past anything on this corridor",
        "head": "Where the road diet breaks",
        "body": [
            "One through lane discharging at a two-second saturation headway with 60% of the cycle has a ceiling near <b>1,080 vehicles an hour</b>. Demand here is 1,111 including the turners. It does not fit.",
            "<b>The three-lane road fails, and it fails in every one of the twelve hours.</b> It serves about <b>927</b> through vehicles instead of 1,000 and ends the hour with roughly <b>108 still queued</b> behind the stop bar — the best of the twelve ends with 77, the worst with 128. Its trips stay short and predictable, because the cars that get through have an easy time of it, but a queue that never comes down is a failure whatever the travel times say. The chart below is that failure: watch the orange line climb and never return.",
            "The four-lane road clears, and clears reliably — about <b>1,008</b> served with a dozen vehicles waiting at the end of the hour, in all twelve. It pays for that in weaving: a quarter of its drivers held up behind a left turn, twenty-two forced lane changes per hundred vehicles, and a <b>22-second</b> spread between the average trip and the unlucky one.",
            "<b>No intersection on this corridor is close to this.</b> The busiest movement measured anywhere on it is 831 vehicles an hour at Delancey Avenue. The breakdown point is real, and it is well above the street."
        ]
    }
}

# Sample order for the full edition: most front-loaded left turns first.
# order_seeds.py recomputes it.
ORDER = [77, 88, 55, 11, 66, 33, 44, 110, 121, 22, 99, 132]

# The public edition offers three chosen hours per volume, labelled a/b/c,
# given here as positions in ORDER (the sample numbers on the full edition's
# buttons) so they stay readable against what is on screen there.
# Renumbered whenever the sample ordering changes, so that these keep
# selecting the same twelve simulated hours Michael chose: seeds 121/66/77
# at 550, 110/99/55 at 700, 77/22/99 at 850.
PICKS = {550: [9, 5, 1], 700: [8, 11, 3], 850: [1, 10, 11]}

NOTE = {
    "complex":
        'Twelve independent hours, same demand, ordered by when the left turns '
        'arrive: <b>1\u20134</b> front-load them into the first cycle, '
        '<b>8\u201312</b> hold them back to the second, <b>5\u20137</b> split '
        'them evenly. The <span class="redfig">red figure</span> on each button '
        'is how many through drivers that hour holds up behind a left turn on '
        'the four-lane road \u2014 on the three-lane road it is zero in every '
        'one of them. The replay is fixed to whichever you pick; the figures '
        'further down average all twelve.',
    "public_labelled":
        'Three independent hours of traffic at each volume, <b>a</b>, <b>b</b> '
        'and <b>c</b>. The <span class="redfig">red figure</span> on each button '
        'is how many through drivers that hour holds up behind a left turn on '
        'the four-lane road \u2014 on the three-lane road it is zero in every '
        'one. Switching volume keeps the letter you are on. The figures further '
        'down average twelve such hours, not only these three.',
    "public": None,   # filled in below: same as the full edition
}

INTRO = {
    "complex":
        'switches between twelve independent hours \u2014 the figures further '
        'down average all twelve, but the replay always shows the one you '
        'choose.',
    "public_labelled":
        'switches between three independent hours at each volume \u2014 the '
        'figures further down average twelve such hours, but the replay always '
        'shows the one you choose.',
}
REPLAYNOTE = {
    "complex": "shows whichever of the twelve sample hours you pick, and never "
               "reshuffles.",
    "public": "shows whichever of the three sample hours you pick, and never "
              "reshuffles.",
    "buildup": "shows one fixed hour at each volume, and never reshuffles.",
}

NOTE["public"] = NOTE["public_labelled"]
NOTE["buildup"] = (
    'One hour of traffic at each volume. The <span class="redfig">red '
    'figure</span> is how many through drivers that hour holds up behind a '
    'left turn on the four-lane road \u2014 on the three-lane road it is '
    'zero at every volume until the diet runs out of capacity. Step the '
    'volume up and watch it grow.')
INTRO["public"] = INTRO["public_labelled"]
INTRO["buildup"] = (
    'is fixed to one hour per volume, so what changes as you step up the '
    'ladder is the traffic, not the luck of the draw.')

# The build-up edition offers one hour per volume: the walk-through is about
# the volume ladder, and a sample picker would only get in the way.
# One hour per volume, chosen by the same rule at every volume: the
# 9th-busiest of the twelve for drivers held up behind a left turn. Picking
# by a fixed rank rather than by eye keeps the ladder honest -- it rises
# because the traffic rises, not because the samples were hand-sorted.
BUILDUP_PICK = {400: 2, 550: 7, 700: 5, 850: 10, 1000: 1}

SAMPLES = {
    "complex": {"mode": "all", "seeds": ORDER},
    "buildup": {"mode": "labelled", "labels": ["a"],
                "byVol": {v: [ORDER[i - 1]] for v, i in BUILDUP_PICK.items()}},
    # Public edition: three chosen hours per volume, labelled a/b/c, from
    # PICKS above.  For all twelve numbered hours instead, swap this for
    #   {"mode": "all", "seeds": ORDER}
    # and the buttons, labels and shipped traces all follow.
    "public": {"mode": "labelled", "labels": ["a", "b", "c"],
               "byVol": {v: [ORDER[i - 1] for i in picks]
                         for v, picks in PICKS.items()}},
}

SHOWVOLS = {
    "public": [400, 550, 700, 850],
    "complex": [400, 550, 700, 850],
    "buildup": [400, 550, 700, 850, 1000],
}

# Volumes the replay offers. Kept narrower than SHOWVOLS for the two older
# editions so their pages do not grow: every extra volume is twelve more hours
# of trace inlined into the file.
REPLAYVOLS = {
    "public": [550, 700, 850],
    "complex": [550, 700, 850],
    "buildup": [400, 550, 700, 850, 1000],
}

TITLES = {"public": "Short Version", "complex": "Full Version", "buildup": None}

SKELETON = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<style>:root{color-scheme:light dark}body{margin:0;'
            'font:14px system-ui}img{max-width:100%}'
            '[hidden]{display:none!important}</style>\n')

tpl = open(TPL).read()
trace = open(TRACE).read().strip()

for edition in ("public", "complex", "buildup"):
    page = tpl
    if edition != "complex":
        page = COMPLEX_ONLY.sub("", page)
    if edition != "buildup":
        page = BUILDUP_ONLY.sub("", page)
    if edition == "public":
        # the sweep footnote points at a section the public page does not have
        page = page.replace("850&nbsp;veh/h is in\n    the table below.",
                            "850&nbsp;veh/h is in the table below.")
    if TITLES[edition]:
        page = page.replace("<title>Stuck Behind a Left Turn</title>",
                            f"<title>Stuck Behind a Left Turn "
                            f"({TITLES[edition]})</title>")
    page = page.replace("/*SAMPLES*/", json.dumps(SAMPLES[edition]))
    page = page.replace("/*SAMPLENOTE*/", NOTE[edition])
    page = page.replace("/*SAMPLEINTRO*/", INTRO[edition])
    page = page.replace("/*REPLAYNOTE*/", REPLAYNOTE[edition])
    page = page.replace("/*SHOWVOLS*/", json.dumps(SHOWVOLS[edition]))
    page = page.replace("/*REPLAYVOLS*/", json.dumps(REPLAYVOLS[edition]))
    page = page.replace("/*CORRIDOR*/",
                        json.dumps(CORRIDOR) if edition == "buildup" else "null")
    page = page.replace("/*STEPS*/",
                        json.dumps(STEPS) if edition == "buildup" else "null")
    page = page.replace("/*QUEUE*/",
                        json.dumps(QUEUE, separators=(",", ":"))
                        if edition == "buildup" else "null")

    # Ship only the traces this edition can actually replay.  Every volume and
    # every sample left in costs about 140 KB of inlined JSON.
    sp = SAMPLES[edition]
    vols = REPLAYVOLS[edition]
    if sp["mode"] == "labelled":
        keep = {f"{c}_{v}_{sd}" for v, sds in sp["byVol"].items() if v in vols
                for sd in sds for c in ("4lane", "3lane")}
        seeds = sorted({sd for v, sds in sp["byVol"].items() if v in vols
                        for sd in sds})
    else:
        keep = {f"{c}_{v}_{sd}" for v in vols for sd in sp["seeds"]
                for c in ("4lane", "3lane")}
        seeds = list(sp["seeds"])
    t = json.loads(trace)
    t["scen"] = {k: val for k, val in t["scen"].items() if k in keep}
    t["vols"] = list(vols)
    t["seeds"] = seeds
    use_trace = json.dumps(t, separators=(",", ":"))

    art = page.replace("/*TRACE*/", use_trace)

    art_path = f"/home/claude/road_diet_weaving_{edition}.html"
    std_path = f"/home/claude/road_diet_weaving_{edition}_standalone.html"
    open(art_path, "w").write(art)
    open(std_path, "w").write(SKELETON + art + "\n</body>\n</html>\n")

    kept = [m for m in re.findall(r'<section id="([^"]+)"', art)]
    print(f"{edition:8s} {len(art) / 1e6:5.2f} MB   sections: {kept}")
