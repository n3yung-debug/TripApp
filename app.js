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
      document.body.dataset.tab = name;
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
    const bd = $("#cd-breakdown");
    if (onTrip) {
      $("#progress-text").textContent = "You're in Barbados right now 🌴 Soak it up!";
      $("#progress-fill").style.width = "100%";
      ms.textContent = "Living the dream — enjoy every second 🥂";
      if (bd) bd.textContent = "";
    } else if (done) {
      $("#progress-text").textContent = "What a trip. Already planning the next one? 💕";
      ms.textContent = "";
      if (bd) bd.textContent = "";
    } else {
      if (bd) bd.textContent = formatBreakdown(breakdownUntil(start));
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

  // Calendar-aware "X months, Y weeks, Z days" until a timestamp.
  function breakdownUntil(startMs) {
    const now = new Date();
    const start = new Date(startMs);
    if (start <= now) return null;
    let months = (start.getFullYear() - now.getFullYear()) * 12 + (start.getMonth() - now.getMonth());
    let anchor = new Date(now); anchor.setMonth(anchor.getMonth() + months);
    if (anchor > start) { months--; anchor = new Date(now); anchor.setMonth(anchor.getMonth() + months); }
    if (months < 0) months = 0;
    let remDays = Math.floor((start - anchor) / 86400000);
    const weeks = Math.floor(remDays / 7);
    const days = remDays % 7;
    return { months, weeks, days };
  }
  function formatBreakdown(bd) {
    if (!bd) return "";
    const parts = [];
    const push = (n, unit) => { if (n > 0) parts.push(`${n} ${unit}${n === 1 ? "" : "s"}`); };
    push(bd.months, "month"); push(bd.weeks, "week"); push(bd.days, "day");
    if (!parts.length) return "Check-in is today! 🎉";
    return parts.join(", ") + " to go";
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
  // Turn a title element into an inline text input; onSave(newText) or re-render on cancel.
  function beginInlineEdit(titleEl, current, onSave, reRender) {
    const input = document.createElement("input");
    input.type = "text"; input.className = "item-edit"; input.value = current; input.maxLength = 120;
    titleEl.replaceWith(input);
    input.focus(); input.select();
    let settled = false;
    const finish = (save) => {
      if (settled) return; settled = true;
      const val = input.value.trim();
      if (save && val && val !== current) onSave(val);
      else reRender();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); finish(true); }
      else if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
  }

  function checkRow({ item, done, title, meta, onToggle, onDelete, onEdit, reRender }) {
    const el = document.createElement("div");
    el.className = "item" + (done ? " done" : "");
    el.innerHTML = `
      <button class="item-check" aria-label="toggle">✓</button>
      <div class="item-body">
        <div class="item-title">${esc(title)}</div>
        <div class="item-meta">${meta || ""}</div>
      </div>
      ${onEdit ? `<button class="item-editbtn" aria-label="edit">✏️</button>` : ""}
      <button class="item-del" aria-label="delete">🗑️</button>`;
    el.querySelector(".item-check").addEventListener("click", onToggle);
    el.querySelector(".item-del").addEventListener("click", onDelete);
    if (onEdit) {
      el.querySelector(".item-editbtn").addEventListener("click", () =>
        beginInlineEdit(el.querySelector(".item-title"), title, onEdit, reRender || (() => {})));
    }
    return el;
  }
  function emptyMsg(text) {
    const d = document.createElement("div");
    d.className = "empty"; d.textContent = text; return d;
  }

  // -------------------------------------------------------------- CATEGORIES (custom, synced)
  // Base sets; users can add their own, stored in settings (packCats / planTypes)
  // and shared across both phones.
  const PACK_BASE_CATS = ["Beach", "Clothes", "Toiletries", "Documents", "Tech"]; // "Other" always appended last
  const PLAN_BASE_TYPES = [
    { value: "excursion", emoji: "🤿", label: "Excursion" },
    { value: "dining", emoji: "🍽️", label: "Dining" },
    { value: "idea", emoji: "💡", label: "Idea" },
  ];
  const NEW_CAT_SENTINEL = "__new__";
  let customPackCats = [];
  let customPlanTypes = [];
  let pendingPackCat = null;   // reselect after a new pack category syncs in
  let pendingPlanType = null;  // reselect after a new plan category syncs in

  function effectivePackCats() {
    const out = [];
    [...PACK_BASE_CATS, ...customPackCats].forEach((c) => {
      if (c && c !== "Other" && !out.some((x) => x.toLowerCase() === c.toLowerCase())) out.push(c);
    });
    out.push("Other");
    return out;
  }
  function effectivePlanTypes() {
    const out = PLAN_BASE_TYPES.slice();
    customPlanTypes.forEach((name) => {
      if (name && !out.some((t) => t.value.toLowerCase() === name.toLowerCase())) {
        out.push({ value: name, emoji: "🏷️", label: name, custom: true });
      }
    });
    return out;
  }
  function typeMeta(type) {
    const t = effectivePlanTypes().find((x) => x.value === type);
    return t ? [t.emoji, t.label] : ["🏷️", type];
  }
  // Fill a <select> from string values, DOM-safe, with a trailing "＋ New category…" option.
  function fillCatSelect(sel, values, selected) {
    sel.innerHTML = "";
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = (typeof v === "object" ? v.value : v);
      o.textContent = (typeof v === "object" ? `${v.emoji} ${v.label}` : v);
      if (o.value === selected) o.selected = true;
      sel.appendChild(o);
    });
    const o = document.createElement("option");
    o.value = NEW_CAT_SENTINEL; o.textContent = "＋ New category…";
    sel.appendChild(o);
  }
  function promptCategory(existingNames, message, def) {
    let name = window.prompt(message || "New category name:", def || "");
    if (name == null) return null;
    name = name.trim().slice(0, 30);
    if (!name || name === NEW_CAT_SENTINEL) return null;
    if (name.toLowerCase() === "other" || existingNames.some((c) => c.toLowerCase() === name.toLowerCase())) {
      alert("“" + name + "” already exists.");
      return null;
    }
    return name;
  }
  function initCategories() {
    Store.subscribeSettings((s) => {
      customPackCats = Array.isArray(s.packCats) ? s.packCats : [];
      customPlanTypes = Array.isArray(s.planTypes) ? s.planTypes : [];
      rebuildPackCatUI();
      rebuildPlannerTypeUI();
      renderCategoryManagers();
      renderPackGrid();
      if (openOwner !== null) renderPackSheetList();
      renderCalGrid();
      if (openDay !== null) renderDaySheetList();
    });
  }

  // ---- Category management (Settings tab) ----
  function catRow(display, rawName, editable, kind) {
    const row = document.createElement("div");
    row.className = "cat-row";
    const span = document.createElement("span");
    span.className = "cat-name"; span.textContent = display;
    row.appendChild(span);
    if (!editable) {
      const tag = document.createElement("span");
      tag.className = "cat-base"; tag.textContent = "built-in";
      row.appendChild(tag);
      return row;
    }
    const rn = document.createElement("button"); rn.textContent = "✏️"; rn.setAttribute("aria-label", "rename");
    const dl = document.createElement("button"); dl.textContent = "🗑️"; dl.setAttribute("aria-label", "delete");
    rn.addEventListener("click", () => (kind === "pack" ? renamePackCat(rawName) : renamePlanType(rawName)));
    dl.addEventListener("click", () => (kind === "pack" ? deletePackCat(rawName) : deletePlanType(rawName)));
    row.appendChild(rn); row.appendChild(dl);
    return row;
  }
  function renderCategoryManagers() {
    const packEl = $("#cat-pack-list");
    if (packEl) {
      packEl.innerHTML = "";
      [...PACK_BASE_CATS, "Other"].forEach((n) => packEl.appendChild(catRow(n, n, false, "pack")));
      customPackCats.forEach((n) => packEl.appendChild(catRow(n, n, true, "pack")));
    }
    const planEl = $("#cat-plan-list");
    if (planEl) {
      planEl.innerHTML = "";
      PLAN_BASE_TYPES.forEach((t) => planEl.appendChild(catRow(`${t.emoji} ${t.label}`, t.value, false, "plan")));
      customPlanTypes.forEach((n) => planEl.appendChild(catRow(`🏷️ ${n}`, n, true, "plan")));
    }
  }
  function renamePackCat(oldName) {
    const others = effectivePackCats().filter((c) => c.toLowerCase() !== oldName.toLowerCase());
    const name = promptCategory(others, `Rename “${oldName}” to:`, oldName);
    if (!name) return;
    Store.setSetting("packCats", customPackCats.map((c) => (c === oldName ? name : c)));
    currentPacking.filter((r) => (r.category || "") === oldName).forEach((r) => Store.update("packing", r.id, { category: name }));
  }
  function deletePackCat(name) {
    const n = currentPacking.filter((r) => (r.category || "") === name).length;
    if (!confirm(`Delete category “${name}”?` + (n ? ` ${n} item${n === 1 ? "" : "s"} will move to “Other”.` : ""))) return;
    Store.setSetting("packCats", customPackCats.filter((c) => c !== name));
    currentPacking.filter((r) => (r.category || "") === name).forEach((r) => Store.update("packing", r.id, { category: "Other" }));
  }
  function renamePlanType(oldName) {
    const others = effectivePlanTypes().map((t) => t.label).filter((c) => c.toLowerCase() !== oldName.toLowerCase());
    const name = promptCategory(others, `Rename “${oldName}” to:`, oldName);
    if (!name) return;
    Store.setSetting("planTypes", customPlanTypes.map((c) => (c === oldName ? name : c)));
    currentPlans.filter((r) => r.type === oldName).forEach((r) => Store.update("plans", r.id, { type: name }));
  }
  function deletePlanType(name) {
    const n = currentPlans.filter((r) => r.type === name).length;
    if (!confirm(`Delete category “${name}”?` + (n ? ` ${n} plan${n === 1 ? "" : "s"} will move to “Idea”.` : ""))) return;
    Store.setSetting("planTypes", customPlanTypes.filter((c) => c !== name));
    currentPlans.filter((r) => r.type === name).forEach((r) => Store.update("plans", r.id, { type: "idea" }));
  }

  // -------------------------------------------------------------- PLANNER
  const TILE_PREVIEW_MAX = 5;
  let planFilter = "all";
  let currentPlans = [];
  let openDay = null; // iso string, or null when sheet is closed

  function fmtTime(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const d = new Date(2000, 0, 1, h, m);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  function sortByTime(a, b) {
    if (a.done !== b.done) return a.done - b.done;
    const ta = a.time || "99:99", tb = b.time || "99:99";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.createdAt - b.createdAt;
  }
  function itemsFor(day) {
    let rows = currentPlans.filter((r) => (r.day || "") === day);
    if (planFilter !== "all") rows = rows.filter((r) => r.type === planFilter);
    return rows.sort(sortByTime);
  }

  function rebuildPlanFilters() {
    const fr = $("#plan-filters");
    fr.innerHTML = "";
    const chips = [{ value: "all", label: "All" },
      ...effectivePlanTypes().map((t) => ({ value: t.value, label: t.custom ? `🏷️ ${t.label}` : t.emoji }))];
    chips.forEach(({ value, label }) => {
      const b = document.createElement("button");
      b.className = "chip" + (planFilter === value ? " active" : "");
      b.textContent = label; b.dataset.f = value;
      b.addEventListener("click", () => {
        planFilter = value;
        $$(".chip", fr).forEach((c) => c.classList.toggle("active", c.dataset.f === value));
        renderCalGrid();
        if (openDay !== null) renderDaySheetList();
      });
      fr.appendChild(b);
    });
  }
  function rebuildPlannerTypeUI() {
    const sel = $("#day-add-type");
    if (sel) {
      const cur = sel.value && sel.value !== NEW_CAT_SENTINEL ? sel.value : "";
      fillCatSelect(sel, effectivePlanTypes(),
        (pendingPlanType && effectivePlanTypes().some((t) => t.value === pendingPlanType)) ? pendingPlanType : cur);
      if (pendingPlanType) pendingPlanType = null;
    }
    rebuildPlanFilters();
  }

  function initPlanner() {
    rebuildPlannerTypeUI();
    $("#day-add-type").addEventListener("change", (e) => {
      if (e.target.value !== NEW_CAT_SENTINEL) return;
      const name = promptCategory(effectivePlanTypes().map((t) => t.label));
      if (name) { pendingPlanType = name; Store.setSetting("planTypes", [...customPlanTypes, name]); }
      else rebuildPlannerTypeUI();
    });

    // calendar squares — one per trip day
    const grid = $("#cal-grid");
    (TRIP.days || []).forEach((iso) => {
      const d = new Date(iso + "T12:00:00");
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "cal-tile"; tile.dataset.day = iso;
      tile.innerHTML = `
        <div class="cal-tile-head">
          <span class="cal-tile-dow">${d.toLocaleDateString(undefined, { weekday: "short" })}</span>
          <span class="cal-tile-num">${d.getDate()}</span>
          <span class="cal-tile-mon">${d.toLocaleDateString(undefined, { month: "short" })}</span>
        </div>
        <div class="cal-tile-events" data-events-for="${iso}"></div>`;
      tile.addEventListener("click", () => openDaySheet(iso));
      grid.appendChild(tile);
    });

    // day sheet controls
    $("#day-sheet-close").addEventListener("click", closeDaySheet);
    $("#day-sheet").querySelector(".sheet-backdrop").addEventListener("click", closeDaySheet);
    $("#day-sheet-add-btn").addEventListener("click", () => {
      const form = $("#day-add-form");
      form.hidden = !form.hidden;
      if (!form.hidden) $("#day-add-title").focus();
    });
    $("#day-add-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#day-add-title").value.trim();
      if (!title || openDay === null) return;
      Store.add("plans", {
        title, type: $("#day-add-type").value, time: $("#day-add-time").value || "",
        day: openDay, done: false,
      });
      $("#day-add-title").value = "";
      $("#day-add-time").value = "";
    });

    Store.subscribe("plans", (rows) => {
      currentPlans = rows;
      renderCalGrid();
      if (openDay !== null) renderDaySheetList();
    });
  }

  function renderCalGrid() {
    (TRIP.days || []).forEach((iso) => {
      const rows = itemsFor(iso);
      const box = $(`.cal-tile-events[data-events-for="${iso}"]`);
      if (!box) return;
      if (!rows.length) { box.innerHTML = `<span class="tile-empty">Tap to add</span>`; return; }
      const shown = rows.slice(0, TILE_PREVIEW_MAX);
      const rest = rows.length - shown.length;
      box.innerHTML = shown.map((r) => {
        const [emoji] = typeMeta(r.type);
        const t = r.time ? fmtTime(r.time) + " · " : "";
        return `<span class="tile-chip">${emoji} ${t}${esc(r.title)}</span>`;
      }).join("") + (rest > 0 ? `<span class="tile-more">+${rest} more</span>` : "");
    });
  }

  function openDaySheet(day) {
    openDay = day;
    $("#day-sheet-title").textContent = dayLabel(day);
    $("#day-add-form").hidden = true;
    $("#day-add-title").value = "";
    $("#day-add-time").value = "";
    renderDaySheetList();
    $("#day-sheet").hidden = false;
  }
  function closeDaySheet() {
    $("#day-sheet").hidden = true;
    openDay = null;
  }
  function renderDaySheetList() {
    const list = $("#day-sheet-list");
    list.innerHTML = "";
    const rows = itemsFor(openDay);
    if (!rows.length) { list.appendChild(emptyMsg("Nothing yet — tap ＋ to add the first plan 🗺️")); return; }
    rows.forEach((r) => {
      const [emoji, tname] = typeMeta(r.type);
      const meta = (r.time ? `<span class="tag">🕐 ${fmtTime(r.time)}</span>` : "") + `<span class="tag">${esc(emoji)} ${esc(tname)}</span>`;
      list.appendChild(checkRow({
        title: r.title, done: r.done, meta,
        onToggle: () => Store.update("plans", r.id, { done: !r.done }),
        onDelete: () => Store.remove("plans", r.id),
        onEdit: (val) => Store.update("plans", r.id, { title: val }),
        reRender: renderDaySheetList,
      }));
    });
  }

  // -------------------------------------------------------------- PACKING
  const PACK_SEED = [
    ["Passport", "Documents"], ["Sandals booking confirmation", "Documents"],
    ["Sunscreen (reef-safe)", "Toiletries"], ["Aloe / after-sun", "Toiletries"],
    ["Swimsuits", "Beach"], ["Beach cover-up", "Beach"], ["Sunglasses", "Beach"],
    ["Sun hat", "Beach"], ["Flip flops", "Beach"], ["Snorkel gear (optional)", "Beach"],
    ["Nice dinner outfits", "Clothes"], ["Light layers for AC", "Clothes"],
    ["Phone + charger", "Tech"], ["Portable battery", "Tech"], ["Camera", "Tech"],
    ["Bug spray", "Toiletries"], ["Meds / vitamins", "Toiletries"],
    ["Cash for tips (USD)", "Documents"],
  ];
  const PACK_OWNERS = ["Kelli", "Nick"];
  const PACK_TILE_PREVIEW_MAX = 5;
  const PACK_IMPORT_MAX = 200;
  const PACK_LABELS = {
    packing: { verb: "packed", allDone: "🎉 All packed!", icon: "🧳", noun: "Packing" },
    shopping: { verb: "got", allDone: "🎉 All bought!", icon: "🛒", noun: "Shopping" },
  };
  let currentPacking = [];
  let openOwner = null;
  let packList = "packing"; // "packing" | "shopping" — active section

  // Existing items (pre-shopping-split) have no `list`; treat them as packing.
  function itemList(r) { return r.list || "packing"; }
  function packItemsFor(list, owner) {
    return currentPacking.filter((r) => itemList(r) === list && r.owner === owner)
      .sort((a, b) => (a.done - b.done) || (a.category || "").localeCompare(b.category || "") || (a.createdAt - b.createdAt));
  }

  // Parse pasted text (iPhone Notes etc.) into clean individual items.
  function parseListText(text) {
    if (!text) return [];
    let lines = text.split(/\r?\n/);
    // Single comma-separated line -> split on commas.
    if (lines.filter((l) => l.trim()).length <= 1 && text.indexOf(",") !== -1) {
      lines = text.split(",");
    }
    const seen = new Set();
    const out = [];
    for (let raw of lines) {
      let s = raw.trim();
      if (!s) continue;
      s = s.replace(/^[\-\*•◦‣·⁃∙\s]+/, "");            // bullets / dashes
      s = s.replace(/^\[[ xX✓]?\]\s*/, "");                                      // [ ] [x]
      s = s.replace(/^[☐☑☒✅✔✓❌□■○●]\s*/, ""); // checkbox glyphs
      s = s.replace(/^\d+[\.\)]\s*/, "");                                             // 1.  2)
      s = s.replace(/^[\-\*•\s]+/, "");                                          // leftover bullet
      s = s.trim();
      if (!s) continue;
      if (s.length > 80) s = s.slice(0, 80);
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= PACK_IMPORT_MAX) break;
    }
    return out;
  }

  function initPacking() {
    rebuildPackCatUI();
    $("#pack-add-cat").addEventListener("change", (e) => {
      if (e.target.value !== NEW_CAT_SENTINEL) return;
      const name = promptCategory(effectivePackCats());
      if (name) { pendingPackCat = name; Store.setSetting("packCats", [...customPackCats, name]); }
      else rebuildPackCatUI();
    });

    const grid = $("#pack-grid");
    PACK_OWNERS.forEach((owner) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "pack-tile"; tile.dataset.owner = owner;
      tile.innerHTML = `
        <span class="pack-tile-name">${esc(owner)}</span>
        <span class="pack-tile-sub" data-sub-for="${owner}"></span>
        <div class="pack-tile-events" data-events-for="${owner}"></div>`;
      tile.addEventListener("click", () => openPackSheet(owner));
      grid.appendChild(tile);
    });

    // Packing / Shopping segmented control
    $("#pack-seg").addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      packList = btn.dataset.list;
      $$(".seg-btn", $("#pack-seg")).forEach((b) => b.classList.toggle("active", b === btn));
      $("#pack-seed").style.display = packList === "packing" ? "" : "none";
      renderPackGrid();
    });

    $("#pack-sheet-close").addEventListener("click", closePackSheet);
    $("#pack-sheet").querySelector(".sheet-backdrop").addEventListener("click", closePackSheet);
    $("#pack-sheet-add-btn").addEventListener("click", () => {
      const form = $("#pack-add-form");
      form.hidden = !form.hidden;
      if (!form.hidden) { $("#pack-import-form").hidden = true; $("#pack-add-title").focus(); }
    });
    $("#pack-add-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#pack-add-title").value.trim();
      if (!title || openOwner === null) return;
      Store.add("packing", { title, category: $("#pack-add-cat").value, list: packList, owner: openOwner, done: false });
      $("#pack-add-title").value = "";
    });

    // Import / paste-a-list
    $("#pack-import-toggle").addEventListener("click", () => {
      const form = $("#pack-import-form");
      form.hidden = !form.hidden;
      if (!form.hidden) { $("#pack-add-form").hidden = true; $("#pack-import-text").focus(); }
      updateImportCount();
    });
    $("#pack-import-text").addEventListener("input", updateImportCount);
    $("#pack-import-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (openOwner === null) return;
      const items = parseListText($("#pack-import-text").value);
      if (!items.length) { alert("No items found to import — paste a list first."); return; }
      items.forEach((title) => Store.add("packing", { title, category: "Other", list: packList, owner: openOwner, done: false }));
      $("#pack-import-text").value = "";
      $("#pack-import-form").hidden = true;
      updateImportCount();
    });

    $("#pack-copy-btn").addEventListener("click", copyCurrentList);

    $("#pack-seed").addEventListener("click", () => {
      if (!confirm("Add ~18 suggested resort essentials to both Kelli's and Nick's Packing lists?")) return;
      PACK_OWNERS.forEach((owner) => {
        PACK_SEED.forEach(([title, category]) => Store.add("packing", { title, category, list: "packing", owner, done: false }));
      });
    });

    Store.subscribe("packing", (rows) => {
      currentPacking = rows;
      renderPackGrid();
      if (openOwner !== null) renderPackSheetList();
    });
  }

  function updateImportCount() {
    const n = parseListText($("#pack-import-text").value).length;
    $("#pack-import-count").textContent = n ? `${n} item${n === 1 ? "" : "s"} ready to add` : "";
  }

  function renderPackGrid() {
    const L = PACK_LABELS[packList];
    PACK_OWNERS.forEach((owner) => {
      const rows = packItemsFor(packList, owner);
      const done = rows.filter((r) => r.done).length;
      $(`.pack-tile-sub[data-sub-for="${owner}"]`).textContent = rows.length ? `${done}/${rows.length} ${L.verb}` : "Tap to add";
      const box = $(`.pack-tile-events[data-events-for="${owner}"]`);
      if (!rows.length) { box.innerHTML = `<span class="tile-empty">Nothing yet</span>`; return; }
      const todo = rows.filter((r) => !r.done);
      const shown = (todo.length ? todo : rows).slice(0, PACK_TILE_PREVIEW_MAX);
      const rest = (todo.length ? todo.length : rows.length) - shown.length;
      box.innerHTML = shown.map((r) => `<span class="tile-chip">${r.done ? "✓ " : ""}${esc(r.title)}</span>`).join("")
        + (rest > 0 ? `<span class="tile-more">+${rest} more</span>` : "")
        + (!todo.length && rows.length ? `<span class="tile-chip">${L.allDone}</span>` : "");
    });
  }

  function openPackSheet(owner) {
    openOwner = owner;
    $("#pack-sheet-title").textContent = `${owner} · ${PACK_LABELS[packList].noun}`;
    $("#pack-add-form").hidden = true;
    $("#pack-add-title").value = "";
    $("#pack-import-form").hidden = true;
    $("#pack-import-text").value = "";
    updateImportCount();
    renderPackSheetList();
    $("#pack-sheet").hidden = false;
  }
  function closePackSheet() {
    $("#pack-sheet").hidden = true;
    openOwner = null;
  }
  function renderPackSheetList() {
    const list = $("#pack-sheet-list");
    list.innerHTML = "";
    const rows = packItemsFor(packList, openOwner);
    if (!rows.length) { list.appendChild(emptyMsg(`Nothing yet — tap ＋ to add, or 📋 paste a list ${PACK_LABELS[packList].icon}`)); return; }
    let lastCat = null;
    rows.forEach((r) => {
      const cat = r.category || "Other";
      if (cat !== lastCat) {
        const h = document.createElement("div");
        h.className = "day-heading"; h.textContent = cat;
        list.appendChild(h);
        lastCat = cat;
      }
      list.appendChild(packRow(r));
    });
  }

  function rebuildPackCatUI() {
    const sel = $("#pack-add-cat");
    if (!sel) return;
    const cur = sel.value && sel.value !== NEW_CAT_SENTINEL ? sel.value : "";
    fillCatSelect(sel, effectivePackCats(),
      (pendingPackCat && effectivePackCats().includes(pendingPackCat)) ? pendingPackCat : cur);
    if (pendingPackCat) pendingPackCat = null;
  }

  // A list row with an inline category changer.
  function packRow(r) {
    const el = document.createElement("div");
    el.className = "item" + (r.done ? " done" : "");
    const cat = r.category || "Other";
    // ensure the item's own category is selectable even if it was later removed from the list
    const values = effectivePackCats().slice();
    if (!values.some((c) => c.toLowerCase() === cat.toLowerCase())) values.unshift(cat);
    el.innerHTML = `
      <button class="item-check" aria-label="toggle">✓</button>
      <div class="item-body">
        <div class="item-title">${esc(r.title)}</div>
      </div>
      <button class="item-editbtn" aria-label="edit">✏️</button>
      <button class="item-del" aria-label="delete">🗑️</button>`;
    const body = el.querySelector(".item-body");
    const sel = document.createElement("select");
    sel.className = "item-cat"; sel.setAttribute("aria-label", "Category");
    fillCatSelect(sel, values, cat);
    body.appendChild(sel);
    el.querySelector(".item-check").addEventListener("click", () => Store.update("packing", r.id, { done: !r.done }));
    el.querySelector(".item-del").addEventListener("click", () => Store.remove("packing", r.id));
    el.querySelector(".item-editbtn").addEventListener("click", () =>
      beginInlineEdit(el.querySelector(".item-title"), r.title,
        (val) => Store.update("packing", r.id, { title: val }), renderPackSheetList));
    sel.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === NEW_CAT_SENTINEL) {
        const name = promptCategory(effectivePackCats());
        if (name) { Store.setSetting("packCats", [...customPackCats, name]); Store.update("packing", r.id, { category: name }); }
        else renderPackSheetList();
      } else {
        Store.update("packing", r.id, { category: val });
      }
    });
    return el;
  }

  // Build a plain-text version of the open list and copy it to the clipboard.
  function copyCurrentList() {
    if (openOwner === null) return;
    const rows = packItemsFor(packList, openOwner);
    if (!rows.length) { alert("This list is empty."); return; }
    const lines = [`${openOwner} · ${PACK_LABELS[packList].noun}`];
    let lastCat = null;
    rows.forEach((r) => {
      const cat = r.category || "Other";
      if (cat !== lastCat) { lines.push("", cat + ":"); lastCat = cat; }
      lines.push(`- ${r.done ? "[x] " : ""}${r.title}`);
    });
    const text = lines.join("\n");
    copyText(text).then((ok) => {
      const btn = $("#pack-copy-btn");
      const orig = btn.textContent;
      btn.textContent = ok ? "✓ Copied!" : "Copied below";
      setTimeout(() => { btn.textContent = orig; }, 1600);
      if (!ok) window.prompt("Copy your list:", text);
    });
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
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

  // -------------------------------------------------------------- HOME PHOTO STRIP
  function initHomePhotos() {
    $("#home-photos-more").addEventListener("click", () => {
      $('.tab[data-tab="photos"]').click();
    });
    Store.subscribe("photos", (rows) => {
      const strip = $("#home-photo-strip");
      strip.innerHTML = "";
      if (!rows.length) {
        strip.innerHTML = `<span class="home-photo-empty">Add your first photo in the 📸 tab</span>`;
        return;
      }
      rows.slice().reverse().slice(0, 10).forEach((r) => {
        const img = document.createElement("img");
        img.loading = "lazy"; img.src = r.url; img.alt = r.caption || "memory";
        img.addEventListener("click", () => $('.tab[data-tab="photos"]').click());
        strip.appendChild(img);
      });
    });
  }

  // -------------------------------------------------------------- INFO / weather
  const SEASONAL_NOTE = "Typical late Sep/early Oct in Barbados: 84–88°F, brief tropical showers that pass quickly. "
    + "This falls within Atlantic hurricane season, though Barbados sits at the southern edge and sees direct hits far less often than islands further north — still worth having travel insurance.";

  function renderTripForecastGrid(forecastDays) {
    const grid = $("#trip-forecast-grid");
    const byIso = {};
    (forecastDays || []).forEach((d) => { byIso[d.iso] = d; });
    grid.innerHTML = (TRIP.days || []).map((iso) => {
      const d = new Date(iso + "T12:00:00");
      const dow = d.toLocaleDateString(undefined, { weekday: "short" });
      const num = d.getDate();
      const match = byIso[iso];
      if (match) {
        return `<div class="trip-day"><div class="d">${dow}</div><div class="n">${num}</div>
          <div class="e">${match.emoji}</div><div class="t">${match.hi}°/${match.lo}°</div></div>`;
      }
      return `<div class="trip-day pending"><div class="d">${dow}</div><div class="n">${num}</div>
        <div class="e">🔮</div><div class="t">—</div></div>`;
    }).join("");
    const anyLive = (TRIP.days || []).some((iso) => byIso[iso]);
    $("#trip-forecast-note").textContent = anyLive
      ? SEASONAL_NOTE
      : "🔮 days = forecast isn't out yet (Open-Meteo predicts ~16 days ahead). This fills in on its own as the trip gets closer — no need to check back manually. " + SEASONAL_NOTE;
  }

  function initInfo() {
    if (CFG.weather) $("#info-loc").textContent = CFG.weather.locationName || "";
    renderTripForecastGrid([]); // draw the 6 dated placeholders immediately, independent of network
    if (!window.Weather) return;
    Weather.fetch().then((wx) => {
      $("#weather-card").innerHTML = `
        <div class="wx-now">
          <span class="wx-emoji">${wx.emoji}</span>
          <span class="wx-temp">${wx.temp}°</span>
        </div>
        <div class="wx-desc">Right now in St. Lawrence Gap · ${esc(wx.desc)} · 💨 ${wx.wind} mph · 💧 ${wx.humidity}%</div>`;
      renderTripForecastGrid(wx.forecast);
      if (wx.today) {
        const sr = new Date(wx.today.sunrise).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const ss = new Date(wx.today.sunset).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        $("#sun-card").innerHTML = `<h3>🌅 Sun today (Barbados)</h3>
          <p>Sunrise <b>${sr}</b> &nbsp;·&nbsp; Sunset <b>${ss}</b></p>`;
      }
    }).catch((err) => {
      console.warn("weather failed", err);
      $("#weather-card").innerHTML = `<p>Couldn't load live weather right now (offline?). ${SEASONAL_NOTE}</p>`;
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
    initCategories();
    initNotes();
    initPhotos();
    initHomePhotos();
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
