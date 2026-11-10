
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { Location } from "../../types/location";
import { searchLocation } from "../../utils/searchLocation";

import "./Navbar.css";

interface NavbarProps {
    selectedLocation: Location;
    muted: boolean;
    onLocationSelect: (location: Location) => void;
    onMuteToggle: () => void;
}

const Navbar = ({
    selectedLocation,
    muted,
    onLocationSelect,
    onMuteToggle,
}: NavbarProps) => {

    const navLinks = [
        "Planetary Explorer",
        "Earth Symphony Studio",
        "Regional Compare",
        "Data Sources & Methodology",
    ];

    const [query, setQuery] = useState("");
    const [searchStatus, setSearchStatus] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const searchController = useRef<AbortController | null>(null);

    // Cancel any pending search when the component unmounts.
    useEffect(() => {
        return () => {
            searchController.current?.abort();
        };
    }, []);

    // Search for a location or coordinates.
    const handleSearch = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const searchQuery = query.trim();

        if (!searchQuery || isSearching) return;

        // Cancel the previous request.
        searchController.current?.abort();

        const controller = new AbortController();
        searchController.current = controller;

        setIsSearching(true);
        setSearchStatus("");

        try {
            const location = await searchLocation(
                searchQuery,
                controller.signal
            );

            // Ignore cancelled requests.
            if (controller.signal.aborted) return;

            if (!location) {
                setSearchStatus("No matching location found.");
                return;
            }

            // Update the selected location in App.tsx.
            onLocationSelect(location);

            setSearchStatus("");
            setQuery("");

        } catch (error) {

            if (controller.signal.aborted) return;

            console.error("Location search failed:", error);

            setSearchStatus(
                error instanceof Error
                    ? error.message
                    : "Location search failed. Please try again."
            );

        } finally {

            if (!controller.signal.aborted) {
                setIsSearching(false);
            }
        }
    };

    return (
        <header className="main-header">

            {/* Main Navigation */}
            <nav className="navbar">

                {/* Logo and Brand */}
                <div className="brand-section">

                    <div className="brand-logo">
                        🛰️
                    </div>

                    <div className="brand-info">
                        <span className="brand-label">
                            NASA SPACE APPS 2026
                        </span>

                        <h2>EARTH INFORMATION JUKEBOX</h2>
                    </div>

                    <div className="connection-status">
                        <span className="status-dot"></span>
                        ORBITAL TELEMETRY ONLINE
                    </div>

                </div>

                {/* Navigation Links */}
                <div className="nav-links">

                    {navLinks.map((link, index) => (
                        <a
                            href="#"
                            key={link}
                            className={index === 0 ? "active" : ""}
                        >
                            {link}
                        </a>
                    ))}

                </div>

                {/* Search and Audio */}
                <div className="nav-actions">

                    <form
                        className="search-box"
                        onSubmit={handleSearch}
                        role="search"
                    >

                        <span>⌕</span>

                        <input
                            type="text"
                            placeholder="Coordinate / Region Search..."
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setSearchStatus("");
                            }}
                            aria-label="Search for a place or coordinates"
                            disabled={isSearching}
                        />

                        <button
                            className="search-submit"
                            type="submit"
                            aria-label="Search"
                            disabled={isSearching || !query.trim()}
                        >
                            {isSearching ? "…" : "↵"}
                        </button>

                    </form>

                    {/* Search Status */}
                    {searchStatus && (
                        <p
                            className="search-status"
                            role="status"
                            aria-live="polite"
                        >
                            {searchStatus}
                        </p>
                    )}

                    {/* Audio Mute Button */}
                    <button
                        className={`audio-button${muted ? " muted" : ""}`}
                        type="button"
                        onClick={onMuteToggle}
                        aria-label={
                            muted
                                ? "Unmute sonification"
                                : "Mute sonification"
                        }
                        aria-pressed={muted}
                        title={
                            muted
                                ? "Unmute sonification"
                                : "Mute sonification"
                        }
                    >
                        {muted ? "🔇" : "🔊"}
                    </button>

                </div>

            </nav>

            {/* Telemetry Status Bar */}
            <div className="telemetry-bar">

                <div className="sensor-live">
                    <span className="status-dot"></span>
                    ORBITAL SENSOR ARRAY LIVE
                </div>

                <div className="telemetry-divider"></div>

                <div className="target-info">
                    TARGET: {selectedLocation.lat.toFixed(4)}°,
                    {" "}
                    {selectedLocation.lng.toFixed(4)}°
                    {" "}
                    ({selectedLocation.name})
                </div>

                <div className="data-sources">
                    MODIS/TERRA · OCO-2 · GPM-IMERG
                </div>

                <div className="mission-status">
                    <span>MISSION MODE:</span>

                    <strong>
                        DECISION TELEMETRY
                    </strong>

                    <span className="latency">
                        LATENCY 18ms
                    </span>
                </div>

            </div>

        </header>
    );
};

export default Navbar;
