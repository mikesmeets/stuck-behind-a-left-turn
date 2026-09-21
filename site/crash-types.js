// "How a road diet prevents each kind of crash": a tabbed, side-by-side diagram
// of today's four lanes and the proposed three, one tab per crash type that
// FHWA reports road diets reduce, plus emergency response. Renders into <div data-diagram="crash-types">.
// Text lives in HTML (callout lists), so it stays readable on a phone.
(function () {
  // ---- geometry: westbound on top (moving left), eastbound below (moving right)
  const W = 800;            // road length drawn; each view shows a 400-wide window of it
  const VIEW = 400;
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
  // A driver's field of view: a cone from the eye toward (tx, ty), `spread`
  // degrees either side, `len` long.
  const cone = (ex, ey, tx, ty, spread = 16, len = 190) => {
    const a = Math.atan2(ty - ey, tx - ex), s = (spread * Math.PI) / 180;
    const p = (ang) => `${(ex + len * Math.cos(ang)).toFixed(1)},${(ey + len * Math.sin(ang)).toFixed(1)}`;
    return `<g clip-path="url(#__CLIP__)"><polygon class="cone" points="${ex},${ey} ${p(a - s)} ${p(a - s / 2)} ${p(a)} ${p(a + s / 2)} ${p(a + s)}"/></g>`;
  };
  // What a car at (x, y) hides from the eye: the wedge between the rays that
  // graze its corners, from the car out to `len`.
  const shadow = (ex, ey, x, y, len = 260) => {
    const corners = [[x, y], [x + 34, y], [x, y + 16], [x + 34, y + 16]];
    const ang = ([cx, cy]) => Math.atan2(cy - ey, cx - ex);
    corners.sort((p, q) => ang(p) - ang(q));
    const lo = corners[0], hi = corners[3];
    const ext = ([cx, cy]) => {
      const a = ang([cx, cy]);
      return `${(ex + len * Math.cos(a)).toFixed(1)},${(ey + len * Math.sin(a)).toFixed(1)}`;
    };
    return `<g clip-path="url(#__CLIP__)"><polygon class="shadow" points="${lo[0]},${lo[1]} ${ext(lo)} ${ext(hi)} ${hi[0]},${hi[1]}"/></g>`;
  };
  const truck = (x, y) =>
    `<g class="truck"><rect class="truck-body" x="${x}" y="${y}" width="58" height="18" rx="3"/><rect class="truck-cab" x="${x + 44}" y="${y}" width="14" height="18" rx="3"/><rect class="truck-light" x="${x + 40}" y="${y + 6}" width="4" height="6"/></g>`;
  const unsure = (x, y) => `<text class="unsure" x="${x}" y="${y}" text-anchor="middle">?</text>`;
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
  // Views and shadows are clipped to the pavement so they never spill onto the page.
  let clipN = 0;
  const svg = (label, body) => {
    const id = `ct-road-${++clipN}`;
    return `<svg viewBox="0 0 ${W} 165" role="img" aria-label="${label}"><defs><clipPath id="${id}"><rect x="0" y="20" width="${W}" height="120"/></clipPath></defs><g class="diagram">${body.replaceAll("__CLIP__", id)}</g></svg>`;
  };

  // ---- the four scenarios -------------------------------------------------
  const SCENARIOS = [
    {
      key: "rear-end", win: 225, tab: "Rear-end",
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
      key: "sideswipe", win: 190, tab: "Sideswipe",
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
      key: "left-turn", win: 325, tab: "Left-turn",
      title: "Turning across two lanes you can't see",
      intro: "Turning left from a four-lane street means crossing two lanes of oncoming traffic. A car in the near lane can hide a car in the far lane until it's too late.",
      today: svg("Four lanes: a driver turning left across two oncoming lanes cannot see a car in the far lane, hidden behind a car in the near lane.",
        fourLane(`${cone(452, 95, 590, 40, 20, 200)}${shadow(452, 95, 495, FOUR.wbIn)}
          ${car(430, FOUR.ebIn, "turn")}
          ${car(495, FOUR.wbIn)}
          ${car(570, FOUR.wbOut, "block")}
          ${arrow("M540 35 L 500 35", "492,35 501,30 501,40", "warn")}
          <path class="path" d="M462 95 C 478 95, 466 50, 462 12"/><polygon class="arrowhead" points="462,3 457,12 467,12"/>
          ${burst(463, 35)}
          ${car(150, FOUR.ebOut)}${car(90, FOUR.wbIn)}
          ${pin(420, 76, 1)}${pin(512, 76, 2)}${pin(600, 12, 3)}`)),
      todayNotes: ["A driver waits to turn left across two oncoming lanes.",
                   "An oncoming car in the near lane blocks the view of the far lane.",
                   "A car in the far lane, hidden until the last second, drives into the turn."],
      diet: svg("Three lanes: the turning driver waits in the center lane and crosses one oncoming lane with a clear view.",
        threeLane(`${cone(452, 80, 590, 46, 20, 200)}
          ${car(430, THREE.ctr, "turn")}
          ${car(575, THREE.wb)}
          <path class="path" d="M462 80 C 478 80, 466 45, 462 12"/><polygon class="arrowhead" points="462,3 457,12 467,12"/>
          ${car(150, THREE.eb)}${car(300, THREE.eb)}
          ${pin(420, 71, 1)}${pin(600, 20, 2)}`)),
      dietNotes: ["The turning driver waits in the center lane.",
                  "There's only one oncoming lane to cross, and nothing can hide in it."],
    },
    {
      key: "pedestrian", win: 75, tab: "Pedestrian",
      title: "The car you can't see past",
      intro: "Safety engineers call it the multiple-threat crash. One driver stops for someone in the crosswalk, and a driver in the next lane, who can't see them, keeps going.",
      today: svg("Four lanes: a car stops at the crosswalk in the outside lane; a car in the inside lane cannot see the pedestrian and keeps going.",
        fourLane(`${crosswalk(300, 20, 140)}
          ${cone(249, 95, 330, 110, 20, 150)}${shadow(249, 95, 258, FOUR.ebOut, 170)}
          ${car(258, FOUR.ebOut)}
          ${ped(299, 131)}
          ${car(215, FOUR.ebIn, "block")}
          ${arrow("M190 95 L 206 95", "214,95 205,90 205,100", "warn")}
          ${burst(303, 101)}
          ${car(420, FOUR.wbIn)}${car(540, FOUR.wbOut)}
          ${pin(275, 152, 1)}${pin(232, 76, 2)}${pin(338, 104, 3)}`, { driveway: false })),
      todayNotes: ["A driver stops to let someone cross.",
                   "A driver in the next lane can't see past the stopped car and doesn't slow down.",
                   "The person crossing steps out from in front of the stopped car."],
      diet: svg("Three lanes: when the car in the only travel lane stops at the crosswalk, there is no second lane where another driver can pass it.",
        threeLane(`${crosswalk(300, 29, 131)}
          ${cone(292, 113.5, 330, 100, 20, 120)}
          ${car(258, THREE.eb)}${car(205, THREE.eb)}
          ${ped(313, 88)}
          ${car(430, THREE.wb)}
          ${pin(275, 142, 1)}${pin(338, 80, 2)}`, { driveway: false })),
      dietNotes: ["When the driver stops, the car behind stops too. There's no second lane to pass in.",
                  "The person crossing faces one lane of traffic at a time."],
    },
    {
      key: "emergency", win: 190, tab: "Emergency vehicles",
      title: "A clear path for fire trucks and ambulances",
      intro: "The worry is that fewer lanes will slow emergency response. FHWA found the opposite: &ldquo;Road Diets do not degrade response times,&rdquo; and the center turn lane can make them faster.<a class=\"cite\" href=\"#src-fhwa-ems\"></a>",
      today: svg("Four lanes: a fire truck comes up behind traffic; the outside-lane driver pulls right, the inside-lane driver doesn't know where to go, and the truck has to weave between them.",
        fourLane(`${car(385, 121)}${car(340, FOUR.ebIn)}${car(470, FOUR.ebIn)}${car(520, 121)}
          ${car(250, FOUR.wbIn)}${car(430, FOUR.wbOut)}
          ${truck(228, 101)}
          ${unsure(357, 84)}${unsure(487, 84)}
          <path class="truck-path" d="M290 110 C 318 110, 322 105, 345 105 S 385 115, 420 111 S 455 104, 540 107"/><polygon class="truck-path-head" points="550,107 539,101 540,113"/>
          ${pin(402, 152, 1)}${pin(420, 64, 2)}${pin(257, 152, 3)}`, { driveway: false })),
      todayNotes: ["Drivers in the outside lane pull over to the right.",
                   "Drivers in the inside lane often aren't sure where to go.",
                   "The truck has to thread a path between them, down the middle of the road."],
      diet: svg("Three lanes: drivers pull right toward the shoulder and the fire truck drives straight down the empty center turn lane.",
        threeLane(`${car(340, 111)}${car(470, 111)}${car(560, 111)}
          ${car(300, THREE.wb)}${car(450, THREE.wb)}
          ${truck(228, 71)}
          <path class="truck-path" d="M290 80 L 560 80"/><polygon class="truck-path-head" points="570,80 559,74 559,86"/>
          ${pin(357, 142, 1)}${pin(410, 52, 2)}`, { driveway: false })),
      dietNotes: ["Drivers pull to the right, into the wider shoulder, and stay put.",
                  "The truck uses the center turn lane as an open path around traffic."],
    },
  ];

  // Zoom a drawing to the 400-wide window around its action.
  const frame = (svgText, x0) => svgText.replace(`viewBox="0 0 ${W} 165"`, `viewBox="${x0} 0 ${VIEW} 165"`);
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
          <div><p class="panel-title">Today · four narrow lanes</p>${frame(s.today, s.win)}${notes(s.todayNotes)}</div>
          <div><p class="panel-title">Road diet · one lane each way and a center turn lane</p>${frame(s.diet, s.win)}${notes(s.dietNotes)}</div>
        </div>
      </div>`).join("")}
      <ul class="ct-key">
        <li><i class="k-turn"></i>Turning driver</li>
        <li><i class="k-block"></i>Driver at risk</li>
        <li><i class="k-ped"></i>Person crossing</li>
        <li><i class="k-cone"></i>Driver's view</li>
        <li><i class="k-shadow"></i>Hidden from view</li>
        <li><i class="k-truck"></i>Emergency vehicle</li>
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
