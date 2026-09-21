// Daily traffic (AADT) on four Boston Post Road segments, 1979–2025.
// Source: NYSDOT counts, compiled in "AADT Graphs from NYSDOT.xlsx".
// Renders into <div data-chart="traffic-trend">.
(function () {
  const SERIES = [
    { name:"Larchmont", color:"--s1", pts:[[1979,15430],[1980,21460],[1983,14630],[1985,18220],[1987,16760],[1990,13150],[1992,14220],[1996,15920],[2006,13935],[2011,13694],[2014,13241],[2024,10104]] },
    { name:"Mamaroneck", color:"--s2", pts:[[1979,17810],[1980,18690],[1983,19080],[1987,19540],[1988,20680],[1991,18910],[1994,18130],[1996,21520],[2000,19301],[2003,20686],[2006,19286],[2016,19377],[2019,19936],[2024,14958]] },
    { name:"Rye Neck to Barry", color:"--s3", pts:[[1979,17140],[1980,17130],[1988,16250],[1991,16620],[1996,18000],[1997,17590],[2006,17293],[2008,18134],[2019,16757],[2023,16049]] },
    { name:"Rye Neck to Rye border", color:"--s4", pts:[[1980,8690],[1983,10700],[1985,10900],[1990,11100],[1992,12010],[1996,11850],[1999,13430],[2002,11963],[2005,11764],[2006,13042],[2009,11516],[2017,10300],[2025,9740]] },
  ];
  const START = 1990;   // the chart begins here; earlier counts stay in the data file
  SERIES.forEach(s => { s.pts = s.pts.filter(([yr]) => yr >= START); });
  const X0 = START - 1, X1 = 2026, Y1 = 22000;
  const fmt = n => n.toLocaleString("en-US");
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

  document.querySelectorAll('[data-chart="traffic-trend"]').forEach(root => {
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
      `Line chart of daily traffic on four Boston Post Road segments, ${START} to 2025. ` +
      SERIES.map(s => `${s.name}: ${fmt(s.pts[0][1])} in ${s.pts[0][0]}, ${fmt(s.pts.at(-1)[1])} in ${s.pts.at(-1)[0]}.`).join(" ");

    let hits = [];
    function draw() {
      const W = plot.clientWidth;
      if (!W) return;
      const narrow = W < 560;
      const m = { t:10, r: narrow ? 12 : 168, b:26, l:46 };
      const H = narrow ? 300 : 360;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      [...svg.querySelectorAll(":scope > g")].forEach(g => g.remove());
      const x = v => m.l + (v - X0) / (X1 - X0) * (W - m.l - m.r);
      const y = v => m.t + (1 - v / Y1) * (H - m.t - m.b);
      const grid = el("g", { class:"grid" }, svg), axis = el("g", { class:"axis" }, svg);
      for (let v = 0; v <= Y1; v += 5000) {
        if (v) el("line", { x1:m.l, x2:W - m.r, y1:y(v), y2:y(v) }, grid);
        el("text", { x:m.l - 8, y:y(v) + 4, "text-anchor":"end" }, axis).textContent = v ? `${v/1000}k` : "0";
      }
      el("line", { class:"base", x1:m.l, x2:W - m.r, y1:y(0), y2:y(0) }, axis);
      for (let yr = 1990; yr <= 2020; yr += narrow ? 10 : 5)
        el("text", { x:x(yr), y:H - 6, "text-anchor":"middle" }, axis).textContent = yr;
      const marks = el("g", {}, svg);
      hits = [];
      SERIES.forEach(s => {
        const c = css(s.color), card = css("--card");
        el("polyline", { points:s.pts.map(([a,b]) => `${x(a)},${y(b)}`).join(" "),
          fill:"none", stroke:c, "stroke-width":2, "stroke-linejoin":"round", "stroke-linecap":"round" }, marks);
        s.pts.forEach(([a,b], i) => {
          const last = i === s.pts.length - 1;
          el("circle", { cx:x(a), cy:y(b), r:last ? 4.5 : 3, fill:c, stroke:card, "stroke-width":2 }, marks);
          hits.push({ s, yr:a, v:b, px:x(a), py:y(b), prev:s.pts[i-1] });
        });
      });
      if (!narrow) {
        const labs = SERIES.map(s => ({ s, yv:y(s.pts.at(-1)[1]) })).sort((a,b) => a.yv - b.yv);
        for (let i = 1; i < labs.length; i++) labs[i].yv = Math.max(labs[i].yv, labs[i-1].yv + 32);
        const g = el("g", {}, svg);
        labs.forEach(({ s, yv }) => {
          const [yr, v] = s.pts.at(-1);
          const t = el("text", { class:"endlabel", x:x(X1) + 10, y:yv - 2 }, g);
          t.textContent = s.name;
          el("tspan", { class:"v", x:x(X1) + 10, dy:15 }, t).textContent = `${fmt(v)} (${yr})`;
        });
      }
    }
    function pointer(e) {
      const r = plot.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      const k = vb.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      let best = null, bd = 24 * k;
      for (const h of hits) { const d = Math.hypot(h.px - px, h.py - py); if (d < bd) { bd = d; best = h; } }
      if (!best) { tip.style.opacity = 0; return; }
      const chg = best.prev ? (best.v - best.prev[1]) / best.prev[1] * 100 : null;
      tip.innerHTML = `<div>${best.s.name}, ${best.yr}</div><b>${fmt(best.v)}</b> vehicles/day` +
        (chg === null ? "" : `<div class="muted">${chg >= 0 ? "+" : "−"}${Math.abs(chg).toFixed(0)}% vs ${best.prev[0]} count</div>`);
      const tx = best.px / k, ty = best.py / k, tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(tx - tw / 2, 0), r.width - tw) + "px";
      tip.style.top = Math.max(ty - tip.offsetHeight - 12, 0) + "px";
      tip.style.opacity = 1;
    }
    plot.addEventListener("pointermove", pointer);
    plot.addEventListener("pointerdown", pointer);
    plot.addEventListener("pointerleave", () => tip.style.opacity = 0);

    const years = [...new Set(SERIES.flatMap(s => s.pts.map(p => p[0])))].sort((a,b) => a - b);
    tablewrap.innerHTML =
      `<table class="data"><thead><tr><th>Year</th>${SERIES.map(s => `<th>${s.name}</th>`).join("")}</tr></thead><tbody>` +
      years.map(yr => `<tr><td>${yr}</td>${SERIES.map(s => { const p = s.pts.find(q => q[0] === yr);
        return `<td>${p ? fmt(p[1]) : ""}</td>`; }).join("")}</tr>`).join("") + "</tbody></table>";
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
