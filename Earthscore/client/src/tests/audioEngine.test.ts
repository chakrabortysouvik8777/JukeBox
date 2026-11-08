import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AudioEngine } from "../audio/AudioEngine";

// These fake audio objects record commands without producing sound.
const audioMocks = vi.hoisted(() => {
  class FakeParam {
    cancelAndHoldAtTime = vi.fn();
    linearRampToValueAtTime = vi.fn();
    setValueAtTime = vi.fn();
  }

  class FakeGain {
    static instances: FakeGain[] = [];

    gain = new FakeParam();
    dispose = vi.fn();

    constructor(public initialValue: number) {
      FakeGain.instances.push(this);
    }

    connect(_destination: unknown): this {
      return this;
    }

    toDestination(): this {
      return this;
    }
  }

  class FakeOscillator {
    static instances: FakeOscillator[] = [];

    frequency = new FakeParam();
    start = vi.fn();
    dispose = vi.fn();

    constructor(_options: unknown) {
      FakeOscillator.instances.push(this);
    }

    connect(_destination: unknown): this {
      return this;
    }
  }

  return {
    FakeGain,
    FakeOscillator,
    start: vi.fn<() => Promise<void>>(),
    context: { state: "running" },
  };
});

// Replace Tone.js only inside this test file.
vi.mock("tone", () => ({
  Gain: audioMocks.FakeGain,
  Oscillator: audioMocks.FakeOscillator,
  start: audioMocks.start,
  getContext: () => audioMocks.context,

  // Fixed clocks make timing assertions repeatable.
  now: () => 10,
  immediate: () => 9.9,
}));

describe("AudioEngine", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    vi.clearAllMocks();

    audioMocks.FakeGain.instances.length = 0;
    audioMocks.FakeOscillator.instances.length = 0;

    audioMocks.context.state = "running";
    audioMocks.start.mockReset();
    audioMocks.start.mockResolvedValue(undefined);

    engine = new AudioEngine();
  });

  afterEach(() => {
    engine.dispose();
  });

  it("rejects playback before audio has been started", () => {
    expect(() => engine.playFrequency(440)).toThrow(
      "Call and await audioEngine.start() before playing.",
    );

    expect(audioMocks.FakeOscillator.instances).toHaveLength(0);
  });

  it("shares concurrent initialization and avoids duplicate oscillators", async () => {
    await Promise.all([engine.start(), engine.start()]);

    expect(audioMocks.start).toHaveBeenCalledTimes(1);
    expect(audioMocks.FakeOscillator.instances).toHaveLength(1);
    expect(audioMocks.FakeGain.instances).toHaveLength(2);

    await engine.start();

    expect(audioMocks.FakeOscillator.instances).toHaveLength(1);
    expect(
      audioMocks.FakeOscillator.instances[0].start,
    ).toHaveBeenCalledTimes(1);
  });

  it("sends the mapped temperature frequency to the oscillator", async () => {
    await engine.start();

    const sound = engine.playTemperature(16.5, 0.5);
    const oscillator = audioMocks.FakeOscillator.instances[0];
    const envelope = audioMocks.FakeGain.instances[1];

    expect(sound.frequencyHz).toBeCloseTo(440);

    expect(
      oscillator.frequency.linearRampToValueAtTime,
    ).toHaveBeenCalledWith(440, 10.02);

    // The note must finish at zero amplitude.
    expect(
      envelope.gain.linearRampToValueAtTime,
    ).toHaveBeenLastCalledWith(0, 10.5);
  });

  it("cancels pending automation when replacing a note", async () => {
    await engine.start();

    engine.playFrequency(220);
    engine.playFrequency(880);

    const oscillator = audioMocks.FakeOscillator.instances[0];
    const envelope = audioMocks.FakeGain.instances[1];

    expect(
      oscillator.frequency.cancelAndHoldAtTime,
    ).toHaveBeenCalledTimes(2);

    expect(
      envelope.gain.cancelAndHoldAtTime,
    ).toHaveBeenCalledTimes(2);

    expect(
      oscillator.frequency.linearRampToValueAtTime,
    ).toHaveBeenLastCalledWith(880, 10.02);
  });

  it("stops the current sound for a missing observation", async () => {
    await engine.start();
    engine.playTemperature(25);

    const oscillator = audioMocks.FakeOscillator.instances[0];
    const envelope = audioMocks.FakeGain.instances[1];

    oscillator.frequency.linearRampToValueAtTime.mockClear();
    envelope.gain.linearRampToValueAtTime.mockClear();

    const sound = engine.playTemperature(null);

    expect(sound.frequencyHz).toBeNull();

    expect(
      oscillator.frequency.linearRampToValueAtTime,
    ).not.toHaveBeenCalled();

    expect(
      envelope.gain.cancelAndHoldAtTime,
    ).toHaveBeenLastCalledWith(9.9);

    const lastRamp =
      envelope.gain.linearRampToValueAtTime.mock.lastCall!;

    expect(lastRamp[0]).toBe(0);
    expect(lastRamp[1]).toBeCloseTo(9.92);
  });

  it("preserves volume set before initialization and supports mute", async () => {
    engine.setVolume(0.4);
    await engine.start();

    const output = audioMocks.FakeGain.instances[0];

    expect(engine.getVolume()).toBe(0.4);
    expect(output.initialValue).toBe(0.4);

    engine.setVolume(0);

    expect(engine.getVolume()).toBe(0);

    const lastRamp =
      output.gain.linearRampToValueAtTime.mock.lastCall!;

    expect(lastRamp[0]).toBe(0);
    expect(lastRamp[1]).toBeCloseTo(9.92);
  });

  it("rejects invalid inputs before scheduling audio", async () => {
    await engine.start();

    for (const frequency of [NaN, Infinity, -1, 0, 20001]) {
      expect(() => engine.playFrequency(frequency)).toThrow();
    }

    for (const duration of [NaN, Infinity, 0, 0.01, 11]) {
      expect(() => engine.playFrequency(440, duration)).toThrow();
    }

    for (const volume of [NaN, Infinity, -0.1, 1.1]) {
      expect(() => engine.setVolume(volume)).toThrow();
    }

    const oscillator = audioMocks.FakeOscillator.instances[0];

    expect(
      oscillator.frequency.linearRampToValueAtTime,
    ).not.toHaveBeenCalled();
  });

  it("allows initialization to be retried after an error", async () => {
    audioMocks.start.mockRejectedValueOnce(
      new Error("Audio permission failed"),
    );

    await expect(engine.start()).rejects.toThrow(
      "Audio permission failed",
    );

    expect(audioMocks.FakeOscillator.instances).toHaveLength(0);

    await engine.start();

    expect(audioMocks.FakeOscillator.instances).toHaveLength(1);
  });

  it("does not create audio nodes if disposed during initialization", async () => {
    let finishStarting!: () => void;

    audioMocks.start.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishStarting = resolve;
        }),
    );

    const pendingStart = engine.start();

    engine.dispose();
    finishStarting();

    await expect(pendingStart).rejects.toThrow(
      "This AudioEngine has already been disposed.",
    );

    expect(audioMocks.FakeOscillator.instances).toHaveLength(0);
    expect(audioMocks.FakeGain.instances).toHaveLength(0);
  });

  it("disposes resources once and rejects later playback", async () => {
    await engine.start();

    const oscillator = audioMocks.FakeOscillator.instances[0];
    const gains = [...audioMocks.FakeGain.instances];

    engine.dispose();
    engine.dispose();

    expect(oscillator.dispose).toHaveBeenCalledTimes(1);

    for (const gain of gains) {
      expect(gain.dispose).toHaveBeenCalledTimes(1);
    }

    expect(() => engine.playFrequency(440)).toThrow(
      "This AudioEngine has already been disposed.",
    );

    await expect(engine.start()).rejects.toThrow(
      "This AudioEngine has already been disposed.",
    );
  });
});