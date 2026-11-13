// client/src/types/playback.ts
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'stopped';

export type ComparisonSlot = 'A' | 'B';

export interface ObservationEvent {
  id: string;
  date: string;
  regionId: string;
  slot: ComparisonSlot;
  temperatureKelvin: number | null;
  temperatureCelsius: number | null;
  audioFrequencyHz: number | null;
  frameUrl?: string;
  // Any sonified parameter: its value and unit (temperature, rainfall, …).
  // temperatureCelsius is only filled for temperature.
  parameterId?: string;
  value?: number | null;
  unit?: string;
}

export interface PlaybackState {
  status: PlaybackStatus;
  dateIndex: number;
  selectedRegionId: string;
  comparisonRegionId: string | null;
  activeSlot: ComparisonSlot;
  secondsPerEvent: number;
  playbackSpeed: number;
  soundEnabled: boolean;
  volume: number;
  events: ObservationEvent[];

  // Where the current play range starts and ends (event indices).
  // Whole timeline: 0 … events.length - 1. One year: Jan … Dec of that year.
  rangeStartIndex: number;
  playUntilIndex: number | null; // null = play to the end of the events

  // Increases whenever the audio must be (re)scheduled:
  // play, seek while playing, speed change, new events.
  // Position updates from the audio clock (TICK) do NOT change it.
  scheduleVersion: number;

  // Last audio error to show in the UI, or null.
  error: string | null;
}

export type PlaybackAction =
  | { type: 'PLAY' }
  | { type: 'PLAY_RANGE'; payload: { startIndex: number; endIndex: number } }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; payload: { index: number } }
  | { type: 'SET_SPEED'; payload: { speed: number } }
  | { type: 'SET_VOLUME'; payload: { volume: number } }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'SELECT_REGION'; payload: { regionId: string } }
  | { type: 'SET_COMPARISON_REGION'; payload: { regionId: string | null } }
  | { type: 'SET_EVENTS'; payload: { events: ObservationEvent[]; startIndex?: number } }
  | { type: 'STEP_NEXT' }
  | { type: 'STEP_PREV' }
  // Sent by the PlaybackController from the audio clock:
  | { type: 'TICK'; payload: { index: number } }
  | { type: 'ENDED' }
  | { type: 'PLAYBACK_ERROR'; payload: { message: string } };
