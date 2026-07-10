// ============================================================================
//  TripApp configuration
//  ---------------------------------------------------------------------------
//  This is the ONLY file you normally need to edit.
//
//  1) FIREBASE (live sync between Nick's and Kelli's phones)
//     Paste the firebaseConfig object you copied from the Firebase console
//     into FIREBASE_CONFIG below. Until you do, the app still works perfectly
//     in "local-only" mode (data saved on each phone separately).
//
//  2) COUPLE_CODE  — a shared secret so only the two of you share the same data.
//     Pick anything hard to guess (both phones must use the SAME value).
//     You can also set/change it inside the app under Settings.
//
//  3) WEATHER — no key needed! We use Open-Meteo (free, no signup).
// ============================================================================

window.TRIPAPP_CONFIG = {

  // ---- Trip details -------------------------------------------------------
  trip: {
    title: "Sandals Barbados",
    person1: "Nick",
    person2: "Kelli",
    // Local time the trip begins. Sandals Barbados = America/Barbados (AST, UTC-4)
    startDate: "2026-09-26T15:00:00-04:00", // Sep 26 2026, ~3pm check-in
    endDate:   "2026-10-01T11:00:00-04:00", // Oct 1 2026, ~11am checkout
    // Days shown in the Trip Planner tab:
    days: [
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01"
    ]
  },

  // ---- Firebase (leave as null for local-only; paste your object to sync) --
  // Example once filled:
  // FIREBASE_CONFIG: {
  //   apiKey: "AIza....",
  //   authDomain: "tripapp-nick-kelli.firebaseapp.com",
  //   projectId: "tripapp-nick-kelli",
  //   storageBucket: "tripapp-nick-kelli.appspot.com",
  //   messagingSenderId: "1234567890",
  //   appId: "1:1234:web:abcd"
  // },
  FIREBASE_CONFIG: null,

  // ---- Shared secret so it's just the two of you --------------------------
  COUPLE_CODE: "nick-and-kelli-barbados",

  // ---- Weather (Open-Meteo, no key). Coordinates: Sandals Barbados area ----
  weather: {
    latitude: 13.073,
    longitude: -59.583,
    locationName: "Christ Church, Barbados",
    timezone: "America/Barbados"
  }
};
