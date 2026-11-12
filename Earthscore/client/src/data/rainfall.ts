/**
 * Rainfall summary for the Open-Meteo historical (ERA5) daily series.
 * Pure functions so the checks can be tested without the network.
 */

export interface RainfallYear {
  year: string;
  rainfall: number; // mm, sum of days with data
  validDays: number;
  expectedDays: number; // 365 or 366
  complete: boolean; // enough days to compare with other years
}

export interface RainfallSummary {
  years: RainfallYear[];
  firstDate: string | null;
  lastDate: string | null;

  // Average annual rainfall over complete years only.
  averageRainfall: number | null;
  completeYearCount: number;

  // Latest complete year compared with that average (in %).
  anomalyYear: string | null;
  anomalyPercent: number | null;

  // The last 30 calendar days of the series.
  last30Total: number | null;
  last30ValidDays: number;
  last30From: string | null;
  last30To: string | null;

  // Latest surface soil moisture value and its date.
  soilMoisture: number | null;
  soilMoistureDate: string | null;
}

// A year counts as complete when at least 95 % of its days have data.
export const COMPLETE_YEAR_SHARE = 0.95;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function validValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function summarizeRainfall(
  time: readonly string[],
  precipitation: readonly (number | null | undefined)[],
  soilMoisture: readonly (number | null | undefined)[] = [],
): RainfallSummary {
  const byYear = new Map<string, { total: number; valid: number }>();

  time.forEach((date, i) => {
    const year = date.slice(0, 4);
    const entry = byYear.get(year) ?? { total: 0, valid: 0 };
    const value = validValue(precipitation[i]);

    if (value !== null) {
      entry.total += value;
      entry.valid += 1;
    }
    byYear.set(year, entry);
  });

  const years: RainfallYear[] = [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, { total, valid }]) => {
      const expectedDays = isLeapYear(Number(year)) ? 366 : 365;
      return {
        year,
        rainfall: Number(total.toFixed(1)),
        validDays: valid,
        expectedDays,
        complete: valid / expectedDays >= COMPLETE_YEAR_SHARE,
      };
    });

  const complete = years.filter((y) => y.complete);
  const averageRainfall =
    complete.length > 0
      ? complete.reduce((sum, y) => sum + y.rainfall, 0) / complete.length
      : null;

  const latestComplete = complete[complete.length - 1];
  const anomalyPercent =
    latestComplete && averageRainfall !== null && averageRainfall > 0
      ? ((latestComplete.rainfall - averageRainfall) / averageRainfall) * 100
      : null;

  // Last 30 calendar days of the series (not "last 30 valid readings").
  const lastStart = Math.max(0, time.length - 30);
  let last30Total = 0;
  let last30ValidDays = 0;
  for (let i = lastStart; i < time.length; i++) {
    const value = validValue(precipitation[i]);
    if (value !== null) {
      last30Total += value;
      last30ValidDays += 1;
    }
  }

  let soilValue: number | null = null;
  let soilDate: string | null = null;
  for (let i = soilMoisture.length - 1; i >= 0; i--) {
    const value = validValue(soilMoisture[i]);
    if (value !== null && value <= 1) {
      soilValue = value;
      soilDate = time[i] ?? null;
      break;
    }
  }

  return {
    years,
    firstDate: time[0] ?? null,
    lastDate: time[time.length - 1] ?? null,
    averageRainfall,
    completeYearCount: complete.length,
    anomalyYear: latestComplete?.year ?? null,
    anomalyPercent,
    last30Total: last30ValidDays > 0 ? last30Total : null,
    last30ValidDays,
    last30From: time.length > 0 ? time[lastStart] : null,
    last30To: time.length > 0 ? time[time.length - 1] : null,
    soilMoisture: soilValue,
    soilMoistureDate: soilDate,
  };
}
