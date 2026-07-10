# 🌴 Nick & Kelli — Barbados App · Setup Guide

Everything here is **free**. Two things to do:
1. Put the app online (GitHub Pages) so you can add it to your iPhones.
2. Turn on live sync (Firebase) so you both share the same data.

Live weather needs **no key** — it just works.

---

## 1. Put the app online with GitHub Pages (free)

1. Push this repo to GitHub (already done for you on branch
   `claude/couples-trip-countdown-app-j2nlla`).
2. On GitHub, open the repo → **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick the branch (`main` after you merge, or the feature branch) and folder **`/ (root)`** → **Save**.
5. Wait ~1 minute. GitHub shows a URL like
   `https://n3yung-debug.github.io/tripapp/`.
6. Open that URL in **Safari** on each iPhone → tap **Share** → **Add to Home Screen**. 🎉

> The app works fully **without** the steps below (local-only mode). Do the
> Firebase step whenever you want your edits to sync between phones.

---

## 2. 🔥 Firebase — live sync between your phones (~5–8 min, free)

### 2.1 Create the project
1. Go to <https://console.firebase.google.com> and sign in with any Google account.
2. **Add project** → name it `tripapp-nick-kelli` → Continue.
3. Turn Google Analytics **off** → **Create project** → Continue.

### 2.2 Firestore (the synced database)
1. **Build → Firestore Database → Create database**.
2. Location: `nam5 (United States)` → Next.
3. Choose **Start in production mode** → **Create**.
4. Open the **Rules** tab, replace everything with the contents of
   [`firestore.rules`](firestore.rules) in this repo → **Publish**.

### 2.3 Authentication (so only signed-in phones sync)
1. **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Anonymous** → Enable → **Save**.

### 2.4 Storage (for your synced photos)
1. **Build → Storage → Get started** → accept default → same location → Done.
2. Open the **Rules** tab, paste the contents of
   [`storage.rules`](storage.rules) → **Publish**.

### 2.5 Get your config keys
1. **⚙️ gear → Project settings**.
2. Scroll to **Your apps** → click the web icon **`</>`**.
3. Nickname `TripApp` → **Register app** (skip Hosting).
4. Copy the whole `firebaseConfig = { ... }` object.
5. Open **`config.js`** in this repo and paste it into `FIREBASE_CONFIG`, e.g.:
   ```js
   FIREBASE_CONFIG: {
     apiKey: "AIza........",
     authDomain: "tripapp-nick-kelli.firebaseapp.com",
     projectId: "tripapp-nick-kelli",
     storageBucket: "tripapp-nick-kelli.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234:web:abcd"
   },
   ```
6. Commit/push. Both phones now sync. ☁️

> **Privacy:** these keys are meant to live in client code — they're safe to
> commit. Access is gated by (a) anonymous sign-in and (b) a shared
> **couple code**. Keep the couple code in `config.js` (or set it in the app
> under **You → Settings**) the same on both phones. It's good privacy for a
> personal app, not bank-grade — don't store secrets in it.

### 2.6 If something doesn't sync

Open **You → Settings** in the app. It now shows a live diagnostic:
- **"☁️ Live sync ON"** = connected.
- **"📱 Local mode..."** + a **⚠️ red line underneath** = tells you exactly
  what's missing (e.g. "Firestore rules aren't published yet" or "Anonymous
  sign-in isn't enabled") and which step above to redo. Each of steps
  2.2–2.4 has its own **Rules** tab that must be *published*, not just
  viewed — that's the most common thing to miss.

---

## 3. ☀️ Weather — nothing to do

Live weather + 5-day forecast + Barbados sunrise/sunset uses **Open-Meteo**,
which is free and needs **no API key**. Coordinates are set to the Sandals
Barbados area in `config.js`.

<details>
<summary>Optional: use OpenWeatherMap instead</summary>

You don't need this, but if you ever want it:
1. Sign up at <https://openweathermap.org/api> → get a free API key.
2. Tell me and I'll swap the weather source and add the key to `config.js`.
</details>

---

## 4. 🐱 Use the cats as the app icon

Right now the app ships with a cute default **two-cats** icon. To use your real
photo:
1. Add your cat photo to this repo at **`assets/icon-source.jpg`**
   (drag-and-drop works in GitHub's web UI → **Add file → Upload files**).
2. Re-run the generator (or ask me to):
   ```bash
   python3 tools/make_icons.py assets/icon-source.jpg
   ```
3. Commit/push. Re-add the app to your home screen to see the new icon.

The couple photo doesn't need any of this — just set it inside the app under
**You → Settings → Home background**, and it syncs to both phones.

---

## What's in the app
- ⏳ **Countdown** to Sep 26 2026 with milestone celebrations 🎉
- 🗺️ **Trip Planner** — excursions, dining & activities tagged to each day
- 🧳 **Packing list** — shared, with one-tap resort essentials
- 💌 **Love notes** — a shared feed
- 📸 **Memories** — shared photo gallery
- ☀️ **Barbados** — live weather, sunset times, tips
- ⚙️ **You** — couple code, background photo, install help
