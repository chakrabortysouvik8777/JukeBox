
import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import "./GlobePanel.css";
import type { Location } from "../../types/location";

interface GlobePanelProps {
    selectedLocation: Location;
    onLocationSelect: (location: Location) => void;
}

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
}: GlobePanelProps) => {
    const globeRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [globeWidth, setGlobeWidth] = useState<number>(650);

    const [activeTool, setActiveTool] =
        useState<ToolType>("point");

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

            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            controls.enableZoom = true;

            globeRef.current.pointOfView({
                lat: 22.5726,
                lng: 88.3639,
                altitude: 1.8,
            }, 1000);
        }
    };

    // Select location by clicking globe
    const handleGlobeClick = (
        coords: { lat: number; lng: number }
    ) => {
        if (activeTool !== "point") return;

        onLocationSelect({
            name: "Selected Location",
            country: "Custom Region",
            lat: Number(coords.lat.toFixed(4)),
            lng: Number(coords.lng.toFixed(4)),
        });
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
                            <span className="anomaly-badge">
                                ANOMALY HIGH
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

                    <span>ACTIVE: 4 / 6 FEEDS</span>
                </div>

                <div className="sensor-grid">

                    <div className="sensor-card active">
                        <span>🌡</span>
                        <strong>Surface Temp</strong>
                        <small>GISTEMP v4</small>
                    </div>

                    <div className="sensor-card active">
                        <span>≋</span>
                        <strong>Aerosol / PM</strong>
                        <small>MODIS AOD</small>
                    </div>

                    <div className="sensor-card active">
                        <span>CO₂</span>
                        <strong>OCO-2 CO₂</strong>
                        <small>Column Avg</small>
                    </div>

                    <div className="sensor-card">
                        <span>💧</span>
                        <strong>Precipitation</strong>
                        <small>GPM IMERG</small>
                    </div>

                    <div className="sensor-card active">
                        <span>🌳</span>
                        <strong>NDVI Veg</strong>
                        <small>MODIS</small>
                    </div>

                    <div className="sensor-card">
                        <span>👥</span>
                        <strong>WorldPop</strong>
                        <small>Density Grid</small>
                    </div>

                </div>
            </div>

        </section>
    );
};

export default GlobePanel;
