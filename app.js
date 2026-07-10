/* ============================================================================
   TripApp — main UI logic
   ============================================================================ */
(function () {
  const CFG = window.TRIPAPP_CONFIG || {};
  const TRIP = CFG.trip || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const APP_VERSION = "1.0.0";

  // -------------------------------------------------------------- tabs
  function initTabs() {
    const tabs = $$(".tab");
    const panels = $$(".tab-panel");
    function show(name) {
      panels.forEach((p) => (p.hidden = p.dataset.panel !== name));
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      try { localStorage.setItem("tripapp_tab", name); } catch {}
    }
    tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab)));
    show(localStorage.getItem("tripapp_tab") || "countdown");
  }

  // -------------------------------------------------------------- countdown
  function fmtDateRange() {
    try {
      const s = new Date(TRIP.startDate), e = new Date(TRIP.endDate);
      const opt = { month: "long", day: "numeric" };
      return `${s.toLocaleDateString(undefined, opt)} – ${e.toLocaleDateString(undefined, opt)}, ${e.getFullYear()}`;
    } catch { return ""; }
  }

  const MILESTONES = [
    { d: 365, msg: "One year to paradise! 🌴" },
    { d: 200, msg: "200 days — the daydreaming begins ✨" },
    { d: 100, msg: "Triple digits gone — 100 days! 🎉" },
    { d: 50,  msg: "50 days to Barbados! 🏝️" },
    { d: 30,  msg: "One month out — start the packing list! 🧳" },
    { d: 14,  msg: "Two weeks!! 🐢" },
    { d: 7,   msg: "One week to paradise! 🌅" },
    { d: 3,   msg: "3 days — almost there! ✈️" },
    { d: 1,   msg: "TOMORROW. Pack your bags! 🍹" },
    { d: 0,   msg: "It's here — welcome to Barbados! 🌴🥂" },
  ];

  let lastMilestoneShown = null;
  function updateCountdown() {
    const now = Date.now();
    const start = new Date(TRIP.startDate).getTime();
    const end = new Date(TRIP.endDate).getTime();
    let diff = start - now;

    const onTrip = now >= start && now <= end;
    const done = now > end;

    if (diff < 0) diff = 0;
    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    $("#cd-days").textContent = days;
    $("#cd-hours").textContent = String(hrs).padStart(2, "0");
    $("#cd-mins").textContent = String(mins).padStart(2, "0");
    $("#cd-secs").textContent = String(secs).padStart(2, "0");

    // progress since "today-ish" baseline (1 year before trip) to start
    const baseline = start - 365 * 86400 * 1000;
    let pct = ((now - baseline) / (start - baseline)) * 100;
    pct = Math.max(0, Math.min(100, pct));
    $("#progress-fill").style.width = pct.toFixed(1) + "%";

    const ms = $("#milestone");
    if (onTrip) {
      $("#progress-text").textContent = "You're in Barbados right now 🌴 Soak it up!";
      $("#progress-fill").style.width = "100%";
      ms.textContent = "Living the dream — enjoy every second 🥂";
    } else if (done) {
      $("#progress-text").textContent = "What a trip. Already planning the next one? 💕";
      ms.textContent = "";
    } else {
      $("#progress-text").textContent = `${days} days, ${hrs}h ${mins}m until check-in`;
      // milestone banner (closest upcoming threshold that we're at/under)
      const hit = MILESTONES.find((m) => days === m.d);
      if (hit) {
        ms.textContent = hit.msg;
        if (lastMilestoneShown !== hit.d && (hit.d <= 100)) { burstConfetti(); }
        lastMilestoneShown = hit.d;
      } else if (!ms.textContent) {
        ms.textContent = "";
      }
    }
  }

  // -------------------------------------------------------------- confetti
  let confettiPieces = [];
  function burstConfetti() {
    const canvas = $("#confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    canvas.style.display = "block";
    const colors = ["#2ec4b6", "#ffd166", "#ff6b6b", "#37d8c8", "#ffffff"];
    confettiPieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      r: 4 + Math.random() * 6,
      c: colors[(Math.random() * colors.length) | 0],
      vy: 2 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      rot: Math.random() * 6,
      vr: -0.2 + Math.random() * 0.4,
    }));
    let frames = 0;
    (function anim() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiPieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      frames++;
      if (frames < 200) requestAnimationFrame(anim);
      else { canvas.style.display = "none"; }
    })();
  }

  // -------------------------------------------------------------- helpers
  function dayLabel(iso) {
    if (!iso) return "Someday";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }
  function checkRow({ item, done, title, meta, onToggle, onDelete }) {
    const el = document.createElement("div");
    el.className = "item" + (done ? " done" : "");
    el.innerHTML = `
      <button class="item-check" aria-label="toggle">✓</button>
      <div class="item-body">
        <div class="item-title">${esc(title)}</div>
        <div class="item-meta">${meta || ""}</div>
      </div>
      <button class="item-del" aria-label="delete">🗑️</button>`;
    el.querySelector(".item-check").addEventListener("click", onToggle);
    el.querySelector(".item-del").addEventListener("click", onDelete);
    return el;
  }
  function emptyMsg(text) {
    const d = document.createElement("div");
    d.className = "empty"; d.textContent = text; return d;
  }

  // -------------------------------------------------------------- PLANNER
  const TYPE_META = {
    excursion: ["🤿", "Excursion"], dining: ["🍽️", "Dining"],
    activity: ["🏖️", "Activity"], idea: ["💡", "Idea"],
  };
  let planFilter = "all";
  let planDayFilter = "all";
  function initCalStrip() {
    const strip = $("#cal-strip");
    strip.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "cal-day active"; allBtn.dataset.day = "all";
    allBtn.innerHTML = `<span class="cal-dow">All</span><span class="cal-num">🗺️</span><span class="cal-mon">Days</span>`;
    strip.appendChild(allBtn);
    (TRIP.days || []).forEach((iso) => {
      const d = new Date(iso + "T12:00:00");
      const b = document.createElement("button");
      b.className = "cal-day"; b.dataset.day = iso;
      b.innerHTML = `
        <span class="cal-dow">${d.toLocaleDateString(undefined, { weekday: "short" })}</span>
        <span class="cal-num">${d.getDate()}</span>
        <span class="cal-mon">${d.toLocaleDateString(undefined, { month: "short" })}</span>
        <span class="cal-count" data-count-for="${iso}"></span>`;
      strip.appendChild(b);
    });
    strip.addEventListener("click", (e) => {
      const btn = e.target.closest(".cal-day");
      if (!btn) return;
      planDayFilter = btn.dataset.day;
      $$(".cal-day", strip).forEach((c) => c.classList.toggle("active", c === btn));
      renderPlans(currentPlans);
    });
  }
  function updateCalCounts(rows) {
    const counts = {};
    rows.forEach((r) => { if (r.day) counts[r.day] = (counts[r.day] || 0) + 1; });
    $$("#cal-strip .cal-count").forEach((el) => {
      const day = el.dataset.countFor;
      el.textContent = counts[day] ? counts[day] : "";
    });
  }
  function initPlanner() {
    initCalStrip();
    // populate day dropdown
    const daySel = $("#plan-day");
    (TRIP.days || []).forEach((iso) => {
      const o = document.createElement("option");
      o.value = iso; o.textContent = dayLabel(iso);
      daySel.appendChild(o);
    });
    // filters
    const filters = [["all", "All"], ["excursion", "🤿"], ["dining", "🍽️"], ["activity", "🏖️"], ["idea", "💡"]];
    const fr = $("#plan-filters");
    filters.forEach(([val, label]) => {
      const b = document.createElement("button");
      b.className = "chip" + (val === "all" ? " active" : "");
      b.textContent = label; b.dataset.f = val;
      b.addEventListener("click", () => {
        planFilter = val;
        $$(".chip", fr).forEach((c) => c.classList.toggle("active", c.dataset.f === val));
        renderPlans(currentPlans);
      });
      fr.appendChild(b);
    });

    $("#plan-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#plan-title").value.trim();
      if (!title) return;
      Store.add("plans", { title, type: $("#plan-type").value, day: $("#plan-day").value || "", done: false });
      $("#plan-title").value = "";
    });

    Store.subscribe("plans", (rows) => { currentPlans = rows; renderPlans(rows); });
  }
  let currentPlans = [];
  function renderPlans(rows) {
    updateCalCounts(rows);
    const list = $("#plan-list");
    list.innerHTML = "";
    let filtered = rows.slice();
    if (planFilter !== "all") filtered = filtered.filter((r) => r.type === planFilter);
    if (planDayFilter !== "all") filtered = filtered.filter((r) => r.day === planDayFilter);
    if (!filtered.length) { list.appendChild(emptyMsg("Nothing yet — add your first plan above! 🗺️")); return; }

    // group by day, "Someday" last (skip grouping headers when a single day is already selected)
    const groups = {};
    filtered.forEach((r) => { (groups[r.day || ""] = groups[r.day || ""] || []).push(r); });
    const dayKeys = (TRIP.days || []).filter((d) => groups[d]);
    if (groups[""]) dayKeys.push("");
    const showHeadings = planDayFilter === "all";

    dayKeys.forEach((day) => {
      if (showHeadings) {
        const h = document.createElement("div");
        h.className = "day-heading";
        h.textContent = day ? dayLabel(day) : "💡 Someday / wishlist";
        list.appendChild(h);
      }
      groups[day].sort((a, b) => (a.done - b.done) || (a.createdAt - b.createdAt));
      groups[day].forEach((r) => {
        const [emoji, tname] = TYPE_META[r.type] || ["•", r.type];
        const meta = `<span class="tag">${emoji} ${tname}</span>`;
        list.appendChild(checkRow({
          title: r.title, done: r.done, meta,
          onToggle: () => Store.update("plans", r.id, { done: !r.done }),
          onDelete: () => Store.remove("plans", r.id),
        }));
      });
    });
  }

  // -------------------------------------------------------------- PACKING
  const PACK_SEED = [
    ["Passports", "Documents"], ["Sandals booking confirmation", "Documents"],
    ["Sunscreen (reef-safe)", "Toiletries"], ["Aloe / after-sun", "Toiletries"],
    ["Swimsuits", "Beach"], ["Beach cover-up", "Beach"], ["Sunglasses", "Beach"],
    ["Sun hat", "Beach"], ["Flip flops", "Beach"], ["Snorkel gear (optional)", "Beach"],
    ["Nice dinner outfits", "Clothes"], ["Light layers for AC", "Clothes"],
    ["Phone + charger", "Tech"], ["Portable battery", "Tech"], ["Camera", "Tech"],
    ["Bug spray", "Toiletries"], ["Meds / vitamins", "Toiletries"],
    ["Cash for tips (USD)", "Documents"],
  ];
  function initPacking() {
    $("#pack-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#pack-title").value.trim();
      if (!title) return;
      Store.add("packing", { title, category: $("#pack-cat").value, done: false });
      $("#pack-title").value = "";
    });
    $("#pack-seed").addEventListener("click", () => {
      if (!confirm("Add ~18 suggested resort essentials to your list?")) return;
      PACK_SEED.forEach(([title, category]) => Store.add("packing", { title, category, done: false }));
    });
    Store.subscribe("packing", renderPacking);
  }
  function renderPacking(rows) {
    const list = $("#pack-list");
    list.innerHTML = "";
    const done = rows.filter((r) => r.done).length;
    $("#pack-count").textContent = rows.length ? `${done}/${rows.length} packed` : "Nothing on the list yet.";
    if (!rows.length) { list.appendChild(emptyMsg("Add items, or tap “resort essentials” below 🧳")); return; }

    const groups = {};
    rows.forEach((r) => { (groups[r.category || "Other"] = groups[r.category || "Other"] || []).push(r); });
    Object.keys(groups).sort().forEach((cat) => {
      const h = document.createElement("div");
      h.className = "day-heading"; h.textContent = cat;
      list.appendChild(h);
      groups[cat].sort((a, b) => (a.done - b.done));
      groups[cat].forEach((r) => list.appendChild(checkRow({
        title: r.title, done: r.done, meta: "",
        onToggle: () => Store.update("packing", r.id, { done: !r.done }),
        onDelete: () => Store.remove("packing", r.id),
      })));
    });
  }

  // -------------------------------------------------------------- NOTES
  function initNotes() {
    $("#note-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = $("#note-text").value.trim();
      if (!text) return;
      Store.add("notes", { text, author: $("#note-author").value });
      $("#note-text").value = "";
    });
    Store.subscribe("notes", renderNotes);
  }
  function renderNotes(rows) {
    const list = $("#note-list");
    list.innerHTML = "";
    if (!rows.length) { list.appendChild(emptyMsg("No notes yet — leave each other something sweet 💌")); return; }
    rows.slice().reverse().forEach((r) => {
      const el = document.createElement("div");
      el.className = "note from-" + (r.author === "Kelli" ? "Kelli" : "Nick");
      const when = new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      el.innerHTML = `
        <div class="note-text">${esc(r.text)}</div>
        <div class="note-foot"><span class="note-from">${esc(r.author)}</span><span>${when}</span></div>`;
      const del = document.createElement("button");
      del.className = "photo-del"; del.textContent = "×"; del.style.top = "8px"; del.style.right = "8px";
      del.addEventListener("click", () => { if (confirm("Delete this note?")) Store.remove("notes", r.id); });
      el.appendChild(del);
      list.appendChild(el);
    });
  }

  // -------------------------------------------------------------- PHOTOS
  function initPhotos() {
    $("#photo-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const label = $(".photo-upload span");
      const prev = label.textContent;
      label.textContent = "Uploading…";
      Store.uploadImage(file).then(({ url }) => {
        const caption = prompt("Add a caption (optional):", "") || "";
        return Store.add("photos", { url, caption });
      }).catch((err) => {
        console.error(err); alert("Couldn't add that photo. If you're on cloud sync, check Firebase Storage is enabled.");
      }).finally(() => { label.textContent = prev; e.target.value = ""; });
    });
    Store.subscribe("photos", renderPhotos);
  }
  function renderPhotos(rows) {
    const grid = $("#photo-grid");
    grid.innerHTML = "";
    if (!rows.length) { grid.appendChild(emptyMsg("No photos yet — add your favorites 📸")); return; }
    rows.slice().reverse().forEach((r) => {
      const fig = document.createElement("figure");
      fig.innerHTML = `<img loading="lazy" src="${esc(r.url)}" alt="${esc(r.caption || "memory")}" />
        ${r.caption ? `<figcaption class="photo-cap">${esc(r.caption)}</figcaption>` : ""}
        <button class="photo-del" aria-label="delete">×</button>`;
      fig.querySelector(".photo-del").addEventListener("click", () => {
        if (confirm("Remove this photo?")) Store.remove("photos", r.id);
      });
      grid.appendChild(fig);
    });
  }

  // -------------------------------------------------------------- INFO / weather
  function initInfo() {
    if (CFG.weather) $("#info-loc").textContent = CFG.weather.locationName || "";
    if (!window.Weather) return;
    Weather.fetch().then((wx) => {
      $("#weather-card").innerHTML = `
        <div class="wx-now">
          <span class="wx-emoji">${wx.emoji}</span>
          <span class="wx-temp">${wx.temp}°</span>
        </div>
        <div class="wx-desc">${esc(wx.desc)} · feels like paradise · 💨 ${wx.wind} mph · 💧 ${wx.humidity}%</div>
        <div class="wx-forecast">
          ${wx.forecast.map((d) => `<div class="wx-day"><div class="d">${esc(d.label)}</div>
            <div class="e">${d.emoji}</div><div>${d.hi}°/${d.lo}°</div></div>`).join("")}
        </div>`;
      if (wx.today) {
        const sr = new Date(wx.today.sunrise).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const ss = new Date(wx.today.sunset).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        $("#sun-card").innerHTML = `<h3>🌅 Sun today (Barbados)</h3>
          <p>Sunrise <b>${sr}</b> &nbsp;·&nbsp; Sunset <b>${ss}</b></p>`;
      }
    }).catch((err) => {
      console.warn("weather failed", err);
      $("#weather-card").innerHTML = `<p>Couldn't load live weather (offline?). Barbados averages a lovely <b>84–88°F</b> in late September. ☀️</p>`;
    });
  }

  // -------------------------------------------------------------- SETTINGS + bg
  function applyBackground(url) {
    const layer = $("#bg-layer");
    if (url) { layer.style.backgroundImage = `url("${url}")`; layer.classList.add("show"); }
    else { layer.style.backgroundImage = ""; layer.classList.remove("show"); }
  }
  function initSettings() {
    $("#hero-names").textContent = `${TRIP.person1 || "Us"} & ${TRIP.person2 || ""}`.replace(/ & $/, "");
    $("#hero-dates").textContent = fmtDateRange();
    $("#app-version").textContent = `TripApp v${APP_VERSION}`;
    $("#couple-code-input").value = Store.coupleCode;

    $("#save-code").addEventListener("click", () => {
      const code = $("#couple-code-input").value.trim();
      if (!code) return;
      Store.setCoupleCode(code);
      alert("Couple code saved. Reloading so both phones sync to the same space…");
      location.reload();
    });

    $("#bg-input").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      Store.uploadImage(file).then(({ url }) => Store.setSetting("backgroundUrl", url))
        .catch((err) => { console.error(err); alert("Couldn't set background."); })
        .finally(() => { e.target.value = ""; });
    });
    $("#bg-clear").addEventListener("click", () => Store.setSetting("backgroundUrl", ""));

    Store.subscribeSettings((s) => { applyBackground(s.backgroundUrl || ""); });
  }

  const ERROR_HINTS = [
    [/permission.denied/i, "Firestore rules aren't published yet. Fix: Firebase console → Firestore Database → Rules → paste firestore.rules → Publish."],
    [/storage\/unauthorized|storage\/unknown|does not exist/i, "Storage isn't set up yet. Fix: Firebase console → Storage → Get started, then Rules → paste storage.rules → Publish."],
    [/admin-restricted-operation|operation-not-allowed/i, "Anonymous sign-in isn't enabled. Fix: Firebase console → Authentication → Sign-in method → enable Anonymous."],
    [/network|unavailable/i, "Can't reach Firebase right now — check your connection."],
  ];
  function friendlyError(err) {
    const hay = `${err.code || ""} ${err.message || ""}`;
    const hit = ERROR_HINTS.find(([re]) => re.test(hay));
    return hit ? hit[1] : `${err.area || "Sync"} error: ${err.message || err.code || "unknown"}`;
  }
  function showSyncError(err) {
    const el = $("#sync-error");
    if (!err) { el.textContent = ""; return; }
    el.textContent = "⚠️ " + friendlyError(err);
  }
  function initSyncStatus() {
    const el = $("#sync-status");
    if (Store.mode === "cloud") {
      el.textContent = "☁️ Live sync ON — you and Kelli share everything.";
      el.className = "sync-status on";
    } else {
      const hasConfig = !!(CFG.FIREBASE_CONFIG && CFG.FIREBASE_CONFIG.apiKey);
      el.textContent = hasConfig
        ? "📱 Local mode — Firebase is configured but couldn't connect (see below)."
        : "📱 Local mode — data is saved on this phone only. Add Firebase in config.js to sync.";
      el.className = "sync-status off";
    }
    showSyncError(Store.lastError);
    window.addEventListener("store-error", (e) => showSyncError(e.detail));
  }

  // -------------------------------------------------------------- boot
  function boot() {
    initTabs();
    initSettings();
    initPlanner();
    initPacking();
    initNotes();
    initPhotos();
    initInfo();
    initSyncStatus();
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  Store.init().then(boot);

  // service worker (offline)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW failed", e));
    });
  }
})();
