
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

    async function loadPopulation() {
      try {
        setLoading(true);
        setError("");
        setData(null);

        const result = await fetchPopulation(
          selectedLocation.lat,
          selectedLocation.lng
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
          <h2>{data.density_per_km2.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}</h2>
          <small>People / km²</small>
        </div>
      </div>

      <div className="population-details">
        <p><strong>Country:</strong> {data.country}</p>
        <p><strong>Administrative area:</strong> {data.unit}</p>
        <p><strong>Dataset year:</strong> {data.data_year}</p>
        <p><strong>Resolution:</strong> Approximately 100 m</p>
        <p><strong>Source:</strong> WorldPop Global2</p>
      </div>
    </div>
  );
}
