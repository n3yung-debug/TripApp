/* ============================================================================
   Weather — Open-Meteo (free, no API key, CORS-enabled).
   Also computes local sunrise/sunset for the trip location.
   ============================================================================ */
(function () {
  const W = window.TRIPAPP_CONFIG && window.TRIPAPP_CONFIG.weather;

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

  const Weather = {};

  Weather.fetch = function () {
    if (!W) return Promise.reject(new Error("No weather config"));
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${W.latitude}&longitude=${W.longitude}`
      + `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph`
      + `&timezone=${encodeURIComponent(W.timezone || "auto")}&forecast_days=5`;
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error("weather http " + r.status);
      return r.json();
    }).then((data) => shape(data));
  };

  function shape(d) {
    const cur = d.current || {};
    const [emoji, desc] = decode(cur.weather_code);
    const daily = d.daily || {};
    const days = (daily.time || []).map((iso, i) => {
      const [e] = decode(daily.weather_code[i]);
      const dt = new Date(iso + "T12:00:00");
      return {
        label: dt.toLocaleDateString(undefined, { weekday: "short" }),
        emoji: e,
        hi: Math.round(daily.temperature_2m_max[i]),
        lo: Math.round(daily.temperature_2m_min[i]),
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
      };
    });
    return {
      temp: Math.round(cur.temperature_2m),
      emoji, desc,
      humidity: cur.relative_humidity_2m,
      wind: Math.round(cur.wind_speed_10m),
      forecast: days,
      today: days[0],
    };
  }

  window.Weather = Weather;
})();
