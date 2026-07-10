# 🌴 Nick & Kelli — Barbados

A private countdown + trip-planning app for our Sandals Barbados trip
(**Sep 26 – Oct 1, 2026**). Installs to the iPhone home screen as a PWA, works
offline, and syncs between our phones.

## Features
- ⏳ Live countdown with milestone celebrations
- 🗺️ Trip Planner — excursions, dining & activities by day
- 🧳 Shared packing checklist
- 💌 Love notes feed
- 📸 Shared photo memories
- ☀️ Barbados info + live weather & sunset times
- ☁️ Optional live sync (Firebase) — works local-only until configured

## Quick start
1. **Run it:** it's a static site — open `index.html` via any web server, or
   host free on GitHub Pages. See **[SETUP.md](SETUP.md)**.
2. **Add to iPhone:** open the URL in Safari → Share → *Add to Home Screen*.
3. **Sync (optional):** follow the Firebase steps in **[SETUP.md](SETUP.md)**
   and paste your keys into `config.js`.

## Project layout
```
index.html            App shell + tabs
styles.css            Tropical theme
config.js             ← edit: trip dates, Firebase keys, couple code
store.js              Data layer (localStorage OR Firestore/Storage)
weather.js            Open-Meteo (no API key)
app.js                UI logic (countdown, planner, packing, notes, photos, info)
sw.js                 Service worker (offline)
manifest.webmanifest  PWA manifest
firestore.rules       Paste into Firebase > Firestore > Rules
storage.rules         Paste into Firebase > Storage > Rules
tools/make_icons.py   Generate icons (default, or from assets/icon-source.jpg)
assets/icons/         Generated icons
```

## Local preview
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
