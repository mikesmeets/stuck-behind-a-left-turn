// Mamaroneck Safe Routes to School parent survey, 2024–25 school year.
// Source: "2024-2025 Survey WIP 2025-04-10.xlsx" (School Share pivot, Combined
// Results). 1,024 responses; one response per child.
//   <div data-chart="school-mode">  primary way each school's students get there
//   <div data-chart="why-not">      why children don't walk or bike
(function () {
  // Driven includes carpools and MHS students who drive themselves.
  const MODES = [
    { key:"walk",  name:"Walks",  color:"--s4" },
    { key:"bike",  name:"Bikes",  color:"--s3" },
    { key:"bus",   name:"Bus",    color:"--s2" },
    { key:"drive", name:"Driven", color:"--s1" },
  ];
  const SCHOOLS = [
    { name:"Chatsworth",     n:168, enrolled:652,  walk:106, bike:26,  bus:2,  drive:34 },
    { name:"Central",        n:166, enrolled:498,  walk:81,  bike:6,   bus:2,  drive:77 },
    { name:"Murray",         n:76,  enrolled:683,  walk:50,  bike:7,   bus:0,  drive:19 },
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
  // Fixed dark text on the yellow, aqua and orange fills (in both themes), white on blue.
  const INK = { walk:"#16150f", bike:"#16150f", bus:"#16150f", drive:"#fff" };

  document.querySelectorAll('[data-chart="school-mode"]').forEach(root => {
    const row = s => {
      const segs = MODES.map(m => {
        const p = s[m.key] / s.n * 100;
        if (!s[m.key]) return "";
        const label = p >= 9 ? `<span style="color:${INK[m.key]}">${Math.round(p)}%</span>` : "";
        return `<span class="seg" style="flex:${p} 0 0;background:var(${m.color})" title="${m.name}: ${Math.round(p)}%">${label}</span>`;
      }).join("");
      return `<li${s === ALL ? ' class="total"' : ""}><span class="name">${s.name}<small>${s.n.toLocaleString("en-US")} responses · ${pct(s.n, s.enrolled)}% of students</small></span><span class="stackbar">${segs}</span></li>`;
    };
    root.innerHTML = `
      <div class="chart-tabs" role="group" aria-label="View">
        <button type="button" data-view="chart" aria-pressed="true">Chart</button>
        <button type="button" data-view="table" aria-pressed="false">Table</button>
      </div>
      <ul class="keyrow">${MODES.map(m => `<li><i style="background:var(${m.color})"></i>${m.name}</li>`).join("")}</ul>
      <ul class="stack100" aria-label="Primary way students get to school, by school">${SCHOOLS.map(row).join("")}${row(ALL)}</ul>
      <div class="table-scroll" hidden><table class="data"><thead><tr><th>School</th>${MODES.map(m => `<th>${m.name}</th>`).join("")}<th>Responses</th></tr></thead><tbody>${
        [...SCHOOLS, ALL].map(s => `<tr><td>${s.name}</td>${MODES.map(m => `<td>${pct(s[m.key], s.n)}%</td>`).join("")}<td>${s.n.toLocaleString("en-US")}</td></tr>`).join("")
      }</tbody></table></div>`;
    const chart = [root.querySelector(".keyrow"), root.querySelector(".stack100")], table = root.querySelector(".table-scroll");
    root.querySelectorAll(".chart-tabs button").forEach(b => b.addEventListener("click", () => {
      const t = b.dataset.view === "table";
      root.querySelectorAll(".chart-tabs button").forEach(o => o.setAttribute("aria-pressed", o === b));
      chart.forEach(e => e.hidden = t); table.hidden = !t;
    }));
  });

  document.querySelectorAll('[data-chart="why-not"]').forEach(root => {
    const max = WHY[0][1];
    root.innerHTML = `<ul class="hbars simple" aria-label="Reasons children don't walk or bike to school">${
      WHY.map(([label, v], i) => `<li${i === 0 ? ' class="hl"' : ""}><span class="name">${label}</span><span class="track"><span class="bar" style="width:${v / max * 82}%"></span><span class="val" style="left:${v / max * 82}%">${pct(v, WHY_N)}%</span></span></li>`).join("")
    }</ul>`;
  });
})();
