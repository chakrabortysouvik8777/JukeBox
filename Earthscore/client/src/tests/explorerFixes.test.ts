import { describe, expect, it, vi } from "vitest";

import { appReducer, initialPlaybackState, rangeEndIndex } from "../state/appReducer";
import { PlaybackController, type PlaybackAudioEngine } from "../playback/PlaybackController";
import { fillMissingMonths, parsePowerT2M } from "../data/validateDataset";
import { pageFromHash, hashForPage } from "../utils/useHashPage";
import { T2M_TEMPERATURE_MAPPING } from "../config/audioMapping";
import type { ObservationEvent } from "../types/playback";

// Synthetic events for tests only (not real measurements): 2016–2017.
const events: ObservationEvent[] = Array.from({ length: 24 }, (_, i) => {
  const year = 2016 + Math.floor(i / 12);
  const month = (i % 12) + 1;
  const date = `${year}-${String(month).padStart(2, "0")}`;
  return {
    id: `0,0:${date}`,
    date,
    regionId: "0,0",
    slot: "A",
    temperatureCelsius: 20,
    temperatureKelvin: 293.15,
    audioFrequencyHz: 600,
  };
});

const loaded = appReducer(initialPlaybackState, {
  type: "SET_EVENTS",
  payload: { events },
});

describe("Explorer fix: seeking outside a paused one-year range", () => {
  it("a seek while paused ends the year range, so resume continues the timeline", () => {
    let s = appReducer(loaded, {
      type: "PLAY_RANGE",
      payload: { startIndex: 0, endIndex: 11 }, // 2016 only
    });
    s = appReducer(s, { type: "TICK", payload: { index: 5 } });
    s = appReducer(s, { type: "PAUSE" });

    // User picks 2017 while paused.
    s = appReducer(s, { type: "SEEK", payload: { index: 12 } });
    expect(s.playUntilIndex).toBeNull();
    expect(s.rangeStartIndex).toBe(12);

    s = appReducer(s, { type: "PLAY" });
    expect(s.status).toBe("playing");
    expect(s.dateIndex).toBe(12);
    expect(rangeEndIndex(s)).toBe(23); // not the old Dec 2016
  });

  it("STOP after such a seek returns to the seek position", () => {
    let s = appReducer(loaded, { type: "SEEK", payload: { index: 12 } });
    s = appReducer(s, { type: "PLAY" });
    s = appReducer(s, { type: "TICK", payload: { index: 15 } });
    s = appReducer(s, { type: "STOP" });
    expect(s.dateIndex).toBe(12);
  });
});

describe("Explorer fix: location switch clears events", () => {
  it("SET_EVENTS with no events stops playback; PLAY is then ignored", () => {
    const playing = appReducer(loaded, { type: "PLAY" });
    const cleared = appReducer(playing, { type: "SET_EVENTS", payload: { events: [] } });
    expect(cleared.status).toBe("stopped");
    expect(cleared.events).toHaveLength(0);
    expect(appReducer(cleared, { type: "PLAY" })).toBe(cleared);
  });
});

describe("Explorer fix: Stop cancels a pending legend preview", () => {
  function makeEngine() {
    let finishStart!: () => void;
    const engine = {
      start: vi.fn(() => new Promise<void>((resolve) => (finishStart = resolve))),
      getAudioTime: () => 10,
      getPlaybackTime: () => 10,
      scheduleFrequency: vi.fn(),
      playTemperature: vi.fn(),
      setVolume: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    } satisfies PlaybackAudioEngine;
    return { engine, finish: () => finishStart() };
  }

  it("stopAll() before audio has started means the preview never sounds", async () => {
    const { engine, finish } = makeEngine();
    const controller = new PlaybackController(engine, () => {}, {
      request: () => 0,
      cancel: () => {},
    });

    const pending = controller.preview(10, loaded, T2M_TEMPERATURE_MAPPING);
    controller.stopAll(); // user presses Stop immediately
    finish();
    await pending;

    expect(engine.playTemperature).not.toHaveBeenCalled();
    expect(engine.stop).toHaveBeenCalled();
  });

  it("halt() alone (pause effect after a preview click) keeps the preview", async () => {
    const { engine, finish } = makeEngine();
    const controller = new PlaybackController(engine, () => {}, {
      request: () => 0,
      cancel: () => {},
    });

    const pending = controller.preview(10, loaded, T2M_TEMPERATURE_MAPPING);
    controller.halt();
    finish();
    await pending;

    expect(engine.playTemperature).toHaveBeenCalledTimes(1);
  });
});

describe("Explorer fix: months absent from a NASA response", () => {
  it("are inserted as silent (null) observations, keeping timing even", () => {
    const series = parsePowerT2M(
      {
        header: { fill_value: -999 },
        parameters: { T2M: { units: "C" } },
        // March and April 2016 are missing entirely (no key at all).
        properties: { parameter: { T2M: { "201601": 10, "201602": 11, "201605": 14 } } },
      },
      1,
      2,
      "test",
    );

    expect(series.observations.map((o) => o.date)).toEqual([
      "2016-01",
      "2016-02",
      "2016-03",
      "2016-04",
      "2016-05",
    ]);
    expect(series.observations[2]).toMatchObject({
      id: "1.0000,2.0000:2016-03",
      month: 3,
      temperatureC: null,
    });
    expect(series.missingCount).toBe(2);
  });

  it("fills across a year boundary and keeps existing values", () => {
    const filled = fillMissingMonths(
      [
        { id: "k:2016-11", date: "2016-11", year: 2016, month: 11, temperatureC: 5 },
        { id: "k:2017-02", date: "2017-02", year: 2017, month: 2, temperatureC: 7 },
      ],
      "k",
    );
    expect(filled.map((o) => [o.date, o.temperatureC])).toEqual([
      ["2016-11", 5],
      ["2016-12", null],
      ["2017-01", null],
      ["2017-02", 7],
    ]);
  });
});

describe("Pages", () => {
  it.each([
    ["", "explorer"],
    ["#/explorer", "explorer"],
    ["#/compare", "compare"],
    ["#/methodology", "methodology"],
    ["#/studio", "explorer"], // removed page falls back to the Explorer
    ["#compare", "compare"],
  ])("%s -> %s", (hash, page) => {
    expect(pageFromHash(hash)).toBe(page);
  });

  it("builds hash links", () => {
    expect(hashForPage("methodology")).toBe("#/methodology");
  });
});
