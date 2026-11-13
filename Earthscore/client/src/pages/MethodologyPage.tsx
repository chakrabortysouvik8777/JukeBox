import "./Pages.css";
import { T2M_TEMPERATURE_MAPPING } from "../config/audioMapping";
import { PLAYBACK_DEFAULTS } from "../config/defaults";
import { SOUND_PARAMETERS, SOUND_PARAMETER_IDS } from "../config/parameters";

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
          The prototype turns monthly Earth data into sound: each month
          becomes one note, and a higher value sounds higher. Four parameters
          can be heard — air temperature and rainfall at any point on Earth
          (NASA POWER), and global CO₂ and methane (NOAA). The same values
          drive the chart, the month cards and the audio, so what you see and
          what you hear always match.
        </p>
      </section>

      <div className="page-grid">
        <section className="page-card">
          <h2>1. The data used for sound</h2>
          <p>
            Monthly values for 2016–2025. Temperature is the default; the
            others are chosen with <strong>Sound source</strong> in the
            Explorer.
          </p>
          <ul>
            <li><strong>Temperature</strong> — NASA POWER T2M: mean air temperature at 2 m, °C.</li>
            <li><strong>Rainfall</strong> — NASA POWER PRECTOTCORR: bias-corrected precipitation, mm/day (monthly mean).</li>
            <li><strong>CO₂ / CH₄</strong> — NOAA GML global monthly means (ppm / ppb). Not NASA, and the same for every location.</li>
            <li>NASA POWER values are the gridded product at the selected point, not a weather-station reading and not a city-wide average.</li>
            <li>Fetched live in the browser; no API key is used. If NASA POWER does not respond within 15 seconds, saved NASA data for the six preset locations is used, and the app says so with the download date.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>2. Checks before use</h2>
          <ul>
            <li>NASA's month 13 (the annual mean) is removed.</li>
            <li>The fill value −999 becomes <em>missing</em>, never 0 °C.</li>
            <li>Values below −90 °C or above 60 °C, and rainfall below 0 or above 200 mm/day, are treated as missing.</li>
            <li>Months absent from a response are inserted as missing, so timing stays even.</li>
            <li>A response in the wrong units is rejected.</li>
          </ul>
        </section>

        <section className="page-card">
          <h2>3. Value → pitch</h2>
          <p>
            Each parameter has one fixed mapping (a project design choice,
            not a NASA standard), the same for every place and year. For
            temperature (<code>{m.id}</code>):
          </p>
          <span className="page-formula">
            {`u = clamp((T − (${m.minTemperatureC})) / (${m.maxTemperatureC} − (${m.minTemperatureC})), 0, 1)
frequency = ${m.minFrequencyHz} Hz × 2^(${m.octaves} × u)`}
          </span>
          <p>
            {m.minTemperatureC} °C → {m.minFrequencyHz} Hz, {m.maxTemperatureC} °C → {maxHz} Hz
            ({m.octaves} octaves). Values outside a range use the nearest end
            pitch; the original value is still shown and marked *. Loudness
            never depends on the value.
          </p>
        </section>

        <section className="page-card page-wide">
          <h2>3b. Mappings of all sonified parameters</h2>
          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Source</th>
                  <th>Where</th>
                  <th>Mapping</th>
                  <th>Low → high</th>
                </tr>
              </thead>
              <tbody>
                {SOUND_PARAMETER_IDS.map((id) => {
                  const p = SOUND_PARAMETERS[id];
                  const top = p.mapping.minFrequencyHz * 2 ** p.mapping.octaves;
                  return (
                    <tr key={id}>
                      <td>{p.label}</td>
                      <td>{p.source}</td>
                      <td>{p.scope === "point" ? "Selected point" : "Global average"}</td>
                      <td><code>{p.mapping.id}</code></td>
                      <td>
                        {p.mapping.minTemperatureC} {p.unit} → {p.mapping.minFrequencyHz} Hz,{" "}
                        {p.mapping.maxTemperatureC} {p.unit} → {top} Hz
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p>
            CO₂ and CH₄ rise steadily, so their sound is a slow climb with a
            small yearly wobble; they show the worldwide trend, not the
            selected place. Ranges were chosen to cover 2016–2025 values.
          </p>
        </section>

        <section className="page-card">
          <h2>4. Timing and playback</h2>
          <ul>
            <li>One month every {PLAYBACK_DEFAULTS.secondsPerEvent} s at 1× speed: a year lasts {yearSeconds} s, 2016–2025 about {Math.round(10 * yearSeconds)} s.</li>
            <li>Notes are scheduled on the audio clock; the visuals follow what is being heard.</li>
            <li>Missing months are silent but keep their time slot.</li>
            <li>The DAW Engine renders the same notes to a WAV file for download (stereo in Regional Compare: A left, B right).</li>
          </ul>
        </section>

        <section className="page-card page-wide">
          <h2>5. Side panels (shown as numbers)</h2>
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

        <section className="page-card page-wide">
          <h2>5b. Not sonified (yet) and why</h2>
          <ul>
            <li><strong>Air quality</strong> — the panel shows a current model estimate, not a 2016–2025 monthly series. A NASA monthly aerosol series (aerosol optical depth) is a candidate, but is not yet verified.</li>
            <li><strong>Vegetation (NDVI)</strong> — available from NASA MODIS, but ten years need about 23 separate requests per location, too slow for a live demo. A saved series is a possible next step.</li>
            <li><strong>Population</strong> — one modelled value per year, not a monthly series, so there is nothing to play month by month.</li>
          </ul>
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
            <li>Temperature or rainfall can be compared (CO₂ and CH₄ are global, so A and B would be identical).</li>
            <li>Both use the same pitch mapping, so the same value always gives the same note.</li>
            <li>Each month plays A then B. With headphones A is on the left and B on the right (partly panned, so speakers still play both).</li>
            <li>The difference is <strong>A − B</strong> for the same month in the parameter's unit, not a climate anomaly.</li>
            <li>The DAW Engine on that page renders the comparison as a stereo WAV file.</li>
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
