import { useEffect, useMemo, useState } from "react";

import { temperatureToSound } from "../../audio/temperatureMapping";
import { T2M_TEMPERATURE_MAPPING } from "../../config/audioMapping";
import { fetchTemperatureSeries } from "../../services/nasaAPI";
import { selectYear } from "../../data/selectors";
import { useAppState } from "../../state/AppProvider";
import {
  firstIndexOfYear,
  lastIndexOfYear,
} from "../../playback/createPlaybackEvents";
import type { TemperatureSeries } from "../../types/dataset";
import type { Location } from "../../types/location";

import SoundLegend from "./SoundLegend";
import TemperatureChart from "./TemperatureChart";
import "./YearSonifier.css";

interface YearSonifierProps {
  location: Location;
  year: number;
  // Optional: lets the chart change the selected year.
  onYearChange?: (year: number) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type LoadState = "loading" | "ready" | "error";

/**
 * Shows the 12 months of the selected year, the 2016–2025 chart and the
 * sound legend. All sound comes from the shared PlaybackController, so this
 * panel and the Chronological Sonic Scrubber never play at the same time.
 */
export default function YearSonifier({
  location,
  year,
  onYearChange,
}: YearSonifierProps) {
  const { state: playback, dispatch, controller } = useAppState();

  const [series, setSeries] = useState<TemperatureSeries | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [previewError, setPreviewError] = useState("");

  // ---------- Data: NASA POWER monthly T2M for the selected location ----------
  // (Shared cache: the timeline uses the same download.)

  useEffect(() => {
    const abort = new AbortController();

    setLoadState("loading");
    setLoadError("");

    fetchTemperatureSeries(location.lat, location.lng, abort.signal)
      .then((data) => {
        setSeries(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;

        setLoadError(
          error instanceof Error ? error.message : "Could not load NASA data.",
        );
        setLoadState("error");
      });

    return () => abort.abort();
  }, [location.lat, location.lng]);

  // The monthly observations of the selected year (validated:
  // month 13 removed, missing values are null).
  const months = useMemo(
    () => (series ? selectYear(series.observations, year) : []),
    [series, year],
  );

  // ---------- Shared playback position ----------

  const isPlaying = playback.status === "playing";
  const showPosition = isPlaying || playback.status === "paused";

  const activeEvent = showPosition
    ? playback.events[playback.dateIndex]
    : undefined;

  const activeObservationId = activeEvent?.id ?? null;

  const activeIndex = activeObservationId
    ? months.findIndex((month) => month.id === activeObservationId)
    : -1;

  const activeSound =
    activeIndex >= 0
      ? temperatureToSound(
          months[activeIndex].temperatureC,
          T2M_TEMPERATURE_MAPPING,
        )
      : undefined;

  // The shared events belong to this location once their ids match.
  const eventsReady =
    playback.events.length > 0 &&
    months.length > 0 &&
    playback.events.some((event) => event.id === months[0].id);

  // ---------- Controls ----------

  function handlePlayYear() {
    const start = firstIndexOfYear(playback.events, year);
    const end = lastIndexOfYear(playback.events, year);
    if (start < 0 || end < 0) return;

    setPreviewError("");
    // Start audio inside the click (browser rule), then play.
    controller?.unlock();
    dispatch({ type: "PLAY_RANGE", payload: { startIndex: start, endIndex: end } });
  }

  function handleStop() {
    dispatch({ type: "STOP" });
  }

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch({
      type: "SET_VOLUME",
      payload: { volume: Number(event.target.value) },
    });
  }

  async function handlePreview(temperatureC: number) {
    if (!controller) return;

    // Pause the timeline before previewing a reference tone.
    if (isPlaying) dispatch({ type: "PAUSE" });
    setPreviewError("");

    try {
      await controller.preview(temperatureC, playback, T2M_TEMPERATURE_MAPPING);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Audio could not start.",
      );
    }
  }

  const audioError = playback.error || previewError;

  // ---------- Render ----------

  return (
    <section className="year-sonifier" aria-label="Temperature sonification">
      <div className="ys-header">
        <div>
          <p className="ys-eyebrow">TEMPERATURE SONIFICATION</p>
          <h2>
            {location.name} · {year}
          </h2>
          <p className="ys-subtitle">
            Each note is one month of NASA POWER T2M air temperature.
            Higher pitch means warmer.
          </p>
        </div>

        <div className="ys-controls">
          <button
            type="button"
            className="ys-play"
            onClick={isPlaying ? handleStop : handlePlayYear}
            disabled={!isPlaying && (!eventsReady || months.length === 0)}
          >
            {isPlaying ? "■ STOP" : "▶ PLAY YEAR"}
          </button>

          <label className="ys-volume">
            <span>Volume{playback.soundEnabled ? "" : " (muted)"}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playback.volume}
              onChange={handleVolumeChange}
              aria-label="Sonification volume"
            />
          </label>
        </div>
      </div>

      {series?.origin === "snapshot" && (
        <p className="ys-status ys-offline">
          NASA POWER is not responding, so saved NASA data is shown
          {series.snapshotCreatedAt
            ? ` (downloaded ${series.snapshotCreatedAt.slice(0, 10)})`
            : ""}
          .
        </p>
      )}

      {loadState === "loading" && (
        <p className="ys-status">Loading NASA POWER data…</p>
      )}

      {loadState === "error" && (
        <p className="ys-status ys-error">{loadError}</p>
      )}

      {audioError && <p className="ys-status ys-error">{audioError}</p>}

      {loadState === "ready" && months.length === 0 && (
        <p className="ys-status">No monthly data available for {year}.</p>
      )}

      {months.length > 0 && (
        <ol className="ys-months">
          {months.map((month, index) => {
            const sound = temperatureToSound(
              month.temperatureC,
              T2M_TEMPERATURE_MAPPING,
            );

            return (
              <li
                key={month.id}
                className={`ys-month ${index === activeIndex ? "active" : ""} ${
                  month.temperatureC === null ? "missing" : ""
                }`}
              >
                <span className="ys-month-name">
                  {MONTH_NAMES[month.month - 1]}
                </span>
                <strong>
                  {month.temperatureC === null
                    ? "—"
                    : `${month.temperatureC.toFixed(1)}°C`}
                </strong>
                <span className="ys-hz">
                  {sound.frequencyHz === null
                    ? "no tone"
                    : `${Math.round(sound.frequencyHz)} Hz`}
                  {sound.clipped ? " *" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {series && loadState === "ready" && (
        <TemperatureChart
          observations={series.observations}
          selectedYear={year}
          activeObservationId={activeObservationId}
          onYearSelect={onYearChange}
        />
      )}

      <SoundLegend
        className="ys-legend"
        mapping={T2M_TEMPERATURE_MAPPING}
        currentSound={activeSound}
        onPreview={handlePreview}
        onStopPreview={() => controller?.halt()}
      />

      <p className="ys-source">
        Source: NASA POWER (T2M, monthly)
        {series?.origin === "snapshot" ? ", saved copy" : ""}. Mapping:{" "}
        {T2M_TEMPERATURE_MAPPING.id}.
        * = outside the sound range, pitch limited to the nearest endpoint.
      </p>
    </section>
  );
}
