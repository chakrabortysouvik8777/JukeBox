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

  class FakePanner {
    static instances: FakePanner[] = [];

    pan = new FakeParam();
    dispose = vi.fn();

    constructor(public initialValue: number) {
      FakePanner.instances.push(this);
    }

    connect(_destination: unknown): this {
      return this;
    }
  }

  return {
    FakeGain,
    FakeOscillator,
    FakePanner,
    start: vi.fn<() => Promise<void>>(),
    context: { state: "running" },
  };
});

// Replace Tone.js only inside this test file.
vi.mock("tone", () => ({
  Gain: audioMocks.FakeGain,
  Oscillator: audioMocks.FakeOscillator,
  Panner: audioMocks.FakePanner,
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
    audioMocks.FakePanner.instances.length = 0;

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

  describe("scheduled playback", () => {
    it("reports the scheduling clock and the playback clock", () => {
      // Scheduling clock runs ahead of what the listener hears.
      expect(engine.getAudioTime()).toBe(10);
      expect(engine.getPlaybackTime()).toBe(9.9);
    });

    it("rejects scheduling before audio has been started", () => {
      expect(() => engine.scheduleFrequency(440, 12, 0.5)).toThrow(
        "Call and await audioEngine.start() before playing.",
      );
    });

    it("schedules pitch and envelope at the requested audio time", async () => {
      await engine.start();

      engine.scheduleFrequency(440, 12, 0.5);

      const oscillator = audioMocks.FakeOscillator.instances[0];
      const envelope = audioMocks.FakeGain.instances[1];

      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 12);

      const gainSets = envelope.gain.setValueAtTime.mock.calls;
      const gainRamps = envelope.gain.linearRampToValueAtTime.mock.calls;

      // Silent at the start, fade in, hold, fade out to zero at the end.
      expect(gainSets[0]).toEqual([0, 12]);
      expect(gainRamps[0][0]).toBe(0.2);
      expect(gainRamps[0][1]).toBeCloseTo(12.02);
      expect(gainSets[1][0]).toBe(0.2);
      expect(gainSets[1][1]).toBeCloseTo(12.48);
      expect(gainRamps[1]).toEqual([0, 12.5]);

      // Scheduling must not cancel anything.
      expect(envelope.gain.cancelAndHoldAtTime).not.toHaveBeenCalled();
    });

    it("maps and schedules a temperature with an explicit mapping", async () => {
      await engine.start();

      const sound = engine.scheduleTemperature(2.5, 12, 0.5, {
        id: "t2m-pitch-v1",
        minTemperatureC: -40,
        maxTemperatureC: 45,
        minFrequencyHz: 220,
        octaves: 2,
      });

      const oscillator = audioMocks.FakeOscillator.instances[0];
      const [frequency, time] =
        oscillator.frequency.setValueAtTime.mock.lastCall!;

      expect(sound.frequencyHz).toBeCloseTo(440);
      expect(frequency).toBeCloseTo(440);
      expect(time).toBe(12);
    });

    it("schedules nothing for a missing observation", async () => {
      await engine.start();

      const sound = engine.scheduleTemperature(null, 12, 0.5);

      const oscillator = audioMocks.FakeOscillator.instances[0];
      const envelope = audioMocks.FakeGain.instances[1];

      expect(sound.frequencyHz).toBeNull();
      expect(oscillator.frequency.setValueAtTime).not.toHaveBeenCalled();
      expect(envelope.gain.setValueAtTime).not.toHaveBeenCalled();
    });

    it("allows back-to-back notes in sequence", async () => {
      await engine.start();

      engine.scheduleFrequency(220, 12, 0.5);
      engine.scheduleFrequency(440, 12.5, 0.5);
      engine.scheduleFrequency(880, 13, 0.5);

      const oscillator = audioMocks.FakeOscillator.instances[0];

      expect(oscillator.frequency.setValueAtTime.mock.calls).toEqual([
        [220, 12],
        [440, 12.5],
        [880, 13],
      ]);
    });

    it("rejects overlapping notes", async () => {
      await engine.start();

      engine.scheduleFrequency(220, 12, 0.5);

      expect(() => engine.scheduleFrequency(440, 12.2, 0.5)).toThrow(
        "Scheduled notes must not overlap",
      );
    });

    it("rejects start times in the past and invalid times", async () => {
      await engine.start();

      expect(() => engine.scheduleFrequency(440, 5, 0.5)).toThrow(
        "Start time is in the past",
      );

      for (const time of [NaN, Infinity]) {
        expect(() => engine.scheduleFrequency(440, time, 0.5)).toThrow();
      }

      expect(() => engine.scheduleFrequency(440, 12, 0.01)).toThrow();
    });

    it("places each scheduled note in stereo (A left, B right)", async () => {
      await engine.start();

      engine.scheduleFrequency(440, 12, 0.4, -0.6);
      engine.scheduleFrequency(440, 12.5, 0.4, 0.6);
      engine.scheduleFrequency(440, 13, 0.4); // default: centre

      const panner = audioMocks.FakePanner.instances[0];
      expect(panner.pan.setValueAtTime.mock.calls).toEqual([
        [-0.6, 12],
        [0.6, 12.5],
        [0, 13],
      ]);
    });

    it("rejects an invalid stereo position", async () => {
      await engine.start();
      expect(() => engine.scheduleFrequency(440, 12, 0.4, 2)).toThrow("Pan");
    });

    it("dispose() also releases the panner", async () => {
      await engine.start();
      const panner = audioMocks.FakePanner.instances[0];
      engine.dispose();
      expect(panner.dispose).toHaveBeenCalledTimes(1);
    });

    it("stop() cancels future notes and allows a new schedule", async () => {
      await engine.start();

      engine.scheduleFrequency(220, 12, 0.5);
      engine.scheduleFrequency(440, 12.5, 0.5);

      engine.stop();

      const oscillator = audioMocks.FakeOscillator.instances[0];
      const envelope = audioMocks.FakeGain.instances[1];

      // Cancelling from the current time removes every later event.
      expect(oscillator.frequency.cancelAndHoldAtTime).toHaveBeenCalledWith(9.9);
      expect(envelope.gain.cancelAndHoldAtTime).toHaveBeenCalledWith(9.9);

      // After a seek, the controller can schedule from an earlier time again.
      expect(() => engine.scheduleFrequency(330, 10.5, 0.5)).not.toThrow();
    });
  });
});