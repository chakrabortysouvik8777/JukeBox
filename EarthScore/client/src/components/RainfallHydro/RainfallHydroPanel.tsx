
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./RainfallHydroPanel.css";

interface RainfallHydroProps {
  latitude: number;
  longitude: number;
}

interface DailyData {
  time: string[];
  precipitation_sum: (number | null)[];
  soil_moisture_0_to_7cm_mean?: (number | null)[];
}

interface AnnualRainfall {
  year: string;
  rainfall: number;
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
  const [annualData, setAnnualData] = useState<AnnualRainfall[]>([]);
  const [last30Days, setLast30Days] = useState<number | null>(null);
  const [soilMoisture, setSoilMoisture] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchRainfall = async () => {
      setLoading(true);
      setError("");

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

        // Calculate annual rainfall
        const yearlyTotals: Record<string, number> = {};

        time.forEach((date, index) => {
          const year = date.substring(0, 4);
          const rainfall = precipitation_sum[index];

          if (rainfall !== null && rainfall !== undefined) {
            yearlyTotals[year] =
              (yearlyTotals[year] || 0) + rainfall;
          }
        });

        const yearlyChartData = Object.entries(yearlyTotals)
          .map(([year, rainfall]) => ({
            year,
            rainfall: Number(rainfall.toFixed(1)),
          }))
          .sort((a, b) => a.year.localeCompare(b.year));

        setAnnualData(yearlyChartData);

        // Calculate latest available 30-day rainfall
        const validReadings = time
          .map((date, index) => ({
            date,
            rainfall: precipitation_sum[index],
          }))
          .filter(
            (item) =>
              item.rainfall !== null &&
              item.rainfall !== undefined
          );

        const recentReadings = validReadings.slice(-30);

        const recentTotal = recentReadings.reduce(
          (sum, item) => sum + (item.rainfall ?? 0),
          0
        );

        setLast30Days(
          recentReadings.length > 0 ? recentTotal : null
        );

        // Latest available surface soil moisture
        const moistureReadings =
          result.daily.soil_moisture_0_to_7cm_mean ?? [];

        const latestMoisture = [...moistureReadings]
          .reverse()
          .find(
            (value) => value !== null && value !== undefined
          );

        setSoilMoisture(latestMoisture ?? null);

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

  const averageRainfall =
    annualData.length > 0
      ? annualData.reduce((sum, item) => sum + item.rainfall, 0) /
        annualData.length
      : null;

  const latestYear = annualData[annualData.length - 1];

  const rainfallDifference =
    averageRainfall !== null &&
    averageRainfall > 0 &&
    latestYear
      ? ((latestYear.rainfall - averageRainfall) /
          averageRainfall) *
        100
      : null;

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

      {!loading && !error && (
        <>
          <div className="rainfall-metrics">

            <div className="rainfall-metric">
              <span>10-YEAR AVERAGE</span>
              <h3>
                {averageRainfall !== null
                  ? `${averageRainfall.toFixed(1)} mm`
                  : "N/A"}
              </h3>
              <small>Annual precipitation</small>
            </div>

            <div className="rainfall-metric">
              <span>LAST 30 DAYS</span>
              <h3>
                {last30Days !== null
                  ? `${last30Days.toFixed(1)} mm`
                  : "N/A"}
              </h3>
              <small>Latest available 30-day period</small>
            </div>

            <div className="rainfall-metric">
              <span>SURFACE SOIL MOISTURE</span>
              <h3>
                {soilMoisture !== null
                  ? `${soilMoisture.toFixed(3)} m³/m³`
                  : "N/A"}
              </h3>
              <small>Top 7 cm of soil</small>
            </div>

            <div className="rainfall-metric">
              <span>RAINFALL ANOMALY</span>
              <h3>
                {rainfallDifference !== null
                  ? `${rainfallDifference > 0 ? "+" : ""}${rainfallDifference.toFixed(1)}%`
                  : "N/A"}
              </h3>
              <small>Latest year vs 10-year average</small>
            </div>

          </div>

          <div className="rainfall-chart-section">

            <div className="rainfall-chart-header">
              <h3>ANNUAL RAINFALL TREND</h3>
              <span>2016 – 2025</span>
            </div>

            {annualData.length > 0 ? (
              <div className="rainfall-chart">

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={annualData}
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
                      formatter={(value) => [
                        `${Number(value).toFixed(1)} mm`,
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
                    />
                  </BarChart>
                </ResponsiveContainer>

              </div>
            ) : (
              <p>No annual rainfall data available.</p>
            )}

          </div>

          <p className="rainfall-source">
            Source: Open-Meteo Historical Weather API ·
            ERA5 / ERA5-Land reanalysis
          </p>
        </>
      )}
    </section>
  );
};

export default RainfallHydroPanel;
