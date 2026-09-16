/* ============================================================================
   Store — one API, two backends.
   - If FIREBASE_CONFIG is set  -> live sync via Firestore + Storage.
   - Otherwise                  -> local-only via localStorage (per device).

   MULTI-TRIP MODEL
   ----------------
   Data is namespaced by an ACTIVE TRIP:
     cloud: couples/{code}/trips/{tripId}/{collection}
     local: tripapp:{code}:{tripId}:{coll}
   Each trip is one document (metadata + its `settings` map) with the item
   collections ("plans","packing","notes","photos") beneath it. A trips
   registry lives at couples/{code}/trips (cloud) / tripapp:{code}:__trips
   (local); the active trip id is on the couple doc (cloud) / __active (local).

   Legacy single-trip data (couples/{code}/{coll}) is migrated once into the
   first trip by Store.ensureTrips() — see migrateCloud / ensureTripsLocal.

   Public API (subscribe fns return an unsubscribe fn):
     Store.init()
     Store.mode                          // "cloud" | "local"
     Store.ensureTrips(seedTrip)         // -> {trips, activeId}  (run once at boot)
     Store.subscribe(coll, cb) / add / update / remove
     Store.subscribeSettings(cb) / setSetting(key,value)   // per active trip
     Store.subscribeTrips(cb)
     Store.addTrip(meta, id?) / updateTrip(id,patch) / removeTrip(id)
     Store.setActiveTrip(id) / subscribeActive(cb)
     Store.activeTripId
     Store.uploadImage(file)
     Store.setCoupleCode(code) / Store.coupleCode
   ============================================================================ */
(function () {
  const CFG = window.TRIPAPP_CONFIG || {};
  const LS_CODE_KEY = "tripapp_couple_code";
  const ITEM_COLLS = ["plans", "packing", "notes", "photos"];

  const Store = {
    mode: "local",
    coupleCode: localStorage.getItem(LS_CODE_KEY) || CFG.COUPLE_CODE || "our-trip",
    activeTripId: null,
    _db: null,
    _storage: null,
    _ready: null,
    lastError: null,
  };

  function reportError(area, err) {
    Store.lastError = { area, code: (err && err.code) || "", message: (err && err.message) || String(err) };
    console.warn(`[Store:${area}]`, err);
    window.dispatchEvent(new CustomEvent("store-error", { detail: Store.lastError }));
  }

  // ---------------------------------------------------------------- helpers
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function emitLocal(coll) {
    window.dispatchEvent(new CustomEvent("localstore-change", { detail: { coll } }));
  }

  // local keys (per active trip)
  function lsKey(coll) { return `tripapp:${Store.coupleCode}:${Store.activeTripId}:${coll}`; }
  function tripsLsKey() { return `tripapp:${Store.coupleCode}:__trips`; }
  function activeLsKey() { return `tripapp:${Store.coupleCode}:__active`; }
  function legacyLsKey(coll) { return `tripapp:${Store.coupleCode}:${coll}`; } // pre-multi-trip

  function readLocal(coll) {
    try { return JSON.parse(localStorage.getItem(lsKey(coll)) || "[]"); } catch { return []; }
  }
  function writeLocal(coll, arr) {
    localStorage.setItem(lsKey(coll), JSON.stringify(arr));
    emitLocal(coll);
  }
  function readLocalTrips() {
    try { return JSON.parse(localStorage.getItem(tripsLsKey()) || "[]"); } catch { return []; }
  }
  function writeLocalTrips(arr) {
    localStorage.setItem(tripsLsKey(), JSON.stringify(arr));
    emitLocal("__trips");
  }
  function readLocalSettings() {
    try { return JSON.parse(localStorage.getItem(lsKey("settings")) || "{}"); } catch { return {}; }
  }

  // cloud path helpers
  function coupleDoc() { return Store._db.collection("couples").doc(Store.coupleCode); }
  function tripsCol() { return coupleDoc().collection("trips"); }
  function tripDoc(id) { return tripsCol().doc(id); }
  function coll(name) { return tripDoc(Store.activeTripId).collection(name); }

  // ---------------------------------------------------------------- init
  Store.init = function () {
    if (Store._ready) return Store._ready;
    Store._ready = new Promise((resolve) => {
      const fbCfg = CFG.FIREBASE_CONFIG;
      if (fbCfg && fbCfg.apiKey && !window.firebase) {
        reportError("init", { message: "Firebase SDK didn't load (offline, or a network/adblock issue)." });
      }
      const hasFirebase = fbCfg && fbCfg.apiKey && window.firebase;
      if (!hasFirebase) { Store.mode = "local"; resolve("local"); return; }
      try {
        firebase.initializeApp(fbCfg);
        Store._db = firebase.firestore();
        Store._storage = firebase.storage();
        firebase.auth().onAuthStateChanged((user) => {
          if (user) { Store.mode = "cloud"; resolve("cloud"); }
        });
        firebase.auth().signInAnonymously().catch((err) => {
          reportError("auth", err); Store.mode = "local"; resolve("local");
        });
        setTimeout(() => {
          if (Store.mode !== "cloud") {
            if (!Store.lastError) reportError("auth", { message: "Timed out waiting for Firebase sign-in (slow/no connection?)." });
            resolve("local");
          }
        }, 6000);
      } catch (err) { reportError("init", err); Store.mode = "local"; resolve("local"); }
    });
    return Store._ready;
  };

  // ---------------------------------------------------------------- trips: ensure + migrate
  // seedTrip: metadata used to create the first trip (from config) when none exist.
  Store.ensureTrips = function (seedTrip) {
    return Store.mode === "cloud" ? ensureTripsCloud(seedTrip) : ensureTripsLocal(seedTrip);
  };

  function pickActive(trips, preferred) {
    if (preferred && trips.some((t) => t.id === preferred)) return preferred;
    return trips[0] && trips[0].id;
  }

  function ensureTripsLocal(seed) {
    let trips = readLocalTrips();
    if (!trips.length) {
      const legacy = ITEM_COLLS.concat("settings").some((c) => localStorage.getItem(legacyLsKey(c)) != null);
      const tid = uid();
      const meta = Object.assign({ id: tid, createdAt: Date.now() }, seed);
      if (legacy) {
        // copy legacy per-couple data into this trip's namespace (originals left intact)
        const savedActive = Store.activeTripId;
        Store.activeTripId = tid;
        ITEM_COLLS.concat("settings").forEach((c) => {
          const v = localStorage.getItem(legacyLsKey(c));
          if (v != null) localStorage.setItem(lsKey(c), v);
        });
        Store.activeTripId = savedActive;
      }
      trips = [meta];
      writeLocalTrips(trips);
      localStorage.setItem(activeLsKey(), tid);
    }
    let active = pickActive(trips, localStorage.getItem(activeLsKey()));
    localStorage.setItem(activeLsKey(), active);
    Store.activeTripId = active;
    return Promise.resolve({ trips, activeId: active });
  }

  function ensureTripsCloud(seed) {
    return tripsCol().get().then((snap) => {
      if (!snap.empty) {
        const trips = [];
        snap.forEach((d) => trips.push(Object.assign({ id: d.id }, d.data())));
        return coupleDoc().get().then((cd) => {
          const active = pickActive(trips, cd.exists && cd.data().activeTripId);
          Store.activeTripId = active;
          localStorage.setItem(activeLsKey(), active);
          return { trips, activeId: active };
        });
      }
      return migrateCloud(seed);
    });
  }

  function migrateCloud(seed) {
    const tid = uid();
    return Store._db.runTransaction((tx) => tx.get(coupleDoc()).then((cd) => {
      if (cd.exists && cd.data().migratedV2) return { claimed: false };
      const legacySettings = (cd.exists && cd.data().settings) || {};
      const meta = Object.assign({ createdAt: Date.now(), settings: legacySettings }, seed);
      tx.set(tripDoc(tid), meta);
      tx.set(coupleDoc(), { activeTripId: tid, migratedV2: true }, { merge: true });
      return { claimed: true, meta };
    })).then((res) => {
      if (!res.claimed) return ensureTripsCloud(seed); // another device already migrated
      return Promise.all(ITEM_COLLS.map((c) => coupleDoc().collection(c).get())).then((snaps) => {
        const batch = Store._db.batch();
        snaps.forEach((s, i) => s.forEach((d) => batch.set(tripDoc(tid).collection(ITEM_COLLS[i]).doc(d.id), d.data())));
        return batch.commit();
      }).then(() => {
        Store.activeTripId = tid;
        localStorage.setItem(activeLsKey(), tid);
        return { trips: [Object.assign({ id: tid }, res.meta)], activeId: tid };
      });
    }).catch((err) => {
      reportError("migrate", err);
      // last resort: seed a fresh trip so the app still works
      const meta = Object.assign({ createdAt: Date.now() }, seed);
      return tripDoc(tid).set(meta).then(() => coupleDoc().set({ activeTripId: tid }, { merge: true })).then(() => {
        Store.activeTripId = tid; localStorage.setItem(activeLsKey(), tid);
        return { trips: [Object.assign({ id: tid }, meta)], activeId: tid };
      });
    });
  }

  // ---------------------------------------------------------------- trips registry API
  Store.subscribeTrips = function (cb) {
    if (Store.mode === "cloud") {
      return tripsCol().orderBy("createdAt", "asc").onSnapshot(
        (snap) => { const rows = []; snap.forEach((d) => rows.push(Object.assign({ id: d.id }, d.data()))); cb(rows); },
        (err) => { reportError("trips", err); cb(readLocalTrips()); }
      );
    }
    const handler = (e) => { if (!e || !e.detail || e.detail.coll === "__trips") cb(readLocalTrips()); };
    window.addEventListener("localstore-change", handler);
    cb(readLocalTrips());
    return () => window.removeEventListener("localstore-change", handler);
  };
  Store.addTrip = function (meta, id) {
    const doc = Object.assign({ createdAt: Date.now() }, meta);
    if (Store.mode === "cloud") {
      const ref = id ? tripDoc(id) : tripsCol().doc();
      return ref.set(doc).then(() => ref.id).catch((err) => { reportError("addTrip", err); throw err; });
    }
    doc.id = id || uid();
    const arr = readLocalTrips();
    const ix = arr.findIndex((t) => t.id === doc.id);
    if (ix >= 0) arr[ix] = Object.assign(arr[ix], doc); else arr.push(doc);
    writeLocalTrips(arr);
    return Promise.resolve(doc.id);
  };
  Store.updateTrip = function (id, patch) {
    if (Store.mode === "cloud") {
      return tripDoc(id).set(patch, { merge: true }).catch((err) => { reportError("updateTrip", err); throw err; });
    }
    writeLocalTrips(readLocalTrips().map((t) => (t.id === id ? Object.assign(t, patch) : t)));
    return Promise.resolve();
  };
  Store.removeTrip = function (id) {
    if (Store.mode === "cloud") {
      // note: item subcollections are left orphaned (client-side recursive delete is unsafe); metadata removal hides the trip
      return tripDoc(id).delete().catch((err) => { reportError("removeTrip", err); throw err; });
    }
    writeLocalTrips(readLocalTrips().filter((t) => t.id !== id));
    ITEM_COLLS.concat("settings").forEach((c) => localStorage.removeItem(`tripapp:${Store.coupleCode}:${id}:${c}`));
    return Promise.resolve();
  };
  Store.setActiveTrip = function (id) {
    Store.activeTripId = id;
    localStorage.setItem(activeLsKey(), id);
    emitLocal("__active");
    if (Store.mode === "cloud") coupleDoc().set({ activeTripId: id }, { merge: true }).catch((err) => reportError("active", err));
    return Promise.resolve();
  };
  Store.subscribeActive = function (cb) {
    if (Store.mode === "cloud") {
      return coupleDoc().onSnapshot(
        (d) => cb((d.exists && d.data().activeTripId) || Store.activeTripId),
        (err) => { reportError("active", err); cb(localStorage.getItem(activeLsKey())); }
      );
    }
    const handler = (e) => { if (!e || !e.detail || e.detail.coll === "__active") cb(localStorage.getItem(activeLsKey())); };
    window.addEventListener("localstore-change", handler);
    cb(localStorage.getItem(activeLsKey()));
    return () => window.removeEventListener("localstore-change", handler);
  };

  // ---------------------------------------------------------------- items: subscribe/add/update/remove
  Store.subscribe = function (name, cb) {
    if (Store.mode === "cloud") {
      return coll(name).orderBy("createdAt", "asc").onSnapshot(
        (snap) => { const rows = []; snap.forEach((d) => rows.push(Object.assign({ id: d.id }, d.data()))); cb(rows); },
        (err) => { reportError("subscribe:" + name, err); cb(readLocal(name)); }
      );
    }
    const handler = (e) => { if (!e || !e.detail || e.detail.coll === name) cb(readLocal(name)); };
    window.addEventListener("localstore-change", handler);
    cb(readLocal(name));
    return () => window.removeEventListener("localstore-change", handler);
  };
  Store.add = function (name, obj) {
    const doc = Object.assign({ createdAt: Date.now() }, obj);
    if (Store.mode === "cloud") {
      return coll(name).add(doc).then((ref) => ref.id).catch((err) => { reportError("add:" + name, err); throw err; });
    }
    doc.id = uid();
    const arr = readLocal(name); arr.push(doc); writeLocal(name, arr);
    return Promise.resolve(doc.id);
  };
  Store.update = function (name, id, patch) {
    if (Store.mode === "cloud") {
      return coll(name).doc(id).update(patch).catch((err) => { reportError("update:" + name, err); throw err; });
    }
    writeLocal(name, readLocal(name).map((r) => (r.id === id ? Object.assign(r, patch) : r)));
    return Promise.resolve();
  };
  Store.remove = function (name, id) {
    if (Store.mode === "cloud") {
      return coll(name).doc(id).delete().catch((err) => { reportError("remove:" + name, err); throw err; });
    }
    writeLocal(name, readLocal(name).filter((r) => r.id !== id));
    return Promise.resolve();
  };

  // ---------------------------------------------------------------- settings (per active trip)
  Store.subscribeSettings = function (cb) {
    if (Store.mode === "cloud") {
      return tripDoc(Store.activeTripId).onSnapshot(
        (d) => cb((d.exists && d.data().settings) || {}),
        (err) => { reportError("settings", err); cb(readLocalSettings()); }
      );
    }
    const handler = (e) => { if (!e || !e.detail || e.detail.coll === "settings") cb(readLocalSettings()); };
    window.addEventListener("localstore-change", handler);
    cb(readLocalSettings());
    return () => window.removeEventListener("localstore-change", handler);
  };
  Store.setSetting = function (key, value) {
    if (Store.mode === "cloud") {
      return tripDoc(Store.activeTripId).set({ settings: { [key]: value } }, { merge: true })
        .catch((err) => { reportError("settings-write", err); throw err; });
    }
    const s = readLocalSettings(); s[key] = value;
    localStorage.setItem(lsKey("settings"), JSON.stringify(s));
    emitLocal("settings");
    return Promise.resolve();
  };

  // ---------------------------------------------------------------- images
  Store.uploadImage = function (file) {
    return shrink(file, 1400).then((blobOrDataUrl) => {
      if (Store.mode === "cloud") {
        const path = `couples/${Store.coupleCode}/trips/${Store.activeTripId}/img/${uid()}.jpg`;
        const ref = Store._storage.ref().child(path);
        return ref.put(blobOrDataUrl.blob).then(() => ref.getDownloadURL()).then((url) => ({ url }))
          .catch((err) => { reportError("upload", err); throw err; });
      }
      return { url: blobOrDataUrl.dataUrl };
    });
  };

  function shrink(file, maxDim) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        canvas.toBlob((blob) => resolve({ dataUrl, blob }), "image/jpeg", 0.82);
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------- couple code
  Store.setCoupleCode = function (code) {
    code = (code || "").trim();
    if (!code) return;
    Store.coupleCode = code;
    localStorage.setItem(LS_CODE_KEY, code);
  };

  window.Store = Store;
})();
