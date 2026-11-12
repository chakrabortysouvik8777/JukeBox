import type { PlaybackAction, PlaybackState } from '../types/playback';
import type { TemperatureMappingConfig } from '../types/audio';
import { PLAYBACK_DEFAULTS } from '../config/defaults';
import { rangeEndIndex } from '../state/appReducer';

/**
 * The part of M3's AudioEngine the controller needs.
 * (AudioEngine in src/audio/AudioEngine.ts implements all of it.)
 */
export interface PlaybackAudioEngine {
  start(): Promise<void>;
  getAudioTime(): number; // scheduling clock (runs slightly ahead)
  getPlaybackTime(): number; // what the listener hears now
  scheduleFrequency(
    frequencyHz: number | null,
    startTime: number,
    durationSeconds: number,
    pan?: number
  ): void;
  playTemperature(
    temperatureC: number | null,
    durationSeconds?: number,
    mapping?: TemperatureMappingConfig
  ): unknown;
  setVolume(volume: number): void;
  stop(): void;
  dispose(): void;
}

/** Animation-frame functions, replaceable in tests. */
export interface FrameScheduler {
  request(callback: () => void): number;
  cancel(id: number): void;
}

const browserFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

// Stereo position for Regional Compare: A at −0.6 (left), B at +0.6 (right).
// Not fully hard-panned, so speakers and one-ear listening still hear both.
export const COMPARE_PAN = 0.6;

// Small delay so the first note is never scheduled in the past.
const LEAD_SECONDS = 0.1;

/**
 * Plays the shared event sequence on the audio clock and reports the
 * position back to the reducer (TICK / ENDED).
 *
 * - All notes of the range are scheduled at once with absolute times,
 *   so sound timing does not depend on setInterval or React renders.
 * - Visual position follows engine.getPlaybackTime() via animation frames.
 * - Every new play/pause/seek increases a generation number, so old
 *   callbacks (and an audio start still in progress) cannot restart sound.
 */
export class PlaybackController {
  private generation = 0;
  // Separate token for legend previews, so halting the timeline
  // (e.g. the PAUSE that precedes a preview) does not cancel the preview.
  private previewToken = 0;
  private frameId: number | null = null;
  private disposed = false;

  constructor(
    private readonly engine: PlaybackAudioEngine,
    private readonly dispatch: (action: PlaybackAction) => void,
    private readonly frames: FrameScheduler = browserFrames
  ) {}

  /** Seconds between two events at the current speed. */
  static stepSeconds(state: PlaybackState): number {
    return state.secondsPerEvent / state.playbackSpeed;
  }

  /** Start (or restart) playback from state.dateIndex to the end of the range. */
  public async play(state: PlaybackState): Promise<void> {
    if (this.disposed || state.events.length === 0) return;

    this.cancelSchedule();
    this.previewToken += 1; // a new playback cancels a pending preview
    // Remove notes from any earlier schedule (seek, speed change, new range)
    // before scheduling new ones.
    this.engine.stop();
    const generation = this.generation;

    try {
      // Must happen inside the user's click (browser audio rule);
      // React runs this effect in the same task as the click's dispatch.
      await this.engine.start();
    } catch (error) {
      if (generation !== this.generation) return;
      this.dispatch({
        type: 'PLAYBACK_ERROR',
        payload: {
          message: error instanceof Error ? error.message : 'Audio could not start.',
        },
      });
      return;
    }

    // Paused, stopped or re-seeked while audio was starting.
    if (generation !== this.generation || this.disposed) return;

    this.applyVolume(state);

    const step = PlaybackController.stepSeconds(state);
    const note = Math.max(0.05, step * PLAYBACK_DEFAULTS.noteFraction);
    const startIndex = state.dateIndex;
    const endIndex = rangeEndIndex(state);
    const t0 = this.engine.getAudioTime() + LEAD_SECONDS;

    // A/B comparison: location A on the left, B on the right.
    // A single location plays centred.
    const comparing = state.events.some((event) => event.slot === 'B');

    for (let i = startIndex; i <= endIndex; i++) {
      const event = state.events[i];
      const pan = comparing ? (event.slot === 'A' ? -COMPARE_PAN : COMPARE_PAN) : 0;

      this.engine.scheduleFrequency(
        event.audioFrequencyHz,
        t0 + (i - startIndex) * step,
        note,
        pan
      );
    }

    let lastReported = startIndex;

    const tick = () => {
      if (generation !== this.generation || this.disposed) return;

      const elapsed = this.engine.getPlaybackTime() - t0;
      const index = startIndex + Math.floor(elapsed / step);

      if (index > endIndex) {
        this.frameId = null;
        this.dispatch({ type: 'ENDED' });
        return;
      }

      if (index > lastReported) {
        lastReported = index;
        this.dispatch({ type: 'TICK', payload: { index } });
      }

      this.frameId = this.frames.request(tick);
    };

    this.frameId = this.frames.request(tick);
  }

  /**
   * Call directly inside a click handler (before dispatching PLAY), so the
   * browser sees the audio start as part of the user's gesture.
   * Errors are reported later by play().
   */
  public unlock(): void {
    if (this.disposed) return;
    this.engine.start().catch(() => {
      /* play() reports the error */
    });
  }

  /** Stop the sound and all future notes; keep the position (state decides). */
  public halt(): void {
    this.cancelSchedule();
    this.engine.stop();
  }

  /**
   * Full stop for Stop buttons: halts the timeline AND cancels a legend
   * preview that is still waiting for audio to start.
   * (halt() alone keeps a pending preview, because a preview click
   * itself pauses the timeline.)
   */
  public stopAll(): void {
    this.previewToken += 1;
    this.halt();
  }

  /** Apply volume and mute without touching the schedule. */
  public applyVolume(state: Pick<PlaybackState, 'volume' | 'soundEnabled'>): void {
    if (this.disposed) return;
    this.engine.setVolume(state.soundEnabled ? state.volume : 0);
  }

  /** Play one reference tone (sound legend). Halts the timeline first. */
  public async preview(
    temperatureC: number,
    state: PlaybackState,
    mapping: TemperatureMappingConfig
  ): Promise<void> {
    this.halt();
    const token = ++this.previewToken;

    await this.engine.start();
    if (token !== this.previewToken || this.disposed) return;

    this.applyVolume(state);
    this.engine.playTemperature(temperatureC, 1, mapping);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.cancelSchedule();
    this.disposed = true;
    this.engine.dispose();
  }

  private cancelSchedule(): void {
    this.generation += 1;
    if (this.frameId !== null) {
      this.frames.cancel(this.frameId);
      this.frameId = null;
    }
  }
}
