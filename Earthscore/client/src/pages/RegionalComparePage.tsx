import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./Pages.css";
import "./RegionalCompare.css";

import { useAppState } from "../state/AppProvider";
import { fetchTemperatureSeries } from "../services/nasaAPI";
import { T2M_TEMPERATURE_MAPPING } from "../config/audioMapping";
import { temperatureToSound } from "../audio/temperatureMapping";
import {
  alignSeries,
  createCompareEvents,
  eventOfMonth,
  monthOfEvent,
  type CompareRow,
} from "../data/compare";
import { PRESET_LOCATIONS, presetByName } from "../utils/presets";
import { searchLocation } from "../utils/searchLocation";
import type { Location } from "../types/location";
import type { TemperatureSeries } from "../types/dataset";

type Slot = "A" | "B";

interface LoadState {
  status: "loading" | "ready" | "error";
  series: TemperatureSeries | null;
  error: string;
}

const LOADING: LoadState = { status: "loading", series: null, error: "" };

const MATCHUPS: ReadonlyArray<[string, string]> = [
  ["Kolkata", "Svalbard"],
  ["Svalbard", "Amazon"],
  ["Tokyo", "Sahara"],
];

const SPEEDS = [0.5, 1, 2] as const;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COLORS: Record<Slot, string> = { A: "#427b9c", B: "#b7502d" };

function formatC(value: number | null): string {
  return value === null ? "missing" : `${value.toFixed(1)} °C`;
}

function formatHz(value: number | null): string {
  if (value === null) return "no tone";
  return `${Math.round(temperatureToSound(value, T2M_TEMPERATURE_MAPPING).frequencyHz ?? 0)} Hz`;
}

function monthLabel(row: CompareRow | undefined): string {
  return row ? `${MONTH_NAMES[row.month - 1]} ${row.year}` : "";
}

// ---------- Location picker (presets + search) ----------

interface PickerProps {
  slot: Slot;
  location: Location;
  load: LoadState;
  active: boolean;
  onSelect: (location: Location) => void;
}

function LocationPicker({ slot, location, load, active, onSelect }: PickerProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel a pending search if the location changes another way or on leave.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSearching(false);
  }, [location.lat, location.lng]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text || searching) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setSearching(true);
    setStatus("");

    try {
      const result = await searchLocation(text, abort.signal);
      if (abort.signal.aborted) return;

      if (!result) {
        setStatus("No matching location found.");
      } else {
        abortRef.current = null;
        setQuery("");
        onSelect(result);
      }
    } catch (error) {
      if (abort.signal.aborted) return;
      setStatus(error instanceof Error ? error.message : "Search failed.");
    } finally {
      if (!abort.signal.aborted) setSearching(false);
    }
  }

  return (
    <section
      className={`compare-card slot-${slot.toLowerCase()} ${active ? "is-active" : ""}`}
      aria-label={`Location ${slot}`}
    >
      <div className="compare-card-top">
        <span className="compare-slot-badge">
          LOCATION {slot} · {slot === "A" ? "LEFT" : "RIGHT"} EAR
        </span>
        {active && <span className="compare-now">♪ PLAYING NOW</span>}
      </div>

      <h2>
        {location.name}
        <small>
          {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
        </small>
      </h2>

      <div className="compare-presets" role="group" aria-label={`Presets for ${slot}`}>
        {PRESET_LOCATIONS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className={preset.name === location.name ? "selected" : ""}
            aria-pressed={preset.name === location.name}
            onClick={() => onSelect(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <form className="compare-search" onSubmit={handleSearch} role="search">
        <input
          type="text"
          value={query}
          placeholder="Search a place or lat, lng"
          aria-label={`Search location ${slot}`}
          onChange={(e) => {
            setQuery(e.target.value);
            setStatus("");
          }}
          disabled={searching}
        />
        <button type="submit" disabled={searching || !query.trim()}>
          {searching ? "…" : "Go"}
        </button>
      </form>
      {status && <p className="compare-msg compare-error">{status}</p>}

      {load.status === "loading" && <p className="compare-msg">Loading NASA POWER data…</p>}
      {load.status === "error" && <p className="compare-msg compare-error">{load.error}</p>}
      {load.series?.origin === "snapshot" && (
        <p className="compare-msg compare-offline">
          NASA POWER not responding: saved NASA data
          {load.series.snapshotCreatedAt
            ? ` (downloaded ${load.series.snapshotCreatedAt.slice(0, 10)})`
            : ""}
          .
        </p>
      )}
      {load.status === "ready" && load.series && load.series.missingCount > 0 && (
        <p className="compare-msg">
          {load.series.missingCount} missing month
          {load.series.missingCount === 1 ? "" : "s"} (silent).
        </p>
      )}
    </section>
  );
}

// ---------- Page ----------

/**
 * Regional Compare: NASA POWER T2M for two locations, aligned by month,
 * on one chart, played alternately A → B with the same pitch mapping.
 * Uses the shared playback timeline, so it never overlaps Explorer audio.
 */
export default function RegionalComparePage() {
  const { state: playback, dispatch, controller } = useAppState();

  const [locA, setLocA] = useState<Location>(() => presetByName("Kolkata"));
  const [locB, setLocB] = useState<Location>(() => presetByName("Svalbard"));
  const [loadA, setLoadA] = useState<LoadState>(LOADING);
  const [loadB, setLoadB] = useState<LoadState>(LOADING);

  // Load both locations. Changing either one stops the sound, clears the
  // old sequence and cancels requests that are still running.
  useEffect(() => {
    const abort = new AbortController();

    controller?.stopAll();
    dispatch({ type: "SET_EVENTS", payload: { events: [] } });
    setLoadA(LOADING);
    setLoadB(LOADING);

    const load = (loc: Location, set: (s: LoadState) => void) =>
      fetchTemperatureSeries(loc.lat, loc.lng, abort.signal).then(
        (series) => {
          if (!abort.signal.aborted) set({ status: "ready", series, error: "" });
          return series;
        },
        (error: unknown) => {
          if (!abort.signal.aborted) {
            set({
              status: "error",
              series: null,
              error: error instanceof Error ? error.message : "Could not load NASA data.",
            });
          }
          return null;
        },
      );

    Promise.all([load(locA, setLoadA), load(locB, setLoadB)]).then(([a, b]) => {
      if (abort.signal.aborted || !a || !b) return;

      const rows = alignSeries(a, b);
      dispatch({
        type: "SET_EVENTS",
        payload: { events: createCompareEvents(rows, a, b, T2M_TEMPERATURE_MAPPING) },
      });
    });

    return () => abort.abort();
    // controller is stable for the app's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locA.lat, locA.lng, locB.lat, locB.lng, dispatch]);

  const rows = useMemo(
    () => (loadA.series && loadB.series ? alignSeries(loadA.series, loadB.series) : []),
    [loadA.series, loadB.series],
  );

  // The shared timeline holds this page's A/B events once both have loaded.
  const ready =
    rows.length > 0 &&
    playback.events.length === rows.length * 2 &&
    playback.events[0]?.slot === "A" &&
    playback.events[1]?.slot === "B";

  const isPlaying = playback.status === "playing";
  const isPaused = playback.status === "paused";
  const showActive = ready && (isPlaying || isPaused);

  const monthIndex = ready ? Math.min(rows.length - 1, monthOfEvent(playback.dateIndex)) : 0;
  const row = rows[monthIndex];
  const activeSlot: Slot | null = showActive ? playback.activeSlot : null;

  // ---------- Controls ----------

  function handlePlayPause() {
    if (isPlaying) {
      dispatch({ type: "PAUSE" });
      return;
    }
    controller?.unlock(); // start audio inside the click (browser rule)
    dispatch({ type: "PLAY" });
  }

  function handleStop() {
    controller?.stopAll();
    dispatch({ type: "STOP" });
  }

  function seekMonth(index: number) {
    if (!ready) return;
    const clamped = Math.max(0, Math.min(rows.length - 1, index));
    dispatch({ type: "SEEK", payload: { index: eventOfMonth(clamped) } });
  }

  function selectMatchup(a: string, b: string) {
    setLocA(presetByName(a));
    setLocB(presetByName(b));
  }

  const yearTicks = rows.filter((r) => r.month === 1).map((r) => r.date);
  const stepSeconds = playback.secondsPerEvent / playback.playbackSpeed;

  return (
    <main className="page-workspace compare-page">
      <section className="page-hero">
        <p className="page-eyebrow">REGIONAL COMPARE</p>
        <h1>Compare two places by ear</h1>
        <p>
          NASA POWER monthly air temperature at 2 m (T2M), 2016–2025, for two
          locations. Each month plays A then B with the same
          temperature-to-pitch mapping — higher pitch is warmer. With
          headphones, A is on the left and B on the right.
        </p>
        <div className="compare-matchups" role="group" aria-label="Quick matchups">
          <span>MATCHUPS:</span>
          {MATCHUPS.map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              className={locA.name === a && locB.name === b ? "selected" : ""}
              onClick={() => selectMatchup(a, b)}
            >
              {a} / {b}
            </button>
          ))}
        </div>
      </section>

      <div className="compare-pickers">
        <LocationPicker
          slot="A"
          location={locA}
          load={loadA}
          active={activeSlot === "A"}
          onSelect={setLocA}
        />
        <LocationPicker
          slot="B"
          location={locB}
          load={loadB}
          active={activeSlot === "B"}
          onSelect={setLocB}
        />
      </div>

      {/* Selected month: values, difference and pitches */}
      <section className="page-card compare-month" aria-live="off">
        <div className="compare-month-head">
          <h2>{row ? monthLabel(row) : "—"}</h2>
          <span>
            {isPlaying ? "PLAYING" : isPaused ? "PAUSED" : ready ? "READY" : "LOADING…"}
            {activeSlot ? ` · ${activeSlot === "A" ? locA.name : locB.name} now` : ""}
          </span>
        </div>

        <div className="compare-values">
          <div className={`compare-value slot-a ${activeSlot === "A" ? "is-active" : ""}`}>
            <span>A · {locA.name}</span>
            <strong>{formatC(row?.a ?? null)}</strong>
            <small>{formatHz(row?.a ?? null)}</small>
          </div>
          <div className={`compare-value slot-b ${activeSlot === "B" ? "is-active" : ""}`}>
            <span>B · {locB.name}</span>
            <strong>{formatC(row?.b ?? null)}</strong>
            <small>{formatHz(row?.b ?? null)}</small>
          </div>
          <div className="compare-value compare-diff">
            <span>DIFFERENCE A − B</span>
            <strong>
              {row?.difference == null
                ? "N/A"
                : `${row.difference >= 0 ? "+" : "−"}${Math.abs(row.difference).toFixed(1)} °C`}
            </strong>
            <small>
              {row?.difference == null
                ? "needs both values"
                : row.difference > 0
                  ? `${locA.name} warmer`
                  : row.difference < 0
                    ? `${locB.name} warmer`
                    : "equal"}
            </small>
          </div>
        </div>
      </section>

      {/* Both series on one chart: shared date and temperature scales */}
      <section className="page-card compare-chart">
        <div className="compare-legend">
          <span style={{ color: COLORS.A }}>━ A · {locA.name}</span>
          <span style={{ color: COLORS.B }}>━ B · {locB.name}</span>
          <small>Same °C scale for both · gaps = missing months · click to choose a month</small>
        </div>

        {rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={rows}
              margin={{ top: 10, right: 16, bottom: 0, left: -8 }}
              onClick={(state) => {
                const label = state?.activeLabel;
                if (typeof label !== "string") return;
                const index = rows.findIndex((r) => r.date === label);
                if (index >= 0) seekMonth(index);
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid stroke="rgba(49,77,94,0.12)" vertical={false} />
              <XAxis
                dataKey="date"
                ticks={yearTicks}
                tickFormatter={(d: string) => d.slice(0, 4)}
                tick={{ fill: "#71818a", fontSize: 12 }}
                stroke="rgba(49,77,94,0.25)"
              />
              <YAxis
                unit="°C"
                width={56}
                tick={{ fill: "#71818a", fontSize: 12 }}
                stroke="rgba(49,77,94,0.25)"
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(67,117,143,0.25)",
                  borderRadius: 8,
                  color: "#294250",
                }}
                labelStyle={{ color: "#61737d" }}
                formatter={(value, name) => [
                  typeof value === "number" ? `${value.toFixed(1)} °C` : "missing",
                  name === "a" ? `A · ${locA.name}` : `B · ${locB.name}`,
                ]}
              />
              <Line
                type="monotone"
                dataKey="a"
                stroke={COLORS.A}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="b"
                stroke={COLORS.B}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {row && <ReferenceLine x={row.date} stroke="rgba(49,77,94,0.35)" />}
              {row?.a != null && (
                <ReferenceDot
                  x={row.date}
                  y={row.a}
                  r={activeSlot === "A" ? 7 : 4}
                  fill={COLORS.A}
                  stroke="#ffffff"
                  strokeWidth={activeSlot === "A" ? 3 : 1}
                />
              )}
              {row?.b != null && (
                <ReferenceDot
                  x={row.date}
                  y={row.b}
                  r={activeSlot === "B" ? 7 : 4}
                  fill={COLORS.B}
                  stroke="#ffffff"
                  strokeWidth={activeSlot === "B" ? 3 : 1}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="compare-msg">
            {loadA.status === "error" || loadB.status === "error"
              ? "Both locations need data to compare."
              : "Loading both locations…"}
          </p>
        )}
      </section>

      {/* Playback controls */}
      <section className="page-card compare-controls">
        <div className="compare-buttons">
          <button
            type="button"
            onClick={() => seekMonth(monthIndex - 1)}
            disabled={!ready || monthIndex === 0}
            aria-label="Previous month"
          >
            ◀ MONTH
          </button>
          <button
            type="button"
            className="compare-play"
            onClick={handlePlayPause}
            disabled={!ready}
          >
            {isPlaying ? "Ⅱ PAUSE" : isPaused ? "▶ RESUME" : "▶ PLAY A → B"}
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            aria-label="Stop comparison"
          >
            ■ STOP
          </button>
          <button
            type="button"
            onClick={() => seekMonth(monthIndex + 1)}
            disabled={!ready || monthIndex >= rows.length - 1}
            aria-label="Next month"
          >
            MONTH ▶
          </button>
        </div>

        <label className="compare-seek">
          <span>{rows[0] ? monthLabel(rows[0]) : ""}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, rows.length - 1)}
            step={1}
            value={monthIndex}
            onChange={(e) => seekMonth(Number(e.target.value))}
            disabled={!ready}
            aria-label="Choose month"
            aria-valuetext={monthLabel(row)}
          />
          <span>{rows.length ? monthLabel(rows[rows.length - 1]) : ""}</span>
        </label>

        <div className="compare-settings">
          <div role="group" aria-label="Playback speed" className="compare-speed">
            <span>SPEED</span>
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={playback.playbackSpeed === speed ? "selected" : ""}
                aria-pressed={playback.playbackSpeed === speed}
                onClick={() => dispatch({ type: "SET_SPEED", payload: { speed } })}
              >
                {speed}×
              </button>
            ))}
            <small>{stepSeconds.toFixed(2)} s per note · {(2 * stepSeconds).toFixed(2)} s per month</small>
          </div>

          <label className="compare-volume">
            <span>VOLUME{playback.soundEnabled ? "" : " (MUTED)"}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={playback.volume}
              onChange={(e) =>
                dispatch({ type: "SET_VOLUME", payload: { volume: Number(e.target.value) } })
              }
              aria-label="Comparison volume"
            />
          </label>
        </div>

        {playback.error && <p className="compare-msg compare-error">Audio: {playback.error}</p>}

        <p className="compare-note">
          Source: NASA POWER T2M (monthly mean air temperature at 2 m, a
          value of NASA's gridded product at each point). Pitch mapping{" "}
          {T2M_TEMPERATURE_MAPPING.id}, identical for A and B. The difference
          is a simple A − B for the same month, not a climate anomaly.{" "}
          <a className="page-link" href="#/methodology">How it works</a>
        </p>
      </section>
    </main>
  );
}
