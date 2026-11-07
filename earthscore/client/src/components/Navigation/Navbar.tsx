import "./Navbar.css";

const Navbar = () => {
    const navLinks = ["Planetary Explorer", "Earth Symphony Studio", "Regional Compare", "Data Sources & Methodology"];
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
                            key={index}
                            className={index === 0 ? "active" : ""}
                        >
                            {link}
                        </a>
                    ))}
                </div>

                {/* Search and Audio */}
                <div className="nav-actions">
                    <div className="search-box">
                        <span>⌕</span>
                        <input
                            type="text"
                            placeholder="Coordinate / Region Search..."
                        />
                    </div>

                    <button className="audio-button" aria-label="Audio settings">
                        🔊
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
                    TARGET: 22.5726° N, 88.3639° E (BENGAL BASIN)
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