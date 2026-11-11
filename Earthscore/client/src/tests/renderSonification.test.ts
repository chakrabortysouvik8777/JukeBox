import { describe, expect, it, vi } from "vitest";

import {
  encodeWav,
  fileNamePart,
  renderDurationSeconds,
  renderNotes,
  waveformPeaks,
  type OfflineContextFactory,
} from "../audio/renderSonification";

// ---------- Fake OfflineAudioContext that records automation ----------

function fakeContextFactory() {
  const calls = {
    frequency: [] as Array<[number, number]>,
    gainSet: [] as Array<[number, number]>,
    gainRamp: [] as Array<[number, number]>,
    created: null as null | { channels: number; length: number; sampleRate: number },
    start: vi.fn(),
    stop: vi.fn(),
  };

  const factory: OfflineContextFactory = (channels, length, sampleRate) => {
    calls.created = { channels, length, sampleRate };

    const oscillator = {
      type: "",
      frequency: {
        setValueAtTime: (v: number, t: number) => calls.frequency.push([v, t]),
      },
      connect: (node: unknown) => node,
      start: calls.start,
      stop: calls.stop,
    };

    const gain = {
      gain: {
        setValueAtTime: (v: number, t: number) => calls.gainSet.push([v, t]),
        linearRampToValueAtTime: (v: number, t: number) => calls.gainRamp.push([v, t]),
      },
      connect: (node: unknown) => node,
    };

    return {
      destination: {} as AudioNode,
      sampleRate,
      createOscillator: () => oscillator as unknown as OscillatorNode,
      createGain: () => gain as unknown as GainNode,
      startRendering: async () => ({ duration: length / sampleRate }) as AudioBuffer,
    };
  };

  return { factory, calls };
}

describe("renderNotes", () => {
  const options = { stepSeconds: 0.5, noteSeconds: 0.4, sampleRate: 8000 };

  it("schedules each note at its time and keeps missing months silent", async () => {
    const { factory, calls } = fakeContextFactory();

    await renderNotes(
      [{ frequencyHz: 220 }, { frequencyHz: null }, { frequencyHz: 440 }],
      options,
      factory,
    );

    // Notes at 0 s and 1.0 s; the missing month (0.5 s) produces nothing.
    expect(calls.frequency).toEqual([
      [220, 0],
      [440, 1],
    ]);

    // Each note ends at zero amplitude (no clicks).
    expect(calls.gainRamp.filter(([v]) => v === 0).map(([, t]) => t)).toEqual([
      0.4, 1.4,
    ]);
  });

  it("creates a mono buffer long enough for all notes plus a tail", async () => {
    const { factory, calls } = fakeContextFactory();
    await renderNotes([{ frequencyHz: 300 }, { frequencyHz: 300 }], options, factory);

    const seconds = renderDurationSeconds(2, options); // 0.5 + 0.4 + 0.25
    expect(seconds).toBeCloseTo(1.15);
    expect(calls.created).toEqual({
      channels: 1,
      length: Math.ceil(seconds * 8000),
      sampleRate: 8000,
    });
    expect(calls.stop).toHaveBeenCalledWith(seconds);
  });

  it.each([
    [{ stepSeconds: 0, noteSeconds: 0.4 }],
    [{ stepSeconds: 0.5, noteSeconds: 0.6 }],
    [{ stepSeconds: 0.5, noteSeconds: 0.4, amplitude: 1.5 }],
  ])("rejects invalid options %o", async (bad) => {
    const { factory } = fakeContextFactory();
    await expect(renderNotes([{ frequencyHz: 220 }], bad, factory)).rejects.toThrow();
  });
});

describe("encodeWav", () => {
  it("writes a valid 16-bit mono PCM header and samples", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 0.5]), 44100);
    const view = new DataView(wav);
    const text = (o: number, n: number) =>
      String.fromCharCode(...new Uint8Array(wav, o, n));

    expect(wav.byteLength).toBe(44 + 4 * 2);
    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(text(36, 4)).toBe("data");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16);

    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
    expect(view.getInt16(50, true)).toBe(16383);
  });

  it("clips values outside −1…1", () => {
    const view = new DataView(encodeWav(new Float32Array([2, -3]), 8000));
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });
});

describe("waveformPeaks", () => {
  it("returns one normalised peak per bar", () => {
    const samples = new Float32Array([0.1, -0.2, 0, 0, 0.4, -0.1, 0.05, 0]);
    expect(waveformPeaks(samples, 4)).toEqual([0.5, 0, 1, 0.125]);
  });

  it("handles silence and empty input", () => {
    expect(waveformPeaks(new Float32Array(10), 2)).toEqual([0, 0]);
    expect(waveformPeaks(new Float32Array(0), 3)).toEqual([0, 0, 0]);
  });
});

describe("fileNamePart", () => {
  it.each([
    ["Kolkata", "kolkata"],
    ["São Paulo, Brazil", "sao-paulo-brazil"],
    ["Finding location...", "finding-location"],
    ["!!!", "location"],
  ])("%s -> %s", (input, expected) => {
    expect(fileNamePart(input)).toBe(expected);
  });
});
