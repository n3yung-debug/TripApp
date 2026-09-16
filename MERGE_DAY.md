# 🧳 Multi-Trip — Merge Day Checklist

Everything for going live with the multi-trip feature **after the Barbados trip**.
Live app stays frozen until you say "merge the multi-trip branch."

- **Live branch (what the phones load):** `claude/couples-trip-countdown-app-j2nlla`
- **Feature branch (parked, ready):** `claude/multi-trip`
- **Merge type:** clean fast-forward (no conflicts) — the two multi-trip commits
  sit directly on top of the current live head `8c2b012`.
- **Pre-merge live head (for rollback):** `8c2b012` (rain forecast)

---

## 1. Before merging (do first)

- [ ] **Barbados trip is over** and you're both home — no reason to risk confusion mid-trip.
- [ ] Both phones have the app **closed** (not just backgrounded).
- [ ] *(Optional but nice)* On one phone, note roughly what's in the app now —
      e.g. how many photos, a couple of note titles, packing items — so you can
      confirm nothing's missing after the merge.

## 2. The merge (Claude does this on your say-so)

- [ ] Fast-forward `claude/multi-trip` → the live branch and push.
      (Command for reference: `git checkout claude/couples-trip-countdown-app-j2nlla
      && git merge --ff-only claude/multi-trip && git push`.)
- [ ] Service worker cache is already bumped to **v13**, so phones will pull the
      new version on next open — no extra step.

## 3. First open after merge (the important part)

- [ ] **You open the app first**, alone, before telling Kelli.
- [ ] On first load the app **automatically migrates** your Barbados data into a
      trip called **"Sandals Barbados"** (trip #1). This runs once.
- [ ] Verify your data is all there:
  - [ ] **Plan** — itinerary items on the right days
  - [ ] **Pack** — packing + shopping lists (both people)
  - [ ] **Notes** — your love notes
  - [ ] **Photos** — trip photos
  - [ ] **Home** — countdown now shows the trip as finished ("What a trip…")
- [ ] Open **⚙️ You → ✈️ Trips** → confirm **"Sandals Barbados"** is listed and
      marked *viewing*.

## 4. Once you've confirmed it looks right

- [ ] Have **Kelli open the app** (she'll get the same migrated data via sync).
- [ ] *(Optional)* Try **"＋ Start a new trip"** for your next getaway — type the
      destination, it looks up the weather automatically, and you get a blank
      slate. Barbados stays put as a past trip to look back on.

## 5. If something looks wrong (rollback)

Your original Barbados data is **copied, not moved** — the untouched originals
still sit at the old location, so nothing is lost even if the migration misbehaves.

- [ ] Tell Claude: **"roll back the merge."** It resets the live branch to
      `8c2b012` (force-with-lease) and bumps the cache so phones return to exactly
      today's app.
- [ ] Reopen the app on both phones — you're back to the pre-merge version.
- [ ] Report what looked wrong so it can be fixed before trying again.

---

### Notes
- Only **local mode** was testable in the build environment (Firebase is network-
  blocked there). The **cloud** migration mirrors the same logic and is
  transaction-guarded so two phones can't double-migrate — but step 3's manual
  check is your real confirmation. Do it before relying on the app.
- Nothing here changes your Firebase billing (still the $1 alert, realistically $0).
