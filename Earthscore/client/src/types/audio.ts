// Settings that control how temperature becomes pitch.
export interface TemperatureMappingConfig {
  readonly id: string;
  readonly minTemperatureC: number;
  readonly maxTemperatureC: number;
  readonly minFrequencyHz: number;
  readonly octaves: number;
}

// Result returned by the temperature mapping function.
export interface TemperatureSound {
  readonly originalTemperatureC: number | null;
  readonly normalizedValue: number | null;
  readonly frequencyHz: number | null;
  readonly clipped: boolean;
}

/**
 * What the playback controller (M4) may call on the audio engine (M3).
 *
 * Time values are absolute audio-clock seconds, read from getAudioTime().
 * Durations are seconds and include the short fade-in and fade-out.
 */
export interface ScheduledAudioEngine {
  start(): Promise<void>;

  // Current audio-clock time, safe to use as the base for scheduling.
  getAudioTime(): number;

  // Time the listener hears now; use it to sync visuals.
  getPlaybackTime(): number;

  // Schedule one observation. null schedules no tone but returns the
  // mapping result so the timeline position is preserved.
  scheduleTemperature(
    temperatureC: number | null,
    startTime: number,
    durationSeconds: number,
    mapping?: TemperatureMappingConfig,
  ): TemperatureSound;

  // pan: stereo position, −1 = left, 0 = centre (default), 1 = right.
  scheduleFrequency(
    frequencyHz: number | null,
    startTime: number,
    durationSeconds: number,
    pan?: number,
  ): void;

  // Fade out the current note AND cancel every future scheduled note.
  stop(): void;

  setVolume(volume: number): void;
  dispose(): void;
}