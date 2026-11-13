
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { Location } from "../../types/location";
import { searchLocation } from "../../utils/searchLocation";
import { PAGES, hashForPage, type PageId } from "../../utils/useHashPage";

import "./Navbar.css";

interface NavbarProps {
    currentPage: PageId;
    selectedLocation: Location | null;
    muted: boolean;
    onLocationSelect: (location: Location) => void;
    onMuteToggle: () => void;
}

const Navbar = ({
    currentPage,
    selectedLocation,
    muted,
    onLocationSelect,
    onMuteToggle,
}: NavbarProps) => {

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

    // If the location is changed elsewhere (globe, preset) while a search is
    // still running, cancel the search so its late result cannot overwrite
    // the newer selection.
    useEffect(() => {
        if (searchController.current && !searchController.current.signal.aborted) {
            searchController.current.abort();
            setIsSearching(false);
        }
    }, [selectedLocation?.lat, selectedLocation?.lng]);

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

            // Done: this search is no longer pending.
            searchController.current = null;

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


                </div>

                {/* Navigation Links */}
                <div className="nav-links">

                    {PAGES.map((page) => (
                        <a
                            href={hashForPage(page.id)}
                            key={page.id}
                            className={page.id === currentPage ? "active" : ""}
                            aria-current={page.id === currentPage ? "page" : undefined}
                        >
                            {page.label}
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

                        {searchStatus && (
                            <p
                                className="search-status"
                                role="status"
                                aria-live="polite"
                            >
                                {searchStatus}
                            </p>
                        )}
                    </form>

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

            {/* Status bar: selected point and the data actually used */}
            <div className="telemetry-bar">

                <div className="target-info">
                    {selectedLocation
                        ? `TARGET: ${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lng.toFixed(4)}° (${selectedLocation.name})`
                        : "TARGET: NONE SELECTED"}
                </div>

                <div className="telemetry-divider"></div>

                <div className="data-sources">
                    SOUND: NASA POWER T2M (monthly air temperature at 2 m)
                </div>

                <div className="mission-status">
                    <a className="latency" href={hashForPage("methodology")}>
                        HOW IT WORKS
                    </a>
                </div>

            </div>

        </header>
    );
};

export default Navbar;
