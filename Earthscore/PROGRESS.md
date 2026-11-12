# PROGRESS — Earth Information Jukebox

Last updated: 12 November 2026. See `docs/VALIDATION.md` for evidence.

## Working (verified with automated tests and sandbox browser runs)

**Planetary Explorer**
- NASA POWER T2M monthly data (2016–2025) for any point: validated, cached,
  15 s timeout, saved-data fallback for the six presets.
- Temperature → pitch mapping `t2m-pitch-v1` (−40 °C → 220 Hz, 45 °C → 880 Hz).
- One shared playback timeline on the audio clock: Play / Pause / Resume /
  Stop, seek by year or chart click, speed 0.5× / 1× / 2×, volume and mute.
- Timeline, month cards, chart dot, globe badge and year label follow the sound.
- PLAY YEAR (one year) and PLAY TIMELINE (from the selected year to 2025).
- Location switch stops sound, clears old data, disables Play until loaded;
  older slow responses cannot overwrite a newer choice.
- DAW Engine: renders the same notes to a WAV file, shows the month being
  heard, pitch bars, download; never plays together with the timeline.
- Other panels with validation: rainfall completeness, MODIS NDVI quality
  and grid, WorldPop values, safe air-quality display; honest source labels.
- Pages: Planetary Explorer, Regional Compare (placeholder), Data Sources &
  Methodology.

## Not yet verified

- Real-device listening checks (docs/VALIDATION.md section C).

## Next

- Regional Compare: two locations, shared chart, A − B difference,
  alternating A → B sound, full controls (mentor's list, items 1–16).
- Final check of both pages together, then deploy.

## Team

| Role | Member | Area |
|---|---|---|
| M1 | Sweta | UI, navigation, globe, design |
| M2 → M3 | (handled by Souvik) | Data validation and data docs |
| M3 | Souvik | Sonification, audio engine, data layer |
| M4 | Sannoy | Shared state and playback controller |
