
import { useState, type FormEvent } from "react";
import type { Location } from "../../types/location";
import "./Navbar.css";

interface NavbarProps {
    selectedLocation: Location;
    onCoordinateSearch: (latitude: number, longitude: number) => void;
}

const Navbar = ({
    selectedLocation,
    onCoordinateSearch,
}: NavbarProps) => {
    const navLinks = [
        "Planetary Explorer",
        "Earth Symphony Studio",
        "Regional Compare",
    ];

    const [coordinates, setCoordinates] = useState("");
    const [searchError, setSearchError] = useState("");

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Expected format: latitude, longitude
        const parts = coordinates.split(",").map((value) => value.trim());

        if (parts.length !== 2) {
            setSearchError("Enter coordinates as latitude, longitude.");
            return;
        }

        const latitude = Number(parts[0]);
        const longitude = Number(parts[1]);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            setSearchError("Enter valid coordinates (lat: -90 to 90, lng: -180 to 180).");
            return;
        }

        setSearchError("");
        onCoordinateSearch(latitude, longitude);
    };

    return (
        <header className="main-header">
            <nav className="navbar">
                <div className="brand-section">
                    <div className="brand-logo">🛰️</div>

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

                <div className="nav-links">
                    {navLinks.map((link, index) => (
                        <a
                            href="#"
                            key={index}
                            className={index === 0 ? "active" : ""}
                        >
                            {link}
                        </a>
                    ))}
                </div>

                <div className="nav-actions">
                    <form className="search-box" onSubmit={handleSearch}>
                        <span>⌕</span>
                        <input
                            type="text"
                            value={coordinates}
                            onChange={(event) =>
                                setCoordinates(event.target.value)
                            }
                            placeholder="Latitude, Longitude..."
                            aria-label="Search by latitude and longitude"
                        />
                        <button type="submit" aria-label="Search coordinates">
                            Go
                        </button>
                    </form>

                    <button
                        className="audio-button"
                        aria-label="Audio settings"
                        type="button"
                    >
                        🔊
                    </button>

                    {searchError && (
                        <p className="coordinate-error">{searchError}</p>
                    )}
                </div>
            </nav>

            <div className="telemetry-bar">
                <div className="sensor-live">
                    <span className="status-dot"></span>
                    ORBITAL SENSOR ARRAY LIVE
                </div>

                <div className="telemetry-divider"></div>

                <div className="target-info">
                    TARGET: {selectedLocation.lat.toFixed(4)}°,
                    {" "}{selectedLocation.lng.toFixed(4)}°
                    {" "}({selectedLocation.name})
                </div>

                <div className="data-sources">
                    MODIS/TERRA · OCO-2 · GPM-IMERG
                </div>

                <div className="mission-status">
                    <span>MISSION MODE:</span>
                    <strong>DECISION TELEMETRY</strong>
                    <span className="latency">LATENCY 18ms</span>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
