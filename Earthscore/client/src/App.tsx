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

  return (
    <>
      <Navbar />

      <main className="dashboard-layout">

        {/* LEFT PANEL */}
        <div className="left-panel">
          <GlobePanel
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
            selectedYear={selectedYear}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <DiagnosticPanel
            selectedLocation={selectedLocation}
          />
          
        </div>

      </main>

      {/*Chronological Sonic Order*/}
      <TimelineScrubber
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/*Temperature sonification (M3): plays the 12 months of the selected year*/}
      <YearSonifier
        location={selectedLocation}
        year={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/*Digital Audio Workstation*/}
      <DAWEngine
        audioUrl={audioUrl}
        selectedYear={selectedYear}
      />
    </>
  );
}

export default App;