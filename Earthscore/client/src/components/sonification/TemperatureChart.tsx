import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TemperatureObservation } from "../../types/dataset";

interface TemperatureChartProps {
  // All months 2016–2025 for the selected location (validated).
  observations: readonly TemperatureObservation[];

  // Year currently selected (shaded on the chart).
  selectedYear: number;

  // Observation being played right now, or null.
  activeObservationId: string | null;

  // Optional: clicking the chart selects that year.
  onYearSelect?: (year: number) => void;
}

interface ChartPoint {
  date: string;
  year: number;
  temperatureC: number | null;
}

export default function TemperatureChart({
  observations,
  selectedYear,
  activeObservationId,
  onYearSelect,
}: TemperatureChartProps) {
  const data: ChartPoint[] = useMemo(
    () =>
      observations.map((o) => ({
        date: o.date,
        year: o.year,
        temperatureC: o.temperatureC,
      })),
    [observations],
  );

  const yearDates = data.filter((point) => point.year === selectedYear);
  const firstDate = yearDates[0]?.date;
  const lastDate = yearDates[yearDates.length - 1]?.date;

  const active = observations.find((o) => o.id === activeObservationId);

  // Show one tick per January so the axis reads as years.
  const yearTicks = data
    .filter((point) => point.date.endsWith("-01"))
    .map((point) => point.date);

  if (data.length === 0) return null;

  return (
    <figure className="ys-chart">
      <figcaption className="ys-chart-caption">
        Monthly temperature 2016–2025 · shaded: {selectedYear}
        {onYearSelect ? " · click the chart to choose a year" : ""}
      </figcaption>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, bottom: 0, left: -8 }}
          onClick={(state) => {
            const label = state?.activeLabel;
            if (!onYearSelect || typeof label !== "string") return;

            const year = Number(label.slice(0, 4));
            if (Number.isFinite(year)) onYearSelect(year);
          }}
          style={{ cursor: onYearSelect ? "pointer" : "default" }}
        >
          <CartesianGrid stroke="rgba(143,165,189,0.12)" vertical={false} />

          {firstDate && lastDate && (
            <ReferenceArea
              x1={firstDate}
              x2={lastDate}
              fill="#42d9e8"
              fillOpacity={0.12}
              stroke="none"
            />
          )}

          <XAxis
            dataKey="date"
            ticks={yearTicks}
            tickFormatter={(date: string) => date.slice(0, 4)}
            tick={{ fill: "#8fa5bd", fontSize: 11 }}
            stroke="rgba(143,165,189,0.3)"
          />

          <YAxis
            unit="°C"
            width={56}
            tick={{ fill: "#8fa5bd", fontSize: 11 }}
            stroke="rgba(143,165,189,0.3)"
            domain={["auto", "auto"]}
          />

          <Tooltip
            contentStyle={{
              background: "#0b1726",
              border: "1px solid rgba(66,217,232,0.4)",
              borderRadius: 8,
              color: "#e8f1ff",
            }}
            labelStyle={{ color: "#8fa5bd" }}
            formatter={(value) =>
              typeof value === "number"
                ? [`${value.toFixed(1)} °C`, "T2M"]
                : ["missing", "T2M"]
            }
          />

          {/* connectNulls=false: missing months stay visible as gaps */}
          <Line
            type="monotone"
            dataKey="temperatureC"
            stroke="#42d9e8"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {active && active.temperatureC !== null && (
            <ReferenceDot
              x={active.date}
              y={active.temperatureC}
              r={6}
              fill="#ffffff"
              stroke="#42d9e8"
              strokeWidth={3}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}