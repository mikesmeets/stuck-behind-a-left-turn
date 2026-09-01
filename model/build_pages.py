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
FENCE = re.compile(r"<!--COMPLEX-ONLY-START-->.*?<!--COMPLEX-ONLY-END-->",
                   re.S)

# Sample order for the full edition: most front-loaded left turns first.
# order_seeds.py recomputes it.
ORDER = [77, 88, 55, 66, 11, 44, 33, 110, 121, 99, 22, 132]

# The public edition offers three chosen hours per volume, labelled a/b/c,
# given here as positions in ORDER (the sample numbers on the full edition's
# buttons) so they stay readable against what is on screen there.
PICKS = {550: [9, 4, 1], 700: [8, 10, 3], 850: [1, 11, 10]}

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
}

NOTE["public"] = NOTE["public_labelled"]
INTRO["public"] = INTRO["public_labelled"]

SAMPLES = {
    "complex": {"mode": "all", "seeds": ORDER},
    # Public edition: three chosen hours per volume, labelled a/b/c, from
    # PICKS above.  For all twelve numbered hours instead, swap this for
    #   {"mode": "all", "seeds": ORDER}
    # and the buttons, labels and shipped traces all follow.
    "public": {"mode": "labelled", "labels": ["a", "b", "c"],
               "byVol": {v: [ORDER[i - 1] for i in picks]
                         for v, picks in PICKS.items()}},
}

SKELETON = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<style>:root{color-scheme:light dark}body{margin:0;'
            'font:14px system-ui}img{max-width:100%}'
            '[hidden]{display:none!important}</style>\n')

tpl = open(TPL).read()
trace = open(TRACE).read().strip()

for edition in ("public", "complex"):
    page = tpl if edition == "complex" else FENCE.sub("", tpl)
    if edition == "public":
        # the sweep footnote points at a section the public page does not have
        page = page.replace("850&nbsp;veh/h is in\n    the table below.",
                            "850&nbsp;veh/h is in the table below.")
    label = "Public" if edition == "public" else "Complex"
    page = page.replace("<title>Stuck Behind a Left Turn</title>",
                        f"<title>Stuck Behind a Left Turn ({label})</title>")
    page = page.replace("/*SAMPLES*/", json.dumps(SAMPLES[edition]))
    page = page.replace("/*SAMPLENOTE*/", NOTE[edition])
    page = page.replace("/*SAMPLEINTRO*/", INTRO[edition])
    page = page.replace("/*REPLAYNOTE*/", REPLAYNOTE[edition])

    if SAMPLES[edition]["mode"] == "labelled":
        # ship only the hours this edition can show
        keep = {f"{c}_{v}_{sd}" for v, sds in SAMPLES[edition]["byVol"].items()
                for sd in sds for c in ("4lane", "3lane")}
        t = json.loads(trace)
        t["scen"] = {k: val for k, val in t["scen"].items() if k in keep}
        t["seeds"] = sorted({sd for sds in SAMPLES[edition]["byVol"].values()
                             for sd in sds})
        use_trace = json.dumps(t, separators=(",", ":"))
    else:
        use_trace = trace

    art = page.replace("/*TRACE*/", use_trace)

    art_path = f"/home/claude/road_diet_weaving_{edition}.html"
    std_path = f"/home/claude/road_diet_weaving_{edition}_standalone.html"
    open(art_path, "w").write(art)
    open(std_path, "w").write(SKELETON + art + "\n</body>\n</html>\n")

    kept = [m for m in re.findall(r'<section id="([^"]+)"', art)]
    print(f"{edition:8s} {len(art) / 1e6:5.2f} MB   sections: {kept}")
