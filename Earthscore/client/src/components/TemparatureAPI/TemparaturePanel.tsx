
import { useEffect, useState } from "react";
import {
  fetchCurrentWeather,
  type CurrentWeather,
} from "../../services/currentWeatherAPI";
import "./TemparaturePanel.css";

interface Props {
  latitude: number;
  longitude: number;
}

function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather conditions unavailable";
}

export default function TemperaturePanel({
  latitude,
  longitude,
}: Props) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadWeather() {
      try {
        setLoading(true);
        setError("");

        const result = await fetchCurrentWeather(
          latitude,
          longitude,
          controller.signal
        );

        if (active) setWeather(result);
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to fetch current weather."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWeather();

    // Refresh current weather every 10 minutes.
    const interval = window.setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
      controller.abort();
    };
  }, [latitude, longitude]);

  if (loading) {
    return <p>Loading current weather...</p>;
  }

  if (error) {
    return <p className="temperature-error">{error}</p>;
  }

  if (!weather) return <p>No current weather data available.</p>;

  return (
    <div className="temperature-panel">
      <div className="temperature-heading">
        <div>
          <h3>Current Weather Conditions</h3>
          <p>Current model estimate at this point (Open-Meteo, not NASA). The sound uses NASA POWER monthly history instead.</p>
        </div>

        <span>{weather.isDay ? "☀️ Day" : "🌙 Night"}</span>
      </div>

      <div className="temperature-main">
        <span className="temperature-icon">
          {weather.isDay ? "🌤️" : "🌙"}
        </span>

        <div>
          <h1>{weather.temperature.toFixed(1)}°C</h1>
          <p>{getWeatherDescription(weather.weatherCode)}</p>
        </div>
      </div>

      <div className="weather-grid">
        <div className="weather-card">
          <span>🌡️ Feels Like</span>
          <strong>{weather.feelsLike.toFixed(1)}°C</strong>
        </div>

        <div className="weather-card">
          <span>💧 Humidity</span>
          <strong>{weather.humidity}%</strong>
        </div>

        <div className="weather-card">
          <span>💨 Wind Speed</span>
          <strong>{weather.windSpeed} km/h</strong>
        </div>

        <div className="weather-card">
          <span>🌧️ Precipitation</span>
          <strong>{weather.precipitation} mm</strong>
        </div>

        <div className="weather-card">
          <span>☁️ Cloud Cover</span>
          <strong>{weather.cloudCover}%</strong>
        </div>

        <div className="weather-card">
          <span>📊 Pressure</span>
          <strong>{weather.pressure} hPa</strong>
        </div>

        <div className="weather-card">
          <span>🧭 Wind Direction</span>
          <strong>{weather.windDirection}°</strong>
        </div>
      </div>

      <p className="weather-updated">
        Weather data time: {weather.time.replace("T", " ")}
      </p>

      <p className="weather-source">
        Source: Open-Meteo Weather Forecast API.
        Current conditions are model-based estimates, not necessarily
        measurements from a weather station at the exact coordinates.
      </p>
    </div>
  );
}
