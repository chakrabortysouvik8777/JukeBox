/**
 * Regional Compare: align two NASA POWER series by calendar month and
 * build the alternating A → B playback sequence.
 */
import type { TemperatureSeries } from "../types/dataset";
import type { TemperatureMappingConfig } from "../types/audio";
import type { ObservationEvent } from "../types/playback";
import { temperatureToSound } from "../audio/temperatureMapping";
import { locationKey } from "./validateDataset";
import { createPlaybackEvents, type RawRecord } from "../playback/createPlaybackEvents";

export interface CompareRow {
  date: string; // "YYYY-MM"
  year: number;
  month: number;
  a: number | null; // °C at location A, null = missing
  b: number | null; // °C at location B, null = missing
  difference: number | null; // A − B in °C, null if either is missing
}

/**
 * One row per calendar month present in either series (union, sorted).
 * A month missing at one location stays null there — never 0 and never
 * dropped, so the two locations always stay aligned month by month.
 */
export function alignSeries(
  seriesA: TemperatureSeries,
  seriesB: TemperatureSeries,
): CompareRow[] {
  const a = new Map(seriesA.observations.map((o) => [o.date, o]));
  const b = new Map(seriesB.observations.map((o) => [o.date, o]));
  const dates = [...new Set([...a.keys(), ...b.keys()])].sort();

  return dates.map((date) => {
    const ta = a.get(date)?.temperatureC ?? null;
    const tb = b.get(date)?.temperatureC ?? null;

    return {
      date,
      year: Number(date.slice(0, 4)),
      month: Number(date.slice(5, 7)),
      a: ta,
      b: tb,
      difference: ta !== null && tb !== null ? ta - tb : null,
    };
  });
}

function record(
  slot: "A" | "B",
  regionId: string,
  date: string,
  temperatureC: number | null,
  mapping: TemperatureMappingConfig,
): RawRecord {
  return {
    // Slot in the id keeps A and B distinct even for the same location.
    id: `${slot}|${regionId}:${date}`,
    date,
    regionId,
    temperatureCelsius: temperatureC,
    temperatureKelvin: temperatureC === null ? null : temperatureC + 273.15,
    audioFrequencyHz: temperatureToSound(temperatureC, mapping).frequencyHz,
  };
}

/**
 * Alternating events A, B, A, B … (two per month), all with the same
 * temperature-to-pitch mapping. Event 2k is month k at A, 2k + 1 at B.
 */
export function createCompareEvents(
  rows: readonly CompareRow[],
  seriesA: TemperatureSeries,
  seriesB: TemperatureSeries,
  mapping: TemperatureMappingConfig,
): ObservationEvent[] {
  const regionA = locationKey(seriesA.latitude, seriesA.longitude);
  const regionB = locationKey(seriesB.latitude, seriesB.longitude);

  return createPlaybackEvents(
    rows.map((row) => record("A", regionA, row.date, row.a, mapping)),
    rows.map((row) => record("B", regionB, row.date, row.b, mapping)),
  );
}

/** Month row index for an event index (two events per month). */
export function monthOfEvent(eventIndex: number): number {
  return Math.floor(eventIndex / 2);
}

/** First event (location A) of a month row. */
export function eventOfMonth(monthIndex: number): number {
  return monthIndex * 2;
}
