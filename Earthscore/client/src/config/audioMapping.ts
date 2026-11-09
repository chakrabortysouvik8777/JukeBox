import type { TemperatureMappingConfig } from "../types/audio";

export const DEFAULT_TEMPERATURE_MAPPING:
  Readonly<TemperatureMappingConfig> = Object.freeze({
    id: "sst-pitch-v1",
    minTemperatureC: -2,
    maxTemperatureC: 35,
    minFrequencyHz: 220,
    octaves: 2,
  });

// For NASA POWER T2M: monthly air temperature 2 m above ground (land + ocean).
// Range agreed with M2; values outside it are clipped for pitch only.
export const T2M_TEMPERATURE_MAPPING:
  Readonly<TemperatureMappingConfig> = Object.freeze({
    id: "t2m-pitch-v1",
    minTemperatureC: -40,
    maxTemperatureC: 45,
    minFrequencyHz: 220,
    octaves: 2,
  });