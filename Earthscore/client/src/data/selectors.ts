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