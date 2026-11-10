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
}

export type PlaybackAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; payload: { index: number } }
  | { type: 'SET_SPEED'; payload: { speed: number } }
  | { type: 'SET_VOLUME'; payload: { volume: number } }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'SELECT_REGION'; payload: { regionId: string } }
  | { type: 'SET_COMPARISON_REGION'; payload: { regionId: string | null } }
  | { type: 'SET_EVENTS'; payload: { events: ObservationEvent[] } }
  | { type: 'STEP_NEXT' }
  | { type: 'STEP_PREV' };