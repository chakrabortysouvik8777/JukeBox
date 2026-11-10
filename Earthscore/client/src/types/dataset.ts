// Shared scientific data types (M2).
// Every module (charts, panels, audio, playback) reads these same records.

// Where a series of observations comes from.
export interface DataSourceInfo {
  readonly name: string; // e.g. "NASA POWER"
  readonly parameter: string; // e.g. "T2M"
  readonly description: string;
  readonly units: string; // always "°C" for temperature records
  readonly temporalResolution: "monthly";
  readonly url: string; // exact request URL, for provenance
}

// One monthly temperature value at one point.
export interface TemperatureObservation {
  // Stable unique id: "<lat>,<lng>:<YYYY-MM>", e.g. "22.5726,88.3639:2016-01"
  readonly id: string;

  // "YYYY-MM" (calendar month, UTC).
  readonly date: string;
  readonly year: number;
  readonly month: number; // 1–12

  // Monthly mean air temperature 2 m above ground, in °C.
  // null = missing (NASA fill value or failed quality check). Never 0.
  readonly temperatureC: number | null;
}

// "live" = downloaded from NASA now.
// "snapshot" = NASA data saved earlier in public/data (used when live fails).
export type DataOrigin = "live" | "snapshot";

// A validated time series for one location.
export interface TemperatureSeries {
  readonly latitude: number;
  readonly longitude: number;
  readonly source: DataSourceInfo;
  readonly observations: readonly TemperatureObservation[]; // sorted by date
  readonly missingCount: number;
  readonly origin: DataOrigin;
  // When origin is "snapshot": when the snapshot was downloaded (ISO date).
  readonly snapshotCreatedAt?: string;
}