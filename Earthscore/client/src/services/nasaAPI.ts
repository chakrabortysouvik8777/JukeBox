import { parsePowerT2M } from "../data/validateDataset";
import type { TemperatureSeries } from "../types/dataset";

const BASE_URL =
  "https://power.larc.nasa.gov/api/temporal/monthly/point";

export const POWER_START_YEAR = 2016;
export const POWER_END_YEAR = 2025;

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

async function download(
  url: string,
  latitude: number,
  longitude: number,
): Promise<TemperatureSeries> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `NASA POWER request failed (${response.status}). Please try again.`,
    );
  }

  const json: unknown = await response.json();

  return parsePowerT2M(json, latitude, longitude, url);
}

/**
 * Validated monthly T2M series for one point (NASA POWER).
 *
 * - Missing values are null, never 0.
 * - POWER's month 13 (annual mean) is removed.
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