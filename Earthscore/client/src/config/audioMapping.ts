import type { TemperatureMappingConfig } from "../types/audio";

export const DEFAULT_TEMPERATURE_MAPPING:
  Readonly<TemperatureMappingConfig> = Object.freeze({
    id: "sst-pitch-v1",
    minTemperatureC: -2,
    maxTemperatureC: 35,
    minFrequencyHz: 220,
    octaves: 2,
  });