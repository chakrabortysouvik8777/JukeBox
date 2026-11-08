import * as Tone from "tone";

import { temperatureToSound } from "./temperatureMapping";
import { DEFAULT_TEMPERATURE_MAPPING } from "../config/audioMapping";

import type {
  TemperatureMappingConfig,
  TemperatureSound,
} from "../types/audio";

const DEFAULT_VOLUME = 0.3;
const MAX_SIGNAL_GAIN = 0.2;
const FADE_SECONDS = 0.02;

export class AudioEngine {
  private oscillator: Tone.Oscillator | null = null;
  private envelope: Tone.Gain | null = null;
  private output: Tone.Gain | null = null;

  private volume = DEFAULT_VOLUME;
  private disposed = false;
  private startPromise: Promise<void> | null = null;

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

    // Start silent.
    this.envelope = new Tone.Gain(0).connect(this.output);

    this.oscillator = new Tone.Oscillator({
      type: "sine",
      frequency: DEFAULT_TEMPERATURE_MAPPING.minFrequencyHz,
    }).connect(this.envelope);

    this.oscillator.start();
  }

  /**
   * Map a temperature to sound and play it.
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
   * This method does not queue future timeline events.
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

    if (
      !Number.isFinite(frequencyHz) ||
      frequencyHz < 20 ||
      frequencyHz > 20000
    ) {
      throw new Error("Frequency must be between 20 and 20000 Hz.");
    }

    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0.05 ||
      durationSeconds > 10
    ) {
      throw new Error("Note duration must be between 0.05 and 10 seconds.");
    }

    const oscillator = this.oscillator;
    const envelope = this.envelope;

    if (
      !oscillator ||
      !envelope ||
      Tone.getContext().state !== "running"
    ) {
      throw new Error("Call and await audioEngine.start() before playing.");
    }

    const now = Tone.now();
    const end = now + durationSeconds;

    // Cancel the previous note's automation.
    // Hold its current value so the transition is not an abrupt jump.
    oscillator.frequency.cancelAndHoldAtTime(now);
    envelope.gain.cancelAndHoldAtTime(now);

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
   * Cancel the current note and fade to silence.
   * Does not close the shared Tone.js audio context.
   */
  public stop(): void {
    if (this.disposed || !this.envelope) {
      return;
    }

    // Use the current audio clock rather than the look-ahead clock
    // so Stop responds promptly.
    const now = Tone.immediate();

    this.oscillator?.frequency.cancelAndHoldAtTime(now);

    this.envelope.gain.cancelAndHoldAtTime(now);
    this.envelope.gain.linearRampToValueAtTime(
      0,
      now + FADE_SECONDS,
    );
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
    this.output?.dispose();

    this.oscillator = null;
    this.envelope = null;
    this.output = null;
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error("This AudioEngine has already been disposed.");
    }
  }
}