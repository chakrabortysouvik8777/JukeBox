import { locationKey, parsePowerT2M } from "../data/validateDataset";
import type { TemperatureSeries } from "../types/dataset";

const BASE_URL =
  "https://power.larc.nasa.gov/api/temporal/monthly/point";

export const POWER_START_YEAR = 2016;
export const POWER_END_YEAR = 2025;

// Give up on the live request after this long and try the snapshot.
const LIVE_TIMEOUT_MS = 15000;

// Saved NASA responses for the preset locations (made by `npm run snapshot`).
export const SNAPSHOT_PATH = "/data/power-t2m-snapshot.json";

// Results already fetched in this browser session, keyed by request URL.
// Avoids re-downloading when the user switches back to a location.
const cache = new Map<string, Promise<TemperatureSeries>>();

export function buildTemperatureUrl(
  latitude: number,
  longitude: number,
): string {
  const params = new URLSearchParams({
    parameters: "T2M",
    community: "SB",
    longitude: longitude.toFixed(4),
    latitude: latitude.toFixed(4),
    start: String(POWER_START_YEAR),
    end: String(POWER_END_YEAR),
    format: "JSON",
  });

  return `${BASE_URL}?${params.toString()}`;
}

async function downloadLive(
  url: string,
  latitude: number,
  longitude: number,
): Promise<TemperatureSeries> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`NASA POWER request failed (${response.status}).`);
    }

    const json: unknown = await response.json();

    return parsePowerT2M(json, latitude, longitude, url);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("NASA POWER did not respond in time.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

interface SnapshotFile {
  createdAt: string;
  entries: Record<string, { url: string; response: unknown }>;
}

/** Load the same location from the saved snapshot, or return null. */
async function loadFromSnapshot(
  latitude: number,
  longitude: number,
): Promise<TemperatureSeries | null> {
  try {
    const response = await fetch(SNAPSHOT_PATH);
    if (!response.ok) return null;

    const snapshot = (await response.json()) as SnapshotFile;
    const entry = snapshot.entries?.[locationKey(latitude, longitude)];
    if (!entry) return null;

    const series = parsePowerT2M(entry.response, latitude, longitude, entry.url);

    return {
      ...series,
      origin: "snapshot",
      snapshotCreatedAt: snapshot.createdAt,
    };
  } catch {
    return null;
  }
}

async function download(
  url: string,
  latitude: number,
  longitude: number,
): Promise<TemperatureSeries> {
  try {
    return await downloadLive(url, latitude, longitude);
  } catch (liveError) {
    // Live NASA failed (offline, slow, error): try the saved snapshot.
    const saved = await loadFromSnapshot(latitude, longitude);
    if (saved) return saved;

    const reason =
      liveError instanceof Error ? liveError.message : "Unknown error.";
    throw new Error(`${reason} No saved data for this location. Please try again.`);
  }
}

/**
 * Validated monthly T2M series for one point (NASA POWER).
 *
 * - Missing values are null, never 0.
 * - POWER's month 13 (annual mean) is removed.
 * - If live NASA fails, the saved snapshot is used (origin "snapshot").
 * - Results are cached for the session; failed requests are not cached.
 * - The signal only stops this caller from waiting; a shared download
 *   continues so other callers can still use it.
 */
export function fetchTemperatureSeries(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<TemperatureSeries> {
  const url = buildTemperatureUrl(latitude, longitude);

  let request = cache.get(url);

  if (!request) {
    request = download(url, latitude, longitude);
    cache.set(url, request);
    request.catch(() => cache.delete(url));
  }

  if (!signal) return request;

  return new Promise<TemperatureSeries>((resolve, reject) => {
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

/** For tests only: forget cached responses. */
export function clearTemperatureCache(): void {
  cache.clear();
}