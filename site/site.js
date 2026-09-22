// ---------------------------------------------------------------------------
// Fill these in before launch. Everything else on the site reads from here.
// ---------------------------------------------------------------------------
const CONFIG = {
  // The change.org petition.
  petitionUrl: "",
  // Who the "Email your officials" letter goes to. Official addresses from each
  // body's own site, checked September 19, 2026. Rep. Latimer has no public
  // email (web form only), so he's linked separately on the page.
  emailTo: [
    // Town of Mamaroneck Town Board
    "supervisor@townofmamaroneckny.org", "JKing@TownofMamaroneckNY.org", "RNichinsky@TownofMamaroneckNY.gov",
    "DMoss@townofmamaroneckny.gov", "aregenstreich@townofmamaroneckny.gov",
    // Village of Larchmont Board of Trustees
    "mayor@larchmontny.gov", "pfanelli@larchmontny.gov", "tpare@larchmontny.gov", "dmagid@larchmontny.gov", "ipost@larchmontny.gov",
    // Village of Mamaroneck Board of Trustees
    "storres@vomny.org", "nlucas@vomny.org", "mderose@vomny.org", "dkushnick@vomny.org", "esilver@vomny.org",
    // State Senate District 37, Assembly District 91, County Legislature District 7
    "smayer@nysenate.gov", "OtisS@nyassembly.gov", "Nambiar@Westchesterlegislatorsny.gov",
  ],
  // e.g. "Tuesday, October 21, 7 pm · Mamaroneck High School". Empty = not yet announced.
  meeting: "",
};

const LETTER_SUBJECT = "I support the Boston Post Road road diet";
const LETTER_BODY =
`[Add a sentence about why this matters to you: where you live, if you have kids, how you use the Post Road.]

I'm writing to support NYSDOT's proposed redesign of Boston Post Road (US-1) through Larchmont and Mamaroneck.

Everyone knows Boston Post Road is incredibly dangerous and there have been numerous fatal and near-fatal crashes. This is a unique opportunity to fix this critical connector before another fatality occurs. The Village of Larchmont, Village of Mamaroneck, and Town of Mamaroneck formally requested safety improvements two years ago and after a great deal of work NYSDOT has provided a design that will bring Boston Post Road up to current safety standards.

I expect our elected officials will make the most of this opportunity because it is a win-win-win: improved safety, improved traffic flow, at no cost to the local taxpayer.

Ten schools and more than 6,000 students sit along this corridor. Please support the road diet, and please help residents understand what is being proposed and why.

Thank you,
[Your name]
[Your street or neighborhood]`;

// ---------------------------------------------------------------------------

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Petition button.
  $$("[data-petition]").forEach(a => {
    if (CONFIG.petitionUrl) {
      a.href = CONFIG.petitionUrl;
      a.target = "_blank"; a.rel = "noopener";
    } else {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.textContent = "Petition link coming soon";
    }
  });

  // Email: a mailto link, plus a copy button for people whose mail app
  // doesn't open from a link (Gmail in a browser, most often).
  const mailto = "mailto:" + CONFIG.emailTo.map(encodeURIComponent).join(",") +
    "?subject=" + encodeURIComponent(LETTER_SUBJECT) +
    "&body=" + encodeURIComponent(LETTER_BODY);
  $$("[data-email]").forEach(a => { a.href = mailto; });
  $$("[data-letter]").forEach(pre => { pre.textContent = LETTER_BODY; });
  $$("[data-recipients]").forEach(el => {
    el.textContent = CONFIG.emailTo.length ? CONFIG.emailTo.join(", ") : "Recipient list coming soon.";
  });
  $$("[data-copy-letter]").forEach(btn => btn.addEventListener("click", async () => {
    const status = btn.closest(".action")?.querySelector(".status");
    const text = (CONFIG.emailTo.length ? `To: ${CONFIG.emailTo.join(", ")}\n` : "") +
      `Subject: ${LETTER_SUBJECT}\n\n${LETTER_BODY}`;
    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = "Copied. Paste it into a new email and add your own sentence at the top.";
    } catch {
      if (status) status.textContent = "Couldn't copy automatically. Open \"Read the letter\" below and copy it from there.";
    }
  }));

  // Meeting.
  $$("[data-meeting]").forEach(el => {
    el.textContent = CONFIG.meeting || "NYSDOT expects a third public meeting this fall. We'll post the date here as soon as it's announced.";
  });

  // Citations. <a class="cite" href="#src-x"></a> gets the source's number,
  // and opens a small card instead of jumping to the list.
  const list = $("details.sources ol");
  if (list) {
    // Number sources in the order the page first cites them, and put the
    // list in that order, so the first marker a reader meets is always 1.
    const cited = [];
    $$("a.cite").forEach(a => {
      const id = a.getAttribute("href").slice(1);
      if (!cited.includes(id)) cited.push(id);
    });
    const items = $$("li[id]", list);
    items.sort((a, b) => {
      const ia = cited.indexOf(a.id), ib = cited.indexOf(b.id);
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    }).forEach(li => list.appendChild(li));
    const ids = $$("li[id]", list).map(li => li.id);
    $$("a.cite").forEach(a => {
      const id = a.getAttribute("href").slice(1);
      const n = ids.indexOf(id) + 1;
      a.textContent = n ? String(n) : "?";
      a.setAttribute("aria-label", `Source ${n}`);
    });
    let card = null, owner = null;
    const close = () => { card?.remove(); card = null; owner = null; };
    document.addEventListener("click", e => {
      const a = e.target.closest("a.cite");
      if (!a) { if (card && !card.contains(e.target)) close(); return; }
      e.preventDefault();
      if (owner === a) { close(); return; }
      close();
      const li = document.getElementById(a.getAttribute("href").slice(1));
      if (!li) return;
      card = document.createElement("div");
      card.className = "cite-card"; card.setAttribute("role", "note");
      card.innerHTML = li.innerHTML;
      document.body.appendChild(card);
      const r = a.getBoundingClientRect(), w = card.offsetWidth;
      const left = Math.min(Math.max(r.left + scrollX - w / 2, 16 + scrollX), scrollX + innerWidth - w - 16);
      card.style.left = left + "px";
      card.style.top = (r.bottom + scrollY + 8) + "px";
      owner = a;
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }
  // Arriving at #src-x opens the sources list.
  const openTarget = () => {
    const t = location.hash && document.getElementById(location.hash.slice(1));
    if (t && t.closest("details")) t.closest("details").open = true;
  };
  addEventListener("hashchange", openTarget); openTarget();
})();
