import { useEffect, useState } from "react";
import {
  fetchTemperature,
  TemperatureData,
} from "../../services/nasaAPI";
import TemperatureChart from "./TemparatureChart";

interface Props {
  latitude: number;
  longitude: number;
}

export default function TemperaturePanel({
  latitude,
  longitude,
}: Props) {

  const [data, setData] = useState<TemperatureData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchTemperature(
          latitude,
          longitude
        );

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("Unable to load NASA data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [latitude, longitude]);

  if (loading) return <p>Loading NASA data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h3>Historical Temperature</h3>

      {data.slice(-12).map((item) => (
        <TemperatureChart data={data} />
      ))}
    </div>
  );
}
