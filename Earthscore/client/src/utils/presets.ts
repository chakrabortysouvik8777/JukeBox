import type { Location } from "../types/location";

/** Preset locations (same points as the globe presets and the saved NASA data). */
export const PRESET_LOCATIONS: readonly Location[] = [
  { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639 },
  { name: "Svalbard", country: "Norway", lat: 78.2232, lng: 15.6469 },
  { name: "Amazon", country: "Brazil", lat: -3.4653, lng: -62.2159 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Sahara", country: "Africa", lat: 23.4162, lng: 25.6628 },
  { name: "Tuvalu", country: "Pacific Ocean", lat: -7.1095, lng: 177.6493 },
];

export function presetByName(name: string): Location {
  const preset = PRESET_LOCATIONS.find((p) => p.name === name);
  if (!preset) throw new Error(`Unknown preset: ${name}`);
  return preset;
}
