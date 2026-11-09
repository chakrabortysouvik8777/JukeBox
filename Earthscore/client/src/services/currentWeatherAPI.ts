
const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export interface CurrentWeather {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  cloudCover: number;
  weatherCode: number;
  isDay: boolean;
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "pressure_msl",
      "cloud_cover",
    ].join(","),
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto",
  });

  const response = await fetch(`${BASE_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const result = await response.json();
  const current = result.current;

  if (!current || current.temperature_2m == null) {
    throw new Error("Current weather data is unavailable.");
  }

  return {
    time: current.time,
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windDirection: current.wind_direction_10m,
    precipitation: current.precipitation,
    pressure: current.pressure_msl,
    cloudCover: current.cloud_cover,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
  };
}
