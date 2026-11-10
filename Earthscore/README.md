
# 🌍 EarthScore

**Earth Information Jukebox prototype | Team SARTHAK 🚀**

## Overview

EarthScore is an interactive Earth observation dashboard that blends geospatial exploration, environmental data analysis, and audio-driven storytelling. The project uses a 3D globe, climate and environmental metrics, and a sonification layer to help users explore how Earth systems vary across regions and years.

This repository contains the working prototype for a NASA-inspired Earth data experience with:

- location-aware environmental insights
- year-by-year temporal exploration
- globe-based visualization
- temperature and climate data mapping
- audio synthesis based on observed values
- diagnostic panels for environmental metrics

## What the app does

- Explore a selected location on a 3D globe
- Compare environmental conditions across years
- View temperature, rainfall, vegetation, population, greenhouse-gas, and air-quality signals
- Use a timeline scrubber and playback controls to traverse the dataset
- Translate variations in data into musical patterns through a sonification engine
- Present a unified dashboard combining visual and auditory interpretation

## Project structure

```text
earthscore/
├── README.md
├── Architechture.md
├── CLAUDE.md
├── PROGRESS.md
├── client/
│   ├── package.json
│   ├── index.html
│   ├── public/
│   ├── scripts/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── audio/
│       ├── data/
│       ├── playback/
│       ├── services/
│       ├── state/
│       ├── tests/
│       └── types/
├── data-pipeline/
│   ├── config/
│   ├── tests/
│   ├── download.py
│   ├── preprocess.py
│   ├── prepare_frames.py
│   ├── export_bundle.py
│   └── validate.py
├── docs/
│   ├── AUDIO_CONTRACT.md
│   ├── DATA_CONTRACT.md
│   ├── DATA_SOURCES.md
│   ├── Earth_Information_Jukebox_Complete_Guide.md
│   └── VALIDATION.md
└── Research_Document/
```

## Tech stack

- Frontend: React + TypeScript + Vite
- 3D globe: react-globe.gl, three.js, @react-three/fiber
- Data visualization: Recharts
- Audio: Tone.js with Web Audio synthesis
- State management: React state and reducer patterns
- Data preparation: Python pipeline for NASA and environmental datasets

## Getting started

### 1) Install frontend dependencies

```bash
cd earthscore/client
npm install
```

### 2) Run the app locally

```bash
npm run dev
```

The app will be available in the local Vite dev server (typically at http://localhost:5173).

### 3) Build for production

```bash
npm run build
```

### 4) Run validation checks

```bash
npm run typecheck
npm run test:mapping
npm run test:audio
npm run test:data
```

## Data pipeline

The project includes a Python data-preparation workflow for sourcing, processing, and validating environmental datasets before they are surfaced in the browser app. This is managed under the `data-pipeline/` folder.

Typical workflow:

```bash
cd earthscore
python -m venv .venv
# activate environment
pip install -r data-pipeline/requirements.txt
python data-pipeline/download.py --config data-pipeline/config/pipeline.json
python data-pipeline/preprocess.py --config data-pipeline/config/pipeline.json
python data-pipeline/prepare_frames.py --config data-pipeline/config/pipeline.json
python data-pipeline/export_bundle.py --config data-pipeline/config/pipeline.json
python data-pipeline/validate.py --bundle client/public/data
```

## Team

**Team Name:** SARTHAK

## Current status

The project is in an active prototype and iteration phase. Core UI, globe interactions, data-driven panels, and sonification flows are being refined and validated as the application evolves.

## Notes

- The repository contains both app code and scientific/data-prep assets.
- Documentation and implementation details are maintained in the `docs/` and `Architechture.md` files.
- Work is intended to support an Earth observatory experience that makes environmental trends more intuitive through sound and interaction.

## Future direction

Planned evolution includes deeper climate-analysis workflows, richer environmental datasets, more robust validation, and higher-fidelity sonification mappings that align closely with the intended NASA Earth Information Jukebox experience.
