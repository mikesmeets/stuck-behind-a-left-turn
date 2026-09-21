// The traffic replay as a scroll-driven progression: 400 -> 1,000 through
// vehicles an hour. Each step replays one recorded simulation run (the build-up
// edition's hour for that volume), so it plays the same way every time. It
// isn't simulated in the browser. Data: /site/data/sim-steps.json, extracted
// from simulation.html. Renders into <div data-sim-steps>, whose children
// .ss-step[data-vol] are the step cards.
(function () {
  const root = document.querySelector("[data-sim-steps]");
  if (!root) return;
  const SPEED = 2;                                   // 2x real time
  const steps = [...root.querySelectorAll(".ss-step")];
  const panel = root.querySelector(".ss-panel");

  panel.innerHTML = `
    <div class="ss-head">
      <div class="ss-vol"><b>${steps[0].dataset.vol}</b><span>through vehicles an hour, each direction, at the evening peak</span></div>
      <div class="ss-ctl"><span class="ss-clock">0:00 / 3:00</span><button type="button" class="ss-play">Pause</button></div>
    </div>
    <div class="ss-road">
      <p class="ss-label"><i style="background:var(--s1)"></i><span>Today: four lanes</span><span class="ss-stats"><span><b data-s="served4">0</b> through the block</span><span class="ss-held"><b data-s="held4">0</b> held up behind a left turn</span></span></p>
      <canvas width="1160" height="172" data-road="4lane" aria-hidden="true"></canvas>
    </div>
    <div class="ss-road">
      <p class="ss-label"><i style="background:var(--s2)"></i><span>Road diet: three lanes</span><span class="ss-stats"><span><b data-s="served3">0</b> through the block</span><span class="ss-held"><b data-s="held3">0</b> held up behind a left turn</span></span></p>
      <canvas width="1160" height="142" data-road="3lane" aria-hidden="true"></canvas>
    </div>
    <div class="ss-key">
      <span><i style="background:var(--veh)"></i>through traffic</span>
      <span><i style="background:var(--veh-turn)"></i>will turn left</span>
      <span><i style="background:var(--veh-block)"></i>held up behind a left turn</span>
      <span class="muted">Three minutes of one simulated evening peak at 2× speed</span>
    </div>`;
  const $ = (s) => panel.querySelector(s);
  // Stick just below the site menu, whose height changes on phones.
  const pin = () => { const nav = document.querySelector(".sitenav"); panel.style.top = (nav ? nav.getBoundingClientRect().height : 52) + 8 + "px"; };
  pin(); addEventListener("resize", pin); addEventListener("load", pin);
  const cv = { "4lane": $('[data-road="4lane"]'), "3lane": $('[data-road="3lane"]') };

  let D = null, vol = +steps[0].dataset.vol, t = 0, playing = true, last = 0, visible = false;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { playing = false; $(".ss-play").textContent = "Play"; }

  // ---------- geometry, as in the simulation editions
  let SEG, PX, mx;
  const X0 = -30, LH = 30, STUB = 22, TOP = STUB + 4, VEH_W = 13;
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

  function drawVeh(ctx, x, y, dir, kind, C, yaw) {
    const L = 6.6 * PX, W = VEH_W, hl = L / 2, hw = W / 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(yaw); if (dir === 0) ctx.scale(-1, 1);
    ctx.beginPath(); ctx.roundRect(-hl, -hw, L, W, [2.5, 5.5, 5.5, 2.5]);
    ctx.fillStyle = kind === 2 || kind === 3 ? C.turn : kind === 1 ? C.block : C.veh; ctx.fill();
    ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-hl + L * 0.18, -hw + W * 0.16, L * 0.46, W * 0.68, 2); ctx.fillStyle = "rgba(0,0,0,0.42)"; ctx.fill();
    ctx.beginPath(); ctx.roundRect(-hl + L * 0.655, -hw + W * 0.23, L * 0.12, W * 0.54, 1.5); ctx.fillStyle = "rgba(255,255,255,0.34)"; ctx.fill();
    ctx.restore();
    if (kind === 1) {
      ctx.beginPath(); ctx.roundRect(x - hl - 3, y - hw - 3, L + 6, W + 6, 6);
      ctx.strokeStyle = C.block; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  // Held-up drivers so far: every vehicle drawn red at any frame up to now.
  const heldSoFar = (fr, fi) => { const s = new Set(); for (let i = 0; i <= fi; i++) for (const v of fr[i][0]) if (v[4] === 1) s.add(v[0]); return s.size; };

  function render(cfg) {
    const c = cv[cfg], ctx = c.getContext("2d"), fr = D.scen[cfg + "_" + vol], dt = D.dt;
    const C = { asph: css("--asphalt", "#4a4b4d"), asph2: css("--asphalt-2", "#5c5d60"), paint: css("--paint", "#f2f0e6"),
      yel: css("--yellow", "#e3ae1f"), go: css("--go", "#3f9a5c"), stop: css("--stop", "#c0392f"), veh: css("--veh", "#cfcabc"),
      turn: css("--veh-turn", "#e3ae1f"), block: css("--veh-block", "#d03b3b"), edge: css("--veh-edge", "#2c2b26") };
    const fi = Math.min(fr.length - 1, Math.floor(t / dt)), fj = Math.min(fr.length - 1, fi + 1);
    const u = Math.min(1, (t - fi * dt) / dt);
    ctx.clearRect(0, 0, c.width, c.height);
    drawRoad(ctx, cfg, c.width, fr[fi][2], fr[fi][3], C);
    const next = new Map(); for (const v of fr[fj][0]) next.set(v[0], v);
    for (const v of fr[fi][0]) {
      const [id, dir, x10, lat100, kind] = v;
      let xm = x10 / 10, lc = lat100 / 100, dlc = 0;
      const nx = next.get(id);
      if (nx) { xm += (nx[2] / 10 - xm) * u; dlc = nx[3] / 100 - lc; lc += dlc * u; }
      else if (kind === 3) { dlc = 0.55; lc += dlc * u; }
      const rate = dlc / dt;
      const yaw = kind === 3 ? Math.max(-1.35, Math.min(1.35, -rate * 1.15)) : Math.max(-0.13, Math.min(0.13, -rate * 0.22));
      drawVeh(ctx, mx(dir === 1 ? xm : SEG - xm), laneY(cfg, dir, lc), dir, kind, C, yaw);
    }
    const k = cfg === "4lane" ? "4" : "3";
    $(`[data-s="served${k}"]`).textContent = fr[fi][4] || 0;
    $(`[data-s="held${k}"]`).textContent = heldSoFar(fr, fi);
  }

  function show() {
    if (!D) return;
    render("4lane"); render("3lane");
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    $(".ss-clock").textContent = `${m}:${String(s).padStart(2, "0")} / 3:00`;
  }
  function tick(now) {
    const d = last ? (now - last) / 1000 : 0; last = now;
    if (playing && visible && D) { t += d * SPEED; if (t >= D.win) t = 0; }
    try { show(); } catch (e) { console.error(e); }
    requestAnimationFrame(tick);
  }

  function setVol(v) {
    if (v === vol && D) return;
    vol = v; t = reduce ? 90 : 0;
    $(".ss-vol b").textContent = v.toLocaleString();
    steps.forEach((s) => s.classList.toggle("on", +s.dataset.vol === v));
    show();
  }

  $(".ss-play").addEventListener("click", (e) => {
    playing = !playing; e.currentTarget.textContent = playing ? "Pause" : "Play";
  });

  // The step whose card crosses a line low on the screen, below the sticky panel, sets the volume.
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) setVol(+e.target.dataset.vol); });
  }, { rootMargin: "-70% 0px -29% 0px" });
  steps.forEach((s) => io.observe(s));
  steps[0].classList.add("on");

  // Load the recorded runs when the section gets close, and only animate while it's on screen.
  let loading = false;
  new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    if (visible && !loading) {
      loading = true;
      fetch("/site/data/sim-steps.json").then((r) => r.json()).then((d) => {
        D = d; SEG = d.seg; PX = 1160 / (SEG + 60); mx = (m) => (m - X0) * PX;
        if (reduce) t = 90;
        requestAnimationFrame(tick);
      });
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

  // ?ss-vol=700&ss-t=60 renders a fixed moment, for checking a frame.
  const qp = new URLSearchParams(location.search);
  if (qp.has("ss-vol")) {
    fetch("/site/data/sim-steps.json").then((r) => r.json()).then((d) => {
      D = d; SEG = d.seg; PX = 1160 / (SEG + 60); mx = (m) => (m - X0) * PX;
      playing = false; vol = 0; setVol(+qp.get("ss-vol")); t = +qp.get("ss-t") || 0; show();
    });
  }
})();
