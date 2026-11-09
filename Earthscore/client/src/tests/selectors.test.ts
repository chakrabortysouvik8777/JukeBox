import { describe, expect, it } from "vitest";

import {
  completeAnnualMeans,
  yearDifferenceFromAverage,
} from "../data/selectors";
import type { TemperatureObservation } from "../types/dataset";

// Synthetic observations for tests only (not real measurements).
function makeYear(
  year: number,
  value: number,
  missingMonths: number[] = [],
): TemperatureObservation[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const date = `${year}-${String(month).padStart(2, "0")}`;

    return {
      id: `0,0:${date}`,
      date,
      year,
      month,
      temperatureC: missingMonths.includes(month) ? null : value,
    };
  });
}

describe("completeAnnualMeans", () => {
  it("averages only years with all 12 months", () => {
    const means = completeAnnualMeans([
      ...makeYear(2016, 10),
      ...makeYear(2017, 12, [5]),
      ...makeYear(2018, 14),
    ]);

    expect([...means.keys()]).toEqual([2016, 2018]);
    expect(means.get(2016)).toBe(10);
    expect(means.get(2018)).toBe(14);
  });
});

describe("yearDifferenceFromAverage", () => {
  const observations = [
    ...makeYear(2016, 10),
    ...makeYear(2017, 12),
    ...makeYear(2018, 14),
  ];

  it("returns warmer (+) and cooler (−) differences in °C", () => {
    expect(yearDifferenceFromAverage(observations, 2018)).toBeCloseTo(2);
    expect(yearDifferenceFromAverage(observations, 2016)).toBeCloseTo(-2);
    expect(yearDifferenceFromAverage(observations, 2017)).toBeCloseTo(0);
  });

  it("returns null for an incomplete or unknown year", () => {
    const withGap = [...observations, ...makeYear(2019, 30, [1])];

    expect(yearDifferenceFromAverage(withGap, 2019)).toBeNull();
    expect(yearDifferenceFromAverage(observations, 2030)).toBeNull();
  });

  it("returns null when there is only one complete year", () => {
    expect(yearDifferenceFromAverage(makeYear(2016, 10), 2016)).toBeNull();
  });
});