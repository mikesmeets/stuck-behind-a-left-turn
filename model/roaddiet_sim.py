"""
Toy road-diet weaving microsimulation.

1,000 ft (304.8 m) roadway segment, three unsignalized left-turn driveways.

Config "4lane": 2 through lanes per direction, no center turn lane.
    Left-turners wait in the LEFT THROUGH LANE, blocking through traffic
    behind them.  Blocked through drivers weave into the right lane if a
    gap allows.

Config "3lane": 1 through lane per direction + a shared two-way left-turn
    lane (TWLTL).  Left-turners shift into the TWLTL and wait there,
    blocking nobody -- unless an opposing left-turner already occupies
    that stretch of the TWLTL, in which case they must wait in the
    through lane.

Car following: IDM.  Lane changing: MOBIL (+ mandatory rules).
Left turns: HCM-style critical-gap acceptance against the opposing stream.
"""

import json
import math
import random
from dataclasses import dataclass, field

FT = 0.3048
SEG_LEN = 1000 * FT          # 304.8 m
# Driveways on the two sides of the street are offset from one another, as
# they nearly always are in the real world.  Positions are given in the
# coordinate frame of the direction that turns into them.
DRIVEWAYS = [250 * FT, 500 * FT, 750 * FT]        # 76.2, 152.4, 228.6 m
DRIVEWAYS_OPP = [375 * FT, 625 * FT, 875 * FT]    # 114.3, 190.5, 266.7 m
MAX_LT_WAIT = 90.0           # s before a driver forces a marginal gap
TURN_DUR = 2.5               # s to swing across the opposing lanes once a gap
                             # is accepted -- the manoeuvre itself, not the wait
TURN_SPEED = 1.6             # m/s of forward progress while turning
CROSS_CLEAR = 9.0            # m of opposing roadway a turn sweeps through --
                             # a 5 m vehicle plus clearance either side

# ---------------------------------------------------------------- IDM params
V0 = 35 * 0.44704            # 35 mph -> 15.65 m/s
T_HDWY = 1.2                 # desired time headway, s
A_MAX = 1.5                  # m/s^2
B_COMF = 2.0                 # m/s^2
S0 = 2.5                     # standstill gap, m
DELTA = 4
VEH_LEN = 5.0                # m

# ------------------------------------------------------------- MOBIL params
B_SAFE = 4.0                 # max decel imposed on a new follower, m/s^2
POLITENESS = 0.2
A_THRESH = 0.2               # m/s^2

# A lane change is not instantaneous.  It takes LC_DUR seconds, during part of
# which the vehicle intrudes into BOTH lanes and is a leader for followers in
# each, and throughout which the driver does not accelerate.  That is the
# friction a weaving manoeuvre imposes on everyone around it.
#
# When the intrusion starts and stops is geometry, not a guess: a 6 ft vehicle
# whose centre crosses an 11 ft lane starts overlapping the target lane once
# its centre has moved (11-6)/2 = 2.5 ft, and stops overlapping the lane it is
# leaving once its centre has moved 11-2.5 = 8.5 ft.
LC_DUR = 3.0                 # s, at the short end of measured 3-5 s
LANE_W_FT, VEH_W_FT = 11.0, 6.0
LC_ENTER = ((LANE_W_FT - VEH_W_FT) / 2) / LANE_W_FT      # 0.23 of the manoeuvre
LC_LEAVE = 1.0 - LC_ENTER                                # 0.77
LC_SPEED_PENALTY = 0.95      # desired speed multiplier during the manoeuvre
ENTRY_LC_HOLD = 4.0          # s after release from the stop bar during which a
                             # driver holds their lane -- nobody discharges from
                             # a queue and immediately changes lanes
ENTRY_LC_DIST = 25.0         # m past the stop bar before a DISCRETIONARY change
                             # is considered (escaping a blocking left-turner is
                             # not discretionary and is allowed at once)
LC_COOLDOWN = 6.0            # s of settling after finishing a change before the
                             # same driver considers another one
LC_NO_RETURN = 14.0          # s before a driver will move back into the lane
                             # they just left -- without this they oscillate,
                             # since whichever lane they are not in keeps
                             # looking marginally better

# ------------------------------------------------- left-turn gap acceptance
# HCM 6th ed. major-street left turn: base critical headway 4.1 s,
# +0.2 s per additional opposing through lane.  Follow-up 2.2 s.
TC_4LANE = 4.3               # crossing 2 opposing through lanes
TC_3LANE = 4.1               # crossing 1 opposing through lane
TC_SIGMA = 0.8
TC_MIN = 3.0

TWLTL_CLEAR = 10.0           # m of TWLTL an opposing left-turner reserves
MAND_LC_DIST = 60.0
WEAVE_REACH = 60.0           # m ahead a blocking left-turner still counts
WEAVE_V = 6.0                # m/s below which a turner is already blocking
                             # m ahead of driveway that a left-turner may
                             # shift into the TWLTL

# ------------------------------------------------------------------- signals
# The block sits between two signalized intersections running a common cycle.
# The far signal is offset by the block travel time, so a platoon released at
# the start of green arrives on green -- textbook progression for the measured
# direction.  A driver who loses time inside the block falls out of the platoon
# and can miss the green, which costs a whole cycle.
#
# Because nothing is held on the way out, a progression offset would have
# nothing left to do: it would only stagger when the two directions are
# released, with no downstream green for anyone to catch.  So the two signals
# run together and both directions start at the same moment, which also makes
# the two directions symmetric -- statistics are taken from one of them, but
# either would do.
CYCLE = 90.0                 # s
GREEN = 0.60 * CYCLE          # 54 s of green in a 90 s cycle
OFFSET = 0.0                 # simultaneous release at both ends
MEASURED_DIR = 1
H_SAT = 2.0                  # saturation headway per lane at the stop bar, s
STARTUP = [2.0, 4.2, 6.4, 8.6, 10.8]   # release speeds while a queue discharges

DT = 0.25
WARMUP = 360.0               # s discarded (four full cycles)
SIM_TIME = 3600.0            # s of measured simulation


@dataclass
class Veh:
    vid: int
    direction: int           # +1 or -1
    x: float                 # metres along own direction of travel (0..SEG_LEN)
    v: float
    lane: int                # 0 = through/right lane, 1 = left/turn lane
    turn_at: float = None    # driveway position, or None for through
    v0: float = V0
    t_enter: float = 0.0
    t_want: float = 0.0      # time it wanted to enter
    waiting_for_gap: bool = False
    t_crit: float = 0.0
    lane_changes: int = 0
    weave_changes: int = 0   # lane changes forced by a blocking left-turner
    hard_brakes: int = 0
    stopped: bool = False
    lc_cool: float = 0.0
    entry_lane: int = 0
    braking: bool = False
    sig_stopped: bool = False   # had to stop at the downstream signal
    held: bool = False          # held up behind a left-turning vehicle
    last_a: float = 0.0      # most recent acceleration, m/s^2
    last_lc_from: int = -1   # the lane most recently vacated
    no_return_t: float = -1.0   # ... and when it becomes acceptable again
    lc_from: int = -1        # lane being vacated while a change is in progress
    lc_rem: float = 0.0      # seconds left in the manoeuvre
    latpos: float = 0.0      # continuous lane coordinate, for the animation
    lat: float = 0.0         # 0..1 lateral animation state
    turning: bool = False    # crossing the opposing lanes into the driveway
    turn_rem: float = 0.0
    done: bool = False


def idm_accel(v, v0, gap, dv):
    """dv = v_self - v_leader.  gap = bumper-to-bumper clear distance."""
    if gap is None:
        return A_MAX * (1 - (v / v0) ** DELTA)
    gap = max(gap, 0.1)
    s_star = S0 + max(0.0, v * T_HDWY + v * dv / (2 * math.sqrt(A_MAX * B_COMF)))
    return A_MAX * (1 - (v / v0) ** DELTA - (s_star / gap) ** 2)


class Sim:
    def __init__(self, config, through_vph, seed, trace=False, trace_window=None,
                 left_share=0.10, speed_spread=0.08, green_s=GREEN,
                 warmup=WARMUP, start_red=False, cycle_s=CYCLE):
        assert config in ("4lane", "3lane")
        self.cfg = config
        self.green_s = green_s
        self.cycle_s = cycle_s
        # Seconds of running before statistics start.  The measured runs
        # discard four cycles; the animation runs use 0, because they begin
        # from a cold start on a red signal and everything they show counts.
        self.warmup = warmup
        # start_red shifts the signal so the simulation opens on red: the
        # street is empty, a queue accumulates for one red, and the first
        # green releases it.  That is the moment the replay window opens.
        self.sig_shift = (cycle_s - green_s) if start_red else 0.0
        self.through_vph = through_vph
        self.left_share = left_share
        self.speed_spread = speed_spread
        self.rng = random.Random(seed)
        self.trace = trace
        self.trace_window = trace_window or (WARMUP + 60, WARMUP + 180)
        self.frames = []

        # left_share of all vehicles turn left => total = through / (1 - share)
        self.total_vph = through_vph / (1.0 - left_share)
        self.left_vph = self.total_vph * left_share

        self.t = 0.0
        self.next_id = 0
        self.vehs = {1: [], -1: []}          # sorted by x descending (lead first)
        self.pending = {1: [], -1: []}       # (t_want, is_left, driveway)
        self.entry_queue = {1: [], -1: []}
        self.last_release = {1: [-99.0, -99.0], -1: [-99.0, -99.0]}
        self.discharged = {1: 0, -1: 0}
        self.crossed = {1: 0, -1: 0}         # through vehicles out the far end
        self._build_demand()

        # metrics (through vehicles only, both directions, after warmup)
        self.m = dict(n=0, tt=0.0, delay=0.0, entry_delay=0.0, stops=0,
                      lc=0, weave=0, hard=0, served=0, generated=0,
                      lt_n=0, lt_wait=0.0, nL=0, ttL=0.0, nR=0, ttR=0.0,
                      held=0, sig=0)
        self.tt_all = []          # per-vehicle through travel times
        self.tt_left = []
        self.unserved = 0

    # ------------------------------------------------------------- demand
    def _build_demand(self):
        horizon = self.warmup + SIM_TIME
        for d in (1, -1):
            t = 0.0
            rate = self.total_vph / 3600.0
            while t < horizon:
                t += self.rng.expovariate(rate)
                if t >= horizon:
                    break
                is_left = self.rng.random() < self.left_share
                pool = DRIVEWAYS if d == 1 else DRIVEWAYS_OPP
                dw = self.rng.choice(pool) if is_left else None
                self.pending[d].append((t, is_left, dw))

    # ------------------------------------------------------- neighbour help
    @staticmethod
    def _occupies(v, lane):
        """Which lane(s) this vehicle physically intrudes into right now."""
        if v.turning:
            # still partly in its own lane until it has swung clear of it
            return lane == v.lane and v.latpos < 1.5
        if v.lc_rem <= 0.0:
            return v.lane == lane
        p = 1.0 - v.lc_rem / LC_DUR
        if lane == v.lane:
            return p >= LC_ENTER          # has begun intruding into the target
        if lane == v.lc_from:
            return p < LC_LEAVE           # has not yet cleared the old lane
        return False

    def _lanes_of(self, v):
        return [ln for ln in (0, 1) if self._occupies(v, ln)] or [v.lane]

    def is_held(self, veh):
        """Is this through vehicle slow BECAUSE of a left-turner ahead?

        The speed test alone is not enough.  A vehicle released from the stop
        bar is also below 3 m/s for a second or two, and if a left-turner
        happens to be waiting further up its lane it would be scored as held
        up while it is in fact accelerating away from a green.  A driver who
        is actually held up is not accelerating.
        """
        if veh.turn_at is not None or veh.v >= 3.0 or veh.last_a > 0.3:
            return False
        return self._held_by_left_turn(veh)

    def _held_by_left_turn(self, veh, reach=90.0, v_max=2.0):
        """Is a stopped left-turner the reason this through vehicle is slow?

        The turner does not have to be the immediate leader.  Once one stops
        in a travel lane the whole queue behind it is held up by it, and the
        fourth driver back is as stuck as the first -- so the search runs up
        the lane rather than looking only one vehicle ahead.
        """
        for o in self.vehs[veh.direction]:
            if o.turn_at is None or o.v > v_max:
                continue
            if any(self._occupies(o, ln) for ln in self._lanes_of(veh)):
                if 0 < o.x - veh.x < reach:
                    return True
        return False

    def _leader(self, d, lane, x, exclude=None):
        best, bestdx = None, 1e9
        for v in self.vehs[d]:
            if v is exclude or not self._occupies(v, lane):
                continue
            dx = v.x - x
            if 0 < dx < bestdx:
                best, bestdx = v, dx
        return best

    def _follower(self, d, lane, x, exclude=None):
        best, bestdx = None, 1e9
        for v in self.vehs[d]:
            if v is exclude or not self._occupies(v, lane):
                continue
            dx = x - v.x
            if 0 < dx < bestdx:
                best, bestdx = v, dx
        return best

    def _gap_to(self, follower_x, leader):
        return leader.x - follower_x - VEH_LEN

    # --------------------------------------------------- acceleration model
    def _accel(self, veh, lane=None, ignore=None):
        hypothetical = lane is not None
        lane = veh.lane if lane is None else lane
        d = veh.direction
        changing = veh.lc_rem > 0.0 and not hypothetical
        v0 = veh.v0 * (LC_SPEED_PENALTY if changing else 1.0)
        a = A_MAX * (1 - (veh.v / v0) ** DELTA)

        # while straddling, the driver must clear leaders in every lane occupied
        lanes = self._lanes_of(veh) if changing else [lane]
        for ln in lanes:
            ldr = self._leader(d, ln, veh.x, exclude=ignore or veh)
            if ldr is not None:
                a = min(a, idm_accel(veh.v, v0,
                                     self._gap_to(veh.x, ldr), veh.v - ldr.v))

        # virtual stop point: a left-turner that has reached its turn lane
        stop_x = self._stop_target(veh, lane)
        if stop_x is not None:
            gap = stop_x - veh.x
            a = min(a, idm_accel(veh.v, v0, gap, veh.v))

        # A vehicle from the other direction that is part-way through its turn
        # is sitting across these lanes.  Yield to it -- otherwise traffic
        # drives straight through the manoeuvre.
        if not hypothetical and veh.turn_at is None:
            blk = self._crossing_obstacle(veh)
            if blk is not None:
                a = min(a, idm_accel(veh.v, v0, blk - veh.x, veh.v))

        if changing:
            a = min(a, 0.0)          # nobody accelerates mid-manoeuvre
        return a

    def _crossing_obstacle(self, veh):
        """Nearest point ahead occupied by an opposing vehicle mid-turn."""
        best = None
        for o in self.vehs[-veh.direction]:
            if not o.turning or o.latpos < 1.4:
                continue            # still in its own lane, not across ours yet
            here = SEG_LEN - o.x    # its position in this vehicle's frame
            gap = here - veh.x - VEH_LEN
            if 0 < gap < 60 and (best is None or here < best):
                best = here
        return best

    def _stop_target(self, veh, lane):
        """Where this vehicle must come to rest, if anywhere."""
        if veh.turning:
            return None
        if veh.turn_at is None:
            # Vehicles are not held at the far end: the signal there releases
            # the opposing direction, but nothing stops traffic leaving the
            # block.  Travel time is therefore pure block traversal, with no
            # downstream signal delay folded into it.
            return None
        if self.cfg == "4lane":
            # already in the left through lane; stop at the driveway
            return veh.turn_at if lane == 1 else None
        # 3-lane: stops only once in the TWLTL, or in the through lane if it
        # could not get into the TWLTL before reaching the driveway.
        if lane == 1:
            return veh.turn_at
        # Still in the through lane: it had its chance to shift into the TWLTL
        # at turn_at - MAND_LC_DIST.  If it is still here at -45 m the TWLTL
        # was blocked, so it must slow (and hold up through traffic) instead.
        if veh.x > veh.turn_at - 45.0:
            return veh.turn_at
        return None

    # ------------------------------------------------------ gap acceptance
    def _opposing_arrivals(self, d, conflict_x):
        """Time-to-arrival of opposing through vehicles at the conflict point."""
        opp = -d
        # convert conflict point into the opposing direction's coordinate
        cx = SEG_LEN - conflict_x
        out = []
        for v in self.vehs[opp]:
            # opposing left-turners that are out of the through stream (in the
            # TWLTL, or stopped in the left lane) are not a crossing conflict
            if v.turn_at is not None:
                # already slowing/stopped for its own driveway -> not a threat
                if v.v < 2.0:
                    continue
                # in the 3-lane case the TWLTL is not a through lane at all --
                # but a driver still moving into it is still in the way
                if self.cfg == "3lane" and v.lane == 1 and v.lc_rem == 0.0:
                    continue
            dx = cx - v.x
            if dx < -VEH_LEN:
                continue
            if v.v < 0.5:
                # A stopped vehicle is not "arriving" -- but it is standing
                # somewhere, and if that somewhere is the space this driver has
                # to cross, there is no gap at all.  Queues on the opposing red
                # made this matter: without it a turner drives through them.
                out.append(60.0 if dx > CROSS_CLEAR else 0.0)
            else:
                out.append(max(0.0, dx) / v.v)
        return sorted(out)

    def _crossing_blocked(self, d, conflict_x):
        """Is anything physically standing in the path of the turn right now?"""
        cx = SEG_LEN - conflict_x
        for v in self.vehs[-d]:
            if v.turning:
                continue
            if abs(v.x - cx) < CROSS_CLEAR:
                return True
        return False

    def _twltl_blocked(self, veh):
        """Is an opposing left-turner sitting in this stretch of the TWLTL?"""
        if self.cfg != "3lane":
            return False
        cx = SEG_LEN - veh.turn_at
        for v in self.vehs[-veh.direction]:
            if v.lane == 1 and v.turn_at is not None and not v.turning:
                if abs(v.x - cx) < TWLTL_CLEAR:
                    return True
        return False

    # -------------------------------------------------------- lane changing
    def _try_lane_change(self, veh):
        if veh.lc_cool > 0 or veh.turning:
            return
        d = veh.direction
        cur = veh.lane

        # ---- mandatory: 3-lane left-turner shifting into the TWLTL
        if self.cfg == "3lane" and veh.turn_at is not None and cur == 0:
            if veh.x > veh.turn_at - MAND_LC_DIST:
                if self._twltl_blocked(veh):
                    return
                if self._lc_safe(veh, 1, urgent=True):
                    self._do_lc(veh, 1, weave=False)
            return

        if self.cfg == "3lane":
            return                       # through vehicles never use the TWLTL

        # ---- 4-lane -------------------------------------------------------
        if veh.turn_at is not None:
            return                       # left-turners stay in the left lane

        other = 1 - cur
        # do not step straight back into the lane just left
        if other == veh.last_lc_from and self.t < veh.no_return_t:
            return
        a_cur = self._accel(veh, cur)

        # Is this an escape from a blocking left-turner?  The driver has to be
        # impeded -- braking for it, or already crawling in the queue behind
        # it -- and there has to be a stopped left-turner up the lane within
        # WEAVE_REACH.  Looking only at the immediate leader, as an earlier
        # version did, counted the first driver behind a turner and missed
        # everybody queued behind them, who are just as stuck and just as
        # likely to pull out.
        weave = False
        if cur == 1 and (a_cur < -0.2 or veh.v < 3.0):
            weave = self._held_by_left_turn(veh, reach=WEAVE_REACH,
                                            v_max=WEAVE_V)

        # away from a blocking left-turner, a driver still sorting themselves
        # out of the signal queue is not shopping for a faster lane
        if not weave and veh.x < ENTRY_LC_DIST:
            return

        if not self._lc_safe(veh, other, urgent=weave):
            return

        a_new = self._accel(veh, other)

        # MOBIL incentive
        nf = self._follower(d, other, veh.x)
        of = self._follower(d, cur, veh.x)
        nf_before = self._accel(nf, other) if nf else 0.0
        nf_after = (idm_accel(nf.v, nf.v0, self._gap_to(nf.x, veh), nf.v - veh.v)
                    if nf else 0.0)
        of_before = self._accel(of, cur) if of else 0.0
        of_after = self._accel(of, cur, ignore=veh) if of else 0.0

        incentive = (a_new - a_cur) + POLITENESS * (
            (nf_after - nf_before) + (of_after - of_before))

        thresh = A_THRESH if not weave else -0.5   # blocked drivers are eager
        if incentive > thresh:
            self._do_lc(veh, other, weave=weave)

    def _lc_safe(self, veh, target, urgent=False):
        d = veh.direction
        ldr = self._leader(d, target, veh.x)
        if ldr is not None and self._gap_to(veh.x, ldr) < S0 + 0.4 * veh.v:
            return False
        nf = self._follower(d, target, veh.x)
        if nf is not None:
            gap = self._gap_to(nf.x, veh)
            if gap < S0:
                return False
            a_nf = idm_accel(nf.v, nf.v0, gap, nf.v - veh.v)
            if a_nf < -(B_SAFE if urgent else B_SAFE * 0.6):
                return False
        return True

    def _do_lc(self, veh, target, weave):
        veh.lc_from = veh.lane
        veh.last_lc_from = veh.lane
        veh.no_return_t = self.t + LC_DUR + LC_NO_RETURN
        veh.lane = target
        veh.lc_rem = LC_DUR
        veh.lc_cool = LC_DUR + LC_COOLDOWN
        if self.t >= self.warmup:
            veh.lane_changes += 1
            if weave:
                veh.weave_changes += 1

    # --------------------------------------------------------------- insert
    def _sig_green(self, which, t=None):
        t = self.t if t is None else t
        phase = 0.0 if which == "west" else OFFSET
        return ((t - phase - self.sig_shift) % self.cycle_s) < self.green_s

    def upstream_green(self, d):
        """The signal that releases direction d into the block."""
        return self._sig_green("west" if d == 1 else "east")

    def downstream_green(self, d):
        """The signal at the far end of the block for direction d."""
        return self._sig_green("east" if d == 1 else "west")

    def _insert(self, d):
        """Release the queue at the upstream stop bar at saturation headway."""
        q = self.entry_queue[d]
        while self.pending[d] and self.pending[d][0][0] <= self.t:
            q.append(self.pending[d].pop(0))
            if self.t >= self.warmup and d == MEASURED_DIR:
                self.m["generated"] += 1
        if not self.upstream_green(d):
            self.discharged[d] = 0
            return
        if not q:
            return

        t_want, is_left, dw = q[0]
        if self.cfg == "4lane":
            lane = 1 if is_left else (1 if self.rng.random() < 0.5 else 0)
        else:
            lane = 0

        # saturation headway is enforced per stop-bar lane
        if self.t - self.last_release[d][lane] < H_SAT - 1e-9:
            return

        rear = None
        for v in self.vehs[d]:
            if self._occupies(v, lane) and (rear is None or v.x < rear.x):
                rear = v

        k = self.discharged[d] if self.cfg == "3lane" else self.discharged[d] // 2
        v_ins = STARTUP[k] if k < len(STARTUP) else V0
        if rear is not None:
            v_ins = min(v_ins, rear.v + 1.0)
            if rear.x - VEH_LEN < S0 + T_HDWY * v_ins:
                return                               # no room yet

        veh = Veh(vid=self.next_id, direction=d, x=0.0, v=v_ins, lane=lane,
                  turn_at=dw,
                  v0=V0 * self.rng.uniform(1 - self.speed_spread,
                                           1 + self.speed_spread),
                  t_enter=self.t, t_want=t_want, entry_lane=lane)
        veh.latpos = float(lane)
        veh.lc_cool = ENTRY_LC_HOLD
        veh.t_crit = max(TC_MIN, self.rng.gauss(
            TC_4LANE if self.cfg == "4lane" else TC_3LANE, TC_SIGMA))
        self.next_id += 1
        self.vehs[d].append(veh)
        self.last_release[d][lane] = self.t
        self.discharged[d] += 1
        q.pop(0)

    # ----------------------------------------------------------------- step
    def step(self):
        for d in (1, -1):
            self._insert(d)

        # a left-turner that has accepted its gap swings across the opposing
        # lanes into the driveway rather than vanishing at the stop line
        for d in (1, -1):
            for veh in self.vehs[d]:
                if not veh.turning:
                    continue
                veh.turn_rem = max(0.0, veh.turn_rem - DT)
                p = 1.0 - veh.turn_rem / TURN_DUR
                # lane 0 is the kerb lane, so the far kerb -- and the driveway
                # mouth just past it -- is one lane beyond the last one
                target = 3.8 if self.cfg == "4lane" else 2.8
                veh.latpos = veh.lane + (target - veh.lane) * p
                veh.v = TURN_SPEED
                veh.x += TURN_SPEED * DT
                if veh.turn_rem == 0.0:
                    veh.done = True

        # advance any lane change in progress, then consider new ones
        for d in (1, -1):
            for veh in self.vehs[d]:
                if veh.turning:
                    continue
                if veh.lc_rem > 0.0:
                    veh.lc_rem = max(0.0, veh.lc_rem - DT)
                    p = 1.0 - veh.lc_rem / LC_DUR          # 0 -> 1 across the change
                    veh.latpos = veh.lc_from + (veh.lane - veh.lc_from) * p
                    if veh.lc_rem == 0.0:
                        veh.lc_from = -1
                        veh.latpos = float(veh.lane)
                else:
                    veh.latpos = float(veh.lane)

        for d in (1, -1):
            for veh in sorted(self.vehs[d], key=lambda z: -z.x):
                veh.lc_cool = max(0.0, veh.lc_cool - DT)
                self._try_lane_change(veh)

        # left-turn gap acceptance
        for d in (1, -1):
            for veh in self.vehs[d]:
                if veh.turn_at is None:
                    continue
                at_stop = veh.x > veh.turn_at - 4.0 and veh.v < 0.8
                if at_stop:
                    if not veh.waiting_for_gap:
                        veh.waiting_for_gap = True
                        veh.t_wait_start = self.t
                    arrivals = self._opposing_arrivals(d, veh.turn_at)
                    nxt = arrivals[0] if arrivals else 99.0
                    forced = (self.t - veh.t_wait_start) > MAX_LT_WAIT
                    clear = not self._crossing_blocked(d, veh.turn_at)
                    if clear and (nxt >= veh.t_crit or forced):
                        if self.t >= self.warmup:
                            self.m["lt_n"] += 1
                            self.m["lt_wait"] += self.t - veh.t_wait_start
                        veh.turning = True
                        veh.turn_rem = TURN_DUR
                        veh.waiting_for_gap = False

        # accelerations + integrate
        for d in (1, -1):
            accs = {}
            for veh in self.vehs[d]:
                if veh.done or veh.turning:
                    continue
                accs[veh.vid] = max(-6.0, min(A_MAX, self._accel(veh)))
            for veh in self.vehs[d]:
                if veh.done or veh.turning:
                    continue
                a = accs[veh.vid]
                veh.last_a = a
                if self.t >= self.warmup and veh.turn_at is None:
                    if a < -3.0 and not veh.braking:
                        veh.hard_brakes += 1          # count events, not steps
                        veh.braking = True
                    elif a > -1.5:
                        veh.braking = False
                    if veh.v < 0.3:
                        # distinguish "stopped at the far signal" from
                        # "stopped inside the block by a left-turner"
                        if (not self.downstream_green(veh.direction)
                                and veh.x > SEG_LEN - 70):
                            veh.sig_stopped = True
                        else:
                            veh.stopped = True
                    if self.is_held(veh):
                        veh.held = True
                veh.v = max(0.0, veh.v + a * DT)
                veh.x += veh.v * DT

        # exits
        for d in (1, -1):
            keep = []
            for veh in self.vehs[d]:
                if veh.done or veh.x >= SEG_LEN:
                    if (self.t >= self.warmup and veh.t_enter >= self.warmup
                            and veh.turn_at is None and veh.x >= SEG_LEN
                            and d == MEASURED_DIR):
                        tt = self.t - veh.t_enter
                        self.m["n"] += 1
                        self.m["tt"] += tt
                        self.m["delay"] += tt - SEG_LEN / V0
                        self.m["entry_delay"] += veh.t_enter - veh.t_want
                        self.m["stops"] += 1 if veh.stopped else 0
                        self.m["held"] += 1 if veh.held else 0
                        self.m["sig"] += 1 if veh.sig_stopped else 0
                        self.m["lc"] += veh.lane_changes
                        self.m["weave"] += veh.weave_changes
                        self.m["hard"] += veh.hard_brakes
                        self.tt_all.append(tt)
                        if veh.entry_lane == 1:
                            self.m["nL"] += 1
                            self.m["ttL"] += tt
                            self.tt_left.append(tt)
                        else:
                            self.m["nR"] += 1
                            self.m["ttR"] += tt
                    if self.t >= self.warmup and veh.x >= SEG_LEN and d == MEASURED_DIR:
                        self.m["served"] += 1
                    # Both directions, for the replay's on-screen count.  The
                    # measured statistics above stay one-directional; this is
                    # only what a viewer of the animation can see cross the
                    # far end.  Left-turners leave at a driveway and so are
                    # not counted as having crossed.
                    if self.t >= self.warmup and veh.x >= SEG_LEN:
                        self.crossed[d] += 1
                else:
                    keep.append(veh)
            self.vehs[d] = keep

        if self.trace and self.trace_window[0] <= self.t <= self.trace_window[1]:
            self._snap()

        self.t += DT

    def _snap(self):
        f = []
        for d in (1, -1):
            for veh in self.vehs[d]:
                f.append([veh.vid, d, round(veh.x, 1), round(veh.latpos, 2),
                          1 if veh.turn_at is not None else 0,
                          round(veh.v, 1),
                          round(veh.turn_at, 1) if veh.turn_at else 0])
        self.frames.append([round(self.t - self.trace_window[0], 2), f])

    def run(self):
        n = int((self.warmup + SIM_TIME) / DT)
        for _ in range(n):
            self.step()
        self.unserved = len(self.entry_queue[MEASURED_DIR])
        return self.results()

    def results(self):
        m = self.m
        n = max(1, m["n"])
        srt = sorted(self.tt_all) or [0.0]

        def pct(p):
            return srt[min(len(srt) - 1, int(p * len(srt)))]

        return dict(
            tt_p50=pct(0.50), tt_p85=pct(0.85), tt_p95=pct(0.95),
            config=self.cfg,
            through_vph=self.through_vph,
            g_over_c=self.green_s / self.cycle_s,
            total_vph=round(self.total_vph),
            n_through=m["n"],
            travel_time_s=m["tt"] / n,
            delay_s=m["delay"] / n,
            entry_delay_s=m["entry_delay"] / n,
            pct_stopped=100.0 * m["stops"] / n,
            pct_held_by_lt=100.0 * m["held"] / n,
            pct_stopped_at_signal=100.0 * m["sig"] / n,
            weaves_per_100=100.0 * m["weave"] / n,
            lane_changes_per_100=100.0 * m["lc"] / n,
            hard_brakes_per_100=100.0 * m["hard"] / n,
            throughput_vph=m["served"] / (SIM_TIME / 3600.0) ,
            demand_vph=m["generated"] / (SIM_TIME / 3600.0) ,
            unserved=self.unserved,
            lt_wait_s=m["lt_wait"] / max(1, m["lt_n"]),
            speed_mph=(SEG_LEN / (m["tt"] / n)) / 0.44704,
            tt_left_lane_s=m["ttL"] / max(1, m["nL"]),
            tt_right_lane_s=m["ttR"] / max(1, m["nR"]),
        )


if __name__ == "__main__":
    import sys
    levels = [400, 700, 1000, 1300]
    seeds = [11, 22, 33, 44, 55, 66]
    out = []
    dists = {}
    for cfg in ("4lane", "3lane"):
        for lv in levels:
            sims = []
            for sd in seeds:
                s = Sim(cfg, lv, sd)
                s.run()
                sims.append(s)
            runs = [s.results() for s in sims]
            agg = {k: (sum(r[k] for r in runs) / len(runs)
                       if isinstance(runs[0][k], (int, float)) else runs[0][k])
                   for k in runs[0]}
            agg["config"], agg["through_vph"] = cfg, lv
            out.append(agg)
            key = f"{cfg}_{lv}"
            dists[key] = dict(
                all=[round(x, 1) for s in sims for x in s.tt_all],
                left=[round(x, 1) for s in sims for x in s.tt_left])
            print(f"{cfg} {lv:5d}  tt={agg['travel_time_s']:6.1f}s  "
                  f"p85={agg['tt_p85']:6.1f}  p95={agg['tt_p95']:6.1f}  "
                  f"spd={agg['speed_mph']:4.1f}mph  "
                  f"stop%={agg['pct_stopped']:5.1f}  "
                  f"weave/100={agg['weaves_per_100']:5.1f}  "
                  f"thru={agg['throughput_vph']:6.0f}/{agg['demand_vph']:.0f}  "
                  f"ltw={agg['lt_wait_s']:5.1f}", flush=True)
    json.dump(out, open("/home/claude/results.json", "w"), indent=1)
    json.dump(dists, open("/home/claude/tt_dists.json", "w"))
