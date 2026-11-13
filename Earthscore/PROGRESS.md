# PROGRESS — Earth Information Jukebox

Last updated: 13 November 2026 (four sound sources, Compare DAW). See `docs/VALIDATION.md` for evidence.

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
- Pages: Planetary Explorer, Regional Compare, Data Sources & Methodology.
  Any page change stops the sound.

**Sound sources (mentor request)**
- Explorer "Sound source": Temperature (NASA POWER T2M), Rainfall (NASA
  POWER PRECTOTCORR), Air quality (NASA POWER AOD_55 aerosols), CO₂ and CH₄
  (NOAA global monthly, labelled global).
- Each has a fixed mapping (`t2m-pitch-v1`, `rain-pitch-v1`, `aod-pitch-v1`,
  `co2-pitch-v1`, `ch4-pitch-v1`); month cards, chart, legend, timeline, DAW
  and navbar follow the chosen parameter.
- Not sonified yet: vegetation, population (reasons in Methodology 5b and
  docs/DATA_SOURCES.md).

**Regional Compare**
- Location A and B: presets, search, quick matchups; loading, error and
  saved-data notices for each.
- Both series aligned by calendar month (missing months kept as missing).
- One chart, shared date and °C scales; selected month's A, B and A − B.
- Alternating A → B sound with the same mapping; A left, B right (stereo).
- Active location and month highlighted with the sound.
- Play, pause, resume, stop, month seek (slider, buttons, chart click),
  speed, volume, mute; changing a location stops sound and cancels requests.
- Parameter: Temperature, Rainfall or Air quality (same mapping for A and B).
- DAW Engine: renders the comparison as a stereo WAV (A left, B right),
  shows which place is heard, download.

## Not yet verified

- Real-device listening checks (docs/VALIDATION.md section C).

## Next

- Real-device listening checks for both pages (docs/VALIDATION.md, C).
- Re-run `npm run snapshot` so the backup also holds rainfall and aerosols.
- Optional: a saved MODIS NDVI series as a vegetation sound source.
- Deploy as a static site and check on the demo device.

## Team

| Role | Member | Area |
|---|---|---|
| M1 | Sweta | UI, navigation, globe, design |
| M2 → M3 | (handled by Souvik) | Data validation and data docs |
| M3 | Souvik | Sonification, audio engine, data layer |
| M4 | Sannoy | Shared state and playback controller |
