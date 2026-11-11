# CLAUDE.md — EarthScore development guide

Prepared: 1 November 2026. Audience: teammates and coding assistants.

**Status:** implementation specification, not a record of an existing working application. The folders and commands below are the intended repository contract. Create and verify them during implementation; do not report them as already built or tested.

## A. Project overview

Read [Earth_Information_Jukebox_Complete_Guide.md](https://chatgpt.com/library?file_id=libfile_2cf277a422c08191ad92c1befd789297&account_id=personal).

For repository use, the owner can place that existing document at `docs/Earth_Information_Jukebox_Complete_Guide.md`. It is referenced rather than duplicated here. The linked file requires access to the owner's Library; a teammate should use the repository copy.

## B. Tech stack

| Layer | Selected technology | Responsibility | Scope |
| --- | --- | --- | --- |
| Interface | React + TypeScript | Components, user actions, typed data contracts | Core |
| Build tooling | Vite + npm | Development server and production bundle | Core |
| Styling | CSS with shared design tokens | Responsive layout, contrast, visible focus | Core |
| Earth display | NASA image + SVG overlay | Show dated frames and selected region boundaries | Core |
| Time-series chart | SVG rendered by React | Plot temperature, gaps, and active-date cursor | Core; a small dataset does not require a chart framework |
| Audio | Tone.js over Web Audio | Synthesis, note envelopes, audio-clock scheduling | Core |
| UI state | React reducer/context | Selected region, date, status, speed, comparison | Core |
| Data acquisition | Python + earthaccess | Authenticated NASA data discovery/retrieval | Preparation only |
| Scientific processing | xarray + NumPy + netCDF4 | Decode scientific files, apply masks, calculate regional values | Preparation only |
| Browser data | Versioned JSON + dated image assets | Small, reproducible input bundle | Core |
| Validation | pytest; Vitest; manual browser/keyboard checks | Scientific invariants, mapping, playback transitions | Targeted checks |
| Hosting | Static HTTPS hosting | Deliver browser application and prepared assets | Core |
| Version control | Git | Review changes and preserve reproducibility | Core |

### Deliberate boundaries

- No runtime backend, account system, database, or GPU is required for the first version.
- No ML model is required for temperature-to-pitch mapping.
- Python prepares the data; the browser generates the sound interactively.
- Add FastAPI only if later requirements introduce uncached scientific queries. It is not a hidden dependency of this design.
- Select compatible package versions when scaffolding, commit `package-lock.json`, pin the Python environment, and record the Node/Python versions actually tested. This document intentionally does not invent tested version numbers.

## C. File and folder structure

All paths below are relative to the future repository root. `Architechture.md` deliberately retains the filename requested by the project owner.

```text
earthscore/
  CLAUDE.md
  Architechture.md
  README.md
  PROGRESS.md
  .gitignore
  .env.example
  docs/
    Earth_Information_Jukebox_Complete_Guide.md
    DATA_SOURCES.md
    VALIDATION.md
  data-pipeline/
    requirements.txt
    config/
      regions.json
      pipeline.json
    download.py
    preprocess.py
    prepare_frames.py
    export_bundle.py
    validate.py
    tests/
      test_units_and_masks.py
      test_regional_mean.py
      test_bundle_alignment.py
  data/
    raw/                         # Local downloads; excluded from Git
    intermediate/                # Temporary outputs; excluded from Git
  client/
    package.json
    package-lock.json
    index.html
    vite.config.ts
    tsconfig.json
    public/
      data/
        manifest.json
        regions.json
        temperatures.json
      frames/                    # Optimized, date-matched image assets
    src/
      main.tsx
      App.tsx
      styles/
        tokens.css
        global.css
      types/
        dataset.ts
        playback.ts
      config/
        defaults.ts
      data/
        loadDataset.ts
        validateDataset.ts
        selectors.ts
      state/
        AppProvider.tsx
        appReducer.ts
      playback/
        PlaybackController.ts
        createPlaybackEvents.ts
      audio/
        AudioEngine.ts
        temperatureMapping.ts
      visualization/
        geoToPixel.ts
        chartScales.ts
      components/
        EarthViewer.tsx
        TemperatureChart.tsx
        RegionSelector.tsx
        PlaybackControls.tsx
        ComparisonPanel.tsx
        SoundLegend.tsx
        MeasurementPanel.tsx
        DataTable.tsx
        StatusMessage.tsx
      tests/
        temperatureMapping.test.ts
        playbackTransitions.test.ts
        datasetValidation.test.ts
```

### Responsibility of each major area

| Area | Owns | Must not do |
| --- | --- | --- |
| `data-pipeline/` | Units, masks, geographic selection, aggregation, provenance | Put credentials into generated public files |
| `client/src/data/` | Fetching, validating, selecting prepared records | Recompute a different scientific dataset from image colours |
| `client/src/state/` | User choices and displayed playback position | Create independent timers for each component |
| `client/src/playback/` | Shared event sequence, scheduling, cancellation | Let old scheduled events survive a seek or region change |
| `client/src/audio/` | Measurement-to-frequency conversion and sound lifecycle | Download scientific files or infer climate causes |
| `client/src/visualization/` | Coordinate transforms and chart scales | Treat pixel colours as authoritative temperatures |
| `client/src/components/` | Rendering, accessible controls, user actions | Maintain separate copies of the scientific values |
| `docs/` | Sources, preparation assumptions, validation evidence | Describe proposed features as completed results |

### Core implementation rules

1. Read [Architechture.md](./Architechture.md) before implementing shared contracts.
2. Implement one region and a few dates end to end before increasing scope.
3. Use the same prepared observation for the chart, numerical panel, and sound.
4. Keep mapping limits fixed across dates and comparison regions.
5. Store missing values as `null`; never substitute zero.
6. Preserve original values when sound-range clipping occurs; disclose clipping.
7. Use date/record identifiers to join assets, never folder order.
8. Keep audio engine instances outside render-time component construction. Clean them up on unmount.
9. Keep NASA/Earthdata credentials out of `client/`, public assets, Git, and client-exposed environment variables.
10. Label illustrative development fixtures. The final scientific demonstration must use verified NASA records.
11. Do not claim climate trends, heatwaves, or improved learning without the required analysis or evaluation.
12. Update `PROGRESS.md` with implemented, verified, blocked, and next work after each milestone.

### Intended developer commands

These commands describe scripts that the implementation must provide. They are not a claim that a runnable repository accompanies these documents.

From the repository root:

```bash
python -m venv .venv
```

Activate with `.venv\Scripts\Activate.ps1` in Windows PowerShell, or `source .venv/bin/activate` in a POSIX shell. Then:

```bash
python -m pip install -r data-pipeline/requirements.txt
python data-pipeline/download.py --config data-pipeline/config/pipeline.json
python data-pipeline/preprocess.py --config data-pipeline/config/pipeline.json
python data-pipeline/prepare_frames.py --config data-pipeline/config/pipeline.json
python data-pipeline/export_bundle.py --config data-pipeline/config/pipeline.json
python data-pipeline/validate.py --bundle client/public/data
python -m pytest data-pipeline/tests
```

In `client/`, after dependencies and the lockfile have been established:

```bash
npm ci
npm run dev
npm run typecheck
npm run test
npm run build
npm run preview
```

Define `typecheck` as a TypeScript no-emit check, `test` as a non-watch test run, and the Vite development/build/preview scripts in `package.json`. Use `npm install` for initial dependency setup; use `npm ci` for subsequent reproducible installs.

### Suggested teammate split

| Owner | Primary work | Integration handoff |
| --- | --- | --- |
| Teammate A | Python pipeline, bundle schema, provenance, data validation | A validated bundle and small labelled fixture |
| Teammate B | React shell, image overlay, chart, controls, accessibility | Components driven by the agreed state and record types |
| Joint integration | Audio engine, playback controller, A/B comparison | One synchronized interaction and tested cancellation |

Agree on the data contract first. UI work can use a labelled fixture while real data preparation proceeds. Merge a working vertical slice before assigning more features.

### Definition of done

- Real numerical records are matched to documented dated visual assets.
- Play, pause, stop, seek, speed change, region change, and A/B comparison are consistent.
- Sound requires an explicit user gesture and can always be stopped.
- Keyboard users can reach every essential control and inspect exact values.
- Sources, units, sampled footprint, aggregation, and mapping are visible.
- Production build and the actual demonstration device have been checked.
- Any remaining limitations are recorded, not concealed.
