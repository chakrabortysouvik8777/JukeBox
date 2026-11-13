/**
 * One entry point for every sonified parameter:
 *   fetchMonthlySeries("temperature" | "rainfall" | "aerosol" | "co2" | "ch4", lat, lng)
 * returns a validated MonthlySeries for 2016–2025 (missing months = null).
 */
import type { MonthlySeries } from "../types/dataset";
import type { SoundParameterId } from "../config/parameters";
import {
  fillMonthlyGaps,
  locationKey,
  parsePowerMonthly,
  temperatureToMonthly,
  type PowerParameterSpec,
} from "../data/validateDataset";
import {
  POWER_END_YEAR,
  POWER_START_YEAR,
  SNAPSHOT_PATH,
  fetchTemperatureSeries,
} from "./nasaAPI";
import { fetchGreenhouseGases } from "./greenhouseGasAPI";

const POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";
const LIVE_TIMEOUT_MS = 15000;

const RAINFALL_SPEC: PowerParameterSpec = {
  parameter: "PRECTOTCORR",
  parameterId: "rainfall",
  allowedUnits: ["mm/day", "mm day-1"],
  min: 0,
  max: 200, // mm/day as a monthly mean; above this is not plausible
};

const AEROSOL_SPEC: PowerParameterSpec = {
  parameter: "AOD_55",
  parameterId: "aerosol",
  community: "RE", // the request verified in the Codespace used RE
  allowedUnits: [], // AOD has no unit; NASA's unit label is not checked
  min: 0,
  max: 10, // AOD above this is not plausible as a monthly mean
};

// ---------- Shared session cache (failed requests are not cached) ----------

const cache = new Map<string, Promise<MonthlySeries>>();

function shared(
  key: string,
  create: () => Promise<MonthlySeries>,
  signal?: AbortSignal,
): Promise<MonthlySeries> {
  let request = cache.get(key);
  if (!request) {
    request = create();
    cache.set(key, request);
    request.catch(() => cache.delete(key));
  }
  if (!signal) return request;

  return new Promise<MonthlySeries>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true },
    );
    request.then(resolve, reject);
  });
}

/** For tests only. */
export function clearMonthlySeriesCache(): void {
  cache.clear();
  gasRequest = null;
}

// ---------- NASA POWER (any monthly parameter) ----------

export function buildPowerUrl(
  latitude: number,
  longitude: number,
  parameter: string,
  community = "SB",
): string {
  const params = new URLSearchParams({
    parameters: parameter,
    community,
    longitude: longitude.toFixed(4),
    latitude: latitude.toFixed(4),
    start: String(POWER_START_YEAR),
    end: String(POWER_END_YEAR),
    format: "JSON",
  });
  return `${POWER_URL}?${params.toString()}`;
}

async function powerFromSnapshot(
  latitude: number,
  longitude: number,
  spec: PowerParameterSpec,
): Promise<MonthlySeries | null> {
  try {
    const response = await fetch(SNAPSHOT_PATH);
    if (!response.ok) return null;
    const snapshot = (await response.json()) as {
      createdAt: string;
      entries: Record<string, { response: unknown }>;
    };
    const entry = snapshot.entries?.[locationKey(latitude, longitude)];
    if (!entry) return null;

    // Throws (→ null) if this snapshot has no values for the parameter.
    const series = parsePowerMonthly(entry.response, latitude, longitude, spec);
    return { ...series, origin: "snapshot", snapshotCreatedAt: snapshot.createdAt };
  } catch {
    return null;
  }
}

async function downloadPower(
  latitude: number,
  longitude: number,
  spec: PowerParameterSpec,
): Promise<MonthlySeries> {
  const url = buildPowerUrl(latitude, longitude, spec.parameter, spec.community);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LIVE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(`NASA POWER request failed (${response.status}).`);
    return parsePowerMonthly(await response.json(), latitude, longitude, spec);
  } catch (liveError) {
    const reason = abort.signal.aborted
      ? "NASA POWER did not respond in time."
      : liveError instanceof Error
        ? liveError.message
        : "Unknown error.";

    const saved = await powerFromSnapshot(latitude, longitude, spec);
    if (saved) return saved;
    throw new Error(`${reason} No saved data for this location. Please try again.`);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- NOAA global CO₂ / CH₄ ----------

type GasData = Awaited<ReturnType<typeof fetchGreenhouseGases>>;
let gasRequest: Promise<GasData> | null = null;

function gases(): Promise<GasData> {
  if (!gasRequest) {
    gasRequest = fetchGreenhouseGases();
    gasRequest.catch(() => (gasRequest = null));
  }
  return gasRequest;
}

/** Keep 2016–2025 and fill absent months as missing. */
export function gasSeries(
  parameterId: "co2" | "ch4",
  rows: readonly { date: string; value: number }[],
): MonthlySeries {
  const from = `${POWER_START_YEAR}-01`;
  const to = `${POWER_END_YEAR}-12`;

  const observations = rows
    .filter((r) => r.date >= from && r.date <= to && Number.isFinite(r.value) && r.value > 0)
    .map((r) => ({
      id: `${parameterId}|global:${r.date}`,
      date: r.date,
      year: Number(r.date.slice(0, 4)),
      month: Number(r.date.slice(5, 7)),
      value: r.value,
    }));

  if (observations.length === 0) {
    throw new Error("NOAA returned no values for 2016–2025.");
  }

  // Always cover January 2016 … the latest month NOAA has published.
  const padded = fillMonthlyGaps(
    [
      ...(observations[0].date !== from
        ? [{ id: `${parameterId}|global:${from}`, date: from, year: POWER_START_YEAR, month: 1, value: null }]
        : []),
      ...observations,
    ],
    parameterId,
    "global",
  );

  return {
    parameterId,
    regionKey: "global",
    observations: padded,
    missingCount: padded.filter((o) => o.value === null).length,
    origin: "live",
  };
}

// ---------- Public entry point ----------

export function fetchMonthlySeries(
  parameterId: SoundParameterId,
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<MonthlySeries> {
  switch (parameterId) {
    case "temperature":
      return fetchTemperatureSeries(latitude, longitude, signal).then(temperatureToMonthly);

    case "rainfall":
      return shared(
        `rainfall|${locationKey(latitude, longitude)}`,
        () => downloadPower(latitude, longitude, RAINFALL_SPEC),
        signal,
      );

    case "aerosol":
      return shared(
        `aerosol|${locationKey(latitude, longitude)}`,
        () => downloadPower(latitude, longitude, AEROSOL_SPEC),
        signal,
      );

    case "co2":
    case "ch4":
      // Global values: one download serves every location.
      return shared(
        parameterId,
        () => gases().then((g) => gasSeries(parameterId, parameterId === "co2" ? g.co2 : g.methane)),
        signal,
      );
  }
}
