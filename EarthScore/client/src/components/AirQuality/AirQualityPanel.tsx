import { useEffect, useState } from "react";
import "./AirQualityPanel.css";

interface AirQualityProps {
  latitude: number;
  longitude: number;
}

interface AirQualityData {
  us_aqi?: number;
  pm2_5?: number;
  pm10?: number;
  carbon_monoxide?: number;
  nitrogen_dioxide?: number;
  sulphur_dioxide?: number;
  ozone?: number;
}

const AirQualityPanel: React.FC<AirQualityProps> = ({
  latitude,
  longitude,
}) => {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchAirQuality = async () => {
      setLoading(true);
      setError("");

      try {
        const url =
          `https://air-quality-api.open-meteo.com/v1/air-quality` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to fetch air quality data");
        }

        const result = await response.json();

        if (!result.current) {
          throw new Error("Air quality data unavailable");
        }

        setData(result.current);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAirQuality();

    return () => controller.abort();
  }, [latitude, longitude]);

  const getStatus = (aqi?: number) => {
    if (aqi === undefined) return "Unavailable";
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  const status = getStatus(data?.us_aqi);

  if (loading) return <div className="air-card">Loading air quality...</div>;

  if (error) {
    return <div className="air-card">Error: {error}</div>;
  }

  if (!data) return <div className="air-card">No data available</div>;

  const pollutants = [
    { label: "PM2.5", value: data.pm2_5, unit: "µg/m³" },
    { label: "PM10", value: data.pm10, unit: "µg/m³" },
    { label: "CO", value: data.carbon_monoxide, unit: "µg/m³" },
    { label: "NO₂", value: data.nitrogen_dioxide, unit: "µg/m³" },
    { label: "SO₂", value: data.sulphur_dioxide, unit: "µg/m³" },
    { label: "O₃", value: data.ozone, unit: "µg/m³" },
  ];

  return (
    <div className="air-card">
      <div className="air-header">
        <div>
          <h2>Air Quality & Pollution</h2>
          <p>Live atmospheric conditions</p>
        </div>
        <span className="air-indicator">● LIVE</span>
      </div>

      <div className="aqi-section">
        <div>
          <p className="aqi-label">US Air Quality Index</p>
          <h1>{data.us_aqi ?? "N/A"}</h1>
          <span className="aqi-status">{status}</span>
        </div>
      </div>

      <div className="pollutant-grid">
        {pollutants.map((item) => (
          <div className="pollutant-item" key={item.label}>
            <p>{item.label}</p>
            <h3>
              {item.value !== undefined
                ? item.value.toFixed(1)
                : "N/A"}
            </h3>
            <small>{item.unit}</small>
          </div>
        ))}
      </div>

      <p className="air-coordinates">
        Location: {latitude.toFixed(3)}, {longitude.toFixed(3)}
      </p>
    </div>
  );
};

export default AirQualityPanel;
