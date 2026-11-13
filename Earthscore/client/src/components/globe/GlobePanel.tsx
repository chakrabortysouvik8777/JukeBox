
import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import "./GlobePanel.css";

import type { Location } from "../../types/location";
import type { TemperatureSeries } from "../../types/dataset";

import { getPlaceName } from "../../utils/reverseGeoCode";
import { fetchTemperatureSeries } from "../../services/nasaAPI";
import { yearDifferenceFromAverage } from "../../data/selectors";

interface GlobePanelProps {
    selectedLocation: Location | null;
    onLocationSelect: (location: Location) => void;
    onLocationReset: () => void;
    selectedYear: number;
}

const BADGE_STYLES = {
    warmer: { background: "#c2571a", color: "#ffffff" },
    cooler: { background: "#2f6fd0", color: "#ffffff" },
    neutral: { background: "#3a4252", color: "#d5dae5" },
};

type ToolType = "point" | "polygon";
type GeoPoint = { lat: number; lng: number };
type PolygonShape = {
    name: string;
    geometry: {
        type: "Polygon";
        coordinates: Array<Array<[number, number]>>;
    };
};

const polygonCentroid = (points: GeoPoint[]): GeoPoint => {
    const cartesian = points.reduce(
        (sum, point) => {
            const latitude = (point.lat * Math.PI) / 180;
            const longitude = (point.lng * Math.PI) / 180;
            return {
                x: sum.x + Math.cos(latitude) * Math.cos(longitude),
                y: sum.y + Math.cos(latitude) * Math.sin(longitude),
                z: sum.z + Math.sin(latitude),
            };
        },
        { x: 0, y: 0, z: 0 },
    );

    return {
        lat: (Math.atan2(cartesian.z, Math.hypot(cartesian.x, cartesian.y)) * 180) / Math.PI,
        lng: (Math.atan2(cartesian.y, cartesian.x) * 180) / Math.PI,
    };
};

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
    onLocationReset,
    selectedYear,
}: GlobePanelProps) => {
    const globeRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Prevent older reverse-geocoding requests from overwriting newer selections.
    const geocodeRequestId = useRef(0);

    // Latest selected location, read after slow reverse-geocoding requests.
    const selectedRef = useRef(selectedLocation);
    selectedRef.current = selectedLocation;

    const [globeWidth, setGlobeWidth] = useState(650);
    const [globeHeight, setGlobeHeight] = useState(500);
    const [globeReady, setGlobeReady] = useState(false);
    const [activeTool, setActiveTool] = useState<ToolType>("point");
    const [polygonPoints, setPolygonPoints] = useState<GeoPoint[]>([]);
    const [series, setSeries] = useState<TemperatureSeries | null>(null);

    // Move the globe whenever the selected coordinates change.
    useEffect(() => {
        if (!globeReady || !globeRef.current) return;

        globeRef.current.pointOfView(
            selectedLocation
                ? {
                      lat: selectedLocation.lat,
                      lng: selectedLocation.lng,
                      altitude: 1.35,
                  }
                : { lat: 20, lng: 30, altitude: 1.35 },
            1000
        );
    }, [selectedLocation?.lat, selectedLocation?.lng, globeReady]);

    // Fetch NASA POWER temperature data for the selected location.
    useEffect(() => {
        const controller = new AbortController();

        setSeries(null);

        if (!selectedLocation) {
            return () => controller.abort();
        }

        fetchTemperatureSeries(
            selectedLocation.lat,
            selectedLocation.lng,
            controller.signal
        )
            .then((data) => {
                if (!controller.signal.aborted) {
                    setSeries(data);
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    console.error("Temperature series error:", error);
                }
            });

        return () => controller.abort();
    }, [selectedLocation?.lat, selectedLocation?.lng]);

    const yearDifference = series && selectedLocation
        ? yearDifferenceFromAverage(series.observations, selectedYear)
        : null;

    const badgeText =
        yearDifference === null
            ? `${selectedYear} · NO FULL YEAR`
            : `${selectedYear} · ${
                  yearDifference >= 0 ? "+" : "−"
              }${Math.abs(yearDifference).toFixed(1)}°C VS AVG`;

    const badgeStyle =
        yearDifference === null || Math.abs(yearDifference) < 0.05
            ? BADGE_STYLES.neutral
            : yearDifference > 0
              ? BADGE_STYLES.warmer
              : BADGE_STYLES.cooler;

    const polygonData = useMemo<PolygonShape[]>(() => {
        if (polygonPoints.length < 3) return [];

        const ring: Array<[number, number]> = polygonPoints.map(
            ({ lat, lng }) => [lng, lat],
        );
        ring.push(ring[0]);

        return [{
            name: "Selected region",
            geometry: { type: "Polygon", coordinates: [ring] },
        }];
    }, [polygonPoints]);

    // Responsive globe width.
    useEffect(() => {
        const container = containerRef.current;

        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;

            if (width) {
                setGlobeWidth(Math.max(250, width));
                setGlobeHeight(Math.max(360, Math.min(540, width * 0.44)));
            }
        });

        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    // Initialize the globe and its controls.
    const handleGlobeReady = () => {
        if (!globeRef.current) return;

        const controls = globeRef.current.controls();

        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.25;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 120;
        controls.maxDistance = 450;
        controls.zoomSpeed = 0.8;

        const renderer = globeRef.current.renderer();

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 2)
        );

        setGlobeReady(true);
    };

    const isStillSelected = (lat: number, lng: number) =>
        selectedRef.current?.lat === lat && selectedRef.current?.lng === lng;

    // Select a location by clicking on the globe.
    const handleGlobeClick = async (coords: GeoPoint) => {
        const lat = Number(coords.lat.toFixed(4));
        const lng = Number(coords.lng.toFixed(4));

        if (activeTool === "polygon") {
            geocodeRequestId.current++;
            setPolygonPoints((points) => [...points, { lat, lng }]);
            return;
        }

        setPolygonPoints([]);
        const requestId = ++geocodeRequestId.current;

        // Update coordinates immediately.
        onLocationSelect({
            name: "Finding location...",
            country: "Loading...",
            lat,
            lng,
        });

        try {
            const result = await getPlaceName(lat, lng);

            // Ignore an outdated request, or one whose point is no longer
            // selected (e.g. a search result arrived in the meantime).
            if (requestId !== geocodeRequestId.current) return;
            if (!isStillSelected(lat, lng)) return;

            onLocationSelect({
                name: result?.city || result?.name || "Unknown location",
                country:
                    result?.country ||
                    result?.state ||
                    "Unknown country",
                lat,
                lng,
            });
        } catch (error) {
            console.error("Reverse geocoding failed:", error);

            if (requestId !== geocodeRequestId.current) return;
            if (!isStillSelected(lat, lng)) return;

            onLocationSelect({
                name: "Unknown location",
                country: "Unknown country",
                lat,
                lng,
            });
        }
    };

    // Select one of the preset locations.
    const handlePresetClick = (location: Location) => {
        // Invalidate any pending reverse-geocoding request.
        geocodeRequestId.current++;
        setPolygonPoints([]);
        setActiveTool("point");
        onLocationSelect(location);
    };

    const handlePolygonComplete = async () => {
        if (polygonPoints.length < 3) return;

        const center = polygonCentroid(polygonPoints);
        const lat = Number(center.lat.toFixed(4));
        const lng = Number(center.lng.toFixed(4));
        const selectedBeforeRequest = selectedRef.current;
        const requestId = ++geocodeRequestId.current;
        const isCurrentRequest = () =>
            requestId === geocodeRequestId.current &&
            selectedRef.current === selectedBeforeRequest;
        const region: Location = {
            name: "Selected region",
            country: "Custom area",
            lat,
            lng,
        };

        try {
            const result = await getPlaceName(lat, lng);
            if (!isCurrentRequest()) return;
            onLocationSelect({
                ...region,
                name: result?.city || result?.name || region.name,
                country: result?.country || result?.state || region.country,
            });
        } catch (error) {
            console.error("Region reverse geocoding failed:", error);
            if (!isCurrentRequest()) return;
            onLocationSelect(region);
        }

        setActiveTool("point");
    };

    const handleReset = () => {
        geocodeRequestId.current++;
        setPolygonPoints([]);
        setActiveTool("point");
        onLocationReset();
    };

    // Format coordinates.
    const formatCoordinate = (
        value: number,
        positive: string,
        negative: string
    ): string => {
        return `${Math.abs(value).toFixed(4)}° ${
            value >= 0 ? positive : negative
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
                        aria-pressed={activeTool === "point"}
                        onClick={() => {
                            setActiveTool("point");
                            setPolygonPoints([]);
                        }}
                    >
                        ⌖ Point
                    </button>

                    <button
                        className={
                            activeTool === "polygon"
                                ? "tool-btn selected"
                                : "tool-btn"
                        }
                        aria-pressed={activeTool === "polygon"}
                        onClick={() => {
                            setActiveTool("polygon");
                            setPolygonPoints([]);
                        }}
                    >
                        ⬡ Polygon
                    </button>

                    <button
                        className="tool-btn"
                        onClick={handleReset}
                    >
                        ↻ Reset
                    </button>
                </div>

                {activeTool === "polygon" && (
                    <div className="polygon-controls">
                        <span>
                            {polygonPoints.length < 3
                                ? `Click ${3 - polygonPoints.length} or more points on the globe.`
                                : `${polygonPoints.length} vertices selected.`}
                        </span>
                        <button
                            className="tool-btn"
                            onClick={handlePolygonComplete}
                            disabled={polygonPoints.length < 3}
                        >
                            Use this region
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => setPolygonPoints([])}
                            disabled={polygonPoints.length === 0}
                        >
                            Clear points
                        </button>
                    </div>
                )}

                {/* Preset locations */}
                <div className="preset-group">
                    <span className="toolbar-label">PRESETS:</span>

                    {presetLocations.map((location) => (
                        <button
                            key={location.name}
                            className={
                                selectedLocation?.name === location.name
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
                        height={globeHeight}
                        globeImageUrl="/textures/earth-blue-marble.jpg"
                        bumpImageUrl="/textures/earth-topology.png"
                        backgroundColor="rgba(0,0,0,0)"
                        showAtmosphere={true}
                        atmosphereColor="#91d5ff"
                        atmosphereAltitude={0.16}
                        showGraticules={false}
                        rendererConfig={{
                            antialias: true,
                            alpha: true,
                            powerPreference: "high-performance",
                        }}
                        pointsData={
                            polygonPoints.length > 0
                                ? polygonPoints
                                : selectedLocation
                                  ? [selectedLocation]
                                  : []
                        }
                        pointLat="lat"
                        pointLng="lng"
                        pointColor={() =>
                            activeTool === "polygon" ? "#b7502d" : "#e36642"
                        }
                        pointAltitude={0.04}
                        pointRadius={0.75}
                        ringsData={
                            selectedLocation && polygonPoints.length === 0
                                ? [selectedLocation]
                                : []
                        }
                        ringLat="lat"
                        ringLng="lng"
                        ringColor={() => "#e68b54"}
                        ringMaxRadius={3}
                        ringPropagationSpeed={1.5}
                        ringRepeatPeriod={1200}
                        polygonsData={polygonData}
                        polygonGeoJsonGeometry="geometry"
                        polygonCapColor={() => "rgba(183, 80, 45, 0.24)"}
                        polygonSideColor={() => "rgba(183, 80, 45, 0.18)"}
                        polygonStrokeColor={() => "#c75d38"}
                        polygonAltitude={0.012}
                        polygonsTransitionDuration={250}
                        onGlobeClick={handleGlobeClick}
                        onGlobeReady={handleGlobeReady}
                    />

                    {/* Location HUD */}
                    {selectedLocation && (
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
                                )}
                                {", "}
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
                                    <span>DATA</span>
                                    <strong>NASA POWER T2M</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Coordinate Display */}
            <div className="coordinate-display">
                <span className="coordinate-indicator"></span>
                <span>
                    {selectedLocation ? "SELECTED TARGET" : "NO TARGET SELECTED"}
                </span>

                {selectedLocation ? (
                    <strong>
                        {selectedLocation.lat.toFixed(4)}°,
                        {" "}
                        {selectedLocation.lng.toFixed(4)}°
                    </strong>
                ) : (
                    <strong>Choose a point, polygon, or preset</strong>
                )}
            </div>

            {/* Sensor Overlays */}
            <div className="sensor-section">
                <div className="sensor-heading">
                    <span>
                        DATA FEEDS IN THIS PROTOTYPE
                    </span>

                    <span>
                        {selectedLocation
                            ? "SONIFIED: 1 / 6 FEEDS"
                            : "NO LOCATION DATA LOADED"}
                    </span>
                </div>

                <div className="sensor-grid">
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
