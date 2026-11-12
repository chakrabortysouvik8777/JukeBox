
import { useEffect, useState } from "react";
import type { Location } from "../../types/location";
import {
  fetchPopulation,
  type PopulationData,
} from "../../services/populationAPI";
import "./PopulationPanel.css";

interface Props {
  selectedLocation: Location;
}

export default function PopulationPanel({
  selectedLocation,
}: Props) {
  const [data, setData] = useState<PopulationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPopulation() {
      try {
        setLoading(true);
        setError("");
        setData(null);

        const result = await fetchPopulation(
          selectedLocation.lat,
          selectedLocation.lng,
          controller.signal
        );

        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Population data could not be loaded."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPopulation();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedLocation.lat, selectedLocation.lng]);

  if (loading) return <p>Loading population data...</p>;
  if (error) return <p className="api-error">{error}</p>;
  if (!data) return <p>No population data available.</p>;

  return (
    <div className="population-panel">
      <h3>POPULATION & DEMOGRAPHICS</h3>

      <div className="population-cards">
        <div className="population-card">
          <span>Population in grid cell</span>
          <h2>{data.population.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}</h2>
          <small>People</small>
        </div>

        <div className="population-card">
          <span>Estimated population density</span>
          <h2>{Number.isFinite(data.density_per_km2)
            ? data.density_per_km2.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })
            : "N/A"}</h2>
          <small>People / km²</small>
        </div>
      </div>

      <div className="population-details">
        <p><strong>Country:</strong> {data.country}</p>
        <p><strong>Administrative area:</strong> {data.unit}</p>
        <p><strong>Dataset year:</strong> {Number.isFinite(data.data_year) ? data.data_year : "N/A"}</p>
        <p>
          <strong>Grid cell area:</strong>{" "}
          {Number.isFinite(data.cell_area_km2)
            ? `${data.cell_area_km2.toFixed(4)} km² (≈ ${Math.round(Math.sqrt(data.cell_area_km2) * 1000)} m × ${Math.round(Math.sqrt(data.cell_area_km2) * 1000)} m)`
            : "N/A"}
        </p>
        <p><strong>Source:</strong> WorldPop (modelled estimate, not a census count; not NASA)</p>
      </div>
    </div>
  );
}
