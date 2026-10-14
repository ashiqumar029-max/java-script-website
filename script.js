
const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";

const state = {
  city: "Rahim Yar Khan",
  latitude: 28.4199,
  longitude: 70.3035,
  temperatureUnit: "celsius",
  windUnit: "kmh",
  weather: null,
  forecast: null
};

const $ = (selector) => document.querySelector(selector);

const weatherCodes = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm", icon: "⛈️" }
};

function weatherInfo(code) {
  return weatherCodes[code] || {
    label: "Weather unavailable",
    icon: "🌤️"
  };
}

function displayTemperature(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const celsius = Number(value);

  const result = state.temperatureUnit === "fahrenheit"
    ? (celsius * 9 / 5) + 32
    : celsius;

  return Math.round(result);
}

function displayWind(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const result = state.windUnit === "mph"
    ? Number(value) / 1.60934
    : Number(value);

  return `${Math.round(result)} ${state.windUnit === "mph" ? "mph" : "km/h"}`;
}

function setStatus(message, type = "") {
  const element = $("#statusMessage");

  if (!element) return;

  element.textContent = message;
  element.className = `status-message ${type}`.trim();
}

function formatDate(dateString, options = { weekday: "short" }) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function comfortDescription(tempC) {
  if (tempC < 8) return "A little chilly outside";
  if (tempC < 18) return "Cool and comfortable";
  if (tempC < 27) return "Comfortable conditions";
  if (tempC < 34) return "Warm — stay hydrated";

  return "Hot — seek some shade";
}

function uvDescription(value) {
  if (value < 3) return "Low · Minimal protection";
  if (value < 6) return "Moderate · Use sun protection";
  if (value < 8) return "High · Protect your skin";
  if (value < 11) return "Very high · Extra protection";

  return "Extreme · Avoid direct sun";
}

function renderCurrentWeather(data) {
  const current = data.current;
  const daily = data.daily;
  const info = weatherInfo(current.weather_code);

  const temp = displayTemperature(current.temperature_2m);
  const feels = displayTemperature(current.apparent_temperature);
  const high = displayTemperature(daily.temperature_2m_max?.[0]);
  const low = displayTemperature(daily.temperature_2m_min?.[0]);

  const humidity = Math.round(current.relative_humidity_2m ?? 0);
  const wind = displayWind(current.wind_speed_10m);
  const uv = Number(daily.uv_index_max?.[0] ?? 0);

  $("#currentTemp").textContent = temp;
  $("#conditionText").textContent = info.label;

  $("#feelsLike").textContent = `${feels}°`;
  $("#highTemp").textContent = `${high}°`;
  $("#lowTemp").textContent = `${low}°`;

  $("#windSpeed").textContent = wind;
  $("#humidity").textContent = `${humidity}%`;
  $("#uvIndex").textContent = uv.toFixed(1);

  $("#detailFeels").textContent = `${feels}°`;
  $("#detailHumidity").textContent = `${humidity}%`;

  $("#detailWind").textContent =
    `${Math.round(state.windUnit === "mph"
      ? current.wind_speed_10m / 1.60934
      : current.wind_speed_10m)} ${state.windUnit}`;

  $("#detailUV").textContent = uv.toFixed(1);

  $("#feelsDescription").textContent =
    comfortDescription(Number(current.apparent_temperature));

  $("#windDescription").textContent =
    current.wind_speed_10m > 30
      ? "Breezy — take care outdoors"
      : "Air movement";

  $("#uvDescription").textContent = uvDescription(uv);

  const comfort = Math.max(
    8,
    Math.min(
      100,
      100 - Math.abs(22 - Number(current.apparent_temperature)) * 4
    )
  );

  $("#comfortMeter").style.width = `${comfort}%`;
  $("#humidityMeter").style.width = `${humidity}%`;

  $("#windMeter").style.width =
    `${Math.min(100, Number(current.wind_speed_10m) / 60 * 100)}%`;

  $("#uvMeter").style.width =
    `${Math.min(100, uv / 11 * 100)}%`;

  $("#updatedAt").textContent =
    `Updated ${new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date())}`;
}

function renderForecast(data) {
  const daily = data.daily;
  const list = $("#forecastList");

  if (!daily?.time?.length) {
    list.innerHTML =
      '<div class="loading-row">Forecast is currently unavailable.</div>';
    return;
  }

  list.innerHTML = daily.time.slice(0, 5).map((date, index) => {
    const info = weatherInfo(daily.weather_code[index]);

    const high = displayTemperature(daily.temperature_2m_max[index]);
    const low = displayTemperature(daily.temperature_2m_min[index]);

    const rain = Math.round(
      daily.precipitation_probability_max?.[index] ?? 0
    );

    const day = index === 0 ? "Today" : formatDate(date);

    return `
      <div class="forecast-day">
        <div>
          <div class="day-name">${day}</div>
          <span class="day-date">
            ${formatDate(date, { month: "short", day: "numeric" })}
            · ${info.label}
          </span>
        </div>

        <span class="forecast-icon" aria-label="${info.label}">
          ${info.icon}
        </span>

        <div class="rain-chance">Rain ${rain}%</div>

        <div class="forecast-range">
          <strong>${high}°</strong>
          <span class="low">${low}°</span>
        </div>
      </div>
    `;
  }).join("");
}

async function loadWeather() {
  setStatus("Getting the latest forecast…");
  $("#conditionText").textContent = "Loading weather…";

  const params = new URLSearchParams({
    latitude: String(state.latitude),
    longitude: String(state.longitude),

    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",

    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",

    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto",
    forecast_days: "5"
  });

  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Weather service returned an error.");
    }

    const data = await response.json();

    if (!data.current || !data.daily) {
      throw new Error("Weather data was incomplete.");
    }

    state.weather = data.current;
    state.forecast = data.daily;

    renderCurrentWeather(data);
    renderForecast(data);

    setStatus(`Weather loaded for ${state.city}.`, "success");
  } catch (error) {
    console.error(error);

    setStatus(
      "Could not load live weather. Check your internet connection and try again."
    );

    $("#conditionText").textContent = "Weather temporarily unavailable";

    $("#forecastList").innerHTML =
      '<div class="loading-row">Please try again in a moment.</div>';
  }
}

async function searchCity() {
  const input = $("#cityInput");
  const query = input.value.trim();

  if (!query) {
    setStatus("Enter a city name first.");
    input.focus();
    return;
  }

  setStatus(`Searching for ${query}…`);

  try {
    const params = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json"
    });

    const response = await fetch(`${GEO_BASE}?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Could not search for that city.");
    }

    const data = await response.json();
    const place = data.results?.[0];

    if (!place) {
      setStatus(`No city found for "${query}". Try another spelling.`);
      return;
    }

    state.city = [
      place.name,
      place.admin1,
      place.country
    ]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .join(", ");

    state.latitude = place.latitude;
    state.longitude = place.longitude;

    $("#cityName").textContent = state.city;

    await loadWeather();
  } catch (error) {
    console.error(error);

    setStatus(
      "City search failed. Check your connection and try again."
    );
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus(
      "Location is not supported by this browser. Search for a city instead."
    );
    return;
  }

  setStatus("Requesting your location…");

  navigator.geolocation.getCurrentPosition(
    async position => {
      state.latitude = position.coords.latitude;
      state.longitude = position.coords.longitude;

      state.city = "Your current location";
      $("#cityName").textContent = state.city;

      await loadWeather();
    },

    error => {
      const message = error.code === 1
        ? "Location permission was denied. You can search for a city instead."
        : "Could not get your location. Try searching for a city.";

      setStatus(message);
    },

    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

function toggleUnits() {
  state.temperatureUnit =
    state.temperatureUnit === "celsius" ? "fahrenheit" : "celsius";

  state.windUnit =
    state.temperatureUnit === "fahrenheit" ? "mph" : "kmh";

  $("#unitToggle").innerHTML =
    state.temperatureUnit === "celsius"
      ? "°C <span>/</span> °F"
      : "°F <span>/</span> °C";

  if (state.weather && state.forecast) {
    renderCurrentWeather({
      current: state.weather,
      daily: state.forecast
    });

    renderForecast({
      daily: state.forecast
    });
  }
}

// Search button
$("#searchButton").addEventListener("click", searchCity);

// Search by pressing Enter
$("#cityInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchCity();
  }
});

// Current location
$("#locationButton").addEventListener("click", useMyLocation);

// Celsius / Fahrenheit toggle
$("#unitToggle").addEventListener("click", toggleUnits);

// Footer year
$("#year").textContent = new Date().getFullYear();

// Load initial weather
loadWeather();
