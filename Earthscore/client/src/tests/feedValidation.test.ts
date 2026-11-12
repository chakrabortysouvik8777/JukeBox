import { describe, expect, it } from "vitest";

import { summarizeRainfall } from "../data/rainfall";
import { extractCenterSeries, type ModisDate } from "../services/vegetationAPI";
import { parsePopulation } from "../services/populationAPI";

// All data below is synthetic, for tests only.

function days(from: string, count: number): string[] {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  );
}

describe("summarizeRainfall", () => {
  // 2016 (leap, 366 days) + 2017 (365 days)
  const time = days("2016-01-01", 366 + 365);

  it("uses only complete years for the average and the comparison", () => {
    // 2016: 1 mm every day. 2017: 2 mm, but 60 days missing (incomplete).
    const precip = time.map((d, i) =>
      d.startsWith("2016") ? 1 : i % 6 === 0 ? null : 2,
    );
    const s = summarizeRainfall(time, precip);

    expect(s.years.map((y) => [y.year, y.complete])).toEqual([
      ["2016", true],
      ["2017", false],
    ]);
    expect(s.years[0]).toMatchObject({ rainfall: 366, validDays: 366, expectedDays: 366 });
    expect(s.averageRainfall).toBe(366); // 2017 excluded
    expect(s.completeYearCount).toBe(1);
    expect(s.anomalyYear).toBe("2016");
  });

  it("computes the latest complete year against the average", () => {
    const precip = time.map((d) => (d.startsWith("2016") ? 1 : 2));
    const s = summarizeRainfall(time, precip);
    const avg = (366 + 730) / 2;
    expect(s.averageRainfall).toBeCloseTo(avg);
    expect(s.anomalyYear).toBe("2017");
    expect(s.anomalyPercent).toBeCloseTo(((730 - avg) / avg) * 100);
  });

  it("'last 30 days' means the last 30 calendar days, and reports gaps", () => {
    const precip = time.map((_, i) => (i >= time.length - 30 && i % 2 === 0 ? null : 1));
    const s = summarizeRainfall(time, precip);
    expect(s.last30From).toBe("2017-12-02");
    expect(s.last30To).toBe("2017-12-31");
    expect(s.last30ValidDays).toBe(15);
    expect(s.last30Total).toBe(15);
  });

  it("ignores negative and non-numeric values and dates the soil moisture", () => {
    const t = days("2020-01-01", 3);
    const s = summarizeRainfall(t, [-5, Number.NaN, 4], [0.31, 0.29, null]);
    expect(s.years[0].rainfall).toBe(4);
    expect(s.years[0].validDays).toBe(1);
    expect(s.soilMoisture).toBe(0.29);
    expect(s.soilMoistureDate).toBe("2020-01-02");
  });

  it("returns empty values for an empty series", () => {
    const s = summarizeRainfall([], []);
    expect(s.averageRainfall).toBeNull();
    expect(s.last30Total).toBeNull();
    expect(s.soilMoisture).toBeNull();
  });
});

describe("extractCenterSeries (MODIS NDVI)", () => {
  const dates: ModisDate[] = [
    { modis_date: "A2025001", calendar_date: "2025-01-01" },
    { modis_date: "A2025017", calendar_date: "2025-01-17" },
    { modis_date: "A2025033", calendar_date: "2025-02-02" },
    { modis_date: "A2025049", calendar_date: "2025-02-18" },
  ];

  // 3 × 3 grid: centre index 4. Set the centre value per date.
  function band(band: string, modis_date: string, centre: number, size = 9) {
    const data = Array(size).fill(0);
    data[Math.floor(size / 2)] = centre;
    return { band, modis_date, data };
  }

  const subset = {
    nrows: 3,
    ncols: 3,
    subset: [
      band("250m_16_days_NDVI", "A2025001", 5000),
      band("250m_16_days_pixel_reliability", "A2025001", 0), // good
      band("250m_16_days_NDVI", "A2025017", 6000),
      band("250m_16_days_pixel_reliability", "A2025017", 3), // cloudy
      band("250m_16_days_NDVI", "A2025033", -3000), // fill value
      band("250m_16_days_pixel_reliability", "A2025033", 0),
      band("250m_16_days_NDVI", "A2025049", 7000),
      band("250m_16_days_pixel_reliability", "A2025049", -1), // no data
    ],
  };

  it("uses the centre pixel from the reported grid and drops unreliable values", () => {
    const r = extractCenterSeries(subset, dates);
    expect(r.observations).toEqual([{ date: "2025-01-01", ndvi: 0.5 }]);
    expect(r.excludedCount).toBe(3);
    expect(r.gridSize).toBe("3 × 3 pixels");
  });

  it("keeps marginal (1) pixels", () => {
    const r = extractCenterSeries(
      {
        nrows: 3,
        ncols: 3,
        subset: [
          band("250m_16_days_NDVI", "A2025001", 4200),
          band("250m_16_days_pixel_reliability", "A2025001", 1),
        ],
      },
      dates.slice(0, 1),
    );
    expect(r.observations).toEqual([{ date: "2025-01-01", ndvi: 0.42 }]);
  });

  it("drops a band whose length does not match the grid", () => {
    const r = extractCenterSeries(
      {
        nrows: 3,
        ncols: 3,
        subset: [
          band("250m_16_days_NDVI", "A2025001", 5000, 8),
          band("250m_16_days_pixel_reliability", "A2025001", 0),
        ],
      },
      dates.slice(0, 1),
    );
    expect(r.observations).toEqual([]);
    expect(r.excludedCount).toBe(1);
  });

  it.each([
    [{ subset: [] }],
    [{ nrows: 2, ncols: 3, subset: [] }],
    [{ nrows: 0, ncols: 0, subset: [] }],
  ])("rejects an unexpected grid %o", (bad) => {
    expect(() => extractCenterSeries(bad, dates)).toThrow("pixel grid");
  });
});

describe("parsePopulation (WorldPop)", () => {
  it("computes density only from a valid cell area", () => {
    const p = parsePopulation({
      population: 250,
      cell_area_km2: 0.01,
      data_year: 2025,
      country: "India",
      unit: "Kolkata",
      iso3: "IND",
      lat: 22.57,
      lon: 88.36,
    });
    expect(p.population).toBe(250);
    expect(p.density_per_km2).toBe(25000);
    expect(p.data_year).toBe(2025);
  });

  it("returns NaN (shown as N/A) when the cell area is missing or zero", () => {
    expect(parsePopulation({ population: 10, cell_area_km2: 0 }).density_per_km2).toBeNaN();
    expect(parsePopulation({ population: 10 }).density_per_km2).toBeNaN();
  });

  it.each([null, undefined, -99999, "abc", Number.NaN])(
    "rejects population %s (no-data cell)",
    (population) => {
      expect(() => parsePopulation({ population, cell_area_km2: 0.01 })).toThrow(
        "No population data",
      );
    },
  );
});
