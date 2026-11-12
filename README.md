
# 🌍 EarthScore

**Earth Information Jukebox prototype | Team SARTHAK 🚀 | NASA Space Apps Challenge 2026**

## Overview

EarthScore lets you **hear** how air temperature changes over the year and
across the decade at any point on Earth. It turns NASA POWER monthly air
temperature (2016–2025) into sound — one note per month, higher pitch =
warmer — while a globe, a timeline and a chart show the same values.

## What the app does

Three pages (links in the top bar):

1. **Planetary Explorer**
   - Pick a point on the globe, a preset (Kolkata, Svalbard, Amazon, Tokyo,
     Sahara, Tuvalu) or a search result.
   - **PLAY TIMELINE** plays every month from the selected year to 2025;
     **PLAY YEAR** plays one year. Pause, resume, stop, seek by year or by
     clicking the chart, speed 0.5× / 1× / 2×, volume and mute.
   - The timeline, month cards, chart dot and globe badge follow the sound.
   - **DAW Engine** renders the same notes to a WAV file you can scrub and
     download.
   - Side panels: current weather, air quality, rainfall, vegetation (NDVI),
     greenhouse gases and population, each labelled with its real source.
2. **Regional Compare** — in development (two locations, A → B sound).
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
            ├── data/          validation, selectors, rainfall summary
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

Planetary Explorer is working and tested (see `Earthscore/PROGRESS.md` and
`docs/VALIDATION.md`). Real-device listening checks and the Regional Compare
page are next.

## Notes

- Every value shown comes from a named source; nothing is invented.
- Missing data is shown as missing (and is silent in the sound), never as 0.
- This is a prototype: it does not detect heatwaves or prove climate trends.
