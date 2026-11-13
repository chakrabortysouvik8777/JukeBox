/**
 * Regional Compare: align two monthly series (same parameter) by calendar
 * month and build the alternating A → B playback sequence.
 * Works for temperature (NASA POWER T2M) and rainfall (NASA POWER
 * PRECTOTCORR); both locations always use the same mapping.
 */
import type { MonthlySeries, TemperatureSeries } from "../types/dataset";
import type { TemperatureMappingConfig } from "../types/audio";
import type { ObservationEvent } from "../types/playback";
import { temperatureToSound } from "../audio/temperatureMapping";
import { temperatureToMonthly } from "./validateDataset";
import { SOUND_PARAMETERS, type SoundParameter } from "../config/parameters";
import { createPlaybackEvents, type RawRecord } from "../playback/createPlaybackEvents";

export interface CompareRow {
  date: string; // "YYYY-MM"
  year: number;
  month: number;
  a: number | null; // value at location A (parameter's unit), null = missing
  b: number | null; // value at location B, null = missing
  difference: number | null; // A − B, null if either is missing
}

type AnySeries = MonthlySeries | TemperatureSeries;

/** Temperature series are converted to the generic monthly form. */
export function toMonthly(series: AnySeries): MonthlySeries {
  return "parameterId" in series ? series : temperatureToMonthly(series);
}

/**
 * One row per calendar month present in either series (union, sorted).
 * A month missing at one location stays null there — never 0 and never
 * dropped, so the two locations always stay aligned month by month.
 */
export function alignSeries(seriesA: AnySeries, seriesB: AnySeries): CompareRow[] {
  const a = new Map(toMonthly(seriesA).observations.map((o) => [o.date, o.value]));
  const b = new Map(toMonthly(seriesB).observations.map((o) => [o.date, o.value]));
  const dates = [...new Set([...a.keys(), ...b.keys()])].sort();

  return dates.map((date) => {
    const va = a.get(date) ?? null;
    const vb = b.get(date) ?? null;

    return {
      date,
      year: Number(date.slice(0, 4)),
      month: Number(date.slice(5, 7)),
      a: va,
      b: vb,
      difference: va !== null && vb !== null ? va - vb : null,
    };
  });
}

function record(
  slot: "A" | "B",
  regionId: string,
  date: string,
  value: number | null,
  mapping: TemperatureMappingConfig,
  parameter: SoundParameter,
): RawRecord {
  const isTemperature = parameter.id === "temperature";

  return {
    // Slot in the id keeps A and B distinct even for the same location.
    id: `${slot}|${regionId}:${date}`,
    date,
    regionId,
    temperatureCelsius: isTemperature ? value : null,
    temperatureKelvin: isTemperature && value !== null ? value + 273.15 : null,
    audioFrequencyHz: temperatureToSound(value, mapping).frequencyHz,
    parameterId: parameter.id,
    value,
    unit: parameter.unit,
  };
}

/**
 * Alternating events A, B, A, B … (two per month), all with the same
 * value-to-pitch mapping. Event 2k is month k at A, 2k + 1 at B.
 * `parameter` defaults to temperature; `mapping` defaults to its mapping.
 */
export function createCompareEvents(
  rows: readonly CompareRow[],
  seriesA: AnySeries,
  seriesB: AnySeries,
  mapping?: TemperatureMappingConfig,
  parameter: SoundParameter = SOUND_PARAMETERS.temperature,
): ObservationEvent[] {
  const regionA = toMonthly(seriesA).regionKey;
  const regionB = toMonthly(seriesB).regionKey;
  const map = mapping ?? parameter.mapping;

  return createPlaybackEvents(
    rows.map((row) => record("A", regionA, row.date, row.a, map, parameter)),
    rows.map((row) => record("B", regionB, row.date, row.b, map, parameter)),
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
