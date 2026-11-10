import { useState } from "react";
import "./App.css";
import Navbar from "./components/Navigation/Navbar";
import GlobePanel from "./components/globe/GlobePanel";
import DiagnosticPanel from "./components/RightPanelDashboard/DiagnosticsPanel";
import type { Location } from "./types/location";
import TimelineScrubber from "./components/SonicScrubber/TimelineScrubber";
import DAWEngine from "./components/DigitalAudio/DAWEngine";
import TemperaturePanel from "./components/TemparatureAPI/TemparaturePanel";
import YearSonifier from "./components/sonification/YearSonifier";

function App() {
  const [selectedLocation, setSelectedLocation] =
    useState<Location>({
      name: "Kolkata",
      country: "India",
      lat: 22.5726,
      lng: 88.3639,
    });

  const [selectedYear, setSelectedYear] = useState(2016);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <>
      <Navbar
        muted={isMuted}
        onLocationSelect={setSelectedLocation}
        onMuteToggle={() => setIsMuted((muted) => !muted)}
      />

      <main className="dashboard-workspace">
        <div className="dashboard-layout">
          <div className="left-panel">
            <GlobePanel
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              selectedYear={selectedYear}
            />
          </div>

          <div className="right-panel">
            <DiagnosticPanel selectedLocation={selectedLocation} />
          </div>
        </div>

        <TimelineScrubber
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />

        <YearSonifier
          location={selectedLocation}
          year={selectedYear}
          onYearChange={setSelectedYear}
          muted={isMuted}
        />

        <DAWEngine audioUrl={audioUrl} selectedYear={selectedYear} />
      </main>
    </>
  );
}

export default App;