import { ObservationEvent } from '../types/playback';
import type { MonthlySeries, TemperatureSeries } from '../types/dataset';
import type { SoundParameter } from '../config/parameters';
import type { TemperatureMappingConfig } from '../types/audio';
import { temperatureToSound } from '../audio/temperatureMapping';
import { locationKey } from '../data/validateDataset';

export interface RawRecord {
  id: string;
  date: string;
  regionId: string;
  temperatureKelvin: number | null;
  temperatureCelsius: number | null;
  audioFrequencyHz: number | null;
  frameUrl?: string;
  parameterId?: string;
  value?: number | null;
  unit?: string;
}

/**
 * Creates single-region or alternating A/B event sequences for synchronized playback.
 */
export function createPlaybackEvents(
  recordsA: RawRecord[],
  recordsB?: RawRecord[]
): ObservationEvent[] {
  if (!recordsB || recordsB.length === 0) {
    return recordsA.map((rec) => ({
      ...rec,
      slot: 'A',
    }));
  }

  // Interleave region A and region B records date by date for side-by-side sonification
  const events: ObservationEvent[] = [];
  const maxLen = Math.max(recordsA.length, recordsB.length);

  for (let i = 0; i < maxLen; i++) {
    if (recordsA[i]) {
      events.push({
        ...recordsA[i],
        slot: 'A',
      });
    }
    if (recordsB[i]) {
      events.push({
        ...recordsB[i],
        slot: 'B',
      });
    }
  }

  return events;
}

/**
 * Turns a validated NASA POWER series into playback records.
 * The frequency is computed once here with the shared mapping, so the
 * controller, the panel and the legend all agree on the pitch.
 * Missing temperatures stay null (silent), never 0.
 */
export function recordsFromSeries(
  series: TemperatureSeries,
  mapping: TemperatureMappingConfig
): RawRecord[] {
  const regionId = locationKey(series.latitude, series.longitude);

  return series.observations.map((observation) => {
    const sound = temperatureToSound(observation.temperatureC, mapping);

    return {
      id: observation.id,
      date: observation.date,
      regionId,
      temperatureCelsius: observation.temperatureC,
      temperatureKelvin:
        observation.temperatureC === null ? null : observation.temperatureC + 273.15,
      audioFrequencyHz: sound.frequencyHz,
    };
  });
}

/**
 * Playback records for any parameter (temperature, rainfall, CO₂, CH₄),
 * using that parameter's fixed pitch mapping. Missing values stay silent.
 */
export function recordsFromMonthly(
  series: MonthlySeries,
  parameter: SoundParameter,
  idPrefix = ''
): RawRecord[] {
  const isTemperature = parameter.id === 'temperature';

  return series.observations.map((observation) => ({
    id: `${idPrefix}${observation.id}`,
    date: observation.date,
    regionId: series.regionKey,
    parameterId: parameter.id,
    value: observation.value,
    unit: parameter.unit,
    temperatureCelsius: isTemperature ? observation.value : null,
    temperatureKelvin:
      isTemperature && observation.value !== null ? observation.value + 273.15 : null,
    audioFrequencyHz: temperatureToSound(observation.value, parameter.mapping).frequencyHz,
  }));
}

/** Index of the first event of a year ("YYYY-01"), or -1. */
export function firstIndexOfYear(events: readonly ObservationEvent[], year: number): number {
  const prefix = `${year}-`;
  return events.findIndex((event) => event.date.startsWith(prefix));
}

/** Index of the last event of a year ("YYYY-12"), or -1. */
export function lastIndexOfYear(events: readonly ObservationEvent[], year: number): number {
  const prefix = `${year}-`;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].date.startsWith(prefix)) return i;
  }
  return -1;
}
