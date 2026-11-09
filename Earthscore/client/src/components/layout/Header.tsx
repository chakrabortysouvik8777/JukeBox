
import {
  Globe2,
  Search,
  Volume2,
  Activity
} from "lucide-react";

function Header() {
  return (
    <header className="border-b border-white/10 bg-[#0b0e15]">

      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-600 p-2">
            <Globe2 size={25} />
          </div>

          <div>
            <p className="text-xs text-blue-300">
              NASA SPACE APPS 2026
            </p>
            <h1 className="text-lg font-bold text-white">
              EARTH INFORMATION JUKEBOX
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-wrap gap-2 text-sm">
          {[
            "Planetary Explorer",
            "Earth Symphony",
            "Regional Compare",
            "Data Sources"
          ].map((item, index) => (
            <button
              key={item}
              className={`rounded px-3 py-2 ${
                index === 0
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Search */}
        <div className="flex items-center gap-2 rounded bg-[#1a202b] px-3 py-2">
          <Search size={17} className="text-gray-400" />

          <input
            placeholder="Coordinate / Region Search..."
            className="w-44 bg-transparent text-xs text-white outline-none"
          />

          <Volume2 size={18} className="text-gray-400" />
        </div>

      </div>

      {/* Telemetry bar */}
      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 px-6 py-2 text-xs text-gray-400">

        <span className="flex items-center gap-2 text-blue-300">
          <Activity size={14} />
          ORBITAL SENSOR ARRAY LIVE
        </span>

        <span>LAT: 22.5726° N</span>
        <span>LON: 88.3639° E</span>

        <span className="text-gray-500">
          MODIS / TERRA · OCO-2 · GPM IMERG
        </span>

      </div>
    </header>
  );
}

export default Header;
