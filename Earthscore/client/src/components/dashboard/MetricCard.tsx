
import { TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  change: string;
  color: string;
}

function MetricCard({
  title,
  value,
  description,
  change,
  color
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#202630] p-4 hover:border-blue-400/40 transition">

      <div className="flex items-center justify-between gap-2">
        <h3 className={`text-xs font-bold ${color}`}>
          {title}
        </h3>

        <TrendingUp size={15} className={color} />
      </div>

      <h2 className="mt-4 text-2xl font-bold text-gray-100">
        {value}
      </h2>

      <p className="mt-1 text-xs text-gray-400">
        {description}
      </p>

      <p className="mt-2 text-xs text-gray-500">
        {change}
      </p>

      {/* Decorative sparkline placeholder */}
      <div className="mt-4 flex h-7 items-end gap-1">
        {[30, 45, 38, 55, 48, 70, 62, 85].map((height, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t ${color.replace("text-", "bg-")}`}
            style={{ height: `${height}%`, opacity: 0.65 }}
          />
        ))}
      </div>

    </div>
  );
}

export default MetricCard;
