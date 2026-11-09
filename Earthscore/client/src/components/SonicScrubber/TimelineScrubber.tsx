
import { useEffect, useState } from "react";
import "./TimelineScrubber.css";

interface TimelineScrubberProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const START_YEAR = 2016;
const END_YEAR = 2025;

function TimelineScrubber({
  selectedYear,
  onYearChange,
}: TimelineScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Automatically move through the timeline while playing
  useEffect(() => {
    if (!isPlaying) return;

    if (selectedYear >= END_YEAR) {
      setIsPlaying(false);
      return;
    }

    const timer = window.setInterval(() => {
      onYearChange(selectedYear + 1);
    }, 1500);

    return () => window.clearInterval(timer);
  }, [isPlaying, selectedYear, onYearChange]);

  const handlePrevious = () => {
    setIsPlaying(false);
    onYearChange(Math.max(START_YEAR, selectedYear - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    onYearChange(Math.min(END_YEAR, selectedYear + 1));
  };

  const handlePlayPause = () => {
    if (selectedYear >= END_YEAR) {
      onYearChange(START_YEAR);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((previous) => !previous);
  };

  const handleSliderChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setIsPlaying(false);
    onYearChange(Number(event.target.value));
  };

  return (
    <section className="sonic-scrubber">
      <div className="scrubber-header">
        <div>
          <p className="scrubber-eyebrow">TEMPORAL SONIFICATION</p>
          <h2>Chronological Sonic Scrubber</h2>
          <p className="scrubber-description">
            Travel through environmental changes across time.
          </p>
        </div>

        <div className="current-year">
          <span>SELECTED YEAR</span>
          <strong>{selectedYear}</strong>
        </div>
      </div>

      <div className="timeline-track">
        <div className="timeline-labels">
          <span>{START_YEAR}</span>
          <span>{END_YEAR}</span>
        </div>

        <input
          className="year-slider"
          type="range"
          min={START_YEAR}
          max={END_YEAR}
          step={1}
          value={selectedYear}
          onChange={handleSliderChange}
          aria-label="Select timeline year"
          style={{
            "--slider-progress": `${
              ((selectedYear - START_YEAR) /
                (END_YEAR - START_YEAR)) *
              100
            }%`,
          } as React.CSSProperties}
        />

        <div className="year-markers">
          {Array.from(
            { length: END_YEAR - START_YEAR + 1 },
            (_, index) => START_YEAR + index
          ).map((year) => (
            <button
              key={year}
              className={`year-marker ${
                selectedYear === year ? "active" : ""
              }`}
              onClick={() => {
                setIsPlaying(false);
                onYearChange(year);
              }}
              aria-label={`Select ${year}`}
            >
              <span className="marker-dot" />
              <span className="marker-year">{year}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="scrubber-controls">
        <button
          className="skip-button"
          onClick={handlePrevious}
          disabled={selectedYear === START_YEAR}
          aria-label="Previous year"
        >
          −1 YEAR
        </button>

        <button
          className="play-button"
          onClick={handlePlayPause}
        >
          {isPlaying ? "Ⅱ  PAUSE" : "▶  PLAY TIMELINE"}
        </button>

        <button
          className="skip-button"
          onClick={handleNext}
          disabled={selectedYear === END_YEAR}
          aria-label="Next year"
        >
          +1 YEAR
        </button>
      </div>

      <div className="scrubber-footer">
        <span>
          <span className="status-dot" />
          {isPlaying ? "TIMELINE PLAYING" : "TIMELINE PAUSED"}
        </span>
        <span>10-YEAR ENVIRONMENTAL WINDOW</span>
      </div>
    </section>
  );
}

export default TimelineScrubber;
