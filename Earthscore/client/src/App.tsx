
import { useState } from "react";
import "./App.css";

import Navbar from "./components/Navigation/Navbar";
import GlobePanel from "./components/globe/GlobePanel";
import DiagnosticPanel from "./components/RightPanelDashboard/DiagnosticsPanel";
import TimelineScrubber from "./components/SonicScrubber/TimelineScrubber";
import DAWEngine from "./components/DigitalAudio/DAWEngine";
import YearSonifier from "./components/sonification/YearSonifier";

import type { Location } from "./types/location";

function App() {
    // Currently selected location
    const [selectedLocation, setSelectedLocation] =
        useState<Location>({
            name: "Kolkata",
            country: "India",
            lat: 22.5726,
            lng: 88.3639,
        });

    // Selected year for historical data and sonification
    const [selectedYear, setSelectedYear] = useState(2016);

    // Generated audio URL for DAW engine
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // Global audio mute state
    const [isMuted, setIsMuted] = useState(false);

    // Toggle audio mute/unmute
    const handleMuteToggle = () => {
        setIsMuted((previousMuted) => !previousMuted);
    };

    return (
        <>
            {/* NAVBAR */}
            <Navbar
                selectedLocation={selectedLocation}
                muted={isMuted}
                onLocationSelect={setSelectedLocation}
                onMuteToggle={handleMuteToggle}
            />

            <main className="dashboard-workspace">

                {/* MAIN DASHBOARD */}
                <div className="dashboard-layout">

                    {/* LEFT PANEL - INTERACTIVE GLOBE */}
                    <div className="left-panel">
                        <GlobePanel
                            selectedLocation={selectedLocation}
                            onLocationSelect={setSelectedLocation}
                            selectedYear={selectedYear}
                        />
                    </div>

                    {/* RIGHT PANEL - ENVIRONMENTAL DATA */}
                    <div className="right-panel">
                        <DiagnosticPanel
                            selectedLocation={selectedLocation}
                        />
                    </div>

                </div>

                {/* CHRONOLOGICAL SONIC SCRUBBER */}
                <TimelineScrubber
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                />

                {/* YEAR-WISE TEMPERATURE SONIFICATION */}
                <YearSonifier
                    location={selectedLocation}
                    year={selectedYear}
                    onYearChange={setSelectedYear}
                    muted={isMuted}
                />

                {/* DIGITAL AUDIO WORKSTATION */}
                <DAWEngine
                    audioUrl={audioUrl}
                    selectedYear={selectedYear}
                />

            </main>
        </>
    );
}

export default App;
