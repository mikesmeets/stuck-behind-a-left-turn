// Emergency response, animated: the same fire truck on today's four lanes and
// on the road diet, one above the other. Illustrative timing, not a measured
// result. Renders into <div data-diagram="emergency">.
(function () {
  const W = 800, T = 11;            // drawing width, seconds of animation
  const NS = "http://www.w3.org/2000/svg";

  // ---------- roads (same look as the crash-type diagrams)
  const four = `<rect class="road" x="0" y="20" width="${W}" height="120"/>
    <line class="edge" x1="0" y1="21" x2="${W}" y2="21"/><line class="edge" x1="0" y1="139" x2="${W}" y2="139"/>
    <line class="lane" x1="0" y1="50" x2="${W}" y2="50"/><line class="lane" x1="0" y1="110" x2="${W}" y2="110"/>
    <line class="yellow" x1="0" y1="78" x2="${W}" y2="78"/><line class="yellow" x1="0" y1="82" x2="${W}" y2="82"/>`;
  const three = `<rect class="road" x="0" y="20" width="${W}" height="120"/>
    <rect class="shoulder" x="0" y="20" width="${W}" height="9"/><rect class="shoulder" x="0" y="131" width="${W}" height="9"/>
    <line class="edge" x1="0" y1="29" x2="${W}" y2="29"/><line class="edge" x1="0" y1="131" x2="${W}" y2="131"/>
    <line class="yellow" x1="0" y1="64" x2="${W}" y2="64"/><line class="yellow-dash" x1="0" y1="67.5" x2="${W}" y2="67.5"/>
    <line class="yellow" x1="0" y1="96" x2="${W}" y2="96"/><line class="yellow-dash" x1="0" y1="92.5" x2="${W}" y2="92.5"/>`;

  // ---------- actors: keyframes [t, x, y]; the truck is 58 wide, cars 34
  const car = (keys, extra = {}) => ({ kind: "car", keys, ...extra });
  const truck = (keys) => ({ kind: "truck", keys });
  const still = (x, y) => [[0, x, y], [T, x, y]];

  // Today: outside-lane cars pull to the curb; inside-lane cars hesitate,
  // one drifts toward the center line; the truck waits, then weaves through.
  // Westbound (top) traffic is stopped for the siren in both scenes.
  const wb = (ys, xs) => ys.flatMap((y, i) => xs[i].map((x) => car(still(x, y))));

  // Today: outside-lane cars pull to the curb; inside-lane cars hesitate and
  // edge toward the center line; the truck waits, then weaves through.
  const pullRight = (x) => car([[0, x, 117], [1.6, x + 20, 117], [3, x + 34, 122], [T, x + 34, 122]]);
  const unsure = (x, i) => car([[0, x, 87], [1.6, x + 20, 87], [2.6, x + 24, 84], [4.4 + i, x + 24, 84], [5 + i, x + 26, 82], [T, x + 26, 82]],
                               { unsure: [2 + i * 0.2, 5.4 + i * 0.8] });
  const FOUR = [
    ...wb([27, 57], [[40, 170, 300, 430, 560, 690], [100, 230, 360, 490, 620, 750]]),
    ...[100, 210, 320, 430, 540, 650, 760].map(pullRight),
    ...[380, 480, 580, 680, 780].map(unsure),
    truck([[0, -80, 86], [2.4, 250, 86], [4.6, 312, 86], [5.6, 330, 101], [6.6, 440, 101], [7.6, 540, 101],
           [8.6, 610, 101], [9.6, 710, 101], [10.6, 860, 99], [T, 900, 99]]),
  ];
  // Road diet: everyone pulls toward the shoulder; the truck uses the center lane.
  const toShoulder = (x) => car([[0, x, 105.5], [1.6, x + 20, 105.5], [2.8, x + 32, 112], [T, x + 32, 112]]);
  // Same traffic as today: 12 cars each way, now in one lane each way.
  const THREE = [
    ...wb([38.5], [[10, 76, 142, 208, 274, 340, 406, 472, 538, 604, 670, 736]]),
    // A driver waiting in the center lane to turn left gives up the turn and
    // merges back into the pulled-over traffic, clearing the lane. [t, x, y, angle]
    car([[0, 470, 72, 0], [1.6, 470, 72, 0], [2.1, 486, 80, 18], [2.7, 512, 102, 14], [3.1, 520, 111, 0], [T, 520, 111, 0]], { turn: true }),
    // Eastbound traffic pulls toward the shoulder, leaving the gap the turner merges into.
    ...[40, 104, 168, 232, 296, 360, 424, 552, 616, 680, 744].map(toShoulder),
    truck([[0, -80, 104], [1, 10, 71], [2.4, 200, 71], [5.8, 900, 71], [T, 900, 71]]),
  ];

  const CAPTIONS = {
    four: [[0, "A fire truck comes up behind traffic, lights and siren on."],
           [2, "Outside-lane drivers pull right. Inside-lane drivers aren't sure where to go."],
           [4.4, "The truck has to wait, then thread a path down the middle."],
           [8.8, "The truck gets through, but slowly, weaving between cars."]],
    three: [[0, "The same truck, the same traffic, on the road diet. One driver is waiting in the center lane to turn left."],
            [1.8, "Drivers pull right. The driver waiting to turn left merges back into traffic, clearing the center lane."],
            [3.3, "The truck drives straight down the empty center turn lane."],
            [5.8, "The truck is through the block."]],
  };

  const ease = (u) => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const at = (keys, t) => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2], keys[0][3] || 0];
    for (let i = 1; i < keys.length; i++) {
      const [t1, x1, y1, r1 = 0] = keys[i], [t0, x0, y0, r0 = 0] = keys[i - 1];
      if (t <= t1) { const u = ease((t - t0) / (t1 - t0 || 1)); return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r0 + (r1 - r0) * u]; }
    }
    const k = keys[keys.length - 1]; return [k[1], k[2], k[3] || 0];
  };
  const caption = (list, t) => list.filter(([s]) => t >= s).pop()[1];

  function build(svg, roadMarkup, actors) {
    svg.innerHTML = `<g class="diagram">${roadMarkup}<path class="truck-path em-trail" d=""/></g>`;
    const g = svg.querySelector("g");
    return actors.map((a) => {
      const el = document.createElementNS(NS, "g");
      if (a.kind === "car") {
        el.innerHTML = `<rect class="car${a.turn ? " turn" : ""}" width="34" height="16" rx="4"/>` +
          (a.unsure ? `<text class="unsure" x="17" y="-4" text-anchor="middle">?</text>` : "");
      } else {
        el.innerHTML = `<rect class="truck-body" width="58" height="18" rx="3"/><rect class="truck-cab" x="44" width="14" height="18" rx="3"/>
          <rect class="truck-light a" x="38" y="2" width="5" height="6"/><rect class="truck-light b" x="38" y="10" width="5" height="6"/>`;
      }
      g.appendChild(el);
      return { a, el, q: el.querySelector(".unsure"), la: el.querySelector(".truck-light.a"), lb: el.querySelector(".truck-light.b") };
    });
  }
  function draw(items, t) {
    const flash = t > 0.2 && Math.floor(t * 4) % 2 === 0;
    // The truck's route so far, traced from its rear bumper's midpoint.
    const tr = items.find((i) => i.a.kind === "truck");
    const trail = tr.el.parentNode.querySelector(".em-trail"), pts = [];
    for (let u = 0; u <= t; u += 0.08) { const [x, y] = at(tr.a.keys, u); pts.push(`${x.toFixed(1)},${(y + 9).toFixed(1)}`); }
    trail.setAttribute("d", pts.length > 1 ? "M" + pts.join(" L") : "");
    items.forEach(({ a, el, q, la, lb }) => {
      const [x, y, r] = at(a.keys, t);
      el.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})` + (r ? ` rotate(${r.toFixed(1)} 17 8)` : ""));
      if (q) q.style.opacity = t >= a.unsure[0] && t <= a.unsure[1] ? 1 : 0;
      if (la) { la.style.fill = flash ? "#e5484d" : "#3987e5"; lb.style.fill = flash ? "#3987e5" : "#e5484d"; }
    });
  }

  document.querySelectorAll('[data-diagram="emergency"]').forEach((root) => {
    root.innerHTML = `
      <div class="em-row">
        <p class="panel-title">Today · four narrow lanes</p>
        <svg viewBox="0 0 ${W} 160" role="img" aria-label="Animation: on four lanes, drivers in the inside lanes don't know where to go and the fire truck weaves slowly through the middle."></svg>
        <p class="em-cap" aria-live="polite"></p>
      </div>
      <div class="em-row">
        <p class="panel-title">Road diet · one lane each way and a center turn lane</p>
        <svg viewBox="0 0 ${W} 160" role="img" aria-label="Animation: on the road diet, drivers pull right and the fire truck drives straight down the center turn lane."></svg>
        <p class="em-cap" aria-live="polite"></p>
      </div>
      <div class="em-controls">
        <button type="button" class="btn em-play">Play</button>
        <span class="small muted">An illustration of what FHWA describes, not a timed measurement.</span>
      </div>`;
    const [s4, s3] = root.querySelectorAll("svg"), [c4, c3] = root.querySelectorAll(".em-cap"), btn = root.querySelector(".em-play");
    const i4 = build(s4, four, FOUR), i3 = build(s3, three, THREE);
    const show = (t) => { draw(i4, t); draw(i3, t); c4.textContent = caption(CAPTIONS.four, t); c3.textContent = caption(CAPTIONS.three, t); };

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // ?em-t=5 renders a fixed moment (for checking a frame; no playback).
    const fixed = parseFloat(new URLSearchParams(location.search).get("em-t"));
    if (!isNaN(fixed)) { show(Math.min(Math.max(fixed, 0), T)); return; }
    show(reduce ? 5 : 0);
    let raf = 0, start = 0;
    const frame = (now) => {
      const t = Math.min((now - start) / 1000, T);
      show(t);
      if (t < T) raf = requestAnimationFrame(frame);
      else btn.textContent = "Replay";
    };
    btn.addEventListener("click", () => {
      cancelAnimationFrame(raf);
      if (reduce) { show(8.9); btn.textContent = "Replay"; return; }
      btn.textContent = "Playing…";
      start = performance.now(); raf = requestAnimationFrame(frame);
    });
    // Start once, when the diagram first scrolls into view.
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { io.disconnect(); btn.click(); }
      }, { threshold: 0.5 });
      io.observe(root);
    }
  });
})();
