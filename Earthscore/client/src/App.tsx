import { useEffect, useState } from "react";
import "./App.css";

import Navbar from "./components/Navigation/Navbar";
import GlobePanel from "./components/globe/GlobePanel";
import DiagnosticPanel from "./components/RightPanelDashboard/DiagnosticsPanel";
import TimelineScrubber from "./components/SonicScrubber/TimelineScrubber";
import DAWEngine from "./components/DigitalAudio/DAWEngine";
import YearSonifier from "./components/sonification/YearSonifier";

import type { Location } from "./types/location";
import { useAppState } from "./state/AppProvider";
import { fetchTemperatureSeries } from "./services/nasaAPI";
import { T2M_TEMPERATURE_MAPPING } from "./config/audioMapping";
import {
    createPlaybackEvents,
    firstIndexOfYear,
    recordsFromSeries,
} from "./playback/createPlaybackEvents";

function App() {
    // Shared playback state (M4): one timeline for sound and visuals.
    const { state: playback, dispatch } = useAppState();

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

    // Load the NASA POWER months of the selected location into the shared
    // timeline. Keeps the selected year when the location changes.
    useEffect(() => {
        const controller = new AbortController();

        fetchTemperatureSeries(
            selectedLocation.lat,
            selectedLocation.lng,
            controller.signal
        )
            .then((series) => {
                const events = createPlaybackEvents(
                    recordsFromSeries(series, T2M_TEMPERATURE_MAPPING)
                );
                const start = firstIndexOfYear(events, selectedYear);

                dispatch({
                    type: "SET_EVENTS",
                    payload: { events, startIndex: Math.max(0, start) },
                });
            })
            .catch(() => {
                // The sonification panel shows the loading error.
            });

        return () => controller.abort();
        // selectedYear is read once per location on purpose.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLocation.lat, selectedLocation.lng, dispatch]);

    // While the timeline plays, the selected year follows the sound.
    const currentEvent = playback.events[playback.dateIndex];
    const playbackYear = currentEvent ? Number(currentEvent.date.slice(0, 4)) : null;

    useEffect(() => {
        if (playbackYear !== null && playbackYear !== selectedYear) {
            setSelectedYear(playbackYear);
        }
        // Only react to the playback position, not to manual year changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playbackYear]);

    // A year chosen by the user (timeline, chart): move the shared position
    // to January of that year. If playing, playback continues from there.
    const handleYearChange = (year: number) => {
        setSelectedYear(year);

        const index = firstIndexOfYear(playback.events, year);
        if (index >= 0) {
            dispatch({ type: "SEEK", payload: { index } });
        }
    };

    // Global mute lives in the shared state so the controller applies it.
    const isMuted = !playback.soundEnabled;
    const handleMuteToggle = () => dispatch({ type: "TOGGLE_SOUND" });

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
                    onYearChange={handleYearChange}
                />

                {/* YEAR-WISE TEMPERATURE SONIFICATION */}
                <YearSonifier
                    location={selectedLocation}
                    year={selectedYear}
                    onYearChange={handleYearChange}
                />

                {/* DIGITAL AUDIO WORKSTATION */}
                <DAWEngine
                    locationName={selectedLocation.name}
                    selectedYear={selectedYear}
                />

            </main>
        </>
    );
}

export default App;
