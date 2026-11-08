
import MetricCard from "./MetricCard";
import { environmentalMetrics } from "../../data/demoData";

function DiagnosticsPanel() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#171c25] p-5">

      <p className="text-xs font-bold tracking-wider text-blue-300">
        REGIONAL DIAGNOSTIC PORTAL
      </p>

      <h2 className="mt-3 text-2xl font-bold">
        Kolkata, India — Environmental Assessment
      </h2>

      <p className="mt-2 text-sm text-gray-400">
        Explore historical environmental indicators
        for the selected region.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">

        {environmentalMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            description={metric.description}
            change={metric.change}
            color={metric.color}
          />
        ))}

      </div>

    </div>
  );
}

export default DiagnosticsPanel;
