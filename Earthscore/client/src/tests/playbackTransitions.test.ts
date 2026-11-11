import { describe, expect, it, vi } from "vitest";

import { appReducer, initialPlaybackState, rangeEndIndex } from "../state/appReducer";
import {
  PlaybackController,
  type FrameScheduler,
  type PlaybackAudioEngine,
} from "../playback/PlaybackController";
import {
  createPlaybackEvents,
  firstIndexOfYear,
  lastIndexOfYear,
  recordsFromSeries,
} from "../playback/createPlaybackEvents";
import { T2M_TEMPERATURE_MAPPING } from "../config/audioMapping";
import type { PlaybackAction, PlaybackState } from "../types/playback";
import type { TemperatureSeries } from "../types/dataset";

// ---------- Synthetic test data (not real measurements) ----------

function makeSeries(years: number[]): TemperatureSeries {
  const observations = years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const date = `${year}-${String(month).padStart(2, "0")}`;
      return {
        id: `1.0000,2.0000:${date}`,
        date,
        year,
        month,
        // One missing month to check silence.
        temperatureC: year === years[0] && month === 3 ? null : 10 + month,
      };
    }),
  );

  return {
    latitude: 1,
    longitude: 2,
    source: {
      name: "NASA POWER",
      parameter: "T2M",
      description: "test",
      units: "°C",
      temporalResolution: "monthly",
      url: "test",
    },
    observations,
    missingCount: 1,
    origin: "live",
  };
}

const events = createPlaybackEvents(
  recordsFromSeries(makeSeries([2016, 2017]), T2M_TEMPERATURE_MAPPING),
);

function loaded(extra: Partial<PlaybackState> = {}): PlaybackState {
  return {
    ...appReducer(initialPlaybackState, { type: "SET_EVENTS", payload: { events } }),
    ...extra,
  };
}

// ---------- Events ----------

describe("recordsFromSeries / year indices", () => {
  it("builds one event per month with mapped pitch; missing stays silent", () => {
    expect(events).toHaveLength(24);
    expect(events[0]).toMatchObject({ date: "2016-01", slot: "A", temperatureCelsius: 11 });
    expect(events[0].temperatureKelvin).toBeCloseTo(284.15);
    expect(events[0].audioFrequencyHz).toBeGreaterThan(220);
    expect(events[2].temperatureCelsius).toBeNull();
    expect(events[2].audioFrequencyHz).toBeNull();
  });

  it("finds the first and last month of a year", () => {
    expect(firstIndexOfYear(events, 2017)).toBe(12);
    expect(lastIndexOfYear(events, 2017)).toBe(23);
    expect(firstIndexOfYear(events, 2030)).toBe(-1);
  });
});

// ---------- Reducer ----------

describe("appReducer playback transitions", () => {
  it("PLAY plays the whole timeline from the current position", () => {
    const s = appReducer(loaded({ dateIndex: 5 }), { type: "PLAY" });
    expect(s.status).toBe("playing");
    expect(s.dateIndex).toBe(5);
    expect(s.playUntilIndex).toBeNull();
    expect(rangeEndIndex(s)).toBe(23);
  });

  it("PLAY at the last month restarts from the beginning", () => {
    const s = appReducer(loaded({ dateIndex: 23 }), { type: "PLAY" });
    expect(s.dateIndex).toBe(0);
  });

  it("PLAY_RANGE plays one year and STOP returns to its January", () => {
    let s = appReducer(loaded(), {
      type: "PLAY_RANGE",
      payload: { startIndex: 12, endIndex: 23 },
    });
    expect(s).toMatchObject({ status: "playing", dateIndex: 12, playUntilIndex: 23 });

    s = appReducer(s, { type: "TICK", payload: { index: 15 } });
    s = appReducer(s, { type: "STOP" });
    expect(s).toMatchObject({ status: "stopped", dateIndex: 12 });
  });

  it("TICK moves the position without rescheduling audio", () => {
    const playing = appReducer(loaded(), { type: "PLAY" });
    const ticked = appReducer(playing, { type: "TICK", payload: { index: 4 } });
    expect(ticked.dateIndex).toBe(4);
    expect(ticked.scheduleVersion).toBe(playing.scheduleVersion);
  });

  it("TICK is ignored when not playing", () => {
    const s = loaded();
    expect(appReducer(s, { type: "TICK", payload: { index: 4 } })).toBe(s);
  });

  it("SEEK while playing reschedules and continues the whole timeline", () => {
    const year = appReducer(loaded(), {
      type: "PLAY_RANGE",
      payload: { startIndex: 0, endIndex: 11 },
    });
    const s = appReducer(year, { type: "SEEK", payload: { index: 12 } });
    expect(s.dateIndex).toBe(12);
    expect(s.playUntilIndex).toBeNull();
    expect(s.scheduleVersion).toBe(year.scheduleVersion + 1);
  });

  it("SEEK while stopped only moves the position", () => {
    const s0 = loaded();
    const s = appReducer(s0, { type: "SEEK", payload: { index: 30 } });
    expect(s.dateIndex).toBe(23); // clamped
    expect(s.scheduleVersion).toBe(s0.scheduleVersion);
  });

  it("PAUSE then PLAY resumes the same range", () => {
    let s = appReducer(loaded(), {
      type: "PLAY_RANGE",
      payload: { startIndex: 0, endIndex: 11 },
    });
    s = appReducer(s, { type: "TICK", payload: { index: 6 } });
    s = appReducer(s, { type: "PAUSE" });
    expect(s.status).toBe("paused");
    s = appReducer(s, { type: "PLAY" });
    expect(s).toMatchObject({ status: "playing", dateIndex: 6, playUntilIndex: 11 });
  });

  it("ENDED stops at the last month of the range", () => {
    let s = appReducer(loaded(), {
      type: "PLAY_RANGE",
      payload: { startIndex: 0, endIndex: 11 },
    });
    s = appReducer(s, { type: "ENDED" });
    expect(s).toMatchObject({ status: "stopped", dateIndex: 11 });
  });

  it("SET_EVENTS (new location) stops playback and keeps the requested month", () => {
    const playing = appReducer(loaded(), { type: "PLAY" });
    const s = appReducer(playing, {
      type: "SET_EVENTS",
      payload: { events, startIndex: 12 },
    });
    expect(s).toMatchObject({ status: "stopped", dateIndex: 12 });
  });

  it("SET_SPEED while playing reschedules; volume and mute do not", () => {
    const playing = appReducer(loaded(), { type: "PLAY" });
    expect(
      appReducer(playing, { type: "SET_SPEED", payload: { speed: 2 } }).scheduleVersion,
    ).toBe(playing.scheduleVersion + 1);
    expect(
      appReducer(playing, { type: "SET_VOLUME", payload: { volume: 0.2 } }).scheduleVersion,
    ).toBe(playing.scheduleVersion);
    expect(appReducer(playing, { type: "TOGGLE_SOUND" }).soundEnabled).toBe(false);
  });

  it("PLAYBACK_ERROR stops and keeps the message", () => {
    const s = appReducer(appReducer(loaded(), { type: "PLAY" }), {
      type: "PLAYBACK_ERROR",
      payload: { message: "blocked" },
    });
    expect(s).toMatchObject({ status: "stopped", error: "blocked" });
  });
});

// ---------- Controller (fake engine + manual frames) ----------

function setup() {
  let audioTime = 10;
  let playbackTime = 9.9;

  const engine = {
    start: vi.fn(async () => {}),
    getAudioTime: () => audioTime,
    getPlaybackTime: () => playbackTime,
    scheduleFrequency: vi.fn(),
    playTemperature: vi.fn(),
    setVolume: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  } satisfies PlaybackAudioEngine;

  const queue: Array<() => void> = [];
  const frames: FrameScheduler = {
    request: (cb) => queue.push(cb),
    cancel: () => {
      queue.length = 0;
    },
  };

  const dispatched: PlaybackAction[] = [];
  const controller = new PlaybackController(engine, (a) => dispatched.push(a), frames);

  function runFrameAt(time: number) {
    playbackTime = time;
    const cb = queue.shift();
    cb?.();
  }

  return {
    engine,
    controller,
    dispatched,
    runFrameAt,
    pendingFrames: () => queue.length,
    setAudioTime: (t: number) => (audioTime = t),
  };
}

describe("PlaybackController", () => {
  it("schedules every month of the range on the audio clock", async () => {
    const { engine, controller } = setup();
    const state = appReducer(loaded(), {
      type: "PLAY_RANGE",
      payload: { startIndex: 0, endIndex: 11 },
    });

    await controller.play(state);

    // 12 months, 0.5 s apart, starting 0.1 s after the current audio time.
    expect(engine.scheduleFrequency).toHaveBeenCalledTimes(12);
    const calls = engine.scheduleFrequency.mock.calls;
    expect(calls[0][1]).toBeCloseTo(10.1);
    expect(calls[1][1]).toBeCloseTo(10.6);
    expect(calls[0][2]).toBeCloseTo(0.4);
    // The missing month (March) is scheduled as silence (null).
    expect(calls[2][0]).toBeNull();
    expect(engine.setVolume).toHaveBeenCalledWith(0.5);
  });

  it("reports the heard month with TICK and finishes with ENDED", async () => {
    const { controller, dispatched, runFrameAt } = setup();
    const state = appReducer(loaded(), {
      type: "PLAY_RANGE",
      payload: { startIndex: 0, endIndex: 2 },
    });

    await controller.play(state);

    runFrameAt(10.1); // month 0
    runFrameAt(10.65); // month 1
    runFrameAt(11.2); // month 2
    runFrameAt(11.7); // past the end

    expect(dispatched).toEqual([
      { type: "TICK", payload: { index: 1 } },
      { type: "TICK", payload: { index: 2 } },
      { type: "ENDED" },
    ]);
  });

  it("halt() stops sound and future notes; old frames do nothing", async () => {
    const { engine, controller, dispatched, runFrameAt } = setup();
    await controller.play(appReducer(loaded(), { type: "PLAY" }));

    controller.halt();
    runFrameAt(20);

    expect(engine.stop).toHaveBeenCalled();
    expect(dispatched).toEqual([]);
  });

  it("clears earlier notes before scheduling a new range (seek while playing)", async () => {
    const { engine, controller } = setup();
    await controller.play(appReducer(loaded(), { type: "PLAY" }));
    engine.stop.mockClear();
    engine.scheduleFrequency.mockClear();

    await controller.play(
      appReducer(loaded(), { type: "PLAY_RANGE", payload: { startIndex: 12, endIndex: 23 } }),
    );

    expect(engine.stop).toHaveBeenCalledTimes(1);
    expect(engine.stop.mock.invocationCallOrder[0]).toBeLessThan(
      engine.scheduleFrequency.mock.invocationCallOrder[0],
    );
    expect(engine.scheduleFrequency).toHaveBeenCalledTimes(12);
  });

  it("does not start sound if halted while audio is starting", async () => {
    const { engine, controller } = setup();
    let finish!: () => void;
    engine.start.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));

    const pending = controller.play(appReducer(loaded(), { type: "PLAY" }));
    controller.halt(); // e.g. user pressed Stop immediately
    finish();
    await pending;

    expect(engine.scheduleFrequency).not.toHaveBeenCalled();
  });

  it("reports an audio start failure", async () => {
    const { engine, controller, dispatched } = setup();
    engine.start.mockRejectedValueOnce(new Error("blocked by browser"));

    await controller.play(appReducer(loaded(), { type: "PLAY" }));

    expect(dispatched).toEqual([
      { type: "PLAYBACK_ERROR", payload: { message: "blocked by browser" } },
    ]);
  });

  it("applies mute as volume 0", () => {
    const { engine, controller } = setup();
    controller.applyVolume({ volume: 0.7, soundEnabled: false });
    expect(engine.setVolume).toHaveBeenLastCalledWith(0);
  });

  it("preview plays a reference tone even after the timeline is halted", async () => {
    const { engine, controller } = setup();
    const pending = controller.preview(2.5, loaded(), T2M_TEMPERATURE_MAPPING);
    controller.halt(); // the PAUSE effect that follows a preview click
    await pending;

    expect(engine.playTemperature).toHaveBeenCalledWith(2.5, 1, T2M_TEMPERATURE_MAPPING);
  });

  it("dispose() releases the engine and ignores later calls", async () => {
    const { engine, controller } = setup();
    controller.dispose();
    await controller.play(appReducer(loaded(), { type: "PLAY" }));

    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(engine.scheduleFrequency).not.toHaveBeenCalled();
  });
});
