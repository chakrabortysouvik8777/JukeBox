
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

import "./RainfallHydroPanel.css";
import {
  summarizeRainfall,
  type RainfallSummary,
} from "../../data/rainfall";

interface RainfallHydroProps {
  latitude: number;
  longitude: number;
}

interface DailyData {
  time: string[];
  precipitation_sum: (number | null)[];
  soil_moisture_0_to_7cm_mean?: (number | null)[];
}

interface RainfallAPIResponse {
  daily?: DailyData;
  daily_units?: {
    precipitation_sum?: string;
    soil_moisture_0_to_7cm_mean?: string;
  };
}

const RainfallHydroPanel = ({
  latitude,
  longitude,
}: RainfallHydroProps) => {
  const [summary, setSummary] = useState<RainfallSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchRainfall = async () => {
      setLoading(true);
      setError("");
      setSummary(null);

      try {
        const url =
          `https://archive-api.open-meteo.com/v1/archive` +
          `?latitude=${latitude}` +
          `&longitude=${longitude}` +
          `&start_date=2016-01-01` +
          `&end_date=2025-12-31` +
          `&daily=precipitation_sum,soil_moisture_0_to_7cm_mean` +
          `&timezone=auto`;

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to fetch rainfall data");
        }

        const result: RainfallAPIResponse = await response.json();

        if (!result.daily?.time || !result.daily.precipitation_sum) {
          throw new Error("Rainfall data is unavailable");
        }

        const { time, precipitation_sum } = result.daily;

        if (time.length !== precipitation_sum.length) {
          throw new Error("Rainfall data is inconsistent (dates and values differ).");
        }

        if (controller.signal.aborted) return;

        // Completeness checks, averages and the 30-day total (see data/rainfall.ts).
        setSummary(
          summarizeRainfall(
            time,
            precipitation_sum,
            result.daily.soil_moisture_0_to_7cm_mean ?? [],
          ),
        );

      } catch (err) {
        if (
          err instanceof Error &&
          err.name !== "AbortError"
        ) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRainfall();

    return () => controller.abort();
  }, [latitude, longitude]);

  const averageRainfall = summary?.averageRainfall ?? null;
  const incompleteYears = summary?.years.filter((y) => !y.complete) ?? [];

  const formatDate = (date: string | null) =>
    date
      ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

  return (
    <section className="rainfall-panel">
      <div className="rainfall-header">
        <div>
          <h2>RAINFALL & HYDROLOGY</h2>
          <p>10-Year Precipitation Assessment</p>
        </div>

        <span className="rainfall-live">● HISTORICAL DATA</span>
      </div>

      {loading && (
        <p className="rainfall-message">
          Fetching historical rainfall data...
        </p>
      )}

      {error && (
        <p className="rainfall-error">
          {error}
        </p>
      )}

      {!loading && !error && summary && (
        <>
          <div className="rainfall-metrics">

            <div className="rainfall-metric">
              <span>10-YEAR AVERAGE</span>
              <h3>
                {averageRainfall !== null
                  ? `${averageRainfall.toFixed(1)} mm`
                  : "N/A"}
              </h3>
              <small>
                Annual precipitation, {summary.completeYearCount} complete
                {summary.completeYearCount === 1 ? " year" : " years"}
              </small>
            </div>

            <div className="rainfall-metric">
              <span>LAST 30 DAYS OF DATA</span>
              <h3>
                {summary.last30Total !== null
                  ? `${summary.last30Total.toFixed(1)} mm`
                  : "N/A"}
              </h3>
              <small>
                {formatDate(summary.last30From)} – {formatDate(summary.last30To)}
                {summary.last30ValidDays < 30
                  ? ` (${summary.last30ValidDays} of 30 days have data)`
                  : ""}
              </small>
            </div>

            <div className="rainfall-metric">
              <span>SURFACE SOIL MOISTURE</span>
              <h3>
                {summary.soilMoisture !== null
                  ? `${summary.soilMoisture.toFixed(3)} m³/m³`
                  : "N/A"}
              </h3>
              <small>
                Top 7 cm of soil
                {summary.soilMoistureDate
                  ? `, ${formatDate(summary.soilMoistureDate)}`
                  : ""}
              </small>
            </div>

            <div className="rainfall-metric">
              <span>
                {summary.anomalyYear ?? "LATEST YEAR"} VS AVERAGE
              </span>
              <h3>
                {summary.anomalyPercent !== null
                  ? `${summary.anomalyPercent > 0 ? "+" : ""}${summary.anomalyPercent.toFixed(1)}%`
                  : "N/A"}
              </h3>
              <small>Latest complete year vs average of complete years</small>
            </div>

          </div>

          <div className="rainfall-chart-section">

            <div className="rainfall-chart-header">
              <h3>ANNUAL RAINFALL TREND</h3>
              <span>2016 – 2025</span>
            </div>

            {summary.years.length > 0 ? (
              <div className="rainfall-chart">

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.years}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
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
                    />

                    <YAxis
                      stroke="#858da0"
                      tick={{ fontSize: 10 }}
                    />

                    <Tooltip
                      formatter={(value, _name, item) => [
                        `${Number(value).toFixed(1)} mm${
                          item?.payload && !item.payload.complete
                            ? ` (incomplete: ${item.payload.validDays}/${item.payload.expectedDays} days)`
                            : ""
                        }`,
                        "Rainfall",
                      ]}
                      contentStyle={{
                        backgroundColor: "#171d29",
                        border: "1px solid #39445a",
                        color: "#fff",
                      }}
                    />

                    <Bar
                      dataKey="rainfall"
                      fill="#65b9d8"
                      radius={[5, 5, 0, 0]}
                      name="Annual Rainfall"
                    >
                      {/* Incomplete years are drawn faded. */}
                      {summary.years.map((year) => (
                        <Cell
                          key={year.year}
                          fill="#65b9d8"
                          fillOpacity={year.complete ? 1 : 0.35}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

              </div>
            ) : (
              <p>No annual rainfall data available.</p>
            )}

          </div>

          {incompleteYears.length > 0 && (
            <p className="rainfall-message">
              Incomplete {incompleteYears.length === 1 ? "year" : "years"} (fewer
              than 95% of days with data), not used in the average or the
              comparison: {incompleteYears.map((y) => `${y.year} (${y.validDays}/${y.expectedDays} days)`).join(", ")}.
            </p>
          )}

          <p className="rainfall-source">
            Source: Open-Meteo Historical Weather API · ERA5 / ERA5-Land
            reanalysis (model data, not NASA) · data from{" "}
            {formatDate(summary.firstDate)} to {formatDate(summary.lastDate)}
          </p>
        </>
      )}
    </section>
  );
};

export default RainfallHydroPanel;
