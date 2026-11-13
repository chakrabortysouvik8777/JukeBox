
# 🌍 EarthScore

**Earth Information Jukebox prototype | Team SARTHAK 🚀 | NASA Space Apps Challenge 2026**

## Overview

EarthScore lets you **hear** how Earth data changes over the year and
across the decade. It turns monthly data (2016–2025) into sound — one note
per month, higher pitch = higher value — while a globe, a timeline and a
chart show the same values. Sound sources: air temperature, rainfall and
aerosols (haze) at any point (NASA POWER), and global CO₂ and methane (NOAA).

## What the app does

Three pages (links in the top bar):

1. **Planetary Explorer**
   - Pick a point on the globe, a preset (Kolkata, Svalbard, Amazon, Tokyo,
     Sahara, Tuvalu) or a search result.
   - **PLAY TIMELINE** plays every month from the selected year to 2025;
     **PLAY YEAR** plays one year. Pause, resume, stop, seek by year or by
     clicking the chart, speed 0.5× / 1× / 2×, volume and mute.
   - The timeline, month cards, chart dot and globe badge follow the sound.
   - **Sound source**: Temperature, Rainfall, Air quality (aerosols), CO₂ or CH₄ (CO₂ / CH₄ are
     global averages, labelled as such).
   - **DAW Engine** renders the same notes to a WAV file you can scrub and
     download.
   - Side panels: current weather, air quality, rainfall, vegetation (NDVI),
     greenhouse gases and population, each labelled with its real source.
2. **Regional Compare** — two locations side by side: one chart with both
   temperature lines on the same scale, the selected month's values and
   their difference (A − B), and alternating A → B sound with the same
   pitch mapping (A in the left ear, B in the right). Temperature,
   rainfall or aerosols. Play, pause, stop, month seek, speed, volume, matchup presets
   and search, and a DAW Engine that exports the comparison as a stereo WAV.
3. **Data Sources & Methodology** — the data, the checks, the pitch formula
   and what the prototype does not claim.

## Project structure

```text
JukeBox/
├── README.md
├── docs/                      AUDIO_CONTRACT, DATA_CONTRACT, DATA_SOURCES, VALIDATION, guide
├── Research_Document/         sonification research papers
└── Earthscore/
    ├── PROGRESS.md            what works, what is next
    ├── TEAM_ROLES.md, Architechture.md, CLAUDE.md
    └── client/                the React app
        ├── public/data/       saved NASA POWER data (offline backup)
        ├── public/textures/   globe images
        ├── scripts/           makeSnapshot.mjs (refresh the backup)
        └── src/
            ├── audio/         pitch mapping, AudioEngine, WAV rendering
            ├── playback/      PlaybackController (audio-clock scheduling)
            ├── state/         shared playback state (reducer + provider)
            ├── data/          validation, selectors, rainfall summary, A/B alignment
            ├── services/      API calls (NASA POWER, MODIS, WorldPop, …)
            ├── components/    globe, panels, timeline, sonification, DAW
            ├── pages/         Regional Compare, Methodology
            └── tests/         Vitest unit tests
```

## Tech stack

- Frontend: React + TypeScript + Vite
- 3D globe: react-globe.gl, three.js
- Charts: Recharts
- Audio: Tone.js / Web Audio, notes scheduled on the audio clock; WAV export with OfflineAudioContext
- State: React reducer + context (one shared playback timeline)
- Data: fetched live from public APIs in the browser and validated; no backend, no API keys

## Data

| Used for | Source |
|---|---|
| Sound, chart, badge | NASA POWER T2M — monthly mean air temperature at 2 m (2016–2025) |
| Sound (rainfall) | NASA POWER PRECTOTCORR — monthly mean precipitation, mm/day |
| Sound (air quality) | NASA POWER AOD_55 — monthly aerosol optical depth (haze), not an AQI |
| Sound (CO₂, CH₄) | NOAA GML global monthly averages (not NASA, same for every place) |
| Vegetation panel | NASA MODIS MOD13Q1 NDVI (250 m, 16-day) via ORNL DAAC |
| Weather, air quality, rainfall | Open-Meteo (model / reanalysis data, not NASA) |
| Greenhouse gases | NOAA GML global monthly averages (not NASA) |
| Population | WorldPop modelled estimates (not NASA) |

Details and all checks: `docs/DATA_SOURCES.md`.

## Getting started

```bash
cd Earthscore/client
npm ci          # install exact dependency versions
npm run dev     # http://localhost:5173
```

Checks:

```bash
npm test               # all unit tests
npx tsc --noEmit       # type check
npm run build          # production build
npm run snapshot       # refresh the saved NASA data for the presets (needs internet)
```

Results are recorded in `docs/VALIDATION.md`.

## Team

**Team Name:** SARTHAK

| Role | Member | Area |
|---|---|---|
| M1 | Sweta | UI, navigation, globe, design |
| M2 | Roumik → handled by Souvik | Data validation and data documentation |
| M3 | Souvik | Sonification, audio engine, data layer |
| M4 | Sannoy | Shared state and playback controller |

## Current status

Planetary Explorer and Regional Compare are working and tested (see
`Earthscore/PROGRESS.md` and `docs/VALIDATION.md`). Real-device listening
checks on the demo device are next.

## Notes

- Every value shown comes from a named source; nothing is invented.
- Missing data is shown as missing (and is silent in the sound), never as 0.
- This is a prototype: it does not detect heatwaves or prove climate trends.
