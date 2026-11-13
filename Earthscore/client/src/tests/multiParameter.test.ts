import { describe, expect, it } from "vitest";

import {
  POINT_PARAMETER_IDS,
  SOUND_PARAMETERS,
  SOUND_PARAMETER_IDS,
  formatValue,
} from "../config/parameters";
import { parsePowerMonthly, type PowerParameterSpec } from "../data/validateDataset";
import { buildPowerUrl, gasSeries } from "../services/monthlySeries";
import { recordsFromMonthly } from "../playback/createPlaybackEvents";
import { temperatureToSound } from "../audio/temperatureMapping";
import { alignSeries, createCompareEvents } from "../data/compare";
import type { MonthlySeries } from "../types/dataset";

const RAIN: PowerParameterSpec = {
  parameter: "PRECTOTCORR",
  parameterId: "rainfall",
  allowedUnits: ["mm/day", "mm day-1"],
  min: 0,
  max: 200,
};

function powerJson(values: Record<string, unknown>, units = "mm/day") {
  return {
    header: { fill_value: -999 },
    parameters: { PRECTOTCORR: { units } },
    properties: { parameter: { PRECTOTCORR: values } },
  };
}

describe("parameter registry", () => {
  it("has four sonified parameters, two of them measured per point", () => {
    expect(SOUND_PARAMETER_IDS).toEqual(["temperature", "rainfall", "aerosol", "co2", "ch4"]);
    expect(POINT_PARAMETER_IDS).toEqual(["temperature", "rainfall", "aerosol"]);
    expect(SOUND_PARAMETERS.co2.scope).toBe("global");
  });

  it("every mapping has a valid range", () => {
    for (const id of SOUND_PARAMETER_IDS) {
      const m = SOUND_PARAMETERS[id].mapping;
      expect(m.maxTemperatureC).toBeGreaterThan(m.minTemperatureC);
      expect(m.minFrequencyHz).toBeGreaterThan(0);
    }
  });

  it("formats with the parameter's unit and decimals", () => {
    expect(formatValue(null, SOUND_PARAMETERS.rainfall)).toBe("missing");
    expect(formatValue(3.456, SOUND_PARAMETERS.rainfall)).toMatch(/mm\/day$/);
  });

  it("maps rainfall low → 220 Hz and high → top of range", () => {
    const m = SOUND_PARAMETERS.rainfall.mapping;
    expect(temperatureToSound(m.minTemperatureC, m).frequencyHz).toBeCloseTo(220);
    expect(temperatureToSound(m.maxTemperatureC, m).frequencyHz).toBeCloseTo(220 * 2 ** m.octaves);
  });
});

describe("parsePowerMonthly (rainfall)", () => {
  it("reads months, drops month 13 and treats -999 as missing", () => {
    const s = parsePowerMonthly(
      powerJson({ "201601": 1.5, "201602": -999, "201613": 2.2, "201603": 0 }),
      22.5726,
      88.3639,
      RAIN,
    );
    const byDate = Object.fromEntries(s.observations.map((o) => [o.date, o.value]));
    expect(byDate["2016-01"]).toBe(1.5);
    expect(byDate["2016-02"]).toBeNull();
    expect(byDate["2016-03"]).toBe(0); // real zero rain stays 0
    expect(s.observations.some((o) => o.month === 13)).toBe(false);
    expect(s.observations[0].id).toBe("rainfall|22.5726,88.3639:2016-01");
  });

  it("rejects negative and implausible values as missing", () => {
    const s = parsePowerMonthly(powerJson({ "201601": -3, "201602": 500 }), 0, 0, RAIN);
    expect(s.observations.every((o) => o.value === null)).toBe(true);
  });

  it("rejects unexpected units", () => {
    expect(() => parsePowerMonthly(powerJson({ "201601": 1 }, "inches"), 0, 0, RAIN)).toThrow(
      /units/,
    );
  });

  it("rejects a response without the parameter", () => {
    expect(() => parsePowerMonthly({ properties: { parameter: {} } }, 0, 0, RAIN)).toThrow();
  });

  it("builds the NASA POWER URL for the parameter", () => {
    const url = buildPowerUrl(22.5726, 88.3639, "PRECTOTCORR");
    expect(url).toContain("parameters=PRECTOTCORR");
    expect(url).toContain("start=2016");
    expect(url).toContain("end=2025");
  });
});

describe("parsePowerMonthly (aerosols, AOD_55)", () => {
  const AOD: PowerParameterSpec = {
    parameter: "AOD_55",
    parameterId: "aerosol",
    allowedUnits: [],
    min: 0,
    max: 10,
  };
  // Shape of the real NASA POWER response checked in the Codespace (Kolkata).
  const json = {
    properties: { parameter: { AOD_55: { "201601": 1.12, "201602": 1.24, "201613": 0.79, "201603": -999 } } },
    parameters: { AOD_55: { units: "dimensionless" } },
  };

  it("reads AOD values, drops month 13, -999 is missing", () => {
    const s = parsePowerMonthly(json, 22.5726, 88.3639, AOD);
    expect(s.observations.map((o) => o.value)).toEqual([1.12, 1.24, null]);
    expect(s.observations[0].id).toBe("aerosol|22.5726,88.3639:2016-01");
  });

  it("maps AOD 0 → 220 Hz and 1.5 → 880 Hz", () => {
    const m = SOUND_PARAMETERS.aerosol.mapping;
    expect(temperatureToSound(0, m).frequencyHz).toBeCloseTo(220);
    expect(temperatureToSound(1.5, m).frequencyHz).toBeCloseTo(880);
  });
});

describe("gasSeries (NOAA global)", () => {
  it("keeps 2016–2025, pads from January 2016 and fills gaps", () => {
    const s = gasSeries("co2", [
      { date: "2015-12", value: 401 },
      { date: "2016-03", value: 404 },
      { date: "2016-05", value: 406 },
      { date: "2026-01", value: 430 },
    ]);
    expect(s.regionKey).toBe("global");
    expect(s.observations[0].date).toBe("2016-01");
    expect(s.observations[0].value).toBeNull();
    const dates = s.observations.map((o) => o.date);
    expect(dates).toContain("2016-04");
    expect(dates).not.toContain("2026-01");
    expect(dates).not.toContain("2015-12");
    expect(s.missingCount).toBe(3); // Jan, Feb, Apr
  });

  it("throws when there are no values in range", () => {
    expect(() => gasSeries("ch4", [{ date: "2010-01", value: 1800 }])).toThrow();
  });
});

const series = (key: string, values: (number | null)[]): MonthlySeries => ({
  parameterId: "rainfall",
  regionKey: key,
  observations: values.map((value, i) => ({
    id: `rainfall|${key}:2016-0${i + 1}`,
    date: `2016-0${i + 1}`,
    year: 2016,
    month: i + 1,
    value,
  })),
  missingCount: values.filter((v) => v === null).length,
  origin: "live",
});

describe("recordsFromMonthly", () => {
  it("carries value, unit and pitch; missing stays silent", () => {
    const records = recordsFromMonthly(series("1,1", [2, null]), SOUND_PARAMETERS.rainfall);
    expect(records[0].value).toBe(2);
    expect(records[0].unit).toBe(SOUND_PARAMETERS.rainfall.unit);
    expect(records[0].parameterId).toBe("rainfall");
    expect(records[0].temperatureCelsius).toBeNull(); // not temperature
    expect(records[0].audioFrequencyHz).toBeGreaterThan(220);
    expect(records[1].audioFrequencyHz).toBeNull();
    expect(records[0].id).toBe("rainfall|1,1:2016-01");
  });
});

describe("Regional Compare with rainfall", () => {
  const a = series("A", [1, null, 5]);
  const b = series("B", [3, 2, null]);

  it("aligns values and differences in mm/day", () => {
    const rows = alignSeries(a, b);
    expect(rows.map((r) => r.difference)).toEqual([-2, null, null]);
  });

  it("creates A/B events with the rainfall mapping and unit", () => {
    const p = SOUND_PARAMETERS.rainfall;
    const events = createCompareEvents(alignSeries(a, b), a, b, undefined, p);
    expect(events).toHaveLength(6);
    expect(events[0].slot).toBe("A");
    expect(events[1].slot).toBe("B");
    expect(events[0].unit).toBe(p.unit);
    expect(events[0].audioFrequencyHz).toBeCloseTo(temperatureToSound(1, p.mapping).frequencyHz!);
    expect(events[2].audioFrequencyHz).toBeNull(); // A missing in Feb
    expect(events[0].id).toBe("A|A:2016-01");
  });
});
