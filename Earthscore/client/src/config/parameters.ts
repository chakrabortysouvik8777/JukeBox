/**
 * Parameters that can be turned into sound.
 *
 * Every parameter has ONE fixed value-to-pitch mapping, the same for every
 * place and year (a project design choice, not a NASA standard). The mapping
 * reuses TemperatureMappingConfig: its min/max fields are in the
 * parameter's own unit (°C, mm/day, ppm, ppb).
 */
import type { TemperatureMappingConfig } from "../types/audio";
import { T2M_TEMPERATURE_MAPPING } from "./audioMapping";

export type SoundParameterId = "temperature" | "rainfall" | "co2" | "ch4";

export interface SoundParameter {
  id: SoundParameterId;
  label: string; // "Temperature"
  quantity: string; // "air temperature"
  unit: string; // "°C"
  decimals: number;
  // "point" = value at the selected location; "global" = one worldwide value.
  scope: "point" | "global";
  source: string; // shown under charts and panels
  description: string; // one sentence for the panel subtitle
  lowWord: string; // "colder"
  highWord: string; // "warmer"
  mapping: TemperatureMappingConfig;
}

export const SOUND_PARAMETERS: Record<SoundParameterId, SoundParameter> = {
  temperature: {
    id: "temperature",
    label: "Temperature",
    quantity: "air temperature",
    unit: "°C",
    decimals: 1,
    scope: "point",
    source: "NASA POWER T2M (monthly)",
    description:
      "Monthly mean air temperature 2 metres above the ground at this point.",
    lowWord: "colder",
    highWord: "warmer",
    mapping: T2M_TEMPERATURE_MAPPING,
  },
  rainfall: {
    id: "rainfall",
    label: "Rainfall",
    quantity: "precipitation",
    unit: "mm/day",
    decimals: 1,
    scope: "point",
    source: "NASA POWER PRECTOTCORR (monthly)",
    description:
      "Monthly mean precipitation at this point, in millimetres per day (bias-corrected).",
    lowWord: "drier",
    highWord: "wetter",
    mapping: Object.freeze({
      id: "rain-pitch-v1",
      minTemperatureC: 0, // mm/day
      maxTemperatureC: 15, // mm/day
      minFrequencyHz: 220,
      octaves: 2,
    }),
  },
  co2: {
    id: "co2",
    label: "CO₂",
    quantity: "carbon dioxide",
    unit: "ppm",
    decimals: 2,
    scope: "global",
    source: "NOAA GML global monthly mean CO₂ (not NASA)",
    description:
      "Global monthly mean CO₂ in the atmosphere. The same for every location.",
    lowWord: "less CO₂",
    highWord: "more CO₂",
    mapping: Object.freeze({
      id: "co2-pitch-v1",
      minTemperatureC: 400, // ppm
      maxTemperatureC: 430, // ppm
      minFrequencyHz: 220,
      octaves: 2,
    }),
  },
  ch4: {
    id: "ch4",
    label: "CH₄",
    quantity: "methane",
    unit: "ppb",
    decimals: 1,
    scope: "global",
    source: "NOAA GML global monthly mean CH₄ (not NASA)",
    description:
      "Global monthly mean methane in the atmosphere. The same for every location.",
    lowWord: "less CH₄",
    highWord: "more CH₄",
    mapping: Object.freeze({
      id: "ch4-pitch-v1",
      minTemperatureC: 1830, // ppb
      maxTemperatureC: 1950, // ppb
      minFrequencyHz: 220,
      octaves: 2,
    }),
  },
};

export const SOUND_PARAMETER_IDS: readonly SoundParameterId[] = [
  "temperature",
  "rainfall",
  "co2",
  "ch4",
];

/** Parameters that differ between places (usable in Regional Compare). */
export const POINT_PARAMETER_IDS: readonly SoundParameterId[] =
  SOUND_PARAMETER_IDS.filter((id) => SOUND_PARAMETERS[id].scope === "point");

export function formatValue(value: number | null, parameter: SoundParameter): string {
  return value === null ? "missing" : `${value.toFixed(parameter.decimals)} ${parameter.unit}`;
}
