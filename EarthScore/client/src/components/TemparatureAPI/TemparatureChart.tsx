
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { TemperatureData } from "../../services/nasaAPI";

interface Props {
  data: TemperatureData[];
}

export default function TemperatureChart({ data }: Props) {
  const chartData = data.filter(
    (item) => item.temperature !== null
  );

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tickFormatter={(date) => date.slice(0, 4)}
          />

          <YAxis
            label={{
              value: "Temperature (°C)",
              angle: -90,
              position: "insideLeft",
            }}
          />

          <Tooltip />
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#38bdf8"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
