/* ============================================================================
   Store — one API, two backends.
   - If FIREBASE_CONFIG is set  -> live sync via Firestore + Storage.
   - Otherwise                  -> local-only via localStorage (per device).

   Collections: "plans", "packing", "notes", "photos"
   Settings key/value doc:      "settings"

   Public API (all return unsubscribe fn for subscribe):
     Store.init()
     Store.mode                      // "cloud" | "local"
     Store.subscribe(coll, cb)       // cb(arrayOfDocs) on every change
     Store.add(coll, obj)            // -> id
     Store.update(coll, id, patch)
     Store.remove(coll, id)
     Store.subscribeSettings(cb)
     Store.setSetting(key, value)
     Store.uploadImage(file)         // -> {url}  (dataURL in local mode)
     Store.setCoupleCode(code)
     Store.coupleCode
   ============================================================================ */
(function () {
  const CFG = window.TRIPAPP_CONFIG || {};
  const LS_CODE_KEY = "tripapp_couple_code";

  const Store = {
    mode: "local",
    coupleCode: localStorage.getItem(LS_CODE_KEY) || CFG.COUPLE_CODE || "our-trip",
    _db: null,
    _storage: null,
    _ready: null,
    lastError: null, // { area, code, message } — most recent sync problem, for on-screen diagnostics
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
  function lsKey(coll) {
    return `tripapp:${Store.coupleCode}:${coll}`;
  }
  function emitLocal(coll) {
    window.dispatchEvent(new CustomEvent("localstore-change", { detail: { coll } }));
  }
  function readLocal(coll) {
    try { return JSON.parse(localStorage.getItem(lsKey(coll)) || "[]"); }
    catch { return []; }
  }
  function writeLocal(coll, arr) {
    localStorage.setItem(lsKey(coll), JSON.stringify(arr));
    emitLocal(coll);
  }

  // ---------------------------------------------------------------- init
  Store.init = function () {
    if (Store._ready) return Store._ready;
    Store._ready = new Promise((resolve) => {
      const fbCfg = CFG.FIREBASE_CONFIG;
      if (fbCfg && fbCfg.apiKey && !window.firebase) {
        reportError("init", { message: "Firebase SDK didn't load (offline, or a network/adblock issue)." });
      }
      const hasFirebase = fbCfg && fbCfg.apiKey && window.firebase;
      if (!hasFirebase) {
        Store.mode = "local";
        resolve("local");
        return;
      }
      try {
        firebase.initializeApp(fbCfg);
        Store._db = firebase.firestore();
        Store._storage = firebase.storage();
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            Store.mode = "cloud";
            resolve("cloud");
          }
        });
        firebase.auth().signInAnonymously().catch((err) => {
          reportError("auth", err);
          Store.mode = "local";
          resolve("local");
        });
        // Safety: if auth never resolves, fall back after 6s.
        setTimeout(() => {
          if (Store.mode !== "cloud") {
            if (!Store.lastError) reportError("auth", { message: "Timed out waiting for Firebase sign-in (slow/no connection?)." });
            resolve("local");
          }
        }, 6000);
      } catch (err) {
        reportError("init", err);
        Store.mode = "local";
        resolve("local");
      }
    });
    return Store._ready;
  };

  // ---------------------------------------------------------------- paths
  function coll(name) {
    // couples/{code}/{name}
    return Store._db.collection("couples").doc(Store.coupleCode).collection(name);
  }

  // ---------------------------------------------------------------- subscribe
  Store.subscribe = function (name, cb) {
    if (Store.mode === "cloud") {
      return coll(name).orderBy("createdAt", "asc").onSnapshot(
        (snap) => {
          const rows = [];
          snap.forEach((d) => rows.push(Object.assign({ id: d.id }, d.data())));
          cb(rows);
        },
        (err) => { reportError("subscribe:" + name, err); cb(readLocal(name)); }
      );
    }
    // local
    const handler = (e) => { if (!e || !e.detail || e.detail.coll === name) cb(readLocal(name)); };
    window.addEventListener("localstore-change", handler);
    cb(readLocal(name));
    return () => window.removeEventListener("localstore-change", handler);
  };

  // ---------------------------------------------------------------- add
  Store.add = function (name, obj) {
    const doc = Object.assign({ createdAt: Date.now() }, obj);
    if (Store.mode === "cloud") {
      return coll(name).add(doc).then((ref) => ref.id)
        .catch((err) => { reportError("add:" + name, err); throw err; });
    }
    doc.id = uid();
    const arr = readLocal(name);
    arr.push(doc);
    writeLocal(name, arr);
    return Promise.resolve(doc.id);
  };

  // ---------------------------------------------------------------- update
  Store.update = function (name, id, patch) {
    if (Store.mode === "cloud") {
      return coll(name).doc(id).update(patch)
        .catch((err) => { reportError("update:" + name, err); throw err; });
    }
    const arr = readLocal(name).map((r) => (r.id === id ? Object.assign(r, patch) : r));
    writeLocal(name, arr);
    return Promise.resolve();
  };

  // ---------------------------------------------------------------- remove
  Store.remove = function (name, id) {
    if (Store.mode === "cloud") {
      return coll(name).doc(id).delete()
        .catch((err) => { reportError("remove:" + name, err); throw err; });
    }
    writeLocal(name, readLocal(name).filter((r) => r.id !== id));
    return Promise.resolve();
  };

  // ---------------------------------------------------------------- settings
  Store.subscribeSettings = function (cb) {
    if (Store.mode === "cloud") {
      return Store._db.collection("couples").doc(Store.coupleCode)
        .onSnapshot((d) => cb((d.exists && d.data().settings) || {}),
                    (err) => { reportError("settings", err); cb(readLocalSettings()); });
    }
    const handler = (e) => { if (!e || !e.detail || e.detail.coll === "settings") cb(readLocalSettings()); };
    window.addEventListener("localstore-change", handler);
    cb(readLocalSettings());
    return () => window.removeEventListener("localstore-change", handler);
  };
  function readLocalSettings() {
    try { return JSON.parse(localStorage.getItem(lsKey("settings")) || "{}"); }
    catch { return {}; }
  }
  Store.setSetting = function (key, value) {
    if (Store.mode === "cloud") {
      return Store._db.collection("couples").doc(Store.coupleCode)
        .set({ settings: { [key]: value } }, { merge: true })
        .catch((err) => { reportError("settings-write", err); throw err; });
    }
    const s = readLocalSettings();
    s[key] = value;
    localStorage.setItem(lsKey("settings"), JSON.stringify(s));
    emitLocal("settings");
    return Promise.resolve();
  };

  // ---------------------------------------------------------------- images
  // Downscales client-side so both local & cloud stay small.
  Store.uploadImage = function (file) {
    return shrink(file, 1400).then((blobOrDataUrl) => {
      if (Store.mode === "cloud") {
        const path = `couples/${Store.coupleCode}/img/${uid()}.jpg`;
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
        width = Math.round(width * scale);
        height = Math.round(height * scale);
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
