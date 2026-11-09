import type {
  TemperatureMappingConfig,
  TemperatureSound,
} from "../types/audio";

import {
  DEFAULT_TEMPERATURE_MAPPING,
} from "../config/audioMapping";

function validateMapping(
  config: TemperatureMappingConfig
): void {
  const settings = [
    config.minTemperatureC,
    config.maxTemperatureC,
    config.minFrequencyHz,
    config.octaves,
  ];

  if (!settings.every(Number.isFinite)) {
    throw new Error("Mapping settings must be finite numbers.");
  }

  if (config.maxTemperatureC <= config.minTemperatureC) {
    throw new Error(
      "Maximum temperature must exceed minimum temperature."
    );
  }

  if (config.minFrequencyHz <= 0) {
    throw new Error("Minimum frequency must be greater than zero.");
  }

  if (config.octaves <= 0) {
    throw new Error("Octave range must be greater than zero.");
  }

  const maximumFrequency =
    config.minFrequencyHz * Math.pow(2, config.octaves);

  if (!Number.isFinite(maximumFrequency)) {
    throw new Error("Mapping produces an invalid maximum frequency.");
  }
}

export function temperatureToSound(
  temperatureC: number | null,
  config: TemperatureMappingConfig =
    DEFAULT_TEMPERATURE_MAPPING
): TemperatureSound {
  validateMapping(config);

  // Missing data must not become a zero-temperature note.
  if (temperatureC === null) {
    return {
      originalTemperatureC: null,
      normalizedValue: null,
      frequencyHz: null,
      clipped: false,
    };
  }

  // Reject invalid input rather than silently producing bad audio.
  if (
    typeof temperatureC !== "number" ||
    !Number.isFinite(temperatureC)
  ) {
    throw new Error("Temperature must be a finite number or null.");
  }

  const temperatureRange =
    config.maxTemperatureC - config.minTemperatureC;

  const rawNormalizedValue =
    (temperatureC - config.minTemperatureC) /
    temperatureRange;

  const normalizedValue = Math.max(
    0,
    Math.min(1, rawNormalizedValue)
  );

  const frequencyHz =
    config.minFrequencyHz *
    Math.pow(2, config.octaves * normalizedValue);

  const clipped =
    temperatureC < config.minTemperatureC ||
    temperatureC > config.maxTemperatureC;

  return {
    originalTemperatureC: temperatureC,
    normalizedValue,
    frequencyHz,
    clipped,
  };
}