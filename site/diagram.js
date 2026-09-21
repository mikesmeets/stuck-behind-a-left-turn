// The four-lane vs three-lane plan view. Drawn into every
// <div data-diagram="road-diet">, so the Act and Safety pages share one source.
// Numbered pins in the drawing match the HTML callout lists under each panel —
// text stays in HTML so it stays readable on a phone.
(function () {
  const car = (x, y, cls = "", rot = "") =>
    `<rect class="car ${cls}" x="${x}" y="${y}" width="34" height="16" rx="4"${rot ? ` transform="rotate(${rot})"` : ""}/>`;
  const pin = (x, y, n) =>
    `<circle class="pin-bg" cx="${x}" cy="${y}" r="11"/><text class="pin-tx" x="${x}" y="${y + 4.5}" text-anchor="middle">${n}</text>`;
  const driveway = `<rect class="road" x="440" y="0" width="40" height="22"/>`;
  const upArrow = `<path class="path" d="M464 ${"Y"} C 480 ${"Y"}, 462 40, 460 10"/><polygon class="arrowhead" points="460,2 455,11 465,11"/>`;

  const four = `
<svg viewBox="0 0 640 165" role="img" aria-label="Four-lane road: a driver stopped in the left lane to turn blocks the lane; the car behind brakes and another swerves into the right lane.">
  <g class="diagram">
    ${driveway}
    <rect class="road" x="0" y="20" width="640" height="120"/>
    <line class="edge" x1="0" y1="21" x2="440" y2="21"/><line class="edge" x1="480" y1="21" x2="640" y2="21"/>
    <line class="edge" x1="0" y1="139" x2="640" y2="139"/>
    <line class="lane" x1="0" y1="50" x2="640" y2="50"/>
    <line class="lane" x1="0" y1="110" x2="640" y2="110"/>
    <line class="yellow" x1="0" y1="78" x2="640" y2="78"/><line class="yellow" x1="0" y1="82" x2="640" y2="82"/>
    ${car(120, 27)}${car(560, 57)}${car(40, 57)}
    ${car(520, 117)}${car(258, 117)}
    ${car(430, 87, "turn")}
    ${upArrow.replaceAll("Y", "95")}
    ${car(378, 87, "block")}
    ${car(313, 102, "", "16 330 110")}
    <path class="path warn" d="M349 117 Q 362 122 375 124"/><polygon class="arrowhead warn" points="384,124.5 374,119.5 374,129.5"/>
    ${pin(470, 86, 1)}${pin(412, 86, 2)}${pin(330, 153, 3)}
  </g>
</svg>`;

  const three = `
<svg viewBox="0 0 640 165" role="img" aria-label="Three-lane road: the turning driver waits in the center turn lane while through traffic keeps moving in its own lane; the leftover width becomes shoulders.">
  <g class="diagram">
    ${driveway}
    <rect class="road" x="0" y="20" width="640" height="120"/>
    <rect class="shoulder" x="0" y="20" width="640" height="9"/><rect class="shoulder" x="0" y="131" width="640" height="9"/>
    <rect class="road" x="440" y="20" width="40" height="9"/>
    <line class="edge" x1="0" y1="29" x2="440" y2="29"/><line class="edge" x1="480" y1="29" x2="640" y2="29"/>
    <line class="edge" x1="0" y1="131" x2="640" y2="131"/>
    <line class="yellow" x1="0" y1="64" x2="640" y2="64"/><line class="yellow-dash" x1="0" y1="67.5" x2="640" y2="67.5"/>
    <line class="yellow" x1="0" y1="96" x2="640" y2="96"/><line class="yellow-dash" x1="0" y1="92.5" x2="640" y2="92.5"/>
    ${car(150, 38.5)}${car(560, 38.5)}
    ${car(430, 72, "turn")}
    ${upArrow.replaceAll("Y", "80")}
    ${car(250, 105.5)}${car(345, 105.5)}${car(448, 105.5)}${car(580, 105.5)}
    <line class="flow" x1="222" y1="113.5" x2="244" y2="113.5"/><line class="flow" x1="317" y1="113.5" x2="339" y2="113.5"/><line class="flow" x1="420" y1="113.5" x2="442" y2="113.5"/>
    ${pin(470, 71, 1)}${pin(482, 104, 2)}${pin(120, 140, 3)}
  </g>
</svg>`;

  const html = `
<p class="panel-title">Today · four narrow lanes</p>
${four}
<ol class="callouts">
  <li><span class="pin">1</span><span>A driver stops in the travel lane to turn left.</span></li>
  <li><span class="pin">2</span><span>The driver behind brakes hard, which sets up a rear-end crash.</span></li>
  <li><span class="pin">3</span><span>Others swerve into the next lane, which sets up a sideswipe.</span></li>
</ol>
<p class="panel-title">Proposed · one lane each way plus a center turn lane</p>
${three}
<ol class="callouts">
  <li><span class="pin">1</span><span>The turning driver waits in the center lane, out of the way.</span></li>
  <li><span class="pin">2</span><span>Through traffic keeps moving in its own lane.</span></li>
  <li><span class="pin">3</span><span>The leftover width goes to wider lanes and shoulders.</span></li>
</ol>`;

  document.querySelectorAll('[data-diagram="road-diet"]').forEach(el => { el.innerHTML = html; });
})();
