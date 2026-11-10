import { ObservationEvent } from '../types/playback';

export interface RawRecord {
  id: string;
  date: string;
  regionId: string;
  temperatureKelvin: number | null;
  temperatureCelsius: number | null;
  audioFrequencyHz: number | null;
  frameUrl?: string;
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