import { describe, expect, it } from "vitest";
import { temperatureToSound } from "../audio/temperatureMapping";
import { DEFAULT_TEMPERATURE_MAPPING } from "../config/audioMapping";

describe("temperatureToSound", () => {
  it.each([
    [-2, 0, 220],
    [16.5, 0.5, 440],
    [35, 1, 880],
  ])(
    "maps %s°C to normalized value %s and %s Hz",
    (temperature, normalized, frequency) => {
      const result = temperatureToSound(temperature);

      expect(result.originalTemperatureC).toBe(temperature);
      expect(result.normalizedValue).toBeCloseTo(normalized);
      expect(result.frequencyHz).toBeCloseTo(frequency);
      expect(result.clipped).toBe(false);
    },
  );

  it("keeps missing observations silent instead of treating them as zero", () => {
    expect(temperatureToSound(null)).toEqual({
      originalTemperatureC: null,
      normalizedValue: null,
      frequencyHz: null,
      clipped: false,
    });
  });

  it.each([
    [-10, 0, 220],
    [40, 1, 880],
  ])(
    "clips %s°C while preserving the original observation",
    (temperature, normalized, frequency) => {
      const result = temperatureToSound(temperature);

      expect(result.originalTemperatureC).toBe(temperature);
      expect(result.normalizedValue).toBe(normalized);
      expect(result.frequencyHz).toBeCloseTo(frequency);
      expect(result.clipped).toBe(true);
    },
  );

  it("produces increasing pitches for increasing temperatures", () => {
    const temperatures = [-2, 0, 10, 16.5, 25, 35];

    const frequencies = temperatures.map(
      (temperature) => temperatureToSound(temperature).frequencyHz!,
    );

    for (let index = 1; index < frequencies.length; index++) {
      expect(frequencies[index]).toBeGreaterThan(frequencies[index - 1]);
    }
  });

  it("produces the same result for the same observation", () => {
    expect(temperatureToSound(25)).toEqual(temperatureToSound(25));
  });

  it.each([NaN, Infinity, -Infinity])(
    "rejects invalid temperature %s",
    (temperature) => {
      expect(() => temperatureToSound(temperature)).toThrow();
    },
  );

  it("rejects equal temperature bounds", () => {
    expect(() =>
      temperatureToSound(10, {
        ...DEFAULT_TEMPERATURE_MAPPING,
        minTemperatureC: 10,
        maxTemperatureC: 10,
      }),
    ).toThrow();
  });

  it("rejects reversed temperature bounds", () => {
    expect(() =>
      temperatureToSound(10, {
        ...DEFAULT_TEMPERATURE_MAPPING,
        minTemperatureC: 20,
        maxTemperatureC: 0,
      }),
    ).toThrow();
  });

  it.each([
    { minFrequencyHz: 0 },
    { octaves: 0 },
    { octaves: NaN },
  ])("rejects invalid mapping settings %o", (override) => {
    expect(() =>
      temperatureToSound(10, {
        ...DEFAULT_TEMPERATURE_MAPPING,
        ...override,
      }),
    ).toThrow();
  });

  it("supports an explicitly configured mapping", () => {
    const result = temperatureToSound(10, {
      id: "test-mapping",
      minTemperatureC: 0,
      maxTemperatureC: 20,
      minFrequencyHz: 100,
      octaves: 2,
    });

    expect(result.normalizedValue).toBeCloseTo(0.5);
    expect(result.frequencyHz).toBeCloseTo(200);
    expect(result.clipped).toBe(false);
  });
});