import "./Pages.css";

/**
 * Regional Compare — placeholder until the Explorer is stable.
 * Describes what the page will do; it does not show any invented values.
 */
export default function RegionalComparePage() {
  return (
    <main className="page-workspace">
      <section className="page-hero">
        <p className="page-eyebrow">REGIONAL COMPARE</p>
        <h1>Compare two places by ear</h1>
        <p>
          This page will play the NASA POWER monthly air temperature of two
          locations (A and B) one after the other for every month from 2016
          to 2025, using the same temperature-to-pitch mapping for both, so
          the difference between them can be heard as well as seen.
        </p>
        <span className="page-status">IN DEVELOPMENT · NOT YET AVAILABLE</span>
      </section>

      <div className="page-grid">
        <section className="page-card">
          <h2>What it will show</h2>
          <ul>
            <li>Location A and location B selectors (presets and search).</li>
            <li>Both monthly temperature series on one shared chart.</li>
            <li>
              The selected month's temperatures and their difference,
              defined as <strong>A − B</strong> in °C.
            </li>
            <li>Loading, error and saved-data notices for each location.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>How it will sound</h2>
          <ul>
            <li>For each month: A plays, then B (alternating A → B).</li>
            <li>The active location and month are highlighted with the sound.</li>
            <li>Play, pause, resume, stop, seek, speed, volume and mute.</li>
            <li>Missing months stay silent; they are never treated as 0 °C.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>Use the Explorer meanwhile</h2>
          <p>
            Play one location's timeline in the{" "}
            <a className="page-link" href="#/explorer">Planetary Explorer</a>,
            then switch location and play again to compare.
          </p>
        </section>
      </div>
    </main>
  );
}
