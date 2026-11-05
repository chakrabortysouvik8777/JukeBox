
import Header from "./components/layout/Header";
import DiagnosticsPanel from "./components/dashboard/DiagnosticsPanel";
import Timeline from "./components/dashboard/TimeLine";
import EarthGlobe from "./components/globe/EarthGlobe";

function App() {
  return (
    <div className="min-h-screen bg-[#0d111a] text-white">

      <Header />

      <main className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 p-6">

        {/* Left section */}
        <section className="space-y-5">

          <div className="min-h-137.5 rounded-xl border border-white/10 bg-[#171c25] p-5">
            <div className="rounded-xl border border-white/10 bg-[#171c25] p-4">

              <div className="mb-3 flex items-center justify-between"></div>
              <h2 className="text-lg font-semibold">
                Planetary Explorer
              </h2>
              <span className="text-xs text-blue-300">
                EARTH ORBITAL VIEW
              </span>
            </div>

            <EarthGlobe />

          </div>

          <div className="rounded-xl border border-white/10 bg-[#171c25] p-5">
            <h2 className="text-lg font-semibold">
              Chronological Sonic Scrubber
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Historical environmental timeline.
            </p>
          </div>
          {/* Timeline */}
          <Timeline />
        </section>

        {/* Right section */}
        <section>
          <div className="min-h-137.5 rounded-xl border border-white/10 bg-[#171c25] p-5">
            <h2 className="text-lg font-semibold">
              Regional Diagnostic Portal
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Environmental data for your selected region.
            </p>
          </div>
          {/* Environmental metric cards */}
          <DiagnosticsPanel />
        </section>

      </main>

    </div>
  );
}

export default App;
