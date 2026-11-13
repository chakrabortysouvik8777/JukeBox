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

import type { MonthlyObservation } from "../../types/dataset";
import {
  SOUND_PARAMETERS,
  type SoundParameter,
} from "../../config/parameters";

interface TemperatureChartProps {
  // All months 2016–2025 of the selected parameter (validated).
  observations: readonly MonthlyObservation[];

  // Which parameter is shown (default: temperature).
  parameter?: SoundParameter;

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
  value: number | null;
}

/**
 * Monthly line chart of the sonified parameter (2016–2025): the selected
 * year is shaded and the month being heard is marked with a dot.
 * (Kept under its original file name; it now charts any parameter.)
 */
export default function TemperatureChart({
  observations,
  parameter = SOUND_PARAMETERS.temperature,
  selectedYear,
  activeObservationId,
  onYearSelect,
}: TemperatureChartProps) {
  const data: ChartPoint[] = useMemo(
    () =>
      observations.map((o) => ({
        date: o.date,
        year: o.year,
        value: o.value,
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
        Monthly {parameter.quantity} ({parameter.unit}) · shaded: {selectedYear}
        {parameter.scope === "global" ? " · global average" : ""}
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
            width={64}
            tick={{ fill: "#8fa5bd", fontSize: 11 }}
            stroke="rgba(143,165,189,0.3)"
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v}`}
            label={{
              value: parameter.unit,
              angle: -90,
              position: "insideLeft",
              fill: "#8fa5bd",
              fontSize: 11,
            }}
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
                ? [`${value.toFixed(parameter.decimals)} ${parameter.unit}`, parameter.label]
                : ["missing", parameter.label]
            }
          />

          {/* connectNulls=false: missing months stay visible as gaps */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#42d9e8"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {active && active.value !== null && (
            <ReferenceDot
              x={active.date}
              y={active.value}
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
