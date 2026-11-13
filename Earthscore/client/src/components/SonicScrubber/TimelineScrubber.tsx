
import "./TimelineScrubber.css";
import { useAppState } from "../../state/AppProvider";
import { rangeEndIndex } from "../../state/appReducer";

// Playback speeds offered to the user (1× = one month every 0.5 s).
const SPEEDS = [0.5, 1, 2] as const;

interface TimelineScrubberProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  // Data source of the sound, shown in the footer.
  sourceLabel?: string;
}

const START_YEAR = 2016;
const END_YEAR = 2025;

const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function TimelineScrubber({
  selectedYear,
  onYearChange,
  sourceLabel = "NASA POWER T2M",
}: TimelineScrubberProps) {
  // Shared playback (M4 state + audio-clock controller).
  // This component has no timer of its own.
  const { state, dispatch, controller } = useAppState();

  const hasEvents = state.events.length > 0;
  const isPlaying = state.status === "playing";
  const isPaused = state.status === "paused";

  // Whole-timeline playback (not a one-year preview from the panel below).
  const isTimelineRange =
    state.playUntilIndex === null ||
    rangeEndIndex(state) === state.events.length - 1;

  const currentEvent = state.events[state.dateIndex];
  const currentMonth = currentEvent
    ? MONTH_NAMES[Number(currentEvent.date.slice(5, 7)) - 1]
    : null;

  // Smooth progress through all months, for the slider fill.
  const progress = hasEvents
    ? (state.dateIndex / Math.max(1, state.events.length - 1)) * 100
    : ((selectedYear - START_YEAR) / (END_YEAR - START_YEAR)) * 100;

  const handlePrevious = () => {
    onYearChange(Math.max(START_YEAR, selectedYear - 1));
  };

  const handleNext = () => {
    onYearChange(Math.min(END_YEAR, selectedYear + 1));
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      dispatch({ type: "PAUSE" });
      return;
    }

    // Start audio inside the click (browser rule), then play.
    controller?.unlock();

    if (isPaused && !isTimelineRange) {
      // A paused one-year preview: continue as the full timeline from here.
      dispatch({
        type: "PLAY_RANGE",
        payload: {
          startIndex: state.dateIndex,
          endIndex: state.events.length - 1,
        },
      });
      return;
    }

    dispatch({ type: "PLAY" });
  };

  const handleStop = () => {
    // Also cancels a legend preview that is still starting.
    controller?.stopAll();
    dispatch({ type: "STOP" });
  };

  const handleSpeed = (speed: number) => {
    // While playing, the controller reschedules from the current month.
    dispatch({ type: "SET_SPEED", payload: { speed } });
  };

  const handleSliderChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onYearChange(Number(event.target.value));
  };

  const statusText = isPlaying
    ? `TIMELINE PLAYING · ${currentMonth ?? ""} ${selectedYear}`
    : isPaused
      ? `TIMELINE PAUSED · ${currentMonth ?? ""} ${selectedYear}`
      : hasEvents
        ? "TIMELINE READY"
        : "LOADING NASA DATA…";

  return (
    <section className="sonic-scrubber">
      <div className="scrubber-header">
        <div>
          <p className="scrubber-eyebrow">TEMPORAL SONIFICATION</p>
          <h2>Chronological Sonic Scrubber</h2>
          <p className="scrubber-description">
            Travel through environmental changes across time. Play the
            timeline to hear every month from {START_YEAR} to {END_YEAR}.
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
            "--slider-progress": `${progress}%`,
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
              onClick={() => onYearChange(year)}
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
          disabled={!hasEvents}
        >
          {isPlaying ? "Ⅱ  PAUSE" : isPaused ? "▶  RESUME" : "▶  PLAY TIMELINE"}
        </button>

        <button
          className="skip-button"
          onClick={handleStop}
          disabled={!isPlaying && !isPaused}
          aria-label="Stop timeline"
        >
          ■ STOP
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

      <div
        className="scrubber-speed"
        role="group"
        aria-label="Playback speed"
      >
        <span>SPEED</span>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`speed-button ${
              state.playbackSpeed === speed ? "active" : ""
            }`}
            onClick={() => handleSpeed(speed)}
            aria-pressed={state.playbackSpeed === speed}
          >
            {speed}×
          </button>
        ))}
        <small>
          {(state.secondsPerEvent / state.playbackSpeed).toFixed(2)} s per month
        </small>
      </div>

      <div className="scrubber-footer">
        <span>
          <span className="status-dot" />
          {statusText}
        </span>
        <span>
          {state.error
            ? `AUDIO ERROR: ${state.error}`
            : `10-YEAR ENVIRONMENTAL WINDOW · ${sourceLabel.toUpperCase()}`}
        </span>
      </div>
    </section>
  );
}

export default TimelineScrubber;
