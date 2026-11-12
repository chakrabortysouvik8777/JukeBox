import "./Pages.css";
import { T2M_TEMPERATURE_MAPPING } from "../config/audioMapping";
import { PLAYBACK_DEFAULTS } from "../config/defaults";

/**
 * Data Sources & Methodology — what the data is, how it becomes sound,
 * and what the prototype does not claim.
 */
export default function MethodologyPage() {
  const m = T2M_TEMPERATURE_MAPPING;
  const maxHz = m.minFrequencyHz * 2 ** m.octaves;
  const yearSeconds = 12 * PLAYBACK_DEFAULTS.secondsPerEvent;

  return (
    <main className="page-workspace">
      <section className="page-hero">
        <p className="page-eyebrow">DATA SOURCES & METHODOLOGY</p>
        <h1>How the Earth Information Jukebox works</h1>
        <p>
          The prototype turns NASA monthly air-temperature data for any point
          on Earth into sound: each month becomes one note, and warmer months
          sound higher. The same values drive the chart, the month cards, the
          globe badge and the audio, so what you see and what you hear always
          match.
        </p>
      </section>

      <div className="page-grid">
        <section className="page-card">
          <h2>1. The data used for sound</h2>
          <p>
            <strong>NASA POWER, parameter T2M</strong>: monthly mean air
            temperature at 2 metres above the ground, in °C, for 2016–2025.
          </p>
          <ul>
            <li>Value of NASA POWER's gridded product at the selected point, not a weather-station reading and not a city-wide average.</li>
            <li>Fetched live in the browser; no API key is used.</li>
            <li>If NASA POWER does not respond within 15 seconds, saved NASA data for the six preset locations is used, and the app says so with the download date.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>2. Checks before use</h2>
          <ul>
            <li>NASA's month 13 (the annual mean) is removed.</li>
            <li>The fill value −999 becomes <em>missing</em>, never 0 °C.</li>
            <li>Values below −90 °C or above 60 °C are treated as missing.</li>
            <li>Months absent from a response are inserted as missing, so timing stays even.</li>
            <li>A response in the wrong units is rejected.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>3. Temperature → pitch</h2>
          <p>
            Mapping <code>{m.id}</code> (a project design choice, not a NASA
            standard), the same for every place and year:
          </p>
          <span className="page-formula">
            {`u = clamp((T − (${m.minTemperatureC})) / (${m.maxTemperatureC} − (${m.minTemperatureC})), 0, 1)
frequency = ${m.minFrequencyHz} Hz × 2^(${m.octaves} × u)`}
          </span>
          <p>
            {m.minTemperatureC} °C → {m.minFrequencyHz} Hz, {m.maxTemperatureC} °C → {maxHz} Hz
            ({m.octaves} octaves). Temperatures outside the range use the
            nearest end pitch; the original value is still shown and marked *.
            Loudness never depends on temperature.
          </p>
        </section>

        <section className="page-card">
          <h2>4. Timing and playback</h2>
          <ul>
            <li>One month every {PLAYBACK_DEFAULTS.secondsPerEvent} s at 1× speed: a year lasts {yearSeconds} s, 2016–2025 about {Math.round(10 * yearSeconds)} s.</li>
            <li>Notes are scheduled on the audio clock; the visuals follow what is being heard.</li>
            <li>Missing months are silent but keep their time slot.</li>
            <li>The DAW Engine renders the same notes to a WAV file for download.</li>
          </ul>
        </section>

        <section className="page-card page-wide">
          <h2>5. Other panels (shown, not sonified)</h2>
          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Panel</th>
                  <th>Source</th>
                  <th>What it is</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Current weather</td>
                  <td>Open-Meteo forecast API (not NASA)</td>
                  <td>Current model estimate at the point</td>
                </tr>
                <tr>
                  <td>Air quality</td>
                  <td>Open-Meteo air-quality API (not NASA)</td>
                  <td>Current model estimate; missing pollutants shown as “N/A”</td>
                </tr>
                <tr>
                  <td>Rainfall</td>
                  <td>Open-Meteo historical weather API (not NASA)</td>
                  <td>Historical daily data at the point, summarised</td>
                </tr>
                <tr>
                  <td>Vegetation (NDVI)</td>
                  <td>NASA MODIS MOD13Q1 via ORNL DAAC</td>
                  <td>16-day satellite vegetation index at 250 m</td>
                </tr>
                <tr>
                  <td>Greenhouse gases</td>
                  <td>NOAA Global Monitoring Laboratory (not NASA)</td>
                  <td>Global monthly averages, not values for the selected point</td>
                </tr>
                <tr>
                  <td>Population</td>
                  <td>WorldPop (not NASA)</td>
                  <td>Modelled population of a ~100 m grid cell</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="page-card">
          <h2>6. Globe badge</h2>
          <p>
            “2025 · +0.9°C VS AVG” means: the mean T2M of that year minus the
            mean of all complete years 2016–2025 at that point. It is a simple
            comparison within this period, not an official climate anomaly
            (those use a 30-year baseline). Years with a missing month show
            “NO FULL YEAR”.
          </p>
        </section>

        <section className="page-card">
          <h2>7. Regional Compare</h2>
          <ul>
            <li>Two locations are aligned by calendar month; a month missing at one location stays missing (silent) there.</li>
            <li>Both use the same pitch mapping, so the same temperature always gives the same note.</li>
            <li>Each month plays A then B. With headphones A is on the left and B on the right (partly panned, so speakers still play both).</li>
            <li>The difference is <strong>A − B</strong> for the same month in °C, not a climate anomaly.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>8. What this prototype does not claim</h2>
          <ul>
            <li>It does not detect heatwaves or prove climate trends.</li>
            <li>A 10-year point series is not a climate record.</li>
            <li>The sound is an aid to listening, not a scientific measurement.</li>
            <li>It has not been evaluated with users yet.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
