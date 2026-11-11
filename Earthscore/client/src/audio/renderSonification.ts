/**
 * Offline rendering of the sonification to a WAV file (M3).
 *
 * Uses the browser's OfflineAudioContext: the same notes the timeline plays
 * (same pitch mapping, timing and envelope) are rendered faster than real
 * time, without playing through the speakers.
 */

export interface RenderNote {
  // Frequency of the note, or null for a missing observation (silence).
  frequencyHz: number | null;
}

export interface RenderOptions {
  stepSeconds: number; // time from one note's start to the next
  noteSeconds: number; // length of each note (includes fades)
  amplitude?: number; // peak level of a note, 0–1 (default 0.4)
  sampleRate?: number; // default 44100
  tailSeconds?: number; // silence after the last note (default 0.25)
}

// The minimal part of OfflineAudioContext this module uses (fakeable in tests).
export interface OfflineContextLike {
  readonly destination: AudioNode;
  readonly sampleRate: number;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  startRendering(): Promise<AudioBuffer>;
}

export type OfflineContextFactory = (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineContextLike;

const defaultFactory: OfflineContextFactory = (channels, length, sampleRate) =>
  new OfflineAudioContext(channels, length, sampleRate);

const FADE_SECONDS = 0.02;

/** Total length in seconds of a render of `count` notes. */
export function renderDurationSeconds(count: number, options: RenderOptions): number {
  const tail = options.tailSeconds ?? 0.25;
  if (count <= 0) return tail;
  return (count - 1) * options.stepSeconds + options.noteSeconds + tail;
}

/** Render notes to mono audio. Missing notes are silent; timing is kept. */
export async function renderNotes(
  notes: readonly RenderNote[],
  options: RenderOptions,
  createContext: OfflineContextFactory = defaultFactory,
): Promise<AudioBuffer> {
  const sampleRate = options.sampleRate ?? 44100;
  const amplitude = options.amplitude ?? 0.4;

  if (!(options.stepSeconds > 0) || !(options.noteSeconds > 0)) {
    throw new Error("Step and note length must be greater than zero.");
  }
  if (options.noteSeconds > options.stepSeconds) {
    throw new Error("Notes must not be longer than the step (no overlap).");
  }
  if (!(amplitude > 0 && amplitude <= 1)) {
    throw new Error("Amplitude must be between 0 and 1.");
  }

  const duration = renderDurationSeconds(notes.length, options);
  const length = Math.ceil(duration * sampleRate);
  const context = createContext(1, length, sampleRate);

  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = "sine";
  envelope.gain.setValueAtTime(0, 0);

  oscillator.connect(envelope);
  envelope.connect(context.destination);

  notes.forEach((note, index) => {
    if (note.frequencyHz === null) return;

    const start = index * options.stepSeconds;
    const end = start + options.noteSeconds;

    // Same envelope as the live AudioEngine: silent start, 20 ms fade in,
    // hold, 20 ms fade out to zero, so there are no clicks between notes.
    oscillator.frequency.setValueAtTime(note.frequencyHz, start);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(amplitude, start + FADE_SECONDS);
    envelope.gain.setValueAtTime(amplitude, end - FADE_SECONDS);
    envelope.gain.linearRampToValueAtTime(0, end);
  });

  oscillator.start(0);
  oscillator.stop(duration);

  return context.startRendering();
}

/** Encode mono samples (−1…1) as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }

  return buffer;
}

/**
 * Loudness of the audio in `bins` equal slices (0–1 each), for drawing a
 * real waveform. Uses the peak of each slice, scaled to the loudest slice.
 */
export function waveformPeaks(samples: Float32Array, bins: number): number[] {
  if (bins <= 0) return [];
  const peaks = new Array<number>(bins).fill(0);
  if (samples.length === 0) return peaks;

  const size = samples.length / bins;

  for (let b = 0; b < bins; b++) {
    const from = Math.floor(b * size);
    const to = Math.max(from + 1, Math.floor((b + 1) * size));
    let peak = 0;
    for (let i = from; i < to && i < samples.length; i++) {
      const v = Math.abs(samples[i]);
      if (v > peak) peak = v;
    }
    peaks[b] = peak;
  }

  const max = Math.max(...peaks);
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

/** Safe, lowercase file-name part: "São Paulo, Brazil" -> "sao-paulo-brazil". */
export function fileNamePart(text: string): string {
  const cleaned = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "location";
}
