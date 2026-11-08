
import { useState } from "react";
import { Play, Pause, Clock } from "lucide-react";

function Timeline() {
  const [year, setYear] = useState(2024);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-[#171c25] p-5">

      <div className="flex items-center gap-3">
        <Clock className="text-blue-300" />

        <div>
          <h2 className="font-bold">
            Chronological Sonic Scrubber
          </h2>
          <p className="text-sm text-gray-400">
            Decadal Temporal Corridor (2016–2025)
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">

        <button className="rounded bg-blue-600 px-4 py-2 text-sm">
          2016 vs 2025 Decadal Shift
        </button>

        <button
          onClick={() => setPlaying(!playing)}
          className="rounded bg-blue-500 p-2"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>

      </div>

      <div className="mt-8">
        <div className="flex justify-between text-sm">
          <span>JAN 2016</span>
          <span className="text-blue-300">{year}</span>
          <span>DEC 2025</span>
        </div>

        <input
          type="range"
          min="2016"
          max="2025"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="mt-6 w-full accent-blue-500"
        />

        <div className="flex justify-between text-xs text-gray-500">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i}>{2016 + i}</span>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Timeline;
