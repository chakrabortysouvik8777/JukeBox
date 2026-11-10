import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import "./GlobePanel.css";
import type { Location } from "../../types/location";
import type { TemperatureSeries } from "../../types/dataset";
import { getPlaceName } from "../../utils/reverseGeoCode";
import { fetchTemperatureSeries } from "../../services/nasaAPI";
import { yearDifferenceFromAverage } from "../../data/selectors";

interface GlobePanelProps {
    selectedLocation: Location;
    onLocationSelect: (location: Location) => void;
    // Year chosen on the timeline; used for the temperature badge.
    selectedYear: number;
}

// Badge colours: warmer = orange, cooler = blue, unknown = grey.
const BADGE_STYLES = {
    warmer: { background: "#c2571a", color: "#ffffff" },
    cooler: { background: "#2f6fd0", color: "#ffffff" },
    neutral: { background: "#3a4252", color: "#d5dae5" },
};

type ToolType = "point" | "polygon";

const presetLocations: Location[] = [
    { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639 },
    { name: "Svalbard", country: "Norway", lat: 78.2232, lng: 15.6469 },
    { name: "Amazon", country: "Brazil", lat: -3.4653, lng: -62.2159 },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Sahara", country: "Africa", lat: 23.4162, lng: 25.6628 },
    { name: "Tuvalu", country: "Pacific Ocean", lat: -7.1095, lng: 177.6493 },
];

const GlobePanel = ({
    selectedLocation,
    onLocationSelect,
    selectedYear,
}: GlobePanelProps) => {
    const globeRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [globeWidth, setGlobeWidth] = useState<number>(650);

    const [activeTool, setActiveTool] =
        useState<ToolType>("point");

    // NASA POWER series for the badge (shared cache with the sound panel).
    const [series, setSeries] = useState<TemperatureSeries | null>(null);

    useEffect(() => {
        if (!globeRef.current) return;

        globeRef.current.pointOfView(
            {
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                altitude: 1.8,
            },
            1000
        );
    }, [selectedLocation.lat, selectedLocation.lng]);

    useEffect(() => {
        const controller = new AbortController();
        setSeries(null);

        fetchTemperatureSeries(
            selectedLocation.lat,
            selectedLocation.lng,
            controller.signal
        )
            .then(setSeries)
            .catch(() => {
                // The sound panel shows the error message; badge stays neutral.
            });

        return () => controller.abort();
    }, [selectedLocation.lat, selectedLocation.lng]);

    const yearDifference = series
        ? yearDifferenceFromAverage(series.observations, selectedYear)
        : null;

    // Short text so it fits the HUD; the tooltip explains it fully.
    const badgeText =
        yearDifference === null
            ? `${selectedYear} · NO FULL YEAR`
            : `${selectedYear} · ${yearDifference >= 0 ? "+" : "−"}${Math.abs(
                yearDifference
            ).toFixed(1)}°C VS AVG`;

    const badgeStyle =
        yearDifference === null || Math.abs(yearDifference) < 0.05
            ? BADGE_STYLES.neutral
            : yearDifference > 0
                ? BADGE_STYLES.warmer
                : BADGE_STYLES.cooler;

    // Responsive globe width
    useEffect(() => {
        const container = containerRef.current;

        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            setGlobeWidth(Math.max(250, width));
        });

        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    // Globe initialization

    const handleGlobeReady = () => {
        if (globeRef.current) {
            const controls = globeRef.current.controls();

            // Disable automatic globe rotation
            controls.autoRotate = false;

            // Keep manual mouse interaction enabled
            controls.enableRotate = true;
            controls.enableZoom = true;
            controls.enablePan = false;

            // Set initial view to Kolkata
            globeRef.current.pointOfView(
                {
                    lat: 22.5726,
                    lng: 88.3639,
                    altitude: 1.8,
                },
                1000
            );
        }
    };


    // Select location by clicking globe

    const handleGlobeClick = async (
        coords: { lat: number; lng: number }
    ) => {
        if (activeTool !== "point") return;

        const lat = Number(coords.lat.toFixed(4));
        const lng = Number(coords.lng.toFixed(4));

        // Show coordinates immediately
        onLocationSelect({
            name: "Finding location...",
            country: "Loading...",
            lat,
            lng,
        });

        // Fetch actual place name
        const result = await getPlaceName(lat, lng);

        if (result) {
            onLocationSelect({
                name: result.city || result.name,
                country: result.country || result.state || "Unknown",
                lat,
                lng,
            });
        } else {
            onLocationSelect({
                name: "Unknown Location",
                country: "Unknown Region",
                lat,
                lng,
            });
        }
    };


    // Select preset location
    const handlePresetClick = (location: Location) => {
        onLocationSelect(location);

        globeRef.current?.pointOfView(
            {
                lat: location.lat,
                lng: location.lng,
                altitude: 1.8,
            },
            1000
        );
    };

    // Format coordinates
    const formatCoordinate = (
        value: number,
        positive: string,
        negative: string
    ): string => {
        return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative
            }`;
    };

    return (
        <section className="globe-panel">

            {/* Toolbar */}
            <div className="globe-toolbar">

                <div className="tool-group">
                    <span className="toolbar-label">TOOL:</span>

                    <button
                        className={
                            activeTool === "point"
                                ? "tool-btn selected"
                                : "tool-btn"
                        }
                        onClick={() => setActiveTool("point")}
                    >
                        ⌖ Point
                    </button>

                    <button
                        className={
                            activeTool === "polygon"
                                ? "tool-btn selected"
                                : "tool-btn"
                        }
                        onClick={() => setActiveTool("polygon")}
                    >
                        ⬡ Polygon
                    </button>

                    <button
                        className="tool-btn"
                        onClick={() => handlePresetClick(presetLocations[0])}
                    >
                        ↻ Reset
                    </button>
                </div>

                {/* Presets */}
                <div className="preset-group">
                    <span className="toolbar-label">PRESETS:</span>

                    {presetLocations.map((location) => (
                        <button
                            key={location.name}
                            className={
                                selectedLocation.name === location.name
                                    ? "preset-btn active-preset"
                                    : "preset-btn"
                            }
                            onClick={() => handlePresetClick(location)}
                        >
                            {location.name}
                        </button>
                    ))}
                </div>

            </div>

            {/* Interactive Globe */}
            <div className="globe-container" ref={containerRef}>

                <div className="globe-frame">

                    <Globe
                        ref={globeRef}
                        width={globeWidth}
                        height={420}

                        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"

                        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"

                        backgroundColor="rgba(0,0,0,0)"

                        showAtmosphere={true}
                        atmosphereColor="#4779d8"
                        atmosphereAltitude={0.18}

                        showGraticules={true}

                        pointsData={[selectedLocation]}
                        pointLat="lat"
                        pointLng="lng"
                        pointColor={() => "#ff7979"}
                        pointAltitude={0.04}
                        pointRadius={0.55}

                        ringsData={[selectedLocation]}
                        ringLat="lat"
                        ringLng="lng"
                        ringColor={() => "#ff7777"}
                        ringMaxRadius={4}
                        ringPropagationSpeed={2}
                        ringRepeatPeriod={1200}

                        onGlobeClick={handleGlobeClick}
                        onGlobeReady={handleGlobeReady}
                    />

                    {/* Location Information */}
                    <div className="location-hud">

                        <div className="hud-top">
                            <span>HUD RETICLE LOCK</span>
                            <span
                                className="anomaly-badge"
                                style={badgeStyle}
                                title="Mean NASA POWER T2M of the selected year minus the mean of all complete years 2016–2025 at this point. Not an official climate anomaly."
                            >
                                {badgeText}
                            </span>
                        </div>

                        <h3>{selectedLocation.name}</h3>

                        <p className="hud-coordinates">
                            {formatCoordinate(
                                selectedLocation.lat,
                                "N",
                                "S"
                            )},
                            {" "}
                            {formatCoordinate(
                                selectedLocation.lng,
                                "E",
                                "W"
                            )}
                        </p>

                        <div className="hud-stats">

                            <div>
                                <span>LOCATION</span>
                                <strong>{selectedLocation.country}</strong>
                            </div>

                            <div>
                                <span>SELECTION</span>
                                <strong>ACTIVE</strong>
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            {/* Coordinate Display */}
            <div className="coordinate-display">

                <span className="coordinate-indicator"></span>

                <span>SELECTED TARGET</span>

                <strong>
                    {selectedLocation.lat.toFixed(4)}°,
                    {" "}
                    {selectedLocation.lng.toFixed(4)}°
                </strong>

            </div>

            {/* Sensor Overlays */}
            <div className="sensor-section">

                <div className="sensor-heading">
                    <span>
                        ATMOSPHERIC & BIOSPHERIC SENSOR OVERLAYS
                    </span>

                    <span>SONIFIED: 1 / 6 FEEDS</span>
                </div>

                <div className="sensor-grid">

                    {/* Highlighted card = the data that is turned into sound. */}
                    <div
                        className="sensor-card active"
                        title="Monthly air temperature at 2 m. This feed drives the sound."
                    >
                        <span>🌡</span>
                        <strong>Surface Temp 🔊</strong>
                        <small>NASA POWER T2M</small>
                    </div>

                    <div className="sensor-card">
                        <span>≋</span>
                        <strong>Air Quality / PM</strong>
                        <small>Open-Meteo AQ</small>
                    </div>

                    <div className="sensor-card">
                        <span>CO₂</span>
                        <strong>Global CO₂ / CH₄</strong>
                        <small>NOAA GML</small>
                    </div>

                    <div className="sensor-card">
                        <span>💧</span>
                        <strong>Precipitation</strong>
                        <small>Open-Meteo Archive</small>
                    </div>

                    <div className="sensor-card">
                        <span>🌳</span>
                        <strong>NDVI Veg</strong>
                        <small>NASA MODIS MOD13Q1</small>
                    </div>

                    <div className="sensor-card">
                        <span>👥</span>
                        <strong>Population</strong>
                        <small>WorldPop</small>
                    </div>

                </div>
            </div>

        </section>
    );
};

export default GlobePanel;