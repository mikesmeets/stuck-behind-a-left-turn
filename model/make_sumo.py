#!/usr/bin/env python3
"""
Build the SUMO models for the road-diet weaving toy example.

Creates two scenarios under ./sumo/ :

  4lane/  1,000 ft of 4-lane undivided road (2 through lanes each way).
          Left turns are made FROM the left through lane, so a waiting
          left-turner blocks through traffic behind it.

  3lane/  1,000 ft of 3-lane road: 1 through lane each way plus a centre
          two-way left-turn lane.  SUMO has no native TWLTL type, so the
          TWLTL is modelled the standard way -- as a left-turn pocket on
          each approach, half of the centre lane wide (2.00 m), with
          the two directions' pockets offset from one another exactly as
          the real driveways are.  Left-turners leave the through lane
          200 ft upstream of the driveway and wait clear of it.

Three driveways serve each direction, offset side to side:
  eastbound turns left at 250 / 500 / 750 ft (north side)
  westbound turns left at 375 / 625 / 875 ft (south side)

Demand: THROUGH_VPH straight per direction, plus 10% of all vehicles
turning left, split evenly across that direction's three driveways.

Usage:  python make_sumo.py [through_vph ...]
        (default 400 550 700 850)
"""

import os
import sys

FT = 0.3048
SEG = 1000 * FT                       # 304.8 m of measured roadway
APPROACH = 150.0                      # m of upstream storage outside the segment
EXIT = 150.0

DW_EB = [250 * FT, 500 * FT, 750 * FT]        # north-side driveways
DW_WB = [375 * FT, 625 * FT, 875 * FT]        # south-side driveways
POCKET = 200 * FT                     # 61 m left-turn pocket / TWLTL entry

LANE_W = 3.35                         # 11 ft travel lane
TWLTL_HALF = 2.00                     # half of the centre turn lane.  A true
                                      # 12 ft TWLTL halves to 1.83 m, but the
                                      # sublane model needs a little clearance
                                      # around an 1.80 m vehicle, so each half
                                      # is 2.00 m (a 13 ft centre lane).
SIDE_LEN = 40.0
CROSS_LEN = 60.0                      # cross-street stubs at the signals
V_MAIN = 35 * 0.44704                 # 35 mph
V_SIDE = 15 * 0.44704

LEFT_SHARE = 0.10
SIM_END = 3960                        # 360 s warm-up + 3600 s measured

# Signals at both ends of the measured section, running together (offset 0).
# Nothing is held on the way out of the block, so a progression offset would
# only stagger when the two directions are released.
CYCLE = 90
GREEN = 58
YELLOW = 4
OFFSET = 0


def fmt(x):
    return f"{x:.2f}"


class Builder:
    def __init__(self, cfg):
        assert cfg in ("4lane", "3lane")
        self.cfg = cfg
        self.nodes = {}          # id -> (x, y, type)
        self.edges = []          # dicts
        self.conns = []

    # ------------------------------------------------------------------ nodes
    def node(self, nid, x, y, ntype="priority"):
        self.nodes[nid] = (x, y, ntype)
        return nid

    def edge(self, eid, frm, to, lanes, speed, width=None, allow_left=False):
        self.edges.append(dict(id=eid, frm=frm, to=to, lanes=lanes,
                               speed=speed, width=width))

    # ------------------------------------------------------------------ build
    def build(self):
        x0, x1 = -APPROACH, SEG + EXIT

        # every x where something happens on the mainline
        pts = {x0: "src", 0.0: "seg_start", SEG: "seg_end", x1: "snk"}
        for x in DW_EB:
            pts[x] = "dw_n"
        for x in DW_WB:
            pts[x] = "dw_s"
        if self.cfg == "3lane":
            for x in DW_EB:
                pts.setdefault(x - POCKET, "pk")     # EB pocket start
            for x in DW_WB:
                pts.setdefault(x + POCKET, "pk")     # WB pocket start

        xs = sorted(pts)
        ids = {}
        for i, x in enumerate(xs):
            nid = f"M{i}"
            ids[x] = nid
            # the two ends of the measured section are the signalized ones
            is_sig = abs(x) < 0.01 or abs(x - SEG) < 0.01
            self.node(nid, x, 0.0, "traffic_light" if is_sig else "priority")
        self.sig_west, self.sig_east = ids[0.0], ids[SEG]

        # side streets at each driveway
        for j, x in enumerate(DW_EB):
            self.node(f"Nn{j}", x, SIDE_LEN)
        for j, x in enumerate(DW_WB):
            self.node(f"Ns{j}", x, -SIDE_LEN)

        # cross streets at the two signalized ends.  They carry no demand --
        # they exist so netconvert builds a signal that actually alternates
        # instead of one that is permanently green.
        for tag, x in (("W", 0.0), ("E", SEG)):
            self.node(f"X{tag}n", x, CROSS_LEN)
            self.node(f"X{tag}s", x, -CROSS_LEN)

        # ------------------------------------------------- mainline edges
        # Eastbound (left turns to the north side), westbound the reverse.
        for i in range(len(xs) - 1):
            a, b = xs[i], xs[i + 1]
            na, nb = ids[a], ids[b]
            self.edges.append(dict(id=f"EB{i}", frm=na, to=nb, idx=i,
                                   lanes=self._lanes("EB", a, b),
                                   speed=V_MAIN, dirn="EB"))
            self.edges.append(dict(id=f"WB{i}", frm=nb, to=na, idx=i,
                                   lanes=self._lanes("WB", a, b),
                                   speed=V_MAIN, dirn="WB"))

        for j, x in enumerate(DW_EB):
            self.edges.append(dict(id=f"DN{j}", frm=ids[x], to=f"Nn{j}",
                                   lanes=1, speed=V_SIDE, dirn="side"))
        for j, x in enumerate(DW_WB):
            self.edges.append(dict(id=f"DS{j}", frm=ids[x], to=f"Ns{j}",
                                   lanes=1, speed=V_SIDE, dirn="side"))

        for tag, x in (("W", 0.0), ("E", SEG)):
            for side in ("n", "s"):
                self.edges.append(dict(id=f"X{tag}{side}in", frm=f"X{tag}{side}",
                                       to=ids[x], lanes=1, speed=V_SIDE,
                                       dirn="cross"))
                self.edges.append(dict(id=f"X{tag}{side}out", frm=ids[x],
                                       to=f"X{tag}{side}", lanes=1,
                                       speed=V_SIDE, dirn="cross"))

        self.ids, self.xs = ids, xs

    def _lanes(self, dirn, a, b):
        """Lane count on the piece of road spanning x = a..b (a < b).

        4-lane: two through lanes everywhere.
        3-lane: one through lane, plus the centre turn lane wherever this
        piece lies inside a POCKET-long approach to one of that direction's
        driveways.
        """
        if self.cfg == "4lane":
            return 2
        if dirn == "EB":
            for dw in DW_EB:
                if a >= dw - POCKET - 0.01 and b <= dw + 0.01:
                    return 2
        else:
            for dw in DW_WB:
                if b <= dw + POCKET + 0.01 and a >= dw - 0.01:
                    return 2
        return 1

    # ------------------------------------------------------------ connections
    def connections(self):
        out = []
        xs = self.xs
        n = len(xs) - 1
        nl = {e["id"]: e["lanes"] for e in self.edges}

        for i in range(n):
            # ---- eastbound: EBi spans xs[i] -> xs[i+1]
            here = xs[i + 1]
            if i + 1 < n:
                # the through movement always continues in lane 0
                out.append((f"EB{i}", f"EB{i+1}", 0, 0))
                # a continuing centre/left lane connects lane 1 -> lane 1
                if nl[f"EB{i}"] == 2 and nl[f"EB{i+1}"] == 2:
                    out.append((f"EB{i}", f"EB{i+1}", 1, 1))
            if here in DW_EB:
                j = DW_EB.index(here)
                out.append((f"EB{i}", f"DN{j}", nl[f"EB{i}"] - 1, 0))

            # ---- westbound: WBi spans xs[i+1] -> xs[i]
            hereW = xs[i]
            if i - 1 >= 0:
                out.append((f"WB{i}", f"WB{i-1}", 0, 0))
                if nl[f"WB{i}"] == 2 and nl[f"WB{i-1}"] == 2:
                    out.append((f"WB{i}", f"WB{i-1}", 1, 1))
            if hereW in DW_WB:
                j = DW_WB.index(hereW)
                out.append((f"WB{i}", f"DS{j}", nl[f"WB{i}"] - 1, 0))
        self.conns = out

    # ----------------------------------------------------------------- output
    def write(self, d):
        os.makedirs(d, exist_ok=True)
        with open(f"{d}/net.nod.xml", "w") as f:
            f.write('<nodes>\n')
            for nid, (x, y, t) in self.nodes.items():
                extra = ''
                if t == "traffic_light":
                    extra = f' tl="{nid}" tlType="static"'
                f.write(f'  <node id="{nid}" x="{fmt(x)}" y="{fmt(y)}" '
                        f'type="{t}"{extra}/>\n')
            f.write('</nodes>\n')

        with open(f"{d}/net.edg.xml", "w") as f:
            f.write('<edges>\n')
            for e in self.edges:
                f.write(f'  <edge id="{e["id"]}" from="{e["frm"]}" '
                        f'to="{e["to"]}" numLanes="{e["lanes"]}" '
                        f'speed="{fmt(e["speed"])}" priority="'
                        f'{1 if e["dirn"] in ("side", "cross") else 3}" '
                        f'spreadType="center">\n')
                if (self.cfg == "3lane" and e["lanes"] == 2
                        and e["dirn"] in ("EB", "WB")):
                    # lane 0 = through, lane 1 = half of the centre TWLTL
                    f.write(f'    <lane index="0" width="{fmt(LANE_W)}"/>\n')
                    f.write(f'    <lane index="1" width="{fmt(TWLTL_HALF)}"/>\n')
                elif e["dirn"] in ("EB", "WB"):
                    for k in range(e["lanes"]):
                        f.write(f'    <lane index="{k}" width="{fmt(LANE_W)}"/>\n')
                f.write('  </edge>\n')
            f.write('</edges>\n')

        with open(f"{d}/net.con.xml", "w") as f:
            f.write('<connections>\n')
            for a, b, fl, tl in self.conns:
                f.write(f'  <connection from="{a}" to="{b}" fromLane="{fl}" '
                        f'toLane="{tl}"/>\n')
            f.write('</connections>\n')


def write_routes(b, d, vols, n_edges):
    SEG_ = SEG
    """Flows: through traffic end to end, plus left turns into each driveway."""
    xs = b.xs
    eb_thru = [f"EB{i}" for i in range(n_edges)]
    wb_thru = [f"WB{i}" for i in range(n_edges - 1, -1, -1)]

    eb_left = []
    for j, x in enumerate(DW_EB):
        k = xs.index(x)                    # EB edge k-1 ends at the driveway
        eb_left.append([f"EB{i}" for i in range(k)] + [f"DN{j}"])
    wb_left = []
    for j, x in enumerate(DW_WB):
        k = xs.index(x)                    # WB edge k ends at the driveway
        wb_left.append([f"WB{i}" for i in range(n_edges - 1, k - 1, -1)]
                       + [f"DS{j}"])

    dep_lane = "free" if b.cfg == "4lane" else "0"

    with open(f"{d}/net.rou.xml", "w") as f:
        f.write('<routes>\n')
        # SL2015 is SUMO's sublane lane-change model: vehicles move across the
        # lane line continuously instead of teleporting sideways.  maxSpeedLat
        # 1.1 m/s puts a 3.35 m lane change at about 3 s, matching the Python
        # model's manoeuvre time.  Requires <lateral-resolution> in the .sumocfg.
        f.write('  <vType id="car" length="5.00" width="1.80" minGap="2.50"\n'
                '         accel="1.50" decel="2.00" emergencyDecel="6.00"\n'
                '         sigma="0.4" speedDev="0.08" carFollowModel="IDM"\n'
                '         tau="1.20" laneChangeModel="SL2015"\n'
                '         maxSpeedLat="1.10" minGapLat="0.30"\n'
                '         latAlignment="center" lcSublane="1.0"\n'
                '         lcCooperative="1.0" lcSpeedGain="1.0"\n'
                '         lcAssertive="1.0"/>\n')
        f.write(f'  <route id="eb_thru" edges="{" ".join(eb_thru)}"/>\n')
        f.write(f'  <route id="wb_thru" edges="{" ".join(wb_thru)}"/>\n')
        for j in range(3):
            f.write(f'  <route id="eb_left{j}" '
                    f'edges="{" ".join(eb_left[j])}"/>\n')
            f.write(f'  <route id="wb_left{j}" '
                    f'edges="{" ".join(wb_left[j])}"/>\n')
        f.write('</routes>\n')

    for vph in vols:
        total = vph / (1 - LEFT_SHARE)
        each = total * LEFT_SHARE / 3.0
        with open(f"{d}/demand_{vph}.rou.xml", "w") as f:
            f.write('<routes>\n')
            for way in ("eb", "wb"):
                f.write(f'  <flow id="{way}_thru" type="car" '
                        f'route="{way}_thru" begin="0" end="{SIM_END}" '
                        f'vehsPerHour="{vph}" departLane="{dep_lane}" '
                        f'departSpeed="desired"/>\n')
                for j in range(3):
                    f.write(f'  <flow id="{way}_left{j}" type="car" '
                            f'route="{way}_left{j}" begin="0" end="{SIM_END}" '
                            f'vehsPerHour="{each:.1f}" departLane="'
                            f'{dep_lane}" departSpeed="desired"/>\n')
            f.write('</routes>\n')

        with open(f"{d}/run_{vph}.sumocfg", "w") as f:
            f.write(f'''<configuration>
  <input>
    <net-file value="net.net.xml"/>
    <route-files value="net.rou.xml,demand_{vph}.rou.xml"/>
    <additional-files value="signals.add.xml,measure_{vph}.add.xml"/>
  </input>
  <time>
    <begin value="0"/>
    <end value="{SIM_END}"/>
    <step-length value="0.25"/>
  </time>
  <output>
    <tripinfo-output value="out/tripinfo_{vph}.xml"/>
    <summary-output value="out/summary_{vph}.xml"/>
  </output>
  <processing>
    <time-to-teleport value="-1"/>
    <lateral-resolution value="0.40"/>
  </processing>
  <report><no-step-log value="true"/></report>
</configuration>
''')

    # Induction loops on the two stop bars of the measured 1,000 ft.  Matching
    # a vehicle's crossing times at the two gives its true block travel time --
    # what the Python model measures, and what edge data cannot give cleanly
    # (edge data samples only occupied edges, and SUMO's drivers exceed the
    # speed limit, so it reads faster than any vehicle actually travels).
    xs = b.xs
    ent, ext = {}, {}
    for e in b.edges:
        if e["dirn"] not in ("EB", "WB"):
            continue
        a, c = xs[e["idx"]], xs[e["idx"] + 1]
        if e["dirn"] == "EB":
            if abs(a) < 0.01:
                ent["EB"] = e
            if abs(c - SEG) < 0.01:
                ext["EB"] = e
        else:                       # WB travels from c down to a
            if abs(c - SEG) < 0.01:
                ent["WB"] = e
            if abs(a) < 0.01:
                ext["WB"] = e

    for vph in vols:
        with open(f"{d}/measure_{vph}.add.xml", "w") as f:
            f.write('<additional>\n')
            f.write(f'  <edgeData id="ed" file="out/edgedata_{vph}.xml" '
                    f'begin="360" end="3960" excludeEmpty="true"/>\n')
            for way in ("EB", "WB"):
                for tag, tbl, pos in (("in", ent, "1.0"), ("out", ext, "-1.0")):
                    e = tbl.get(way)
                    if e is None:
                        continue
                    for ln in range(e["lanes"]):
                        f.write(f'  <inductionLoop id="{way}_{tag}_{ln}" '
                                f'lane="{e["id"]}_{ln}" pos="{pos}" '
                                f'period="100000" file="out/det_{vph}.xml"/>\n')
            f.write('</additional>\n')


HELP = """\
SUMO inputs for the road-diet weaving toy example.

  net.nod.xml / net.edg.xml / net.con.xml   network description
  net.rou.xml                               vehicle type and routes
  demand_<vph>.rou.xml                      traffic for that through volume
  run_<vph>.sumocfg                         simulation configuration
  set_offsets.py                            writes signals.add.xml from the
                                            built network (correct phase
                                            lengths + the 26 s offset)
  signals.add.xml                           the two signal plans (generated)
  measure_<vph>.add.xml                     edge data + stop-bar detectors

Lane changing uses SUMO's sublane model (SL2015 + lateral-resolution), so
vehicles slide across the lane line over about 3 seconds rather than jumping
from one lane to the next.  That costs some run time but it is what makes the
weaving visible in sumo-gui.
  build.bat                                 builds net.net.xml
  run_all.bat                               builds, then runs every volume headless

Build the network once, then run a volume with the GUI:

    build.bat
    sumo-gui -c run_700.sumocfg

Outputs land in out/ as tripinfo_<vph>.xml (per-vehicle travel time, delay
and waiting time), summary_<vph>.xml, and edgedata.xml.

Signals sit at each end of the measured section (x = 0 and x = 304.80 m),
running a 90 s cycle with 58 s of green and a 4 s yellow -- about 65% green for
the mainline.  Both signals run together (offset 0): nothing is held on the way
out of the block, so a progression offset would only stagger when the two
directions are released.  Note that a
static plan with a fixed phase count is a simplification: there is no
side-street demand in this model, so the red simply represents time given to
the cross street.

Geometry: 1,000 ft of measured roadway (x = 0 to 304.80 m) with 150 m of
approach and exit outside it. Eastbound turns left into driveways at 250 /
500 / 750 ft on the north side; westbound turns left at 375 / 625 / 875 ft
on the south side. Junctions are unsignalized and the mainline has priority,
so left-turners yield to opposing through traffic.

In the 3lane network SUMO has no native two-way left-turn lane, so the TWLTL
is modelled the conventional way: a 61 m (200 ft) left-turn pocket on each
approach, 1.83 m wide -- half of a 12 ft centre lane -- with the two
directions' pockets offset from each other, matching the offset driveways.
Through traffic has no connection into those pockets, so only left-turners
use them.
"""

OFFSETS_PY = """\
#!/usr/bin/env python3
'''Write the coordinated signal plan for this network.

netconvert decides how many signal groups each junction needs, so the phase
state strings can only be written once the network exists.  This reads them
back out of net.net.xml, re-times them to a 90 s cycle with 45 s of
mainline green, and gives the far signal the progression offset -- then writes
the result to signals.add.xml, which the .sumocfg loads.

Run after netconvert; build.bat does it for you.
'''
import xml.etree.ElementTree as ET

CYCLE, GREEN, YELLOW, OFFSET = 90, 45, 4, 26

net = ET.parse("net.net.xml").getroot()
tls = net.findall("tlLogic")
if len(tls) != 2:
    raise SystemExit("expected 2 signals in net.net.xml, found %d" % len(tls))


def node_x(tid):
    for j in net.findall("junction"):
        if j.get("id") == tid:
            return float(j.get("x"))
    return 0.0


def retime(phases):
    '''Mainline green first, then yellows, then whatever is left to the cross
    street.  netconvert orders the major road first because the mainline edges
    carry the higher priority.'''
    kinds = ["y" if "y" in p.get("state").lower() else "g" for p in phases]
    greens = [i for i, k in enumerate(kinds) if k == "g"]
    yellows = [i for i, k in enumerate(kinds) if k == "y"]
    if not greens:
        raise SystemExit("no green phase found -- check the network")
    dur = [0] * len(phases)
    for i in yellows:
        dur[i] = YELLOW
    dur[greens[0]] = GREEN
    left = CYCLE - GREEN - YELLOW * len(yellows)
    rest = greens[1:]
    if not rest:
        print("  ! only one green phase: this signal never turns red.")
        dur[greens[0]] = CYCLE - YELLOW * len(yellows)
    else:
        for n, i in enumerate(rest):
            dur[i] = left // len(rest) + (1 if n < left % len(rest) else 0)
    if sum(dur) != CYCLE:
        dur[greens[0]] += CYCLE - sum(dur)
    return dur


tls.sort(key=lambda t: node_x(t.get("id")))
with open("signals.add.xml", "w") as f:
    f.write("<additional>\\n")
    for tl, off in zip(tls, (0, OFFSET)):
        phases = tl.findall("phase")
        dur = retime(phases)
        f.write('  <tlLogic id="%s" type="static" programID="coord" '
                'offset="%d">\\n' % (tl.get("id"), off))
        for p, d in zip(phases, dur):
            f.write('    <phase duration="%d" state="%s"/>\\n'
                    % (d, p.get("state")))
        f.write("  </tlLogic>\\n")
        print("  %s: offset %d, phases %s" % (tl.get("id"), off, dur))
    f.write("</additional>\\n")
print("signals.add.xml written (%d s cycle, %d s mainline green)" % (CYCLE, GREEN))
"""

BUILD_BAT = """\
@echo off
netconvert -n net.nod.xml -e net.edg.xml -x net.con.xml -o net.net.xml ^
  --no-turnarounds true --junctions.corner-detail 5 ^
  --default.junctions.keep-clear false --tls.default-type static ^
  --tls.green.time 58 --tls.yellow.time 4 --tls.allred.time 0
if errorlevel 1 ( echo netconvert FAILED & exit /b 1 )
python set_offsets.py
if errorlevel 1 ( echo set_offsets FAILED & exit /b 1 )
echo built net.net.xml
"""


def run_all_bat(vols):
    lines = ["@echo off", "call build.bat", "if errorlevel 1 exit /b 1",
             "if not exist out mkdir out"]
    for v in vols:
        lines.append(f"echo running {v} veh/h ...")
        lines.append(f"sumo -c run_{v}.sumocfg")
    lines.append("echo done - see out\\tripinfo_*.xml")
    return "\r\n".join(lines) + "\r\n"

if __name__ == "__main__":
    vols = [int(v) for v in sys.argv[1:]] or [400, 550, 700, 850]
    for cfg in ("4lane", "3lane"):
        b = Builder(cfg)
        b.build()
        b.connections()
        d = os.path.join("sumo", cfg)
        b.write(d)
        n_edges = len(b.xs) - 1
        write_routes(b, d, vols, n_edges)
        open(f"{d}/README.txt", "w").write(HELP)
        open(f"{d}/set_offsets.py", "w").write(OFFSETS_PY)
        open(f"{d}/build.bat", "w", newline="").write(BUILD_BAT.replace("\n", "\r\n"))
        open(f"{d}/run_all.bat", "w", newline="").write(run_all_bat(vols))
        os.makedirs(f"{d}/out", exist_ok=True)
        print(cfg, "->", d, f"({len(b.nodes)} nodes, {len(b.edges)} edges, "
                            f"{len(b.conns)} connections)")
