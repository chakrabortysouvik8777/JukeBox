import { useEffect, useMemo, useRef, useState } from "react";

import { useAudioEngine } from "../../audio/useAudioEngine";
import { temperatureToSound } from "../../audio/temperatureMapping";
import { T2M_TEMPERATURE_MAPPING } from "../../config/audioMapping";
import {
  fetchTemperature,
  type TemperatureData,
} from "../../services/nasaAPI";
import type { Location } from "../../types/location";

import SoundLegend from "./SoundLegend";
import "./YearSonifier.css";

interface YearSonifierProps {
  location: Location;
  year: number;
}

// Seconds between the start of one month's note and the next.
const STEP_SECONDS = 0.6;

// Note length; shorter than the step so months are heard separately.
const NOTE_SECONDS = 0.5;

// Small delay so the first note is never scheduled in the past.
const LEAD_SECONDS = 0.1;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type LoadState = "loading" | "ready" | "error";

export default function YearSonifier({ location, year }: YearSonifierProps) {
  const engineRef = useAudioEngine();

  const [records, setRecords] = useState<TemperatureData[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [audioError, setAudioError] = useState("");

  // Every new Play/Stop increases this number.
  // Old callbacks compare their copy and quit if it is outdated.
  const generationRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  // ---------- Data: NASA POWER monthly T2M for the selected location ----------

  useEffect(() => {
    const controller = new AbortController();

    setLoadState("loading");
    setLoadError("");

    fetchTemperature(location.lat, location.lng, controller.signal)
      .then((data) => {
        setRecords(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setLoadError(
          error instanceof Error ? error.message : "Could not load NASA data.",
        );
        setLoadState("error");
      });

    return () => controller.abort();
  }, [location.lat, location.lng]);

  // The 12 months of the selected year.
  // NASA POWER also returns month "13" (the annual mean), which is skipped.
  const months = useMemo(() => {
    return records
      .filter((record) => {
        const recordYear = Number(record.date.slice(0, 4));
        const month = Number(record.date.slice(4, 6));

        return recordYear === year && month >= 1 && month <= 12;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records, year]);

  // ---------- Playback ----------

  function cancelFrame() {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  function stopPlayback() {
    generationRef.current += 1;
    cancelFrame();
    engineRef.current?.stop();
    setIsPlaying(false);
    setActiveIndex(null);
  }

  // Stop when the location or year changes, and when leaving the page.
  useEffect(() => {
    return () => stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng, year]);

  async function handlePlay() {
    const engine = engineRef.current;

    if (!engine || months.length === 0) return;

    stopPlayback();
    const generation = generationRef.current;

    setAudioError("");

    try {
      // Must be called from the button click (browser audio rule).
      await engine.start();
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : "Audio could not start.",
      );
      return;
    }

    // The user may have pressed Stop while audio was starting.
    if (generation !== generationRef.current) return;

    engine.setVolume(volume);

    const t0 = engine.getAudioTime() + LEAD_SECONDS;

    months.forEach((month, index) => {
      engine.scheduleTemperature(
        month.temperature,
        t0 + index * STEP_SECONDS,
        NOTE_SECONDS,
        T2M_TEMPERATURE_MAPPING,
      );
    });

    setIsPlaying(true);

    // Highlight the month the listener is hearing now.
    const tick = () => {
      if (generation !== generationRef.current) return;

      const elapsed = engine.getPlaybackTime() - t0;
      const index = Math.floor(elapsed / STEP_SECONDS);

      if (index >= months.length) {
        setIsPlaying(false);
        setActiveIndex(null);
        frameRef.current = null;
        return;
      }

      setActiveIndex(index >= 0 ? index : null);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newVolume = Number(event.target.value);

    setVolume(newVolume);
    engineRef.current?.setVolume(newVolume);
  }

  // ---------- Sound legend preview ----------

  async function handlePreview(temperatureC: number) {
    const engine = engineRef.current;
    if (!engine) return;

    // Pause the timeline before previewing a reference tone.
    stopPlayback();
    setAudioError("");

    try {
      await engine.start();
      engine.setVolume(volume);
      engine.playTemperature(temperatureC, 1, T2M_TEMPERATURE_MAPPING);
    } catch (error) {
      setAudioError(
        error instanceof Error ? error.message : "Audio could not start.",
      );
    }
  }

  const activeSound =
    activeIndex !== null && months[activeIndex]
      ? temperatureToSound(
          months[activeIndex].temperature,
          T2M_TEMPERATURE_MAPPING,
        )
      : undefined;

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
            onClick={isPlaying ? stopPlayback : handlePlay}
            disabled={loadState !== "ready" || months.length === 0}
          >
            {isPlaying ? "■ STOP" : "▶ PLAY YEAR"}
          </button>

          <label className="ys-volume">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              aria-label="Sonification volume"
            />
          </label>
        </div>
      </div>

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
              month.temperature,
              T2M_TEMPERATURE_MAPPING,
            );
            const monthNumber = Number(month.date.slice(4, 6));

            return (
              <li
                key={month.date}
                className={`ys-month ${index === activeIndex ? "active" : ""} ${
                  month.temperature === null ? "missing" : ""
                }`}
              >
                <span className="ys-month-name">
                  {MONTH_NAMES[monthNumber - 1]}
                </span>
                <strong>
                  {month.temperature === null
                    ? "—"
                    : `${month.temperature.toFixed(1)}°C`}
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

      <SoundLegend
        className="ys-legend"
        mapping={T2M_TEMPERATURE_MAPPING}
        currentSound={activeSound}
        onPreview={handlePreview}
        onStopPreview={() => engineRef.current?.stop()}
      />

      <p className="ys-source">
        Source: NASA POWER (T2M, monthly). Mapping: {T2M_TEMPERATURE_MAPPING.id}.
        * = outside the sound range, pitch limited to the nearest endpoint.
      </p>
    </section>
  );
}