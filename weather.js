/* ============================================================================
   Weather — Open-Meteo (free, no API key, CORS-enabled).
   Also computes local sunrise/sunset for the trip location.
   ============================================================================ */
(function () {
  function cfgWeather() { return (window.TRIPAPP_CONFIG && window.TRIPAPP_CONFIG.weather) || null; }

  // WMO weather codes -> emoji + text
  const CODES = {
    0:["☀️","Clear sky"],1:["🌤️","Mainly clear"],2:["⛅","Partly cloudy"],3:["☁️","Overcast"],
    45:["🌫️","Fog"],48:["🌫️","Rime fog"],
    51:["🌦️","Light drizzle"],53:["🌦️","Drizzle"],55:["🌧️","Heavy drizzle"],
    61:["🌦️","Light rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],
    66:["🌧️","Freezing rain"],67:["🌧️","Freezing rain"],
    71:["🌨️","Light snow"],73:["🌨️","Snow"],75:["❄️","Heavy snow"],
    80:["🌦️","Light showers"],81:["🌧️","Showers"],82:["⛈️","Violent showers"],
    95:["⛈️","Thunderstorm"],96:["⛈️","Storm + hail"],99:["⛈️","Storm + hail"],
  };
  function decode(code){ return CODES[code] || ["🌡️","—"]; }

  // ---- rain-time helpers ----
  const RAIN_THRESHOLD = 40; // % chance at/above which we flag an hour as "rain expected"
  function fmtHour(h){
    h = ((h % 24) + 24) % 24;
    const ap = h < 12 ? "am" : "pm";
    let hr = h % 12; if (hr === 0) hr = 12;
    return hr + ap;
  }
  // group contiguous hours (>= threshold) into windows {start, end, peak}
  function computeWindows(hours){
    const out = []; let cur = null;
    hours.forEach((h) => {
      if (h.prob >= RAIN_THRESHOLD) {
        if (!cur) cur = { start: h.hour, end: h.hour, peak: h.prob };
        else { cur.end = h.hour; cur.peak = Math.max(cur.peak, h.prob); }
      } else if (cur) { out.push(cur); cur = null; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function windowsToText(windows){
    if (!windows || !windows.length) return "";
    return windows.slice(0, 3).map((w) => `${fmtHour(w.start)}–${fmtHour(w.end + 1)}`).join(", ");
  }

  const Weather = {};

  Weather.fetch = function () {
    const W = cfgWeather();
    if (!W) return Promise.reject(new Error("No weather config"));
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${W.latitude}&longitude=${W.longitude}`
      + `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation_probability`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max`
      + `&hourly=precipitation_probability`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph`
      // forecast_days=16 is Open-Meteo's max free-tier horizon; the trip is far
      // beyond that until ~2 weeks out, at which point matching days populate
      // automatically (see app.js renderTripForecast).
      + `&timezone=${encodeURIComponent(W.timezone || "auto")}&forecast_days=16`;
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error("weather http " + r.status);
      return r.json();
    }).then((data) => shape(data));
  };

  function shape(d) {
    const cur = d.current || {};
    const [emoji, desc] = decode(cur.weather_code);
    const daily = d.daily || {};

    // Bucket hourly rain-chance by calendar date so we can find rain windows.
    const hourly = d.hourly || {};
    const hTime = hourly.time || [];
    const hProb = hourly.precipitation_probability || [];
    const byDate = {};
    hTime.forEach((t, i) => {
      const date = t.slice(0, 10);
      (byDate[date] = byDate[date] || []).push({ hour: parseInt(t.slice(11, 13), 10), prob: hProb[i] == null ? 0 : hProb[i] });
    });

    const days = (daily.time || []).map((iso, i) => {
      const [e] = decode(daily.weather_code[i]);
      const dt = new Date(iso + "T12:00:00");
      const windows = computeWindows(byDate[iso] || []);
      const rainChance = (daily.precipitation_probability_max && daily.precipitation_probability_max[i] != null)
        ? daily.precipitation_probability_max[i] : null;
      return {
        iso,
        label: dt.toLocaleDateString(undefined, { weekday: "short" }),
        emoji: e,
        hi: Math.round(daily.temperature_2m_max[i]),
        lo: Math.round(daily.temperature_2m_min[i]),
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
        rainChance,
        rainWindows: windows,
        rainTimes: windowsToText(windows),
      };
    });
    return {
      temp: Math.round(cur.temperature_2m),
      emoji, desc,
      humidity: cur.relative_humidity_2m,
      wind: Math.round(cur.wind_speed_10m),
      rainChance: cur.precipitation_probability == null ? null : cur.precipitation_probability,
      forecast: days,
      today: days[0],
    };
  }

  // Look up coordinates + timezone for a place name (Open-Meteo geocoding, free, no key).
  // Resolves to { latitude, longitude, locationName, timezone } or rejects if not found.
  Weather.geocode = function (name) {
    const q = (name || "").trim();
    if (!q) return Promise.reject(new Error("Enter a place name"));
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error("geocode http " + r.status);
      return r.json();
    }).then((data) => {
      const hit = data && data.results && data.results[0];
      if (!hit) throw new Error(`Couldn't find "${q}"`);
      const parts = [hit.name, hit.admin1, hit.country].filter(Boolean);
      return {
        latitude: hit.latitude,
        longitude: hit.longitude,
        locationName: parts.join(", "),
        timezone: hit.timezone || "auto",
      };
    });
  };

  window.Weather = Weather;
})();
