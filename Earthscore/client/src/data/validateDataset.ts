import type {
  DataSourceInfo,
  MonthlyObservation,
  MonthlySeries,
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
 * Every calendar month from the earliest to the latest observation,
 * sorted, with absent months added as null observations.
 */
export function fillMissingMonths(
  observations: readonly TemperatureObservation[],
  key: string,
): TemperatureObservation[] {
  if (observations.length === 0) return [];

  const byDate = new Map(observations.map((o) => [o.date, o]));
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const result: TemperatureObservation[] = [];
  let year = first.year;
  let month = first.month;

  while (year < last.year || (year === last.year && month <= last.month)) {
    const date = `${year}-${String(month).padStart(2, "0")}`;
    result.push(
      byDate.get(date) ?? { id: `${key}:${date}`, date, year, month, temperatureC: null },
    );

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
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

  if (byDate.size === 0) {
    throw new DatasetError("NASA POWER response contains no monthly values.");
  }

  // Months absent from the response (not even a fill value) are inserted as
  // missing (null), so every month between the first and last one exists.
  // This keeps the timeline, the chart and the sound evenly spaced in time.
  const observations = fillMissingMonths([...byDate.values()], key);

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
    origin: "live",
  };
}
// ---------- Any NASA POWER monthly parameter (e.g. PRECTOTCORR) ----------

export interface PowerParameterSpec {
  parameter: string; // NASA POWER parameter name, e.g. "PRECTOTCORR"
  parameterId: string; // app SoundParameterId, used in ids
  allowedUnits: readonly string[]; // e.g. ["mm/day"]
  min: number; // plausible range; outside → missing
  max: number;
  community?: string; // NASA POWER community, default "SB"
}

/**
 * Validate a NASA POWER monthly point response for one parameter.
 * Same rules as T2M: month 13 dropped, fill values → missing, implausible
 * values → missing, absent months inserted as missing, wrong units rejected.
 */
export function parsePowerMonthly(
  json: unknown,
  latitude: number,
  longitude: number,
  spec: PowerParameterSpec,
): MonthlySeries {
  if (!isRecord(json)) {
    throw new DatasetError("NASA POWER response is not a JSON object.");
  }

  const properties = json.properties;
  const parameter = isRecord(properties) ? properties.parameter : undefined;
  const values = isRecord(parameter) ? parameter[spec.parameter] : undefined;

  if (!isRecord(values)) {
    throw new DatasetError(`NASA POWER response has no ${spec.parameter} values.`);
  }

  const parameters = json.parameters;
  const info = isRecord(parameters) ? parameters[spec.parameter] : undefined;
  const units = isRecord(info) ? info.units : undefined;

  // An empty allowedUnits list accepts any unit label (e.g. AOD has none).
  if (
    typeof units === "string" &&
    spec.allowedUnits.length > 0 &&
    !spec.allowedUnits.includes(units)
  ) {
    throw new DatasetError(
      `Unexpected ${spec.parameter} units "${units}"; expected ${spec.allowedUnits.join(" or ")}.`,
    );
  }

  const header = json.header;
  const headerFill = isRecord(header) ? Number(header.fill_value) : NaN;
  const fillValue = Number.isFinite(headerFill) ? headerFill : POWER_DEFAULT_FILL_VALUE;

  const regionKey = locationKey(latitude, longitude);
  const byDate = new Map<string, MonthlyObservation>();

  for (const [rawKey, rawValue] of Object.entries(values)) {
    if (!/^\d{6}$/.test(rawKey)) continue;
    const year = Number(rawKey.slice(0, 4));
    const month = Number(rawKey.slice(4, 6));
    if (month < 1 || month > 12) continue;

    const date = `${year}-${String(month).padStart(2, "0")}`;
    const n = typeof rawValue === "number" ? rawValue : Number(rawValue);
    const valid =
      rawValue !== null &&
      rawValue !== "" &&
      Number.isFinite(n) &&
      n !== fillValue &&
      n !== POWER_DEFAULT_FILL_VALUE &&
      n >= spec.min &&
      n <= spec.max;

    byDate.set(date, {
      id: `${spec.parameterId}|${regionKey}:${date}`,
      date,
      year,
      month,
      value: valid ? n : null,
    });
  }

  if (byDate.size === 0) {
    throw new DatasetError("NASA POWER response contains no monthly values.");
  }

  const observations = fillMonthlyGaps([...byDate.values()], spec.parameterId, regionKey);

  return {
    parameterId: spec.parameterId,
    regionKey,
    observations,
    missingCount: observations.filter((o) => o.value === null).length,
    origin: "live",
  };
}

/** Every month between the first and last observation; gaps become null. */
export function fillMonthlyGaps(
  observations: readonly MonthlyObservation[],
  parameterId: string,
  regionKey: string,
): MonthlyObservation[] {
  if (observations.length === 0) return [];

  const byDate = new Map(observations.map((o) => [o.date, o]));
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const result: MonthlyObservation[] = [];
  let year = first.year;
  let month = first.month;

  while (year < last.year || (year === last.year && month <= last.month)) {
    const date = `${year}-${String(month).padStart(2, "0")}`;
    result.push(
      byDate.get(date) ?? {
        id: `${parameterId}|${regionKey}:${date}`,
        date,
        year,
        month,
        value: null,
      },
    );
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}

/** Convert the temperature series into the general monthly form. */
export function temperatureToMonthly(series: TemperatureSeries): MonthlySeries {
  const regionKey = locationKey(series.latitude, series.longitude);
  return {
    parameterId: "temperature",
    regionKey,
    observations: series.observations.map((o) => ({
      id: `temperature|${regionKey}:${o.date}`,
      date: o.date,
      year: o.year,
      month: o.month,
      value: o.temperatureC,
    })),
    missingCount: series.missingCount,
    origin: series.origin,
    snapshotCreatedAt: series.snapshotCreatedAt,
  };
}
