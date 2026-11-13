
import { useEffect, useRef, useState } from "react";
import "./DAWEngine.css";

import { useAppState } from "../../state/AppProvider";
import { PLAYBACK_DEFAULTS } from "../../config/defaults";
import {
  firstIndexOfYear,
  lastIndexOfYear,
} from "../../playback/createPlaybackEvents";
import {
  encodeWav,
  fileNamePart,
  renderNotes,
} from "../../audio/renderSonification";
import { COMPARE_PAN } from "../../playback/PlaybackController";
import {
  SOUND_PARAMETERS,
  type SoundParameterId,
} from "../../config/parameters";
import type { ObservationEvent } from "../../types/playback";

interface DAWEngineProps {
  // Explorer: the selected location. Compare: shown as "A vs B".
  locationName: string;
  selectedYear: number;
  // Parameter that is sonified (default: temperature).
  parameterId?: SoundParameterId;
  // Regional Compare: names of location A (left ear) and B (right ear).
  // When set, the file is stereo with the same panning as live playback.
  slotNames?: { A: string; B: string };
}

// A rendered WAV file and what it contains.
interface RenderedTrack {
  url: string; // blob: URL, revoked when replaced
  fileName: string;
  label: string; // e.g. "2016–2025" or "2019"
  sourceKey: string; // which data the file was made from
  stereo: boolean;
  events: ObservationEvent[]; // the notes in the file, in order
  stepSeconds: number;
  contour: number[]; // 0–1 pitch height per bar; -1 = missing month
  sizeBytes: number;
}

// Placeholder bars before rendering; a rendered file gets at least one
// bar per month (up to 120 for 2016–2025).
const BAR_COUNT = 64;

/**
 * Pitch of the file over time, one value per bar. All notes have the same
 * loudness, so pitch is what changes and what the bars show.
 * Scaled from the lowest (0) to the highest (1) note in this file, so small
 * value changes are visible. Missing months give -1.
 */
function pitchContour(events: readonly ObservationEvent[], bars: number): number[] {
  // Pitch in octaves above the mapping's lowest note (log scale = how we hear).
  const pitches = events.map((event) =>
    event.audioFrequencyHz === null
      ? null
      : Math.log2(event.audioFrequencyHz),
  );

  const known = pitches.filter((p): p is number => p !== null);
  const low = Math.min(...known);
  const high = Math.max(...known);
  const span = high - low;

  return Array.from({ length: bars }, (_, bar) => {
    const pitch = pitches[Math.floor((bar / bars) * pitches.length)];
    if (pitch === null || pitch === undefined) return -1;
    return span > 0 ? (pitch - low) / span : 0.5;
  });
}

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function DAWEngine({
  locationName,
  selectedYear,
  parameterId = "temperature",
  slotNames,
}: DAWEngineProps) {
  const parameter = SOUND_PARAMETERS[parameterId];

  // Same events, timing and mute as the live timeline.
  const { state: playback, dispatch } = useAppState();

  const audioRef = useRef<HTMLAudioElement>(null);

  const [track, setTrack] = useState<RenderedTrack | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const events = playback.events;
  const isCompare = events.some((event) => event.slot === "B");
  // Identifies the data in the shared timeline (location(s) + parameter).
  const sourceKey =
    events.length > 0
      ? `${events[0].id}|${events[1]?.id ?? ""}|${events.length}`
      : null;
  const firstYear = events[0]?.date.slice(0, 4);
  const lastYear = events[events.length - 1]?.date.slice(0, 4);

  // ---------- File lifecycle ----------

  // Free the previous file's memory when it is replaced or the panel closes.
  useEffect(() => {
    const url = track?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [track?.url]);

  // A file belongs to one data source: clear it as soon as the location(s)
  // or the parameter change (also while the new data is still loading).
  useEffect(() => {
    if (track && track.sourceKey !== sourceKey) {
      setTrack(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [sourceKey, track]);

  // Never play the file and the live timeline at the same time.
  useEffect(() => {
    if (playback.status === "playing") audioRef.current?.pause();
  }, [playback.status]);

  // The navbar mute applies here too.
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = !playback.soundEnabled;
  }, [playback.soundEnabled, track?.url]);

  // ---------- Rendering ----------

  async function render(range: "all" | "year") {
    if (events.length === 0 || sourceKey === null) return;

    const start = range === "all" ? 0 : firstIndexOfYear(events, selectedYear);
    const end =
      range === "all" ? events.length - 1 : lastIndexOfYear(events, selectedYear);
    if (start < 0 || end < 0) return;

    const slice = events.slice(start, end + 1);
    const stepSeconds = playback.secondsPerEvent / playback.playbackSpeed;
    const label =
      range === "all" ? `${firstYear}–${lastYear}` : String(selectedYear);

    audioRef.current?.pause();
    setIsRendering(true);
    setRenderError("");

    try {
      // Compare: A on the left, B on the right (same as live playback).
      const buffer = await renderNotes(
        slice.map((event) => ({
          frequencyHz: event.audioFrequencyHz,
          pan: isCompare ? (event.slot === "A" ? -COMPARE_PAN : COMPARE_PAN) : 0,
        })),
        {
          stepSeconds,
          noteSeconds: Math.max(0.05, stepSeconds * PLAYBACK_DEFAULTS.noteFraction),
        },
      );

      const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) =>
        buffer.getChannelData(c),
      );
      const wav = encodeWav(channels, buffer.sampleRate);
      const blob = new Blob([wav], { type: "audio/wav" });

      const place = slotNames
        ? `compare-${fileNamePart(slotNames.A)}-vs-${fileNamePart(slotNames.B)}`
        : fileNamePart(locationName);

      setTrack({
        url: URL.createObjectURL(blob),
        fileName: `earthscore-${place}-${parameterId}-${label.replace("–", "-")}.wav`,
        label,
        sourceKey,
        stereo: buffer.numberOfChannels === 2,
        events: slice,
        stepSeconds,
        contour: pitchContour(slice, Math.max(BAR_COUNT, slice.length)),
        sizeBytes: blob.size,
      });
      setCurrentTime(0);
      setDuration(buffer.duration);
    } catch (error) {
      setRenderError(
        error instanceof Error
          ? `Could not create audio: ${error.message}`
          : "Could not create audio.",
      );
    } finally {
      setIsRendering(false);
    }
  }

  // ---------- Player ----------

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return "00:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);

    return `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (audio.paused) {
      // Pause the live timeline so the two never overlap.
      if (playback.status === "playing") dispatch({ type: "PAUSE" });

      try {
        await audio.play();
      } catch (error) {
        console.error("Audio playback failed:", error);
      }
    } else {
      audio.pause();
    }
  };

  const skipAudio = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration || 0, audio.currentTime + seconds)
    );
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(event.target.value);

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newVolume = Number(event.target.value);

    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const progress =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  // Which note of the file is heard at the current position.
  const monthIndex = track
    ? Math.min(track.events.length - 1, Math.floor(currentTime / track.stepSeconds))
    : -1;
  const monthEvent = track && monthIndex >= 0 ? track.events[monthIndex] : undefined;
  const monthLabel = monthEvent
    ? `${MONTH_NAMES[Number(monthEvent.date.slice(5, 7)) - 1]} ${monthEvent.date.slice(0, 4)}`
    : null;
  const eventValue = monthEvent
    ? (monthEvent.value ?? monthEvent.temperatureCelsius ?? null)
    : null;
  const monthValue =
    eventValue === null
      ? "no data"
      : `${eventValue.toFixed(parameter.decimals)} ${parameter.unit}`;
  const monthPlace =
    monthEvent && slotNames && isCompare
      ? `${monthEvent.slot} · ${slotNames[monthEvent.slot]} · `
      : "";
  const monthCount = track
    ? isCompare
      ? `${track.events.length / 2} months × 2 places · stereo`
      : `${track.events.length} months`
    : "";

  const canRender = events.length > 0 && !isRendering;
  const yearAvailable = firstIndexOfYear(events, selectedYear) >= 0;

  return (
    <section className="daw-engine">
      <audio
        ref={audioRef}
        src={track?.url}
        preload="metadata"
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          event.currentTarget.volume = volume;
          event.currentTarget.muted = !playback.soundEnabled;
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="daw-header">
        <div>
          <p className="daw-eyebrow">AUDIO SYNTHESIS MODULE</p>
          <h2>DAW Engine</h2>
          <p className="daw-subtitle">
            {slotNames
              ? `Render the A → B comparison as a stereo WAV file (A left, B right): listen, scrub through the months and download it.`
              : "Render the sonification as a WAV file: listen, scrub through the months and download it."}
          </p>
        </div>

        <div className="daw-live-status">
          <span className="daw-status-dot" />
          {isRendering
            ? "RENDERING…"
            : isPlaying
              ? "PLAYING"
              : track
                ? "READY"
                : "STANDBY"}
        </div>
      </div>

      {/* Render buttons */}
      <div className="daw-render-row">
        <button
          type="button"
          className="daw-download"
          onClick={() => render("all")}
          disabled={!canRender}
        >
          ⚙ RENDER {firstYear && lastYear ? `${firstYear}–${lastYear}` : "TIMELINE"}
        </button>

        <button
          type="button"
          className="daw-download"
          onClick={() => render("year")}
          disabled={!canRender || !yearAvailable}
        >
          ⚙ RENDER {selectedYear}
        </button>
      </div>

      {renderError && <p className="daw-placeholder daw-error">{renderError}</p>}

      {/* Track information */}
      <div className="daw-track">
        <div className="track-art">
          <span>♫</span>
        </div>

        <div className="track-info">
          <strong>
            {parameter.label} · {slotNames ? `${slotNames.A} vs ${slotNames.B}` : locationName}
            {track ? ` · ${track.label}` : ""}
          </strong>
          <span>
            {track
              ? `${parameter.source} · ${monthCount} · WAV ${(track.sizeBytes / 1_000_000).toFixed(1)} MB`
              : "No audio rendered yet"}
          </span>
          {track && monthLabel && (
            <span aria-live="off">
              Now: {monthLabel} · {monthPlace}{monthValue}
            </span>
          )}
        </div>

        <div className="track-duration">
          {formatTime(duration)}
        </div>
      </div>

      {/* Pitch bars: height = pitch of the notes in the file (compare: A and
          B in two colours). Before rendering they are a decorative placeholder. */}
      <div
        className={`daw-waveform ${isPlaying ? "playing" : ""}`}
        aria-hidden="true"
        title={
          track
            ? `Bar height = pitch of each note (higher = ${parameter.highWord})`
            : undefined
        }
      >
        {Array.from({ length: track ? track.contour.length : BAR_COUNT }, (_, index) => {
          const value = track ? track.contour[index] : 0;
          const height = track
            ? value < 0
              ? 3
              : 12 + value * 85
            : 15 + ((index * 37 + index * index * 13) % 65);

          const played =
            track !== null && (index + 0.5) / track.contour.length <= progress / 100;

          const barEvent = track
            ? track.events[Math.floor((index / track.contour.length) * track.events.length)]
            : undefined;

          return (
            <span
              key={index}
              className={`wave-bar ${track?.stereo && barEvent?.slot === "B" ? "slot-b" : ""}`}
              style={{
                height: `${height}%`,
                opacity: track ? (played ? 1 : 0.4) : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Audio progress */}
      <div className="daw-progress-section">
        <span>{formatTime(currentTime)}</span>

        <input
          type="range"
          className="daw-progress"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          disabled={!track || duration === 0}
          style={{
            "--audio-progress": `${progress}%`,
          } as React.CSSProperties}
          aria-label="Audio progress"
        />

        <span>{formatTime(duration)}</span>
      </div>

      {/* Playback controls */}
      <div className="daw-controls">
        <button
          className="daw-skip"
          onClick={() => skipAudio(-10)}
          disabled={!track}
          aria-label="Rewind 10 seconds"
        >
          ↶ 10s
        </button>

        <button
          className="daw-play"
          onClick={togglePlayback}
          disabled={!track}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>

        <button
          className="daw-skip"
          onClick={() => skipAudio(10)}
          disabled={!track}
          aria-label="Forward 10 seconds"
        >
          10s ↷
        </button>
      </div>

      {/* Volume and download */}
      <div className="daw-bottom-controls">
        <div className="daw-volume">
          <span>{playback.soundEnabled ? "🔊" : "🔇"}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>

        {track ? (
          <a
            className="daw-download"
            href={track.url}
            download={track.fileName}
          >
            ↓ DOWNLOAD WAV
          </a>
        ) : (
          <button className="daw-download" disabled>
            ↓ AUDIO NOT GENERATED
          </button>
        )}
      </div>

      {!track && !isRendering && (
        <p className="daw-placeholder">
          {events.length === 0
            ? "Waiting for data…"
            : `Choose a render button above. The file uses the same notes as the live playback (higher pitch = ${parameter.highWord}).`}
        </p>
      )}
    </section>
  );
}

export default DAWEngine;
