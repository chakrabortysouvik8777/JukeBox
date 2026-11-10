
import { useEffect, useState } from "react";
import type { Location } from "../../types/location";

import {
  fetchGreenhouseGases,
  type GreenhouseGasData,
} from "../../services/greenhouseGasAPI";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import "./GreenhouseGasPanel.css";

interface Props {
  selectedLocation: Location;
}

export default function GreenhouseGasPanel({
  selectedLocation,
}: Props) {
  const [data, setData] = useState<GreenhouseGasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const result = await fetchGreenhouseGases();

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load greenhouse-gas data."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="ghg-message">
        Loading NOAA greenhouse-gas observations...
      </div>
    );
  }

  if (error) {
    return <div className="ghg-error">{error}</div>;
  }

  if (!data) {
    return <div className="ghg-message">No data available.</div>;
  }

  const co2ChartData = data.co2.slice(-36);
  const methaneChartData = data.methane.slice(-36);

  return (
    <div className="ghg-panel">
      <div className="ghg-heading">
        <h3>GREENHOUSE GAS MONITORING</h3>
        <span className="ghg-source-tag">NOAA GML</span>
      </div>

      <p className="ghg-location">
        Globe selection: {selectedLocation.name}
      </p>

      <p className="ghg-note">
        The values below are global atmospheric averages.
        They are not measurements specific to the selected coordinates.
      </p>

      <div className="ghg-summary">
        <div className="ghg-card">
          <span>Carbon dioxide (CO₂)</span>
          <h2>{data.latestCO2.value.toFixed(2)}</h2>
          <small>ppm · {data.latestCO2.date}</small>
        </div>

        <div className="ghg-card methane-card">
          <span>Methane (CH₄)</span>
          <h2>{data.latestMethane.value.toFixed(2)}</h2>
          <small>ppb · {data.latestMethane.date}</small>
        </div>
      </div>

      <section className="ghg-chart-section">
        <h4>CO₂ CONCENTRATION TREND</h4>
        <p>Parts per million (ppm)</p>

        <div className="ghg-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={co2ChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                minTickGap={25}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => [
                  `${Number(value).toFixed(2)} ppm`,
                  "CO₂",
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="ghg-chart-section">
        <h4>CH₄ CONCENTRATION TREND</h4>
        <p>Parts per billion (ppb)</p>

        <div className="ghg-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={methaneChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                minTickGap={25}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => [
                  `${Number(value).toFixed(2)} ppb`,
                  "CH₄",
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="ghg-details">
        <p><strong>CO₂ latest observation:</strong> {data.latestCO2.date}</p>
        <p><strong>CH₄ latest observation:</strong> {data.latestMethane.date}</p>
        <p><strong>Data provider:</strong> NOAA Global Monitoring Laboratory</p>
        <p><strong>Frequency:</strong> Monthly</p>
      </div>

      <p className="ghg-disclaimer">
        Global monthly means are calculated from marine surface
        measurement sites. Recent observations may be preliminary
        and can be revised by NOAA. The charts display the latest
        36 available monthly observations.
      </p>
    </div>
  );
}
