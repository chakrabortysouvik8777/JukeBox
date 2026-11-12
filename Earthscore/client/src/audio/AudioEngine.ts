import * as Tone from "tone";

import { temperatureToSound } from "./temperatureMapping";
import { DEFAULT_TEMPERATURE_MAPPING } from "../config/audioMapping";

import type {
  ScheduledAudioEngine,
  TemperatureMappingConfig,
  TemperatureSound,
} from "../types/audio";

const DEFAULT_VOLUME = 0.3;
const MAX_SIGNAL_GAIN = 0.2;
const FADE_SECONDS = 0.02;

// Small tolerance for floating-point time comparisons.
const TIME_EPSILON = 1e-6;

export class AudioEngine implements ScheduledAudioEngine {
  private oscillator: Tone.Oscillator | null = null;
  private envelope: Tone.Gain | null = null;
  // Stereo position of each note: −1 = left, 0 = centre, 1 = right.
  // Regional Compare plays location A on the left and B on the right.
  private panner: Tone.Panner | null = null;
  private output: Tone.Gain | null = null;

  private volume = DEFAULT_VOLUME;
  private disposed = false;
  private startPromise: Promise<void> | null = null;

  // End time of the last note given to the oscillator.
  // Used to reject overlapping scheduled notes (one voice only).
  private lastNoteEnd = 0;

  /**
   * Call directly from a user action, such as a Play button click.
   * Browsers require user interaction before allowing audio.
   */
  public async start(): Promise<void> {
    this.assertNotDisposed();

    // Reuse an initialization already in progress.
    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.initialize();

    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  private async initialize(): Promise<void> {
    await Tone.start();

    // The component may have unmounted while Tone.start() was pending.
    this.assertNotDisposed();

    if (Tone.getContext().state !== "running") {
      throw new Error(
        "Audio is not running. Start it from a user button click.",
      );
    }

    // Calling start again can resume audio without creating extra nodes.
    if (this.oscillator) {
      return;
    }

    this.output = new Tone.Gain(this.volume).toDestination();

    this.panner = new Tone.Panner(0).connect(this.output);

    // Start silent.
    this.envelope = new Tone.Gain(0).connect(this.panner);

    this.oscillator = new Tone.Oscillator({
      type: "sine",
      frequency: DEFAULT_TEMPERATURE_MAPPING.minFrequencyHz,
    }).connect(this.envelope);

    this.oscillator.start();
  }

  /**
   * Current audio-clock time in seconds.
   * Use it as the base for scheduleTemperature / scheduleFrequency,
   * for example: const t0 = engine.getAudioTime() + 0.1;
   */
  public getAudioTime(): number {
    return Tone.now();
  }

  /**
   * Time the listener is hearing right now, in audio-clock seconds.
   * Use this (not getAudioTime) to decide which observation to highlight,
   * because getAudioTime() runs slightly ahead for safe scheduling.
   */
  public getPlaybackTime(): number {
    return Tone.immediate();
  }

  /**
   * Map a temperature to sound and play it now.
   * Returns the same mapping information the UI can display.
   *
   * durationSeconds includes the short attack and fade-out.
   */
  public playTemperature(
    temperatureC: number | null,
    durationSeconds = 0.5,
    mapping: TemperatureMappingConfig = DEFAULT_TEMPERATURE_MAPPING,
  ): TemperatureSound {
    this.assertNotDisposed();

    const sound = temperatureToSound(temperatureC, mapping);

    this.playFrequency(sound.frequencyHz, durationSeconds);

    return sound;
  }

  /**
   * Play a frequency now, replacing the previous note.
   * null means silence.
   *
   * This also cancels any notes scheduled for the future.
   */
  public playFrequency(
    frequencyHz: number | null,
    durationSeconds = 0.5,
  ): void {
    this.assertNotDisposed();

    if (frequencyHz === null) {
      this.stop();
      return;
    }

    this.validateFrequency(frequencyHz);
    this.validateDuration(durationSeconds);

    const { oscillator, envelope } = this.requireRunningNodes();

    const now = Tone.now();
    const end = now + durationSeconds;

    // Cancel the previous note's automation.
    // Hold its current value so the transition is not an abrupt jump.
    oscillator.frequency.cancelAndHoldAtTime(now);
    envelope.gain.cancelAndHoldAtTime(now);

    // Immediate notes (e.g. the sound legend) are always centred.
    this.panner?.pan.cancelAndHoldAtTime(now);
    this.panner?.pan.setValueAtTime(0, now);

    // A short pitch transition reduces abrupt changes between notes.
    oscillator.frequency.linearRampToValueAtTime(
      frequencyHz,
      now + FADE_SECONDS,
    );

    // Fade in, hold, and fade out.
    envelope.gain.linearRampToValueAtTime(
      MAX_SIGNAL_GAIN,
      now + FADE_SECONDS,
    );

    envelope.gain.setValueAtTime(
      MAX_SIGNAL_GAIN,
      end - FADE_SECONDS,
    );

    envelope.gain.linearRampToValueAtTime(0, end);

    this.lastNoteEnd = end;
  }

  /**
   * Schedule one observation at an absolute audio-clock time.
   * null schedules no tone (silence) but still returns the mapping result,
   * so the controller keeps its timeline position.
   */
  public scheduleTemperature(
    temperatureC: number | null,
    startTime: number,
    durationSeconds: number,
    mapping: TemperatureMappingConfig = DEFAULT_TEMPERATURE_MAPPING,
  ): TemperatureSound {
    this.assertNotDisposed();

    const sound = temperatureToSound(temperatureC, mapping);

    this.scheduleFrequency(sound.frequencyHz, startTime, durationSeconds);

    return sound;
  }

  /**
   * Schedule one note at an absolute audio-clock time.
   *
   * - startTime must not be in the past.
   * - Notes must not overlap: startTime >= end of the previous note.
   *   Back-to-back notes (startTime == previous end) are allowed.
   * - null schedules nothing (a silent gap).
   *
   * stop() cancels every note scheduled with this method.
   */
  public scheduleFrequency(
    frequencyHz: number | null,
    startTime: number,
    durationSeconds: number,
    pan = 0,
  ): void {
    this.assertNotDisposed();

    this.validateDuration(durationSeconds);

    if (!Number.isFinite(startTime)) {
      throw new Error("Start time must be a finite number of seconds.");
    }

    const { oscillator, envelope } = this.requireRunningNodes();

    if (startTime < Tone.immediate() - TIME_EPSILON) {
      throw new Error(
        "Start time is in the past. Read getAudioTime() and schedule after it.",
      );
    }

    if (startTime < this.lastNoteEnd - TIME_EPSILON) {
      throw new Error(
        "Scheduled notes must not overlap. Call stop() before rescheduling.",
      );
    }

    // A missing observation is a silent gap, not a note.
    if (frequencyHz === null) {
      return;
    }

    this.validateFrequency(frequencyHz);

    if (!Number.isFinite(pan) || pan < -1 || pan > 1) {
      throw new Error("Pan must be between -1 (left) and 1 (right).");
    }

    const end = startTime + durationSeconds;

    // Stereo position changes at the note start, while the envelope is 0.
    this.panner?.pan.setValueAtTime(pan, startTime);

    // The previous note has faded to zero by startTime,
    // so the pitch can change instantly without an audible jump.
    oscillator.frequency.setValueAtTime(frequencyHz, startTime);

    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(
      MAX_SIGNAL_GAIN,
      startTime + FADE_SECONDS,
    );
    envelope.gain.setValueAtTime(MAX_SIGNAL_GAIN, end - FADE_SECONDS);
    envelope.gain.linearRampToValueAtTime(0, end);

    this.lastNoteEnd = end;
  }

  /**
   * User volume: 0 = muted, 1 = maximum configured output.
   * Temperature does not control loudness.
   */
  public setVolume(volume: number): void {
    this.assertNotDisposed();

    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new Error("Volume must be a number between 0 and 1.");
    }

    this.volume = volume;

    if (this.output) {
      const now = Tone.immediate();

      this.output.gain.cancelAndHoldAtTime(now);
      this.output.gain.linearRampToValueAtTime(
        volume,
        now + FADE_SECONDS,
      );
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Fade the current note to silence AND cancel all future scheduled notes.
   * Does not close the shared Tone.js audio context.
   */
  public stop(): void {
    if (this.disposed || !this.envelope) {
      return;
    }

    // Use the current audio clock rather than the look-ahead clock
    // so Stop responds promptly.
    const now = Tone.immediate();

    // cancelAndHoldAtTime removes every automation event after `now`,
    // which includes all future scheduled notes.
    this.oscillator?.frequency.cancelAndHoldAtTime(now);
    this.panner?.pan.cancelAndHoldAtTime(now);

    this.envelope.gain.cancelAndHoldAtTime(now);
    this.envelope.gain.linearRampToValueAtTime(
      0,
      now + FADE_SECONDS,
    );

    // New notes may be scheduled once the fade-out has finished.
    this.lastNoteEnd = now + FADE_SECONDS;
  }

  /**
   * Release resources when the owning component is removed.
   * A disposed engine cannot be reused; create a new instance.
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    this.oscillator?.dispose();
    this.envelope?.dispose();
    this.panner?.dispose();
    this.output?.dispose();

    this.oscillator = null;
    this.envelope = null;
    this.panner = null;
    this.output = null;
  }

  private requireRunningNodes(): {
    oscillator: Tone.Oscillator;
    envelope: Tone.Gain;
  } {
    const oscillator = this.oscillator;
    const envelope = this.envelope;

    if (
      !oscillator ||
      !envelope ||
      Tone.getContext().state !== "running"
    ) {
      throw new Error("Call and await audioEngine.start() before playing.");
    }

    return { oscillator, envelope };
  }

  private validateFrequency(frequencyHz: number): void {
    if (
      !Number.isFinite(frequencyHz) ||
      frequencyHz < 20 ||
      frequencyHz > 20000
    ) {
      throw new Error("Frequency must be between 20 and 20000 Hz.");
    }
  }

  private validateDuration(durationSeconds: number): void {
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0.05 ||
      durationSeconds > 10
    ) {
      throw new Error("Note duration must be between 0.05 and 10 seconds.");
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error("This AudioEngine has already been disposed.");
    }
  }
}