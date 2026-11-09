
import { useRef, useState } from "react";
import "./DAWEngine.css";

interface DAWEngineProps {
  audioUrl: string | null;
  selectedYear: number;
}

function DAWEngine({ audioUrl, selectedYear }: DAWEngineProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

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
    if (!audio || !audioUrl) return;

    if (audio.paused) {
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

  return (
    <section className="daw-engine">
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        preload="metadata"
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          event.currentTarget.volume = volume;
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
            Environmental data transformed into sound
          </p>
        </div>

        <div className="daw-live-status">
          <span className="daw-status-dot" />
          {isPlaying ? "PLAYING" : "STANDBY"}
        </div>
      </div>

      {/* Track information */}
      <div className="daw-track">
        <div className="track-art">
          <span>♫</span>
        </div>

        <div className="track-info">
          <strong>Earth Sonification</strong>
          <span>Environmental Audio • {selectedYear}</span>
        </div>

        <div className="track-duration">
          {formatTime(duration)}
        </div>
      </div>

      {/* Waveform visualization */}
      <div className={`daw-waveform ${isPlaying ? "playing" : ""}`}>
        {Array.from({ length: 64 }, (_, index) => {
          const height =
            15 + ((index * 37 + index * index * 13) % 65);

          return (
            <span
              key={index}
              className="wave-bar"
              style={{ height: `${height}%` }}
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
          disabled={!audioUrl || duration === 0}
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
          disabled={!audioUrl}
          aria-label="Rewind 10 seconds"
        >
          ↶ 10s
        </button>

        <button
          className="daw-play"
          onClick={togglePlayback}
          disabled={!audioUrl}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>

        <button
          className="daw-skip"
          onClick={() => skipAudio(10)}
          disabled={!audioUrl}
          aria-label="Forward 10 seconds"
        >
          10s ↷
        </button>
      </div>

      {/* Volume and download */}
      <div className="daw-bottom-controls">
        <div className="daw-volume">
          <span>🔊</span>
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

        {audioUrl ? (
          <a
            className="daw-download"
            href={audioUrl}
            download={`earth-sonification-${selectedYear}.mp3`}
          >
            ↓ DOWNLOAD AUDIO
          </a>
        ) : (
          <button className="daw-download" disabled>
            ↓ AUDIO NOT GENERATED
          </button>
        )}
      </div>

      {!audioUrl && (
        <p className="daw-placeholder">
          Audio output will appear here once sonification is generated.
        </p>
      )}
    </section>
  );
}

export default DAWEngine;
