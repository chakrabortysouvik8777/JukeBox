export const PLAYBACK_DEFAULTS = {
  initialSpeed: 1.0,
  // One monthly observation every 0.5 s: a full year = 6 s, 2016–2025 = 60 s.
  secondsPerEvent: 0.5,
  // Note length as a fraction of the step, so months are heard separately.
  noteFraction: 0.8,
  defaultVolume: 0.5,
  soundEnabled: true,
  minSpeed: 0.25,
  maxSpeed: 4.0,
} as const;
