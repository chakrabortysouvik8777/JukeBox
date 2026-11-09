import type { TemperatureObservation } from "../types/dataset";

/** The monthly observations of one calendar year, in month order. */
export function selectYear(
  observations: readonly TemperatureObservation[],
  year: number,
): TemperatureObservation[] {
  return observations
    .filter((observation) => observation.year === year)
    .sort((a, b) => a.month - b.month);
}

/** Years that have at least one observation, ascending. */
export function availableYears(
  observations: readonly TemperatureObservation[],
): number[] {
  return [...new Set(observations.map((o) => o.year))].sort((a, b) => a - b);
}

/** Mean of the non-missing values, or null when all are missing. */
export function meanTemperature(
  observations: readonly TemperatureObservation[],
): number | null {
  const values = observations
    .map((o) => o.temperatureC)
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Annual mean for every year that has all 12 months present.
 * Years with any missing month are left out, so a gap cannot
 * make a year look warmer or cooler than it was.
 */
export function completeAnnualMeans(
  observations: readonly TemperatureObservation[],
): Map<number, number> {
  const byYear = new Map<number, number[]>();

  for (const observation of observations) {
    if (observation.temperatureC === null) continue;

    const values = byYear.get(observation.year) ?? [];
    values.push(observation.temperatureC);
    byYear.set(observation.year, values);
  }

  const means = new Map<number, number>();

  for (const [year, values] of byYear) {
    if (values.length === 12) {
      means.set(year, values.reduce((sum, v) => sum + v, 0) / values.length);
    }
  }

  return means;
}

/**
 * How much warmer (+) or cooler (−) one year was than the average of all
 * complete years in the series, in °C. null when it cannot be computed
 * (year incomplete, or fewer than two complete years).
 *
 * This compares years within 2016–2025 at one point. It is not an official
 * climate anomaly (those use a 30-year baseline).
 */
export function yearDifferenceFromAverage(
  observations: readonly TemperatureObservation[],
  year: number,
): number | null {
  const means = completeAnnualMeans(observations);
  const yearMean = means.get(year);

  if (yearMean === undefined || means.size < 2) return null;

  const values = [...means.values()];
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  return yearMean - average;
}