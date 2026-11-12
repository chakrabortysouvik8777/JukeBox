import { describe, expect, it, vi } from "vitest";

import {
  alignSeries,
  createCompareEvents,
  eventOfMonth,
  monthOfEvent,
} from "../data/compare";
import { appReducer, initialPlaybackState } from "../state/appReducer";
import {
  COMPARE_PAN,
  PlaybackController,
  type PlaybackAudioEngine,
} from "../playback/PlaybackController";
import { T2M_TEMPERATURE_MAPPING } from "../config/audioMapping";
import type { TemperatureSeries } from "../types/dataset";

// Synthetic series for tests only (not real measurements).
function series(
  lat: number,
  lng: number,
  values: Record<string, number | null>,
): TemperatureSeries {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const observations = Object.entries(values).map(([date, t]) => ({
    id: `${key}:${date}`,
    date,
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    temperatureC: t,
  }));
  return {
    latitude: lat,
    longitude: lng,
    source: {
      name: "NASA POWER",
      parameter: "T2M",
      description: "test",
      units: "°C",
      temporalResolution: "monthly",
      url: "test",
    },
    observations,
    missingCount: observations.filter((o) => o.temperatureC === null).length,
    origin: "live",
  };
}

const A = series(22.5726, 88.3639, { "2016-01": 20, "2016-02": 24, "2016-03": null });
const B = series(78.2232, 15.6469, { "2016-02": -6, "2016-03": -4, "2016-04": 0 });

describe("alignSeries", () => {
  const rows = alignSeries(A, B);

  it("aligns by calendar month over the union of both series", () => {
    expect(rows.map((r) => r.date)).toEqual(["2016-01", "2016-02", "2016-03", "2016-04"]);
  });

  it("keeps missing values as null at the location that lacks them", () => {
    expect(rows[0]).toMatchObject({ a: 20, b: null }); // B has no Jan
    expect(rows[2]).toMatchObject({ a: null, b: -4 }); // A missing in Mar
    expect(rows[3]).toMatchObject({ a: null, b: 0 }); // A has no Apr; 0 °C stays 0
  });

  it("defines the difference as A − B, only when both exist", () => {
    expect(rows[1].difference).toBe(30); // 24 − (−6)
    expect(rows[0].difference).toBeNull();
    expect(rows[2].difference).toBeNull();
  });
});

describe("createCompareEvents", () => {
  const rows = alignSeries(A, B);
  const events = createCompareEvents(rows, A, B, T2M_TEMPERATURE_MAPPING);

  it("alternates A, B for every month (two events per month)", () => {
    expect(events).toHaveLength(rows.length * 2);
    expect(events.map((e) => e.slot).slice(0, 4)).toEqual(["A", "B", "A", "B"]);
    expect(events[2].date).toBe("2016-02");
    expect(events[3].date).toBe("2016-02");
  });

  it("uses the same pitch mapping for both locations", () => {
    // Same temperature → same pitch, whichever location it comes from.
    const same = series(1, 1, { "2016-01": 10 });
    const other = series(2, 2, { "2016-01": 10 });
    const ev = createCompareEvents(alignSeries(same, other), same, other, T2M_TEMPERATURE_MAPPING);
    expect(ev[0].audioFrequencyHz).toBeCloseTo(ev[1].audioFrequencyHz!);
    // Warmer A (24 °C) is higher than colder B (−6 °C) in February.
    expect(events[2].audioFrequencyHz!).toBeGreaterThan(events[3].audioFrequencyHz!);
  });

  it("keeps missing months silent (no frequency), never 0 °C", () => {
    expect(events[1]).toMatchObject({ slot: "B", temperatureCelsius: null, audioFrequencyHz: null });
    expect(events[7]).toMatchObject({ slot: "B", temperatureCelsius: 0 });
    expect(events[7].audioFrequencyHz).not.toBeNull();
  });

  it("gives A and B distinct ids even for the same location", () => {
    const ev = createCompareEvents(alignSeries(A, A), A, A, T2M_TEMPERATURE_MAPPING);
    expect(new Set(ev.map((e) => e.id)).size).toBe(ev.length);
  });

  it("maps between event and month indices", () => {
    expect(monthOfEvent(0)).toBe(0);
    expect(monthOfEvent(5)).toBe(2);
    expect(eventOfMonth(2)).toBe(4);
  });
});

describe("A/B playback", () => {
  const rows = alignSeries(A, B);
  const events = createCompareEvents(rows, A, B, T2M_TEMPERATURE_MAPPING);
  const loaded = appReducer(initialPlaybackState, { type: "SET_EVENTS", payload: { events } });

  function makeController() {
    const engine = {
      start: vi.fn(async () => {}),
      getAudioTime: () => 10,
      getPlaybackTime: () => 10,
      scheduleFrequency: vi.fn(),
      playTemperature: vi.fn(),
      setVolume: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    } satisfies PlaybackAudioEngine;
    const controller = new PlaybackController(engine, () => {}, {
      request: () => 0,
      cancel: () => {},
    });
    return { engine, controller };
  }

  it("plays A on the left and B on the right, one step apart", async () => {
    const { engine, controller } = makeController();
    await controller.play(appReducer(loaded, { type: "PLAY" }));

    const calls = engine.scheduleFrequency.mock.calls;
    expect(calls).toHaveLength(events.length);
    expect(calls[2][3]).toBe(-COMPARE_PAN); // Feb at A
    expect(calls[3][3]).toBe(COMPARE_PAN); // Feb at B
    expect(calls[3][1] - calls[2][1]).toBeCloseTo(0.5); // B 0.5 s after A at 1×
  });

  it("a single location (Explorer) plays centred", async () => {
    const single = appReducer(initialPlaybackState, {
      type: "SET_EVENTS",
      payload: { events: events.filter((e) => e.slot === "A").map((e) => ({ ...e })) },
    });
    const { engine, controller } = makeController();
    await controller.play(appReducer(single, { type: "PLAY" }));

    for (const call of engine.scheduleFrequency.mock.calls) {
      expect(call[3]).toBe(0);
    }
  });

  it("seeking to a month lands on its A event and keeps alternating", () => {
    let s = appReducer(loaded, { type: "PLAY" });
    s = appReducer(s, { type: "SEEK", payload: { index: eventOfMonth(2) } });
    expect(s.dateIndex).toBe(4);
    expect(s.activeSlot).toBe("A");
    s = appReducer(s, { type: "TICK", payload: { index: 5 } });
    expect(s.activeSlot).toBe("B");
    expect(monthOfEvent(s.dateIndex)).toBe(2);
  });
});
