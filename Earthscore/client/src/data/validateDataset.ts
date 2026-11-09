import type {
  DataSourceInfo,
  TemperatureObservation,
  TemperatureSeries,
} from "../types/dataset";

// NASA POWER marks missing values with this number.
export const POWER_DEFAULT_FILL_VALUE = -999;

// Physically plausible monthly mean air temperature near the surface.
// Values outside this range are treated as invalid (null), not clipped.
export const PLAUSIBLE_MIN_C = -90;
export const PLAUSIBLE_MAX_C = 60;

export class DatasetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatasetError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rounded coordinate text used inside observation ids. */
export function locationKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

/** Convert one raw value into °C or null. */
export function cleanTemperature(
  raw: unknown,
  fillValue: number = POWER_DEFAULT_FILL_VALUE,
): number | null {
  if (raw === null || raw === undefined || raw === "") return null;

  const value = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(value)) return null;
  if (value === fillValue || value === POWER_DEFAULT_FILL_VALUE) return null;
  if (value < PLAUSIBLE_MIN_C || value > PLAUSIBLE_MAX_C) return null;

  return value;
}

/**
 * Validate a NASA POWER monthly point response for parameter T2M
 * and turn it into a clean, sorted TemperatureSeries.
 *
 * Rules:
 * - Keys must look like "YYYYMM". Month 13 (POWER's annual mean) is dropped.
 * - Fill values (-999 or header.fill_value) become null, never 0.
 * - Implausible values become null.
 * - Units, when reported, must be °C.
 * - Throws DatasetError if the response is not usable at all.
 */
export function parsePowerT2M(
  json: unknown,
  latitude: number,
  longitude: number,
  requestUrl: string,
): TemperatureSeries {
  if (!isRecord(json)) {
    throw new DatasetError("NASA POWER response is not a JSON object.");
  }

  const properties = json.properties;
  const parameter = isRecord(properties) ? properties.parameter : undefined;
  const t2m = isRecord(parameter) ? parameter.T2M : undefined;

  if (!isRecord(t2m)) {
    throw new DatasetError("NASA POWER response has no T2M values.");
  }

  // Units check (POWER reports them under parameters.T2M.units).
  const parameters = json.parameters;
  const t2mInfo = isRecord(parameters) ? parameters.T2M : undefined;
  const units = isRecord(t2mInfo) ? t2mInfo.units : undefined;

  if (typeof units === "string" && !["C", "°C", "degC"].includes(units)) {
    throw new DatasetError(`Unexpected T2M units "${units}"; expected °C.`);
  }

  const header = json.header;
  const headerFill = isRecord(header) ? Number(header.fill_value) : NaN;
  const fillValue = Number.isFinite(headerFill)
    ? headerFill
    : POWER_DEFAULT_FILL_VALUE;

  const key = locationKey(latitude, longitude);
  const byDate = new Map<string, TemperatureObservation>();

  for (const [rawKey, rawValue] of Object.entries(t2m)) {
    if (!/^\d{6}$/.test(rawKey)) continue;

    const year = Number(rawKey.slice(0, 4));
    const month = Number(rawKey.slice(4, 6));

    // Month 13 is the annual mean, not an observation month.
    if (month < 1 || month > 12) continue;

    const date = `${year}-${String(month).padStart(2, "0")}`;

    byDate.set(date, {
      id: `${key}:${date}`,
      date,
      year,
      month,
      temperatureC: cleanTemperature(rawValue, fillValue),
    });
  }

  const observations = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  if (observations.length === 0) {
    throw new DatasetError("NASA POWER response contains no monthly values.");
  }

  const source: DataSourceInfo = {
    name: "NASA POWER",
    parameter: "T2M",
    description: "Monthly mean air temperature at 2 m above the surface",
    units: "°C",
    temporalResolution: "monthly",
    url: requestUrl,
  };

  return {
    latitude,
    longitude,
    source,
    observations,
    missingCount: observations.filter((o) => o.temperatureC === null).length,
  };
}