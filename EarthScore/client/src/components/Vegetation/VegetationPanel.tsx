
import { useEffect, useState } from "react";
import type { Location } from "../../types/location";
import {
  fetchVegetation,
  type VegetationData,
} from "../../services/vegetationAPI";
import "./VegetationPanel.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import "./VegetationPanel.css";

interface Props {
  selectedLocation: Location;
}

export default function VegetationPanel({
  selectedLocation,
}: Props) {
  const [data, setData] = useState<VegetationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  
useEffect(() => {
  const controller = new AbortController();
  let active = true;

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, 25000);

  async function loadVegetation() {
    try {
      setLoading(true);
      setError("");
      setData(null);

      const result = await fetchVegetation(
        selectedLocation.lat,
        selectedLocation.lng,
        controller.signal
      );

      if (active) {
        setData(result);
      }

    } catch (err) {
      if (active) {
        if (controller.signal.aborted) {
          setError(
            "Satellite data request timed out. Please try again."
          );
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load satellite vegetation data."
          );
        }
      }

    } finally {
      window.clearTimeout(timeoutId);

      if (active) {
        setLoading(false);
      }
    }
  }

  loadVegetation();

  return () => {
    active = false;
    window.clearTimeout(timeoutId);
    controller.abort();
  };

}, [selectedLocation.lat, selectedLocation.lng]);


  if (loading) {
  return (
    <div className="vegetation-message">
      <div className="loading-spinner"></div>
      <p>Fetching satellite vegetation observations...</p>
      <small>Source: NASA MODIS</small>
    </div>
  );
}

if (error) {
  return (
    <div className="vegetation-error">
      <p>{error}</p>

      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}

  if (!data) {
    return <div className="vegetation-message">No vegetation data available.</div>;
  }

  return (
    <div className="vegetation-panel">
      <div className="vegetation-heading">
        <h3>VEGETATION MONITORING</h3>
        <span className="vegetation-tag">NASA MODIS</span>
      </div>

      <div className="vegetation-summary">
        <div className="vegetation-card">
          <span>Latest NDVI</span>
          <h2>{data.latestNDVI.toFixed(3)}</h2>
          <small>Index value</small>
        </div>

        <div className="vegetation-card">
          <span>Vegetation condition</span>
          <h3>{data.condition}</h3>
          <small>Based on latest valid observation</small>
        </div>
      </div>

      <div className="vegetation-chart-section">
        <h4>NDVI OBSERVATION TREND</h4>

        <div className="vegetation-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.observations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />

              <YAxis
                domain={[-0.2, 1]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />

              <Tooltip
                formatter={(value) => [
                  Number(value).toFixed(3),
                  "NDVI",
                ]}
              />

              <Line
                type="monotone"
                dataKey="ndvi"
                stroke="#4ade80"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="vegetation-details">
        <p><strong>Selected location:</strong> {selectedLocation.name}</p>
        <p><strong>Latitude:</strong> {selectedLocation.lat}</p>
        <p><strong>Longitude:</strong> {selectedLocation.lng}</p>
        <p><strong>Latest observation:</strong> {data.latestDate}</p>
        <p><strong>Dataset:</strong> MODIS MOD13Q1.061</p>
        <p><strong>Resolution:</strong> 250 metres</p>
        <p><strong>Observation interval:</strong> 16 days</p>
      </div>

      <p className="vegetation-disclaimer">
        NDVI indicates vegetation greenness. It does not directly measure
        tree count, forest area or biodiversity. The chart shows the
        latest available valid satellite observations, not daily readings.
      </p>
    </div>
  );
}
