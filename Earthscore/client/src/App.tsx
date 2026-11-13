import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
    ArrowRight,
    AudioLines,
    Globe2,
    MapPin,
    Orbit,
    Play,
} from "lucide-react";
import "./App.css";

import Navbar from "./components/Navigation/Navbar";
import GlobePanel from "./components/globe/GlobePanel";
import DiagnosticPanel from "./components/RightPanelDashboard/DiagnosticsPanel";
import TimelineScrubber from "./components/SonicScrubber/TimelineScrubber";
import DAWEngine from "./components/DigitalAudio/DAWEngine";
import YearSonifier from "./components/sonification/YearSonifier";
import RegionalComparePage from "./pages/RegionalComparePage";
import MethodologyPage from "./pages/MethodologyPage";

import type { Location } from "./types/location";
import { useAppState } from "./state/AppProvider";
import { fetchMonthlySeries } from "./services/monthlySeries";
import {
    SOUND_PARAMETERS,
    type SoundParameterId,
} from "./config/parameters";
import {
    createPlaybackEvents,
    firstIndexOfYear,
    recordsFromMonthly,
} from "./playback/createPlaybackEvents";
import { useHashPage } from "./utils/useHashPage";

function App() {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);

    // Shared playback state (M4): one timeline for sound and visuals.
    const { state: playback, dispatch, controller } = useAppState();

    // Current page: #/explorer (default), #/compare, #/methodology
    const page = useHashPage();

    // Currently selected location
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

    // Selected year for historical data and sonification
    const [selectedYear, setSelectedYear] = useState(2016);

    // Which parameter is turned into sound in the Explorer
    // (Temperature, Rainfall, CO₂ or CH₄). Temperature is the default.
    const [soundParameter, setSoundParameter] =
        useState<SoundParameterId>("temperature");

    // Location switch:
    // 1. stop all sound (timeline and any pending legend preview),
    // 2. clear the old location's events, so Play is disabled while loading,
    // 3. load the new NASA POWER months and keep the selected year.
    // Aborting the previous request means an older, slower response can
    // never overwrite the newer location.
    // Runs again when returning to the Explorer from another page, because
    // Regional Compare puts its own A/B events into the shared timeline.
    useEffect(() => {
        if (page !== "explorer" || !isDashboardOpen) return;

        controller?.stopAll();
        dispatch({
            type: "SET_EVENTS",
            payload: { events: [], startIndex: 0 },
        });

        if (!selectedLocation) {
            return;
        }

        const abort = new AbortController();

        fetchMonthlySeries(
            soundParameter,
            selectedLocation.lat,
            selectedLocation.lng,
            abort.signal
        )
            .then((series) => {
                if (abort.signal.aborted) return;

                const events = createPlaybackEvents(
                    recordsFromMonthly(series, SOUND_PARAMETERS[soundParameter])
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

        return () => abort.abort();
        // selectedYear is read once per location on purpose;
        // controller is stable for the app's lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isDashboardOpen,
        selectedLocation?.lat,
        selectedLocation?.lng,
        soundParameter,
        dispatch,
        page,
    ]);

    // Any page change stops the sound, so Explorer and Compare audio can
    // never play at the same time.
    useEffect(() => {
        controller?.stopAll();
        dispatch({ type: "STOP" });
    }, [page, controller, dispatch]);

    // While the timeline plays, the selected year follows the sound.
    const currentEvent = playback.events[playback.dateIndex];
    const playbackYear = currentEvent ? Number(currentEvent.date.slice(0, 4)) : null;

    useEffect(() => {
        if (page !== "explorer") return;
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
    const handleLocationReset = () => {
        setSelectedLocation(null);
        setSelectedYear(2016);
    };

    if (page === "explorer" && !isDashboardOpen) {
        return (
            <main className="landing-page">
                <header className="landing-header">
                    <a className="landing-brand" href="#home" aria-label="EarthScore home">
                        <span className="landing-brand-mark"><Orbit size={21} /></span>
                        <span>
                            <strong>EARTHSCORE</strong>
                            <small>THE EARTH INFORMATION JUKEBOX</small>
                        </span>
                    </a>
                </header>

                <section className="landing-hero" id="home">
                    <div className="landing-copy">
                        <div className="landing-eyebrow">
                            <span className="landing-live-dot" />
                            A NEW WAY TO EXPERIENCE OUR PLANET
                        </div>
                        <h1>Listen to the<br /><em>living Earth.</em></h1>
                        <p className="landing-description">
                            What if a changing planet had a sound? Explore Earth’s
                            environmental story through data you can see, hear, and
                            discover for yourself.
                        </p>
                        <div className="landing-actions">
                            <button
                                className="landing-primary-cta"
                                type="button"
                                onClick={() => setIsDashboardOpen(true)}
                            >
                                <Play size={16} fill="currentColor" />
                                Enter the experience
                                <ArrowRight size={17} />
                            </button>
                        </div>
                        <div className="landing-proof">
                            <span><AudioLines size={16} /> Data, transformed into sound</span>
                            <span><Globe2 size={16} /> Explore place by place</span>
                        </div>
                    </div>

                    <div className="landing-visual" aria-label="Illustration of Earth in space">
                        <div className="landing-orbit landing-orbit-one" />
                        <div className="landing-orbit landing-orbit-two" />
                        <div className="landing-earth">
                            <div className="landing-earth-shade" />
                        </div>
                        <div className="landing-coordinate landing-coordinate-top">
                            <span className="landing-live-dot" /> PLANETARY SIGNAL
                            <strong>ACTIVE</strong>
                        </div>
                        <div className="landing-coordinate landing-coordinate-bottom">
                            <span>01 / 06</span>
                            <strong>Earth, in a different key.</strong>
                            <div className="landing-waveform" aria-hidden="true">
                                {Array.from({ length: 28 }, (_, index) => (
                                    <i
                                        key={index}
                                        style={{ "--bar-index": index } as CSSProperties}
                                    />
                                ))}
                            </div>
                        </div>
                        <span className="landing-star landing-star-one" />
                        <span className="landing-star landing-star-two" />
                        <span className="landing-star landing-star-three" />
                    </div>
                </section>
            </main>
        );
    }

    return (
        <>
            {/* NAVBAR */}
            <Navbar
                currentPage={page}
                selectedLocation={selectedLocation}
                muted={isMuted}
                onLocationSelect={setSelectedLocation}
                onMuteToggle={handleMuteToggle}
                soundLabel={
                    page === "explorer"
                        ? SOUND_PARAMETERS[soundParameter].source
                        : undefined
                }
            />

            {page === "explorer" && (
                <main className="dashboard-workspace">
                    <header className="dashboard-overview">
                        <div className="dashboard-overview-copy">
                            <div className="dashboard-overview-kicker">
                                <span className="dashboard-live-dot" />
                                EARTH DATA WORKSPACE <span>/ 01</span>
                            </div>
                            <h1>Planetary <em>Explorer</em></h1>
                            <p>Explore environmental signals across time and place.</p>
                        </div>
                        <div className="dashboard-overview-context">
                            <span className="dashboard-context-icon">
                                <Globe2 size={20} />
                            </span>
                            <span className="dashboard-context-copy">
                                <small>
                                    {selectedLocation ? "ACTIVE REGION" : "NO REGION SELECTED"}
                                </small>
                                <strong>
                                    {selectedLocation
                                        ? `${selectedLocation.name}, ${selectedLocation.country}`
                                        : "Choose a location"}
                                </strong>
                                <span>
                                    {selectedLocation
                                        ? `${selectedYear} · ${selectedLocation.lat.toFixed(2)}°, ${selectedLocation.lng.toFixed(2)}°`
                                        : "Select a point or draw a polygon to begin."}
                                </span>
                            </span>
                        </div>
                    </header>

                    <div className="dashboard-layout">
                        <div className="left-panel">
                            <GlobePanel
                                selectedLocation={selectedLocation}
                                onLocationSelect={setSelectedLocation}
                                onLocationReset={handleLocationReset}
                                selectedYear={selectedYear}
                            />
                        </div>

                        <div className="right-panel">
                            {selectedLocation ? (
                                <DiagnosticPanel selectedLocation={selectedLocation} />
                            ) : (
                                <section className="dashboard-location-empty">
                                    <span><MapPin size={20} /></span>
                                    <div>
                                        <h2>Select a place to explore</h2>
                                        <p>
                                            Choose Point or Polygon on the globe, use a preset,
                                            or search for a place above. Environmental data and
                                            sonification will load after a location is selected.
                                        </p>
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {selectedLocation && (
                        <>
                            <TimelineScrubber
                                selectedYear={selectedYear}
                                onYearChange={handleYearChange}
                                sourceLabel={SOUND_PARAMETERS[soundParameter].source}
                            />

                            <YearSonifier
                                location={selectedLocation}
                                year={selectedYear}
                                parameterId={soundParameter}
                                onParameterChange={setSoundParameter}
                                onYearChange={handleYearChange}
                            />

                            <DAWEngine
                                locationName={selectedLocation.name}
                                selectedYear={selectedYear}
                                parameterId={soundParameter}
                            />
                        </>
                    )}
                </main>
            )}

            {page === "compare" && <RegionalComparePage />}

            {page === "methodology" && <MethodologyPage />}
        </>
    );
}

export default App;
