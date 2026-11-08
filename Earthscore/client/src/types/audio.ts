// Settings that control how temperature becomes pitch.
export interface TemperatureMappingConfig {
  readonly id: string;
  readonly minTemperatureC: number;
  readonly maxTemperatureC: number;
  readonly minFrequencyHz: number;
  readonly octaves: number;
}

// Result returned by the temperature mapping function.
export interface TemperatureSound {
  readonly originalTemperatureC: number | null;
  readonly normalizedValue: number | null;
  readonly frequencyHz: number | null;
  readonly clipped: boolean;
}