// Mamaroneck Safe Routes to School parent survey, 2024–25 school year.
// Source: "2024-2025 Survey WIP 2025-04-10.xlsx" (School Share pivot, Combined
// Results). 1,024 responses; one response per child.
//   <div data-chart="school-mode">  primary way each school's students get there
//   <div data-chart="why-not">      why children don't walk or bike
(function () {
  // Driven includes carpools and MHS students who drive themselves.
  // Stack order keeps the yellow bus away from the orange driven segment:
  // side by side those two are hard to tell apart, colorblind or not.
  const MODES = [
    { key:"walk",  name:"Walks",  color:"--s1" },
    { key:"bus",   name:"Bus",    color:"--s4" },
    { key:"bike",  name:"Bikes",  color:"--s3" },
    { key:"drive", name:"Driven", color:"--s2" },
  ];
  const SCHOOLS = [
    { name:"Chatsworth",     n:168, enrolled:652,  walk:106, bike:26,  bus:2,  drive:34 },
    { name:"Murray",         n:76,  enrolled:683,  walk:50,  bike:7,   bus:0,  drive:19 },
    { name:"Central",        n:166, enrolled:498,  walk:81,  bike:6,   bus:2,  drive:77 },
    { name:"Mamaroneck Ave", n:123, enrolled:631,  walk:26,  bike:4,   bus:3,  drive:90 },
    { name:"Hommocks",       n:319, enrolled:1281, walk:98,  bike:109, bus:30, drive:82 },
    { name:"MHS",            n:172, enrolled:1779, walk:47,  bike:36,  bus:8,  drive:81 },
  ];
  const ALL = { name:"All six schools", n:1024, enrolled:5524 };
  MODES.forEach(m => { ALL[m.key] = SCHOOLS.reduce((t, s) => t + s[m.key], 0); });

  // Parents who gave a reason their child doesn't walk or bike (select all that apply).
  const WHY_N = 493;
  const WHY = [
    ["It's too dangerous", 330],
    ["It's too far", 119],
    ["It takes too long", 97],
    ["Child is too young", 89],
    ["Doesn't fit the daily schedule", 71],
    ["I simply prefer to drive", 29],
    ["Don't have equipment", 11],
  ];

  const pct = (v, n) => Math.round(v / n * 100);
  // White text on blue, fixed dark text on the green, yellow and orange fills (both themes).
  const INK = { walk:"#fff", bike:"#16150f", bus:"#16150f", drive:"#16150f" };

  // Share of parents who rated their child's walking or biking route "somewhat
  // unsafe" or "very unsafe" (blank answers excluded).
  const UNSAFE = { "Chatsworth":[38,167], "Central":[102,165], "Murray":[28,75], "Mamaroneck Ave":[77,120],
                   "Hommocks":[129,319], "MHS":[88,167], "All six schools":[462,1013] };
  // Phone-width labels, in the abbreviations families here already use.
  const SHORT = { "Chatsworth":"Chat", "Central":"Cent", "Murray":"Mur", "Mamaroneck Ave":"MAS",
                  "Hommocks":"Hmx", "MHS":"MHS", "All six schools":"All" };
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

  document.querySelectorAll('[data-chart="school-mode"]').forEach(root => {
    const groups = [...SCHOOLS, ALL];
    root.innerHTML = `
      <div class="chart-tabs" role="group" aria-label="View">
        <button type="button" data-view="chart" aria-pressed="true">Chart</button>
        <button type="button" data-view="table" aria-pressed="false">Table</button>
      </div>
      <ul class="keyrow">${MODES.map(m => `<li><i style="background:var(${m.color})"></i>${m.name}</li>`).join("")}<li><i class="unsafe-key"></i>Parents who say the route is unsafe</li></ul>
      <div class="chart-plot"><svg role="img"><desc></desc></svg><div class="chart-tip" role="status"></div></div>
      <div class="table-scroll" hidden><table class="data"><thead><tr><th>School</th>${MODES.map(m => `<th>${m.name}</th>`).join("")}<th>Route unsafe</th></tr></thead><tbody>${
        groups.map(s => `<tr><td>${s.name}</td>${MODES.map(m => `<td>${pct(s[m.key], s.n)}%</td>`).join("")}<td>${pct(...UNSAFE[s.name])}%</td></tr>`).join("")
      }</tbody></table></div>`;
    const svg = root.querySelector("svg"), plot = root.querySelector(".chart-plot"), tip = root.querySelector(".chart-tip");
    svg.querySelector("desc").textContent = "Column chart by school: how students get to school, and the share of parents who say the route is unsafe. " +
      groups.map(s => `${s.name}: ${pct(s.drive, s.n)}% driven, ${pct(...UNSAFE[s.name])}% say unsafe.`).join(" ");
    let hits = [];
    function draw() {
      const W = plot.clientWidth; if (!W) return;
      const narrow = W < 560;
      const m = { t:18, r:4, b:narrow ? 30 : 34, l:36 }, H = narrow ? 300 : 340;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      [...svg.querySelectorAll(":scope > g")].forEach(g => g.remove());
      const y = v => m.t + (1 - v / 100) * (H - m.t - m.b);
      const grid = el("g", { class:"grid" }, svg), axis = el("g", { class:"axis" }, svg);
      for (let v = 0; v <= 100; v += 25) {
        if (v) el("line", { x1:m.l, x2:W - m.r, y1:y(v), y2:y(v) }, grid);
        el("text", { x:m.l - 6, y:y(v) + 4, "text-anchor":"end" }, axis).textContent = `${v}%`;
      }
      el("line", { class:"base", x1:m.l, x2:W - m.r, y1:y(0), y2:y(0) }, axis);
      const gap = narrow ? 14 : 36, sep = narrow ? 12 : 30;        // sep sets "All" apart
      const gw = (W - m.l - m.r - gap * (groups.length - 1) - sep) / groups.length;
      const colW = gw * 0.56, unW = gw * 0.28, inner = gw - colW - unW;
      const marks = el("g", {}, svg), labels = el("g", {}, svg);
      hits = [];
      groups.forEach((s, i) => {
        const x0 = m.l + i * (gw + gap) + (s === ALL ? sep : 0);
        let acc = 0;
        MODES.forEach(md => {
          const v = s[md.key] / s.n * 100; if (!v) return;
          const top = y(acc + v), bot = y(acc);
          el("rect", { x:x0, y:top + 1, width:colW, height:Math.max(bot - top - 2, 1), fill:`var(${md.color})`,
                       rx: acc + v >= 99.5 ? 3 : 0 }, marks);
          if (!narrow && bot - top > 16) {
            el("text", { x:x0 + colW / 2, y:(top + bot) / 2 + 4, "text-anchor":"middle", class:"seglabel",
                         fill: INK[md.key] }, labels).textContent = `${Math.round(v)}%`;
          }
          hits.push({ x:x0, w:colW, top, bot, html:`<div>${s.name}</div><b>${Math.round(v)}%</b> ${md.name.toLowerCase()}` });
          acc += v;
        });
        const u = UNSAFE[s.name][0] / UNSAFE[s.name][1] * 100, ux = x0 + colW + inner;
        el("rect", { x:ux, y:y(u), width:unW, height:y(0) - y(u), class:"unsafe-bar", rx:2 }, marks);
        el("text", { x:ux + unW / 2, y:y(u) - 5, "text-anchor":"middle", class:"unsafe-label" }, labels).textContent = `${Math.round(u)}%`;
        hits.push({ x:ux, w:unW, top:y(u), bot:y(0), html:`<div>${s.name}</div><b>${Math.round(u)}%</b> of parents say the route is unsafe` });
        const name = narrow ? (SHORT[s.name] || s.name) : s.name;
        el("text", { x:x0 + gw / 2, y:H - m.b + 16, "text-anchor":"middle", class: (s === ALL ? "grouplabel total" : "grouplabel") + (narrow ? " small" : "") }, labels).textContent = name;
      });
    }
    function pointer(e) {
      const r = plot.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = vb.width / r.width;
      const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      const h = hits.find(h => px >= h.x && px <= h.x + h.w && py >= h.top && py <= h.bot);
      if (!h) { tip.style.opacity = 0; return; }
      tip.innerHTML = h.html;
      const tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max((h.x + h.w / 2) / k - tw / 2, 0), r.width - tw) + "px";
      tip.style.top = Math.max(py / k - tip.offsetHeight - 14, 0) + "px";
      tip.style.opacity = 1;
    }
    plot.addEventListener("pointermove", pointer);
    plot.addEventListener("pointerdown", pointer);
    plot.addEventListener("pointerleave", () => tip.style.opacity = 0);
    const chartParts = [root.querySelector(".keyrow"), plot], table = root.querySelector(".table-scroll");
    root.querySelectorAll(".chart-tabs button").forEach(b => b.addEventListener("click", () => {
      const t = b.dataset.view === "table";
      root.querySelectorAll(".chart-tabs button").forEach(o => o.setAttribute("aria-pressed", o === b));
      chartParts.forEach(e => e.hidden = t); table.hidden = !t;
      if (!t) draw();
    }));
    draw();
    new ResizeObserver(draw).observe(plot);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  });

  document.querySelectorAll('[data-chart="why-not"]').forEach(root => {
    const max = WHY[0][1];
    root.innerHTML = `<ul class="hbars simple" aria-label="Reasons children don't walk or bike to school">${
      WHY.map(([label, v], i) => `<li${i === 0 ? ' class="hl"' : ""}><span class="name">${label}</span><span class="track"><span class="bar" style="width:${v / max * 82}%"></span><span class="val" style="left:${v / max * 82}%">${pct(v, WHY_N)}%</span></span></li>`).join("")
    }</ul>`;
  });
})();
