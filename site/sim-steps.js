// The traffic replay as a scroll-driven progression: 400 -> 1,000 through
// vehicles an hour. Each step replays one recorded simulation run, so it plays
// the same way every time; nothing is simulated in the browser. Data:
// /site/data/sim-steps.json, written by model/make_steps.py. Renders into
// <div data-sim-steps>, whose .ss-step[data-vol] children are the step cards.
// A card with <div data-queue-chart> gets the hour-long queue chart.
(function () {
  const root = document.querySelector("[data-sim-steps]");
  if (!root) return;
  const SPEED = 2;                                   // 2x real time
  const steps = [...root.querySelectorAll(".ss-step")];
  const panel = root.querySelector(".ss-panel");

  // Every signalized intersection, busier direction at the evening peak (same list as traffic.html).
  const CORRIDOR = [
    ["The Pkwy & Harrison Ave", 416], ["Larchmont Ave", 445], ["Greenhaven Rd & Sterling Ave", 461],
    ["Beach Ave", 481], ["Deane Pl & Winans St", 521], ["Lorenzen St & Pine Ridge Rd", 526],
    ["Monroe Ave & Chatsworth Ave", 558], ["N Barry Ave", 571], ["Mamaroneck Ave", 575],
    ["Hommocks Rd & Weaver St", 640], ["Dubois Ave", 650], ["Orienta Ave", 670],
    ["Old Post Rd & Richbell Rd", 687], ["Mamaroneck HS driveway", 777], ["Fenimore Rd", 796],
    ["Alden Rd", 808], ["Delancey Ave", 831],
  ];
  const VOLS = steps.map((s) => +s.dataset.vol);
  // Bump the version whenever make_steps.py rewrites the data, so browsers don't reuse an old copy.
  const DATA = "/site/data/sim-steps.json?v=202609221043";

  // Where each step starts, and what it calls out. t is simulated seconds into
  // the recorded three minutes; hold is real seconds the replay pauses on it.
  // Targets: veh (a vehicle id), turner (a car waiting in the center lane), queue (the entrance).
  const STEP = {
    400: { start: 0, notes: [
      { t: 47.5, hold: 3.5, until: 56, road: "4lane", veh: 21,
        text: "A driver goes around someone waiting to turn left. At this traffic level it's easy: the next lane is open." }] },
    550: { start: 0, notes: [
      { t: 16, hold: 4, until: 26, road: "4lane", veh: 17,
        text: "Three drivers swerve around a stopped turner in a few seconds. Every quick lane change beside moving traffic is a chance for a sideswipe or a rear-end crash." },
      { t: 30, hold: 4, until: 46, road: "3lane", turner: true,
        text: "On the road diet, the turning driver waits in the center lane. Nobody swerves and nobody gets stuck. Smooth and boring, which is the point." }] },
    700: { start: 90, notes: [
      { t: 110, hold: 3, until: 132, road: "4lane", veh: 60,
        text: "Stuck behind a left turn for {n} seconds. The next lane is full, so there's no way around." },
      { t: 121, hold: 4.5, until: 142, road: "3lane", band: true, side: "below",
        text: "The same traffic on the road diet: a steady stream in each through lane. Nobody stuck, nobody swerving. Boring, and safe." }] },
    850: { start: 0, queue: true, notes: [
      { t: 54, hold: 4, until: 68, road: "3lane", queue: true,
        text: "The light turns red with 6 cars still waiting to get in. On four lanes, every car made the green." }] },
    1000: { start: 0, queue: true, notes: [
      { t: 54, hold: 4, until: 68, road: "3lane", queue: true,
        text: "17 cars are left waiting when the light turns red. On four lanes, 1." },
      { t: 144, hold: 4, until: 162, road: "3lane", queue: true,
        text: "Now 27 are left waiting. The line grows every cycle. On four lanes, none." }] },
  };

  const stat = (k) => `<span class="ss-stats"><span><b data-s="served${k}">0</b> through the block</span>` +
    `<span class="ss-held"><b data-s="held${k}">0</b> held up behind a left turn</span>` +
    `<span class="ss-q" hidden><b data-s="q${k}">0</b> waiting at the lights to get in</span></span>`;
  panel.innerHTML = `
    <div class="ss-head">
      <div class="ss-vol"><b>${VOLS[0]}</b><span>through vehicles an hour, each direction, at the evening peak</span></div>
      <div class="ss-scale" aria-label="Every signalized intersection on the corridor, by evening peak traffic"></div>
      <div class="ss-ctl"><span class="ss-clock">0:00 / 3:00</span><button type="button" class="ss-play">Pause</button></div>
    </div>
    <div class="ss-road"><p class="ss-label"><i style="background:var(--s1)"></i><span>Today: four lanes</span>${stat(4)}</p>
      <canvas width="1160" height="172" data-road="4lane" aria-hidden="true"></canvas><div class="ss-note" hidden></div></div>
    <div class="ss-road"><p class="ss-label"><i style="background:var(--s2)"></i><span>Road diet: three lanes</span>${stat(3)}</p>
      <canvas width="1160" height="142" data-road="3lane" aria-hidden="true"></canvas><div class="ss-note" hidden></div></div>
    <div class="ss-key">
      <span><i style="background:var(--veh)"></i>through traffic</span>
      <span><i style="background:var(--veh-turn)"></i>will turn left</span>
      <span><i style="background:var(--veh-block)"></i>held up behind a left turn</span>
      <span><i class="k-swerve"></i>swerving around a turner</span>
      <span class="muted">Three minutes of one simulated evening peak at 2× speed</span>
    </div>`;
  const $ = (s) => panel.querySelector(s);
  const cv = { "4lane": $('[data-road="4lane"]'), "3lane": $('[data-road="3lane"]') };
  const noteEl = { "4lane": cv["4lane"].nextElementSibling, "3lane": cv["3lane"].nextElementSibling };
  // Stick just below the site menu, whose height changes on phones.
  const pin = () => { const nav = document.querySelector(".sitenav"); panel.style.top = (nav ? nav.getBoundingClientRect().height : 52) + 8 + "px"; };
  pin(); addEventListener("resize", pin); addEventListener("load", pin);

  let D = null, vol = VOLS[0], t = 0, playing = true, last = 0, visible = false, holdUntil = 0, fired = new Set();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { playing = false; $(".ss-play").textContent = "Play"; }

  // ---------- the blue-dot corridor scale
  const LO = 380, HI = 1040, pct = (v) => ((v - LO) / (HI - LO)) * 100;
  function paintScale() {
    const i = VOLS.indexOf(vol), mid = (a, b) => (a + b) / 2;
    const bLo = i <= 0 ? LO : mid(VOLS[i - 1], VOLS[i]), bHi = i >= VOLS.length - 1 ? HI : mid(VOLS[i], VOLS[i + 1]);
    $(".ss-scale").innerHTML =
      `<div class="cx-band" style="left:${pct(bLo)}%;width:${pct(bHi) - pct(bLo)}%"></div><div class="cx-track"></div>` +
      VOLS.map((v) => `<div class="cx-tick" style="left:${pct(v)}%"><i></i>${v.toLocaleString()}</div>`).join("") +
      CORRIDOR.map(([n, v]) => `<div class="cx-dot" tabindex="0" style="left:${pct(v)}%" aria-label="${n}, ${v} vehicles an hour">` +
        `<span class="cx-tip"><b>${n}</b> &nbsp;${v}</span></div>`).join("");
  }

  // ---------- geometry, as in the simulation editions
  let SEG, PX, mx;
  const X0 = -30, LH = 30, STUB = 22, TOP = STUB + 4, VEH_W = 13, CW = 1160;
  const N = { "4lane": 4, "3lane": 3 };
  function laneY(cfg, dir, lc) {
    if (cfg === "4lane") return dir === 0 ? TOP + (0.5 + lc) * LH : TOP + (3.5 - lc) * LH;
    const y = dir === 0 ? TOP + (0.5 + lc) * LH : TOP + (2.5 - lc) * LH;
    const nudge = Math.max(0, Math.min(1, lc, 2 - lc));   // opposing turners share the center lane
    return y + (dir === 1 ? 4 : -4) * nudge;
  }
  const line = (ctx, y, w) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); };
  const css = (n, fb) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;

  function drawRoad(ctx, cfg, w, gWest, gEast, C) {
    const n = N[cfg], bot = TOP + n * LH;
    ctx.fillStyle = C.asph2;
    D.dwA.forEach((x) => { const c = mx(x); ctx.beginPath(); ctx.moveTo(c - 13, TOP); ctx.lineTo(c - 17, TOP - STUB); ctx.lineTo(c + 17, TOP - STUB); ctx.lineTo(c + 13, TOP); ctx.closePath(); ctx.fill(); });
    D.dwB.forEach((x) => { const c = mx(SEG - x); ctx.beginPath(); ctx.moveTo(c - 13, bot); ctx.lineTo(c - 17, bot + STUB); ctx.lineTo(c + 17, bot + STUB); ctx.lineTo(c + 13, bot); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = C.asph; ctx.fillRect(0, TOP, w, n * LH);
    ctx.fillStyle = C.asph2; ctx.fillRect(mx(0), TOP, mx(SEG) - mx(0), n * LH);
    ctx.lineCap = "butt"; ctx.strokeStyle = C.paint; ctx.lineWidth = 1.6; ctx.setLineDash([15, 13]);
    if (cfg === "4lane") {
      line(ctx, TOP + LH, w); line(ctx, TOP + 3 * LH, w);
      ctx.setLineDash([]); ctx.strokeStyle = C.yel; line(ctx, TOP + 2 * LH - 3.5, w); line(ctx, TOP + 2 * LH + 3.5, w);
    } else {
      ctx.setLineDash([]); ctx.strokeStyle = C.yel; line(ctx, TOP + LH, w); line(ctx, TOP + 2 * LH, w);
      ctx.setLineDash([13, 13]); ctx.lineWidth = 1.4; line(ctx, TOP + LH + 6, w); line(ctx, TOP + 2 * LH - 6, w);
    }
    ctx.setLineDash([]); ctx.strokeStyle = C.paint; ctx.lineWidth = 1.8;
    [[TOP + 1, D.dwA.map((x) => mx(x))], [bot - 1, D.dwB.map((x) => mx(SEG - x))]].forEach(([y, gaps]) => {
      let cur = 0;
      gaps.concat([w + 40]).forEach((g) => { ctx.beginPath(); ctx.moveTo(cur, y); ctx.lineTo(Math.min(g - 15, w), y); ctx.stroke(); cur = g + 15; });
    });
    const half = n * LH / 2;
    [[mx(0), gWest, TOP + half], [mx(SEG), gEast, TOP + 2]].forEach(([sx, green, y0]) => {
      ctx.fillStyle = C.paint; ctx.fillRect(sx - 6, TOP + 2, 3, n * LH - 4);
      ctx.fillStyle = green ? C.go : C.stop; ctx.fillRect(sx - 2, y0, 5, half - 2);
    });
  }

  function drawVeh(ctx, x, y, dir, kind, C, yaw, swerve) {
    const L = 6.6 * PX, W = VEH_W, hl = L / 2, hw = W / 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(yaw); if (dir === 0) ctx.scale(-1, 1);
    ctx.beginPath(); ctx.roundRect(-hl, -hw, L, W, [2.5, 5.5, 5.5, 2.5]);
    ctx.fillStyle = kind === 2 || kind === 3 ? C.turn : kind === 1 ? C.block : C.veh; ctx.fill();
    ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-hl + L * 0.18, -hw + W * 0.16, L * 0.46, W * 0.68, 2); ctx.fillStyle = "rgba(0,0,0,0.42)"; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-hl + L * 0.655, -hw + W * 0.23, L * 0.12, W * 0.54, 1.5); ctx.fillStyle = "rgba(255,255,255,0.34)"; ctx.fill();
    ctx.restore();
    if (kind === 1 || swerve) {
      ctx.beginPath(); ctx.roundRect(x - hl - 4, y - hw - 4, L + 8, W + 8, 7);
      ctx.strokeStyle = C.block; ctx.lineWidth = swerve ? 2.4 : 1.6; ctx.setLineDash(swerve ? [4, 3] : []);
      ctx.globalAlpha = swerve ? 1 : 0.5; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
    }
  }

  const frames = (cfg) => D.scen[cfg + "_" + vol];
  const fIndex = (fr, tt) => Math.max(0, Math.min(fr.length - 1, Math.floor(tt / D.dt)));
  const startIdx = () => fIndex(frames("4lane"), STEP[vol].start);

  // Drivers who swerved around a stopped turner in the last 3 seconds (a lane change takes 3).
  function swerving(fr, fi) {
    const s = new Set(), back = Math.round(3 / D.dt);
    for (let i = Math.max(0, fi - back); i <= fi; i++) for (const id of fr[i][1]) s.add(id);
    return s;
  }
  const where = {};   // where each vehicle was last drawn, canvas px, per road

  function render(cfg) {
    const c = cv[cfg], ctx = c.getContext("2d"), fr = frames(cfg), dt = D.dt;
    const C = { asph: css("--asphalt", "#4a4b4d"), asph2: css("--asphalt-2", "#5c5d60"), paint: css("--paint", "#f2f0e6"),
      yel: css("--yellow", "#e3ae1f"), go: css("--go", "#3f9a5c"), stop: css("--stop", "#c0392f"), veh: css("--veh", "#cfcabc"),
      turn: css("--veh-turn", "#e3ae1f"), block: css("--veh-block", "#d03b3b"), edge: css("--veh-edge", "#2c2b26") };
    const fi = fIndex(fr, t), fj = Math.min(fr.length - 1, fi + 1), u = Math.min(1, (t - fi * dt) / dt);
    ctx.clearRect(0, 0, c.width, c.height);
    drawRoad(ctx, cfg, c.width, fr[fi][2], fr[fi][3], C);
    const note = activeNote(cfg), focus = note && note.veh != null ? note.veh : null;
    if (note && note.band) {       // the through lanes, one each way, drawn as a soft green band
      ctx.save(); ctx.fillStyle = C.go; ctx.globalAlpha = 0.22;
      const lanes = cfg === "3lane" ? [0, 2] : [0, 1, 2, 3];
      lanes.forEach((l) => ctx.fillRect(mx(0), TOP + l * LH + 2, mx(SEG) - mx(0), LH - 4));
      ctx.restore();
    }
    const next = new Map(); for (const v of fr[fj][0]) next.set(v[0], v);
    const sw = swerving(fr, fi), at = (where[cfg] = new Map());
    for (const v of fr[fi][0]) {
      const [id, dir, x10, lat100, kind] = v;
      let xm = x10 / 10, lc = lat100 / 100, dlc = 0;
      const nx = next.get(id);
      if (nx) { xm += (nx[2] / 10 - xm) * u; dlc = nx[3] / 100 - lc; lc += dlc * u; }
      else if (kind === 3) { dlc = 0.55; lc += dlc * u; }
      const rate = dlc / dt;
      const yaw = kind === 3 ? Math.max(-1.35, Math.min(1.35, -rate * 1.15)) : Math.max(-0.13, Math.min(0.13, -rate * 0.22));
      const X = mx(dir === 1 ? xm : SEG - xm), Y = laneY(cfg, dir, lc);
      drawVeh(ctx, X, Y, dir, kind, C, yaw, sw.has(id));
      if (id === focus) {          // the car a callout is pointing at
        ctx.beginPath(); ctx.arc(X, Y, 6.6 * PX * 0.75, 0, 7);
        ctx.strokeStyle = C.paint; ctx.lineWidth = 2.5; ctx.stroke();
      }
      at.set(id, { x: X, y: Y, kind, lc });
    }
    const k = cfg === "4lane" ? "4" : "3", s0 = fr[startIdx()];
    $(`[data-s="served${k}"]`).textContent = Math.max(0, (fr[fi][4] || 0) - (STEP[vol].start ? s0[4] : 0));
    const held = new Set(); for (let i = startIdx(); i <= fi; i++) for (const v of fr[i][0]) if (v[4] === 1) held.add(v[0]);
    $(`[data-s="held${k}"]`).textContent = held.size;
    $(`[data-s="q${k}"]`).textContent = fr[fi][5] || 0;
  }

  // ---------- callouts: a bubble with a pointer at the car or place it's about
  function heldSeconds(cfg, id) {
    const fr = frames(cfg), fi = fIndex(fr, t); let n = 0;
    for (let i = startIdx(); i <= fi; i++) if (fr[i][0].some((v) => v[0] === id && v[4] === 1)) n++;
    return Math.round(n * D.dt);
  }
  function activeNote(cfg) { return STEP[vol].notes.find((n) => n.road === cfg && t >= n.t && t < n.until); }
  function paintNotes() {
    for (const cfg of ["4lane", "3lane"]) {
      const el = noteEl[cfg], n = activeNote(cfg);
      if (!n) { el.hidden = true; continue; }
      let target = null;
      if (n.veh != null) target = where[cfg].get(n.veh);
      else if (n.turner) target = [...where[cfg].values()].find((p) => (p.kind === 2 || p.kind === 3) && p.lc > 0.6);
      if (!target && n.band) target = { x: mx(SEG * 0.55), y: TOP + (N[cfg] - 0.5) * LH };
      if (!target) target = n.queue ? { x: mx(0) - 8, y: TOP + N[cfg] * LH * 0.75 } : { x: CW / 2, y: TOP + N[cfg] * LH / 2 };
      el.hidden = false;
      el.textContent = n.text.replace("{n}", heldSeconds(cfg, n.veh));
      const c = cv[cfg], k = c.clientWidth / CW, px = target.x * k, py = target.y * k;
      const w = el.offsetWidth, h = el.offsetHeight;
      const left = Math.max(4, Math.min(c.clientWidth - w - 4, px - w * 0.3));
      const above = n.side ? n.side === "above" : py > c.clientHeight / 2;   // default: the side with more room
      el.style.left = left + "px";
      el.style.top = (above ? c.offsetTop + py - h - 14 : c.offsetTop + py + 14) + "px";
      el.dataset.side = above ? "above" : "below";
      el.style.setProperty("--ax", Math.max(10, Math.min(w - 10, px - left)) + "px");
    }
  }

  function show() {
    if (!D) return;
    render("4lane"); render("3lane"); paintNotes();
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    $(".ss-clock").textContent = `${m}:${String(s).padStart(2, "0")} / 3:00`;
  }
  function tick(now) {
    const d = last ? (now - last) / 1000 : 0; last = now;
    if (playing && visible && D && now >= holdUntil) {
      const nt = t + d * SPEED;
      const hit = STEP[vol].notes.find((n) => !fired.has(n) && t < n.t && nt >= n.t);
      if (hit) { fired.add(hit); t = hit.t; holdUntil = now + hit.hold * 1000; }   // pause on the callout
      else t = nt;
      if (t >= D.win) { t = STEP[vol].start; fired = new Set(); }
    }
    try { show(); } catch (e) { console.error(e); }
    requestAnimationFrame(tick);
  }

  // Make the change of step obvious: the number counts up (or down) to the new
  // volume and the header flashes.
  let shown = VOLS[0], countRaf = 0;
  function countTo(v) {
    const el = $(".ss-vol b"), from = shown, t0 = performance.now(), dur = 700;
    cancelAnimationFrame(countRaf); shown = v;
    if (reduce || !D) { el.textContent = v.toLocaleString(); return; }
    const head = $(".ss-vol"); head.classList.remove("flash"); void head.offsetWidth; head.classList.add("flash");
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 3);
      const n = u === 1 ? v : Math.round((from + (v - from) * e) / 10) * 10;
      el.textContent = n.toLocaleString();
      if (u < 1) countRaf = requestAnimationFrame(step);
    };
    countRaf = requestAnimationFrame(step);
  }

  function setVol(v) {
    if (v === vol && D) return;
    vol = v; t = reduce ? Math.max(90, STEP[v].start) : STEP[v].start; fired = new Set(); holdUntil = 0;
    countTo(v);
    panel.querySelectorAll(".ss-q").forEach((e) => (e.hidden = !STEP[v].queue));
    steps.forEach((s) => s.classList.toggle("on", +s.dataset.vol === v));
    paintScale(); show();
  }

  $(".ss-play").addEventListener("click", (e) => {
    playing = !playing; holdUntil = 0; e.currentTarget.textContent = playing ? "Pause" : "Play";
  });

  // The step whose card crosses a line low on the screen, below the sticky panel, sets the volume.
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) setVol(+e.target.dataset.vol); });
  }, { rootMargin: "-70% 0px -29% 0px" });
  steps.forEach((s) => io.observe(s));
  steps[0].classList.add("on");
  paintScale();

  // ---------- the hour-long queue chart, drawn into a step card
  function queueChart(el, v) {
    const T = D.hour.t, a = D.hour.qs["4lane_" + v], b = D.hour.qs["3lane_" + v];
    const ar = D.hour.q["4lane_" + v], br = D.hour.q["3lane_" + v];
    const W = 480, H = 220, ML = 36, MR = 70, MT = 12, MB = 34, iw = W - ML - MR, ih = H - MT - MB;
    const max = Math.max(20, Math.max(...ar, ...br) * 1.1), tMax = T[T.length - 1];
    const X = (x) => ML + (x / tMax) * iw, Y = (y) => MT + ih - (y / max) * ih;
    const stepY = max <= 20 ? 5 : max <= 60 ? 20 : 25;
    let g = "";
    for (let y = 0; y <= max; y += stepY)
      g += `<line x1="${ML}" x2="${W - MR}" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="var(--grid)"/>` +
        `<text x="${ML - 6}" y="${(Y(y) + 4).toFixed(1)}" text-anchor="end" class="qc-ax">${y}</text>`;
    for (let m = 0; m <= 60; m += 15) g += `<text x="${X(m).toFixed(1)}" y="${H - MB + 16}" text-anchor="middle" class="qc-ax">${m}</text>`;
    const path = (s) => "M" + s.map((y, i) => `${X(T[i]).toFixed(1)},${Y(y).toFixed(1)}`).join("L");
    const end = (s) => s[s.length - 1];
    let ya = Y(end(a)), yb = Y(end(b));
    if (Math.abs(ya - yb) < 14) { const m = (ya + yb) / 2; if (end(b) >= end(a)) { yb = m - 7; ya = m + 7; } else { ya = m - 7; yb = m + 7; } }
    el.innerHTML = `<p class="qc-title">Cars waiting at the lights to get in, over a full hour</p>
      <div class="qc-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Over an hour at ${v} vehicles an hour, the four-lane line ends near ${Math.round(end(a))} cars waiting and the road diet's near ${Math.round(end(b))}.">
        ${g}
        <line x1="${ML}" x2="${W - MR}" y1="${MT + ih}" y2="${MT + ih}" stroke="var(--rule)" stroke-width="1.5"/>
        <path d="${path(ar)}" fill="none" stroke="var(--s1)" stroke-width="1" opacity=".3"/>
        <path d="${path(br)}" fill="none" stroke="var(--s2)" stroke-width="1" opacity=".3"/>
        <path d="${path(a)}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>
        <path d="${path(b)}" fill="none" stroke="var(--s2)" stroke-width="2" stroke-linejoin="round"/>
        <text x="${W - MR + 6}" y="${(ya + 4).toFixed(1)}" class="qc-lab">Four lanes</text>
        <text x="${W - MR + 6}" y="${(yb + 4).toFixed(1)}" class="qc-lab">Road diet</text>
        <text x="${ML + iw / 2}" y="${H - 2}" text-anchor="middle" class="qc-ax">minutes into the hour</text>
        <line class="qc-x" x1="0" x2="0" y1="${MT}" y2="${MT + ih}" stroke="var(--ink-3)" visibility="hidden"/>
        <rect x="${ML}" y="${MT}" width="${iw}" height="${ih}" fill="transparent" class="qc-hit"/>
      </svg><div class="qc-tip" hidden></div></div>
      <p class="qc-key"><span><i style="background:var(--s1)"></i>Four lanes</span><span><i style="background:var(--s2)"></i>Road diet</span><span class="muted">Bold: averaged over each 90-second signal cycle. Faint: cycle by cycle. Average of 12 simulated hours.</span></p>`;
    const svg = el.querySelector("svg"), hit = el.querySelector(".qc-hit"), xl = el.querySelector(".qc-x"), tip = el.querySelector(".qc-tip");
    const move = (e) => {
      const r = svg.getBoundingClientRect(), sx = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(T.length - 1, Math.round(((sx - ML) / iw) * (T.length - 1))));
      xl.setAttribute("x1", X(T[i])); xl.setAttribute("x2", X(T[i])); xl.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.innerHTML = `<b>Minute ${Math.round(T[i])}</b><br>Four lanes: ${Math.round(a[i])} waiting<br>Road diet: ${Math.round(b[i])} waiting`;
      tip.style.left = Math.min(r.width - 150, Math.max(0, (X(T[i]) / W) * r.width + 10)) + "px";
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerleave", () => { tip.hidden = true; xl.setAttribute("visibility", "hidden"); });
  }

  function ready(d) {
    D = d; SEG = d.seg; PX = CW / (SEG + 60); mx = (m) => (m - X0) * PX;
    if (d.hour) root.querySelectorAll("[data-queue-chart]").forEach((el) => {
      try { queueChart(el, +el.closest(".ss-step").dataset.vol); } catch (e) { console.error("queue chart", e); }
    });
    t = reduce ? Math.max(90, STEP[vol].start) : STEP[vol].start;
  }

  // Load the recorded runs when the section gets close, and only animate while it's on screen.
  const qp = new URLSearchParams(location.search), fixed = qp.has("ss-vol");
  let loading = fixed;
  new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    if (visible && !loading) {
      loading = true;
      fetch(DATA, { cache: "no-cache" }).then((r) => r.json()).then((d) => { ready(d); requestAnimationFrame(tick); })
        .catch((e) => { console.error("replay data", e); $(".ss-clock").textContent = "Couldn't load the replay. Reload the page."; });
    }
  }, { rootMargin: "600px 0px" }).observe(root);

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const q = Math.min(Array.isArray(r) ? r[0] : r, Math.abs(w) / 2, Math.abs(h) / 2);
      this.moveTo(x + q, y); this.lineTo(x + w - q, y); this.quadraticCurveTo(x + w, y, x + w, y + q);
      this.lineTo(x + w, y + h - q); this.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
      this.lineTo(x + q, y + h); this.quadraticCurveTo(x, y + h, x, y + h - q);
      this.lineTo(x, y + q); this.quadraticCurveTo(x, y, x + q, y); return this;
    };
  }

  // ?ss-vol=700&ss-t=112 renders a fixed moment, for checking a frame.
  if (fixed) {
    fetch(DATA).then((r) => r.json()).then((d) => {
      io.disconnect(); ready(d); playing = false; vol = 0; setVol(+qp.get("ss-vol")); t = +qp.get("ss-t") || 0; show();
    });
  }
})();
