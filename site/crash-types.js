// "How a road diet prevents each kind of crash": a tabbed, side-by-side diagram
// of today's four lanes and the proposed three, one tab per crash type that
// FHWA reports road diets reduce. Renders into <div data-diagram="crash-types">.
// Text lives in HTML (callout lists), so it stays readable on a phone.
(function () {
  // ---- geometry: westbound on top (moving left), eastbound below (moving right)
  const W = 640;
  const FOUR = { top: 20, bot: 140, wbOut: 27, wbIn: 57, ebIn: 87, ebOut: 117 };
  const THREE = { top: 20, bot: 140, wb: 38.5, ctr: 72, eb: 105.5 };

  const car = (x, y, cls = "", rot = "") =>
    `<rect class="car ${cls}" x="${x}" y="${y}" width="34" height="16" rx="4"${rot ? ` transform="rotate(${rot})"` : ""}/>`;
  const pin = (x, y, n) =>
    `<circle class="pin-bg" cx="${x}" cy="${y}" r="11"/><text class="pin-tx" x="${x}" y="${y + 4.5}" text-anchor="middle">${n}</text>`;
  const burst = (x, y) => {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 6 : 13, a = (Math.PI * 2 * i) / 16;
      pts.push(`${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon class="burst" points="${pts.join(" ")}"/>`;
  };
  const arrow = (d, head, cls = "") =>
    `<path class="path ${cls}" d="${d}"/><polygon class="arrowhead ${cls}" points="${head}"/>`;
  const ped = (x, y) =>
    `<g class="ped"><circle cx="${x}" cy="${y - 7}" r="4.5"/><rect x="${x - 4}" y="${y - 2}" width="8" height="11" rx="3"/></g>`;
  const sight = (x1, y1, x2, y2) => `<line class="sight" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const driveway = `<rect class="road" x="440" y="0" width="40" height="22"/>`;
  const crosswalk = (x, top, bot) => {
    let s = "";
    for (let y = top + 4; y < bot - 4; y += 9) s += `<rect class="zebra" x="${x}" y="${y}" width="26" height="5"/>`;
    return s;
  };

  function fourLane(extra = "", opts = {}) {
    return `<rect class="road" x="0" y="${FOUR.top}" width="${W}" height="${FOUR.bot - FOUR.top}"/>
      ${opts.driveway === false ? "" : driveway}
      <line class="edge" x1="0" y1="21" x2="${opts.driveway === false ? W : 440}" y2="21"/>${opts.driveway === false ? "" : `<line class="edge" x1="480" y1="21" x2="${W}" y2="21"/>`}
      <line class="edge" x1="0" y1="139" x2="${W}" y2="139"/>
      <line class="lane" x1="0" y1="50" x2="${W}" y2="50"/><line class="lane" x1="0" y1="110" x2="${W}" y2="110"/>
      <line class="yellow" x1="0" y1="78" x2="${W}" y2="78"/><line class="yellow" x1="0" y1="82" x2="${W}" y2="82"/>
      ${extra}`;
  }
  function threeLane(extra = "", opts = {}) {
    return `<rect class="road" x="0" y="${THREE.top}" width="${W}" height="${THREE.bot - THREE.top}"/>
      ${opts.driveway === false ? "" : driveway}
      <rect class="shoulder" x="0" y="20" width="${W}" height="9"/><rect class="shoulder" x="0" y="131" width="${W}" height="9"/>
      ${opts.driveway === false ? "" : `<rect class="road" x="440" y="20" width="40" height="9"/>`}
      <line class="edge" x1="0" y1="29" x2="${opts.driveway === false ? W : 440}" y2="29"/>${opts.driveway === false ? "" : `<line class="edge" x1="480" y1="29" x2="${W}" y2="29"/>`}
      <line class="edge" x1="0" y1="131" x2="${W}" y2="131"/>
      <line class="yellow" x1="0" y1="64" x2="${W}" y2="64"/><line class="yellow-dash" x1="0" y1="67.5" x2="${W}" y2="67.5"/>
      <line class="yellow" x1="0" y1="96" x2="${W}" y2="96"/><line class="yellow-dash" x1="0" y1="92.5" x2="${W}" y2="92.5"/>
      ${extra}`;
  }
  const svg = (label, body) =>
    `<svg viewBox="0 0 ${W} 165" role="img" aria-label="${label}"><g class="diagram">${body}</g></svg>`;

  // ---- the four scenarios -------------------------------------------------
  const SCENARIOS = [
    {
      key: "rear-end", tab: "Rear-end",
      title: "Stopped in a travel lane",
      intro: "A classic four-lane crash. A driver stops in a travel lane to wait for a gap, and the driver behind doesn't stop in time.",
      today: svg("Four lanes: a driver waiting to turn left stops in the eastbound inside lane; the car behind brakes too late.",
        fourLane(`${car(120, FOUR.wbOut)}${car(560, FOUR.wbIn)}${car(520, FOUR.ebOut)}${car(250, FOUR.ebOut)}
          ${car(430, FOUR.ebIn, "turn")}
          ${arrow("M464 95 C 480 95, 462 40, 460 10", "460,2 455,11 465,11")}
          ${car(384, FOUR.ebIn, "block")}
          <line class="skid" x1="330" y1="90" x2="382" y2="90"/><line class="skid" x1="330" y1="100" x2="382" y2="100"/>
          ${burst(424, 95)}
          ${pin(470, 76, 1)}${pin(360, 76, 2)}`)),
      todayNotes: ["A driver stops in the inside travel lane to wait for a gap in oncoming traffic.",
                   "The driver behind expects the lane to keep moving and brakes too late."],
      diet: svg("Three lanes: the turning driver waits in the center lane; through traffic passes in its own lane.",
        threeLane(`${car(150, THREE.wb)}${car(560, THREE.wb)}
          ${car(430, THREE.ctr, "turn")}
          ${arrow("M464 80 C 480 80, 462 40, 460 10", "460,2 455,11 465,11")}
          ${car(330, THREE.eb)}${car(455, THREE.eb)}${car(580, THREE.eb)}
          <line class="flow" x1="300" y1="113.5" x2="324" y2="113.5"/><line class="flow" x1="425" y1="113.5" x2="449" y2="113.5"/>
          ${pin(470, 71, 1)}${pin(346, 142, 2)}`)),
      dietNotes: ["The turning driver waits in the center lane, out of the way.",
                  "Traffic behind never has to stop for a turning car."],
    },
    {
      key: "sideswipe", tab: "Sideswipe",
      title: "Swerving around the car ahead",
      intro: "Rather than wait, drivers swerve into the next lane to get around a stopped car. On lanes 9.5 feet wide, there's little room to do it safely.",
      today: svg("Four lanes: a driver swerves from the inside lane into the outside lane around a stopped car and hits a car already there.",
        fourLane(`${car(120, FOUR.wbOut)}${car(560, FOUR.wbIn)}
          ${car(430, FOUR.ebIn, "turn")}
          ${arrow("M464 95 C 480 95, 462 40, 460 10", "460,2 455,11 465,11")}
          ${car(356, 100, "", "18 373 108")}
          ${car(372, FOUR.ebOut, "block")}
          ${arrow("M300 95 Q 330 96 352 104", "360,108 349,99 347,110")}
          ${burst(392, 114)}
          ${pin(470, 76, 1)}${pin(330, 76, 2)}${pin(392, 152, 3)}`)),
      todayNotes: ["A driver stops in the inside lane to turn left.",
                   "The driver behind swerves into the outside lane to get around.",
                   "A car already in that lane has nowhere to go."],
      diet: svg("Three lanes: one travel lane each way, so there is no lane to swerve into.",
        threeLane(`${car(150, THREE.wb)}${car(560, THREE.wb)}
          ${car(430, THREE.ctr, "turn")}
          ${arrow("M464 80 C 480 80, 462 40, 460 10", "460,2 455,11 465,11")}
          ${car(300, THREE.eb)}${car(420, THREE.eb)}${car(540, THREE.eb)}
          <line class="flow" x1="270" y1="113.5" x2="294" y2="113.5"/><line class="flow" x1="390" y1="113.5" x2="414" y2="113.5"/>
          ${pin(470, 71, 1)}${pin(436, 142, 2)}`)),
      dietNotes: ["The turning driver is in the center lane, not in anyone's path.",
                  "One lane each way: no weaving, no lane-changing to get around."],
    },
    {
      key: "left-turn", tab: "Left-turn",
      title: "Turning across two lanes you can't see",
      intro: "Turning left from a four-lane street means crossing two lanes of oncoming traffic. A car in the near lane can hide a car in the far lane until it's too late.",
      today: svg("Four lanes: a driver turning left across two oncoming lanes cannot see a car in the far lane, hidden behind a car in the near lane.",
        fourLane(`${car(430, FOUR.ebIn, "turn")}
          ${car(495, FOUR.wbIn)}
          ${car(570, FOUR.wbOut, "block")}
          ${arrow("M540 35 L 500 35", "492,35 501,30 501,40", "warn")}
          ${sight(447, 95, 590, 35)}
          <path class="path" d="M462 95 C 478 95, 466 50, 462 12"/><polygon class="arrowhead" points="462,3 457,12 467,12"/>
          ${burst(463, 35)}
          ${car(150, FOUR.ebOut)}${car(90, FOUR.wbIn)}
          ${pin(420, 76, 1)}${pin(512, 76, 2)}${pin(600, 12, 3)}`)),
      todayNotes: ["A driver waits to turn left across two oncoming lanes.",
                   "An oncoming car in the near lane blocks the view of the far lane.",
                   "A car in the far lane, hidden until the last second, drives into the turn."],
      diet: svg("Three lanes: the turning driver waits in the center lane and crosses one oncoming lane with a clear view.",
        threeLane(`${car(430, THREE.ctr, "turn")}
          ${car(575, THREE.wb)}
          ${sight(447, 80, 590, 46)}
          <path class="path" d="M462 80 C 478 80, 466 45, 462 12"/><polygon class="arrowhead" points="462,3 457,12 467,12"/>
          ${car(150, THREE.eb)}${car(300, THREE.eb)}
          ${pin(420, 71, 1)}${pin(600, 20, 2)}`)),
      dietNotes: ["The turning driver waits in the center lane.",
                  "There's only one oncoming lane to cross, and nothing can hide in it."],
    },
    {
      key: "pedestrian", tab: "Pedestrian",
      title: "The car you can't see past",
      intro: "Safety engineers call it the multiple-threat crash. One driver stops for someone in the crosswalk, and a driver in the next lane, who can't see them, keeps going.",
      today: svg("Four lanes: a car stops at the crosswalk in the outside lane; a car in the inside lane cannot see the pedestrian and keeps going.",
        fourLane(`${crosswalk(300, 20, 140)}
          ${car(258, FOUR.ebOut)}
          ${ped(313, 100)}
          ${car(215, FOUR.ebIn, "block")}
          ${arrow("M190 95 L 206 95", "214,95 205,90 205,100", "warn")}
          ${sight(249, 95, 313, 95)}
          ${burst(300, 95)}
          ${car(420, FOUR.wbIn)}${car(540, FOUR.wbOut)}
          ${pin(275, 152, 1)}${pin(232, 76, 2)}${pin(338, 104, 3)}`, { driveway: false })),
      todayNotes: ["A driver stops to let someone cross.",
                   "A driver in the next lane can't see past the stopped car and doesn't slow down.",
                   "The person crossing steps out from in front of the stopped car."],
      diet: svg("Three lanes: when the car in the only travel lane stops at the crosswalk, there is no second lane where another driver can pass it.",
        threeLane(`${crosswalk(300, 29, 131)}
          ${car(258, THREE.eb)}${car(205, THREE.eb)}
          ${ped(313, 88)}
          ${car(430, THREE.wb)}
          ${pin(275, 142, 1)}${pin(338, 80, 2)}`, { driveway: false })),
      dietNotes: ["When the driver stops, the car behind stops too. There's no second lane to pass in.",
                  "The person crossing faces one lane of traffic at a time."],
    },
  ];

  const notes = (arr) => `<ol class="callouts">${arr.map((t, i) => `<li><span class="pin">${i + 1}</span><span>${t}</span></li>`).join("")}</ol>`;

  document.querySelectorAll('[data-diagram="crash-types"]').forEach((root) => {
    const id = "ct" + Math.random().toString(36).slice(2, 7);
    root.innerHTML = `
      <div class="ct-tabs" role="tablist" aria-label="Crash type">
        ${SCENARIOS.map((s, i) => `<button type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${s.tab}</button>`).join("")}
      </div>
      ${SCENARIOS.map((s, i) => `
      <div class="ct-panel" role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}"${i === 0 ? "" : " hidden"}>
        <h3>${s.title}</h3>
        <p class="sub">${s.intro}</p>
        <div class="ct-pair">
          <div><p class="panel-title">Today · four narrow lanes</p>${s.today}${notes(s.todayNotes)}</div>
          <div><p class="panel-title">Road diet · one lane each way and a center turn lane</p>${s.diet}${notes(s.dietNotes)}</div>
        </div>
      </div>`).join("")}
      <ul class="ct-key">
        <li><i class="k-turn"></i>Turning driver</li>
        <li><i class="k-block"></i>Driver at risk</li>
        <li><i class="k-ped"></i>Person crossing</li>
      </ul>`;
    const tabs = [...root.querySelectorAll('[role="tab"]')], panels = [...root.querySelectorAll('[role="tabpanel"]')];
    const select = (i, focus) => {
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", j === i); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach((p, j) => { p.hidden = j !== i; });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") select((i + 1) % tabs.length, true);
        if (e.key === "ArrowLeft") select((i - 1 + tabs.length) % tabs.length, true);
      });
    });
  });
})();
