import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DatasetError,
  cleanTemperature,
  parsePowerT2M,
} from "../data/validateDataset";
import {
  availableYears,
  meanTemperature,
  selectYear,
} from "../data/selectors";
import {
  SNAPSHOT_PATH,
  buildTemperatureUrl,
  clearTemperatureCache,
  fetchTemperatureSeries,
} from "../services/nasaAPI";

const URL_TEXT = "https://power.larc.nasa.gov/test";

// Small, clearly synthetic POWER-shaped response for tests only.
function powerResponse(
  t2m: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  return {
    header: { fill_value: -999 },
    parameters: { T2M: { units: "C" } },
    properties: { parameter: { T2M: t2m } },
    ...extra,
  };
}

describe("cleanTemperature", () => {
  it.each([
    [25.3, 25.3],
    ["18.5", 18.5],
    [0, 0],
    [-30, -30],
  ])("keeps valid value %s", (raw, expected) => {
    expect(cleanTemperature(raw)).toBe(expected);
  });

  it.each([-999, null, undefined, "", "abc", NaN, Infinity, -120, 75])(
    "turns %s into null (missing), never 0",
    (raw) => {
      expect(cleanTemperature(raw)).toBeNull();
    },
  );

  it("respects a custom fill value from the response header", () => {
    expect(cleanTemperature(-99, -99)).toBeNull();
  });
});

describe("parsePowerT2M", () => {
  it("drops month 13, sorts by date and builds stable ids", () => {
    const series = parsePowerT2M(
      powerResponse({
        "201602": 20,
        "201613": 25, // annual mean, must be dropped
        "201601": 18,
      }),
      22.5726,
      88.3639,
      URL_TEXT,
    );

    expect(series.observations.map((o) => o.date)).toEqual([
      "2016-01",
      "2016-02",
    ]);

    expect(series.observations[0]).toEqual({
      id: "22.5726,88.3639:2016-01",
      date: "2016-01",
      year: 2016,
      month: 1,
      temperatureC: 18,
    });
  });

  it("keeps missing values as null and counts them", () => {
    const series = parsePowerT2M(
      powerResponse({ "201601": -999, "201602": 21.4 }),
      0,
      0,
      URL_TEXT,
    );

    expect(series.observations[0].temperatureC).toBeNull();
    expect(series.observations[1].temperatureC).toBe(21.4);
    expect(series.missingCount).toBe(1);
  });

  it("records provenance", () => {
    const series = parsePowerT2M(
      powerResponse({ "201601": 10 }),
      1,
      2,
      URL_TEXT,
    );

    expect(series.source).toMatchObject({
      name: "NASA POWER",
      parameter: "T2M",
      units: "°C",
      url: URL_TEXT,
    });
  });

  it("ignores keys that are not YYYYMM", () => {
    const series = parsePowerT2M(
      powerResponse({ "201601": 10, ANN: 12, "2016-02": 11 }),
      0,
      0,
      URL_TEXT,
    );

    expect(series.observations).toHaveLength(1);
  });

  it.each([
    ["not an object", "hello"],
    ["no T2M", { properties: { parameter: {} } }],
    ["only month 13", powerResponse({ "201613": 20 })],
  ])("rejects unusable response: %s", (_label, json) => {
    expect(() => parsePowerT2M(json, 0, 0, URL_TEXT)).toThrow(DatasetError);
  });

  it("rejects wrong units", () => {
    const json = powerResponse(
      { "201601": 290 },
      { parameters: { T2M: { units: "K" } } },
    );

    expect(() => parsePowerT2M(json, 0, 0, URL_TEXT)).toThrow("units");
  });
});

describe("selectors", () => {
  const series = parsePowerT2M(
    powerResponse({
      "201702": 12,
      "201601": 10,
      "201602": -999,
      "201701": 14,
    }),
    0,
    0,
    URL_TEXT,
  );

  it("selects one year in month order", () => {
    expect(selectYear(series.observations, 2017).map((o) => o.month)).toEqual(
      [1, 2],
    );
    expect(selectYear(series.observations, 2030)).toEqual([]);
  });

  it("lists available years", () => {
    expect(availableYears(series.observations)).toEqual([2016, 2017]);
  });

  it("averages only non-missing values", () => {
    expect(meanTemperature(selectYear(series.observations, 2016))).toBe(10);
    expect(meanTemperature([])).toBeNull();
  });
});

describe("fetchTemperatureSeries", () => {
  const fetchMock = vi.fn();

  // What the fake network returns for live NASA and for the snapshot file.
  let liveReply: () => unknown;
  let snapshotReply: () => unknown;

  beforeEach(() => {
    clearTemperatureCache();
    fetchMock.mockReset();

    liveReply = () => okResponse(powerResponse({ "201601": 10 }));
    snapshotReply = () => ({ ok: false, status: 404 });

    fetchMock.mockImplementation(async (url: string) =>
      url === SNAPSHOT_PATH ? snapshotReply() : liveReply(),
    );

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function okResponse(json: unknown) {
    return { ok: true, status: 200, json: async () => json };
  }

  function liveCalls() {
    return fetchMock.mock.calls.filter(([url]) => url !== SNAPSHOT_PATH)
      .length;
  }

  it("builds the request URL with T2M, monthly 2016–2025", () => {
    const url = new URL(buildTemperatureUrl(22.5726, 88.3639));

    expect(url.searchParams.get("parameters")).toBe("T2M");
    expect(url.searchParams.get("start")).toBe("2016");
    expect(url.searchParams.get("end")).toBe("2025");
    expect(url.searchParams.get("latitude")).toBe("22.5726");
  });

  it("downloads once, marks the data as live, and reuses the cache", async () => {
    const first = await fetchTemperatureSeries(1, 2);
    const second = await fetchTemperatureSeries(1, 2);

    expect(first.origin).toBe("live");
    expect(liveCalls()).toBe(1);
    expect(second).toBe(first);
  });

  it("uses the saved snapshot when live NASA fails", async () => {
    liveReply = () => ({ ok: false, status: 503 });
    snapshotReply = () =>
      okResponse({
        createdAt: "2026-11-09T10:00:00.000Z",
        entries: {
          "1.0000,2.0000": {
            url: "https://power.larc.nasa.gov/saved",
            response: powerResponse({ "201601": 12.5 }),
          },
        },
      });

    const series = await fetchTemperatureSeries(1, 2);

    expect(series.origin).toBe("snapshot");
    expect(series.snapshotCreatedAt).toBe("2026-11-09T10:00:00.000Z");
    expect(series.observations[0].temperatureC).toBe(12.5);
  });

  it("explains the failure when live fails and no snapshot exists", async () => {
    liveReply = () => ({ ok: false, status: 503 });

    await expect(fetchTemperatureSeries(3, 4)).rejects.toThrow(
      /503.*No saved data/,
    );
  });

  it("does not cache failed requests, so retrying works", async () => {
    liveReply = () => ({ ok: false, status: 503 });
    await expect(fetchTemperatureSeries(3, 4)).rejects.toThrow();

    liveReply = () => okResponse(powerResponse({ "201601": 10 }));
    await expect(fetchTemperatureSeries(3, 4)).resolves.toBeTruthy();

    expect(liveCalls()).toBe(2);
  });

  it("rejects an aborted caller without breaking the shared download", async () => {
    const controller = new AbortController();
    const aborted = fetchTemperatureSeries(5, 6, controller.signal);
    controller.abort();

    await expect(aborted).rejects.toThrow("Aborted");
    await expect(fetchTemperatureSeries(5, 6)).resolves.toBeTruthy();
    expect(liveCalls()).toBe(1);
  });
});