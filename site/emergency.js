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
  const FOUR = [
    car(still(120, 27)), car(still(420, 57)), car(still(640, 27)),                         // westbound, stopped
    car([[0, 280, 117], [1.6, 300, 117], [3, 318, 122], [T, 318, 122]]),                   // outside lane, pulls right
    car([[0, 500, 117], [1.6, 520, 117], [3.2, 536, 122], [T, 536, 122]]),
    car([[0, 380, 87], [1.6, 400, 87], [2.6, 404, 84], [4.6, 404, 84], [6, 408, 82], [T, 408, 82]], { unsure: [2, 6.5] }),   // inside lane, unsure
    car([[0, 600, 87], [1.6, 620, 87], [3, 626, 86], [7.4, 626, 86], [8, 630, 82], [T, 630, 82]], { unsure: [2.2, 8.2] }),
    truck([[0, -80, 86], [2.4, 250, 86], [4.6, 312, 86], [5.6, 330, 101], [6.6, 440, 101], [7.6, 540, 101],
           [8.6, 590, 101], [9.6, 700, 98], [10.6, 860, 92], [T, 900, 92]]),
  ];
  // Road diet: everyone pulls toward the shoulder; the truck uses the center lane.
  const THREE = [
    car(still(150, 38.5)), car(still(470, 38.5)),
    car([[0, 290, 105.5], [1.6, 310, 105.5], [2.8, 322, 112], [T, 322, 112]]),
    car([[0, 400, 105.5], [1.6, 420, 105.5], [2.8, 432, 112], [T, 432, 112]]),
    car([[0, 520, 105.5], [1.6, 540, 105.5], [2.9, 552, 112], [T, 552, 112]]),
    car([[0, 640, 105.5], [1.6, 660, 105.5], [3, 672, 112], [T, 672, 112]]),
    truck([[0, -80, 104], [1.8, 190, 104], [2.6, 240, 71], [6, 900, 71], [T, 900, 71]]),
  ];

  const CAPTIONS = {
    four: [[0, "A fire truck comes up behind traffic, lights and siren on."],
           [2, "Outside-lane drivers pull right. Inside-lane drivers aren't sure where to go."],
           [4.4, "The truck has to wait, then thread a path down the middle."],
           [8.8, "The truck gets through, but slowly, weaving between cars."]],
    three: [[0, "The same truck, the same traffic, on the road diet."],
            [2, "Every driver pulls right, toward the shoulder."],
            [3, "The truck drives down the empty center turn lane."],
            [6, "The truck is through the block."]],
  };

  const ease = (u) => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const at = (keys, t) => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) {
      const [t1, x1, y1] = keys[i], [t0, x0, y0] = keys[i - 1];
      if (t <= t1) { const u = ease((t - t0) / (t1 - t0 || 1)); return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]; }
    }
    const k = keys[keys.length - 1]; return [k[1], k[2]];
  };
  const caption = (list, t) => list.filter(([s]) => t >= s).pop()[1];

  function build(svg, roadMarkup, actors) {
    svg.innerHTML = `<g class="diagram">${roadMarkup}<path class="truck-path em-trail" d=""/></g>`;
    const g = svg.querySelector("g");
    return actors.map((a) => {
      const el = document.createElementNS(NS, "g");
      if (a.kind === "car") {
        el.innerHTML = `<rect class="car" width="34" height="16" rx="4"/>` +
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
      const [x, y] = at(a.keys, t);
      el.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
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
