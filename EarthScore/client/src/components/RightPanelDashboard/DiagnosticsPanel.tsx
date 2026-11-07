
import { useEffect, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import type { Location } from "../../types/location";

import {
  fetchTemperature,
} from "../../services/nasaAPI";

import type {
  TemperatureData,
} from "../../services/nasaAPI";

import TemperatureChart from "../TemparatureAPI/TemparatureChart";

import "./DiagnosticsPanel.css";

interface DiagnosticPanelProps {
  selectedLocation: Location;
}

// Sample data for UI development only
const environmentalData = [
  { year: "2016", temperature: 0.4, pm25: 42, co2: 390 },
  { year: "2017", temperature: 0.5, pm25: 45, co2: 393 },
  { year: "2018", temperature: 0.6, pm25: 43, co2: 397 },
  { year: "2019", temperature: 0.7, pm25: 49, co2: 401 },
  { year: "2020", temperature: 0.8, pm25: 46, co2: 405 },
  { year: "2021", temperature: 1.0, pm25: 51, co2: 410 },
  { year: "2022", temperature: 1.1, pm25: 55, co2: 414 },
  { year: "2023", temperature: 1.2, pm25: 58, co2: 418 },
  { year: "2024", temperature: 1.3, pm25: 60, co2: 421 },
  { year: "2025", temperature: 1.5, pm25: 63, co2: 425 },
];

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  change: string;
  icon: string;
  color: string;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  change,
  icon,
  color,
}: MetricCardProps) => {
  return (
    <div className="metric-card">
      <div className="metric-heading">
        <span className="metric-title" style={{ color }}>
          <span>{icon}</span>
          {title}
        </span>

        <span className="metric-change">{change}</span>
      </div>

      <h2>{value}</h2>

      <p>{subtitle}</p>
    </div>
  );
};

const DiagnosticPanel = ({
  selectedLocation,
}: DiagnosticPanelProps) => {

  // NASA Temperature API states
  const [temperatureData, setTemperatureData] =
    useState<TemperatureData[]>([]);

  const [loading, setLoading] = useState(false);

  const [apiError, setApiError] =
    useState<string | null>(null);

  // Fetch temperature whenever selected location changes
  useEffect(() => {
    let active = true;

    async function loadTemperature() {
      try {
        setLoading(true);
        setApiError(null);

        setTemperatureData([]);

        const result = await fetchTemperature(
          selectedLocation.lat,
          selectedLocation.lng
        );

        if (active) {
          setTemperatureData(result);
        }

      } catch (error) {
        console.error("NASA API Error:", error);

        if (active) {
          setApiError(
            "Unable to fetch NASA temperature data."
          );
        }

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTemperature();

    return () => {
      active = false;
    };

  }, [selectedLocation.lat, selectedLocation.lng]);

  // Latest available temperature
  const latestTemperature =
    [...temperatureData]
      .reverse()
      .find((item) => item.temperature !== null);

  // Environmental metric cards
  const metrics: MetricCardProps[] = [
    {
      title: "TEMP & CLIMATE",
      value: loading
        ? "Loading..."
        : latestTemperature?.temperature !== undefined &&
          latestTemperature?.temperature !== null
          ? `${latestTemperature.temperature.toFixed(2)}°C`
          : "N/A",

      subtitle: "NASA POWER · 2m Temperature",
      change: "Monthly observation",
      icon: "🌡",
      color: "#ff9e8f",
    },
    {
      title: "AIR QUALITY / PM2.5",
      value: "84.2 µg/m³",
      subtitle: "Demo particulate matter indicator",
      change: "DEMO",
      icon: "◉",
      color: "#9bbcff",
    },
    {
      title: "CO₂ COLUMN",
      value: "421.8 ppm",
      subtitle: "Demo atmospheric CO₂ indicator",
      change: "+24.6 ppm",
      icon: "CO₂",
      color: "#d1d5df",
    },
    {
      title: "RAINFALL & HYDRO",
      value: "1,420 mm/yr",
      subtitle: "Demo precipitation indicator",
      change: "DEMO",
      icon: "≋",
      color: "#9bbcff",
    },
    {
      title: "CANOPY & NDVI",
      value: "0.38 Index",
      subtitle: "Demo vegetation indicator",
      change: "DEMO",
      icon: "🌳",
      color: "#ff9e8f",
    },
    {
      title: "URBAN POPULATION",
      value: "15.3 Million",
      subtitle: "Demo population indicator",
      change: "DEMO",
      icon: "♟",
      color: "#c2c8d5",
    },
  ];

  return (
    <section className="diagnostic-panel">

      {/* Dashboard Header */}
      <div className="diagnostic-header">

        <div className="diagnostic-top">
          <span>REGIONAL DIAGNOSTIC PORTAL</span>

          <span className="coordinate-system">
            WGS84 EPSG:4326
          </span>
        </div>

        <h1>
          {selectedLocation.name === "Selected Location"
            ? "Custom Region"
            : selectedLocation.name}
          , {selectedLocation.country} — 10-Year Decadal Assessment
        </h1>

        <p className="diagnostic-description">
          Ground telemetry cross-referenced against
          environmental satellite and Earth observation data.
        </p>

        <div className="location-coordinates">
          LAT: {selectedLocation.lat.toFixed(4)}° |
          LNG: {selectedLocation.lng.toFixed(4)}°
        </div>

      </div>

      {/* Environmental Metric Cards */}
      <div className="metrics-grid">

        {metrics.map((metric) => (
          <MetricCard
            key={metric.title}
            {...metric}
          />
        ))}

      </div>

      {/* NASA Historical Temperature Chart */}
      <div className="correlation-section">

        <div className="chart-header">
          <h3>NASA HISTORICAL TEMPERATURE</h3>

          <span>2016 – 2025</span>
        </div>

        {loading && (
          <p>Fetching NASA temperature data...</p>
        )}

        {apiError && (
          <p className="api-error">{apiError}</p>
        )}

        {!loading && !apiError && temperatureData.length > 0 && (
          <TemperatureChart data={temperatureData} />
        )}

        {!loading && !apiError && temperatureData.length === 0 && (
          <p>No temperature data available.</p>
        )}

      </div>

      {/* Multi-Spectral Correlation Chart */}
      <div className="correlation-section">

        <div className="chart-header">
          <h3>MULTI-SPECTRAL CORRELATION INDEX</h3>

          <span>DEMO DATA · 2016 – 2025</span>
        </div>

        <div className="chart-legend">
          <span className="temp-legend">— Temperature</span>
          <span className="pm-legend">— PM2.5</span>
          <span className="co2-legend">— CO₂</span>
        </div>

        <div className="chart-container">

          <ResponsiveContainer width="100%" height="100%">

            <LineChart
              data={environmentalData}
              margin={{
                top: 10,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >

              <CartesianGrid
                stroke="#303746"
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="year"
                stroke="#858da0"
                tick={{ fontSize: 10 }}
                tickLine={false}
              />

              <YAxis
                stroke="#858da0"
                tick={{ fontSize: 10 }}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#171d29",
                  border: "1px solid #39445a",
                  color: "#fff",
                }}
              />

              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ff9e8f"
                strokeWidth={2}
                dot={false}
                name="Temperature (°C)"
              />

              <Line
                type="monotone"
                dataKey="pm25"
                stroke="#9bbcff"
                strokeWidth={2}
                dot={false}
                name="PM2.5"
              />

              <Line
                type="monotone"
                dataKey="co2"
                stroke="#d1d5df"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                name="CO₂"
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* Data Disclaimer */}
      <div className="data-disclaimer">
        NASA POWER · Temperature data is fetched dynamically.
        Other environmental indicators are demonstration data.
      </div>

    </section>
  );
};

export default DiagnosticPanel;
