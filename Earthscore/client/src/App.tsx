
import { useState } from "react";
import "./App.css";

import Navbar from "./components/Navigation/Navbar";
import GlobePanel from "./components/globe/GlobePanel";
import DiagnosticPanel from "./components/RightPanelDashboard/DiagnosticsPanel";
import TimelineScrubber from "./components/SonicScrubber/TimelineScrubber";
import DAWEngine from "./components/DigitalAudio/DAWEngine";
import YearSonifier from "./components/sonification/YearSonifier";

import type { Location } from "./types/location";
import { getPlaceName } from "./utils/reverseGeoCode";

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

  // Called when the user searches coordinates in Navbar
  const handleCoordinateSearch = async (
    latitude: number,
    longitude: number
  ) => {
    // Update coordinates immediately
    setSelectedLocation({
      name: "Finding location...",
      country: "Loading...",
      lat: latitude,
      lng: longitude,
    });

    try {
      const place = await getPlaceName(latitude, longitude);

      setSelectedLocation({
        name: place?.name || "Unknown location",
        country: place?.country || "Unknown country",
        lat: latitude,
        lng: longitude,
      });
    } catch (error) {
      console.error("Reverse geocoding failed:", error);

      setSelectedLocation({
        name: "Unknown location",
        country: "Unknown country",
        lat: latitude,
        lng: longitude,
      });
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <Navbar
        selectedLocation={selectedLocation}
        onCoordinateSearch={handleCoordinateSearch}
      />

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
          <DiagnosticPanel selectedLocation={selectedLocation} />
        </div>
      </main>

      {/* CHRONOLOGICAL SONIC SCRUBBER */}
      <TimelineScrubber
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/* TEMPERATURE SONIFICATION */}
      <YearSonifier
        location={selectedLocation}
        year={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/* DIGITAL AUDIO WORKSTATION */}
      <DAWEngine
        audioUrl={audioUrl}
        selectedYear={selectedYear}
      />
    </>
  );
}

export default App;