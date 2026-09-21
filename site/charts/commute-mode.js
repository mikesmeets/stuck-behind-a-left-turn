// How Town of Mamaroneck workers get to work, 1990–2024 (share of workers 16+).
// Verified against the Census Bureau's own tables:
//   1990  CPH-5-34 (New York), Table 5 — gives car/truck/van and public transit only
//   2000  Decennial SF3, P030
//   2010, 2019, 2024  ACS 5-year (2006–10, 2015–19, 2020–24), B08301
// Town of Mamaroneck = Larchmont + the Town's part of the Village of Mamaroneck
// + unincorporated. GEOID 3611944842. Renders into <div data-chart="commute-mode">.
(function () {
  const PERIODS = { 1990:"1990 census", 2000:"2000 census", 2010:"ACS 2006–10", 2019:"ACS 2015–19", 2024:"ACS 2020–24" };
  const SERIES = [
    { name:"Drove",            color:"--s1", pts:[[1990,61.6],[2000,56.5],[2010,55.2],[2019,49.6],[2024,44.2]] },
    { name:"Public transit",   color:"--s2", pts:[[1990,26.6],[2000,31.4],[2010,31.0],[2019,33.9],[2024,22.6]] },
    { name:"Worked from home", color:"--s3", pts:[[2000,6.7],[2010,7.1],[2019,8.7],[2024,27.3]] },
    { name:"Walked",           color:"--s4", pts:[[2000,4.6],[2010,4.3],[2019,6.2],[2024,5.0]] },
  ];
  const X0 = 1988, X1 = 2026, Y1 = 70;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
  const pct = v => `${v.toFixed(1)}%`;

  document.querySelectorAll('[data-chart="commute-mode"]').forEach(root => {
    root.innerHTML = `
      <div class="chart-tabs" role="group" aria-label="View">
        <button type="button" data-view="chart" aria-pressed="true">Chart</button>
        <button type="button" data-view="table" aria-pressed="false">Table</button>
      </div>
      <ul class="chart-legend">${SERIES.map(s => `<li><i style="background:var(${s.color})"></i>${s.name}</li>`).join("")}</ul>
      <div class="chart-plot">
        <svg role="img"><desc></desc></svg>
        <div class="chart-tip" role="status"></div>
      </div>
      <div class="table-scroll" hidden></div>`;
    const svg = root.querySelector("svg"), plot = root.querySelector(".chart-plot"),
          tip = root.querySelector(".chart-tip"), legend = root.querySelector(".chart-legend"),
          tablewrap = root.querySelector(".table-scroll");
    svg.querySelector("desc").textContent =
      "Line chart of how Town of Mamaroneck workers commute, 1990 to 2024. " +
      SERIES.map(s => `${s.name}: ${pct(s.pts[0][1])} in ${s.pts[0][0]}, ${pct(s.pts.at(-1)[1])} in 2020–24.`).join(" ");

    let hits = [];
    function draw() {
      const W = plot.clientWidth;
      if (!W) return;
      const narrow = W < 560;
      const m = { t:10, r: narrow ? 12 : 150, b:26, l:40 };
      const H = narrow ? 280 : 320;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      [...svg.querySelectorAll(":scope > g")].forEach(g => g.remove());
      const x = v => m.l + (v - X0) / (X1 - X0) * (W - m.l - m.r);
      const y = v => m.t + (1 - v / Y1) * (H - m.t - m.b);
      const grid = el("g", { class:"grid" }, svg), axis = el("g", { class:"axis" }, svg);
      for (let v = 0; v <= Y1; v += 10) {
        if (v) el("line", { x1:m.l, x2:W - m.r, y1:y(v), y2:y(v) }, grid);
        el("text", { x:m.l - 8, y:y(v) + 4, "text-anchor":"end" }, axis).textContent = `${v}%`;
      }
      el("line", { class:"base", x1:m.l, x2:W - m.r, y1:y(0), y2:y(0) }, axis);
      Object.keys(PERIODS).forEach(yr => {
        if (narrow && yr === "2019") return;
        el("text", { x:x(+yr), y:H - 6, "text-anchor":"middle" }, axis).textContent = yr;
      });
      const marks = el("g", {}, svg);
      hits = [];
      SERIES.forEach(s => {
        const c = css(s.color), card = css("--card");
        el("polyline", { points:s.pts.map(([a,b]) => `${x(a)},${y(b)}`).join(" "),
          fill:"none", stroke:c, "stroke-width":2, "stroke-linejoin":"round", "stroke-linecap":"round" }, marks);
        s.pts.forEach(([a,b], i) => {
          const last = i === s.pts.length - 1;
          el("circle", { cx:x(a), cy:y(b), r:last ? 4.5 : 3, fill:c, stroke:card, "stroke-width":2 }, marks);
          hits.push({ s, yr:a, v:b, px:x(a), py:y(b) });
        });
      });
      if (!narrow) {
        const labs = SERIES.map(s => ({ s, yv:y(s.pts.at(-1)[1]) })).sort((a,b) => a.yv - b.yv);
        for (let i = 1; i < labs.length; i++) labs[i].yv = Math.max(labs[i].yv, labs[i-1].yv + 32);
        const g = el("g", {}, svg);
        labs.forEach(({ s, yv }) => {
          const t = el("text", { class:"endlabel", x:x(X1) + 6, y:yv - 2 }, g);
          t.textContent = s.name;
          el("tspan", { class:"v", x:x(X1) + 6, dy:15 }, t).textContent = pct(s.pts.at(-1)[1]);
        });
      }
    }
    function pointer(e) {
      const r = plot.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const k = vb.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      let best = null, bd = 24 * k;
      for (const h of hits) { const d = Math.hypot(h.px - px, h.py - py); if (d < bd) { bd = d; best = h; } }
      if (!best) { tip.style.opacity = 0; return; }
      tip.innerHTML = `<div>${best.s.name}, ${PERIODS[best.yr]}</div><b>${pct(best.v)}</b> of workers`;
      const tx = best.px / k, ty = best.py / k, tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(tx - tw / 2, 0), r.width - tw) + "px";
      tip.style.top = Math.max(ty - tip.offsetHeight - 12, 0) + "px";
      tip.style.opacity = 1;
    }
    plot.addEventListener("pointermove", pointer);
    plot.addEventListener("pointerdown", pointer);
    plot.addEventListener("pointerleave", () => tip.style.opacity = 0);

    tablewrap.innerHTML =
      `<table class="data"><thead><tr><th>Period</th>${SERIES.map(s => `<th>${s.name}</th>`).join("")}</tr></thead><tbody>` +
      Object.keys(PERIODS).map(yr => `<tr><td>${PERIODS[yr]}</td>${SERIES.map(s => { const p = s.pts.find(q => q[0] === +yr);
        return `<td>${p ? pct(p[1]) : "—"}</td>`; }).join("")}</tr>`).join("") + "</tbody></table>";
    root.querySelectorAll(".chart-tabs button").forEach(b => b.addEventListener("click", () => {
      const t = b.dataset.view === "table";
      root.querySelectorAll(".chart-tabs button").forEach(o => o.setAttribute("aria-pressed", o === b));
      plot.hidden = t; legend.hidden = t; tablewrap.hidden = !t;
      if (!t) draw();
    }));
    draw();
    new ResizeObserver(draw).observe(plot);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  });
})();
