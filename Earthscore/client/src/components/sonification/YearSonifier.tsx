import { useEffect, useMemo, useState } from "react";

import { temperatureToSound } from "../../audio/temperatureMapping";
import {
  SOUND_PARAMETERS,
  SOUND_PARAMETER_IDS,
  formatValue,
  type SoundParameterId,
} from "../../config/parameters";
import { fetchMonthlySeries } from "../../services/monthlySeries";
import { useAppState } from "../../state/AppProvider";
import {
  firstIndexOfYear,
  lastIndexOfYear,
} from "../../playback/createPlaybackEvents";
import type { MonthlySeries } from "../../types/dataset";
import type { Location } from "../../types/location";

import SoundLegend from "./SoundLegend";
import TemperatureChart from "./TemperatureChart";
import "./YearSonifier.css";

interface YearSonifierProps {
  location: Location;
  year: number;
  // Which parameter is turned into sound (chosen here, owned by App).
  parameterId: SoundParameterId;
  onParameterChange: (id: SoundParameterId) => void;
  // Optional: lets the chart change the selected year.
  onYearChange?: (year: number) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type LoadState = "loading" | "ready" | "error";

/**
 * Shows the 12 months of the selected year for the chosen parameter, the
 * 2016–2025 chart and the sound legend. All sound comes from the shared
 * PlaybackController, so this panel and the Chronological Sonic Scrubber
 * never play at the same time.
 */
export default function YearSonifier({
  location,
  year,
  parameterId,
  onParameterChange,
  onYearChange,
}: YearSonifierProps) {
  const { state: playback, dispatch, controller } = useAppState();
  const parameter = SOUND_PARAMETERS[parameterId];

  const [series, setSeries] = useState<MonthlySeries | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [previewError, setPreviewError] = useState("");

  // ---------- Data (shared cache: the timeline uses the same download) ----------

  useEffect(() => {
    const abort = new AbortController();

    setSeries(null);
    setLoadState("loading");
    setLoadError("");

    fetchMonthlySeries(parameterId, location.lat, location.lng, abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return;
        setSeries(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;

        setLoadError(
          error instanceof Error ? error.message : "Could not load the data.",
        );
        setLoadState("error");
      });

    return () => abort.abort();
  }, [parameterId, location.lat, location.lng]);

  // The monthly observations of the selected year.
  const months = useMemo(
    () =>
      series
        ? series.observations
            .filter((o) => o.year === year)
            .sort((a, b) => a.month - b.month)
        : [],
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
      ? temperatureToSound(months[activeIndex].value, parameter.mapping)
      : undefined;

  // The shared events belong to this location and parameter once ids match.
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
    controller?.stopAll();
    dispatch({ type: "STOP" });
  }

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch({
      type: "SET_VOLUME",
      payload: { volume: Number(event.target.value) },
    });
  }

  async function handlePreview(value: number) {
    if (!controller) return;

    // Pause the timeline before previewing a reference tone.
    if (isPlaying) dispatch({ type: "PAUSE" });
    setPreviewError("");

    try {
      await controller.preview(value, playback, parameter.mapping);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Audio could not start.",
      );
    }
  }

  const audioError = playback.error || previewError;

  // ---------- Render ----------

  return (
    <section className="year-sonifier" aria-label="Sonification">
      <div className="ys-header">
        <div>
          <p className="ys-eyebrow">{parameter.label.toUpperCase()} SONIFICATION</p>
          <h2>
            {location.name} · {year}
          </h2>
          <p className="ys-subtitle">
            Each note is one month. {parameter.description} Higher pitch
            means {parameter.highWord}.
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

      {/* Which data becomes sound */}
      <div className="ys-parameters" role="group" aria-label="Sound source">
        <span>SOUND SOURCE</span>
        {SOUND_PARAMETER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={id === parameterId ? "active" : ""}
            aria-pressed={id === parameterId}
            onClick={() => onParameterChange(id)}
            title={SOUND_PARAMETERS[id].source}
          >
            {SOUND_PARAMETERS[id].label}
            {SOUND_PARAMETERS[id].scope === "global" ? " (global)" : ""}
          </button>
        ))}
      </div>

      {parameter.scope === "global" && (
        <p className="ys-status ys-global">
          {parameter.label} is a global monthly average from NOAA: it is the
          same for every location and shows the worldwide trend, not the
          selected place.
        </p>
      )}

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
        <p className="ys-status">Loading {parameter.source}…</p>
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
            const sound = temperatureToSound(month.value, parameter.mapping);

            return (
              <li
                key={month.id}
                className={`ys-month ${index === activeIndex ? "active" : ""} ${
                  month.value === null ? "missing" : ""
                }`}
              >
                <span className="ys-month-name">
                  {MONTH_NAMES[month.month - 1]}
                </span>
                <strong>
                  {month.value === null
                    ? "—"
                    : `${month.value.toFixed(parameter.decimals)}`}
                </strong>
                <span className="ys-unit">{month.value === null ? "" : parameter.unit}</span>
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
          parameter={parameter}
          selectedYear={year}
          activeObservationId={activeObservationId}
          onYearSelect={onYearChange}
        />
      )}

      <SoundLegend
        className="ys-legend"
        parameter={parameter}
        currentSound={activeSound}
        onPreview={handlePreview}
        onStopPreview={() => controller?.stopAll()}
      />

      <p className="ys-source">
        Source: {parameter.source}
        {series?.origin === "snapshot" ? ", saved copy" : ""}. Mapping:{" "}
        {parameter.mapping.id} ({formatValue(parameter.mapping.minTemperatureC, parameter)} →{" "}
        {parameter.mapping.minFrequencyHz} Hz, {formatValue(parameter.mapping.maxTemperatureC, parameter)} →{" "}
        {parameter.mapping.minFrequencyHz * 2 ** parameter.mapping.octaves} Hz).
        * = outside the sound range, pitch limited to the nearest endpoint.
      </p>
    </section>
  );
}
