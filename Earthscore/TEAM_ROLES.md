# TEAM_ROLES — Earth Information Jukebox

Prepared: 3 November 2026. Place this file in the `earthscore/` repository root.

This is the four-member implementation and ownership plan. It extends the original folder structure with the four pages from the teammate's HTML prototype. It does not claim that these application files have been implemented. The existing design must be preserved during integration.

Related documents: [CLAUDE.md](./CLAUDE.md) and [Architechture.md](./Architechture.md). Their earlier two-person work split is superseded by this four-person ownership plan; their scientific and synchronization principles still apply. This document does not modify those files.

## 1. Team roles

Replace the member labels with names when assigning work.

| Label | Team | Main responsibility | First deliverable |
|---|---|---|---|
| M1 - SWETA| Visualization | UI, React integration, routing, design preservation | Explorer page with controls emitting actions |
| M2 - ROUMIK | Visualization | NASA data preparation, maps, charts, scientific values | One verified region/date series with matched frames |
| M3 — SOUVIK | Sonification | Data-to-frequency mapping and audio engine | Correct tone from a supplied measurement, with reliable stop |
| M4 - SANNOY | Sonification | Shared state, playback timing, synchronization, integration | One sequence controlling sound and visuals together |

**Ownership means responsibility, not isolation.** Every file has one primary editor. Other members can contribute through a coordinated change reviewed by that owner. “Shared” means several modules depend on the file; it does not mean everyone edits it independently.

M4 coordinates integration, but each member remains responsible for testing their own work. M2 owns data preparation explicitly so it does not fall between the visualization and sonification teams.

## 2. Complete proposed repository map

Legend: `[M1]`–`[M4]` = primary owner; `[S]` = common contract/configuration/document; `[G]` = generated; `[R]` = preserved reference; `[NEW]` = addition to the earlier scaffold. Directory labels cover children unless a child has its own label.

```text
earthscore/
  TEAM_ROLES.md                           [M4, S, NEW]
  CLAUDE.md                               [M4, S]
  Architechture.md                         [M4, S]
  README.md                               [M4, S]
  PROGRESS.md                             [M4, S]
  .gitignore                              [M4, S]
  .env.example                            [M2, S]

  docs/
    Earth_Information_Jukebox_Complete_Guide.md [M4, R]
    DATA_SOURCES.md                        [M2]
    VALIDATION.md                          [M4, S]
    UI_HANDOFF.md                          [M1, NEW]
    DATA_CONTRACT.md                       [M2, S, NEW]
    AUDIO_CONTRACT.md                      [M3, S, NEW]

  design-reference/                       [M1, R, NEW]
    stitch/
      planetary_explorer/
        code.html
        screen.png
      earth_symphony_studio/
        code.html
        screen.png
      regional_compare/
        code.html
        screen.png
      data_sources_and_methodology/
        code.html
        screen.png
      orbital_telemetry_sonification/
        DESIGN.md

  data-pipeline/                          [M2]
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

  data/                                   [M2; local, excluded from Git]
    raw/
    intermediate/

  client/
    package.json                          [M4, S]
    package-lock.json                     [M4, S, G]
    index.html                            [M1]
    vite.config.ts                        [M4, S]
    tsconfig.json                         [M4, S]
    public/
      data/                               [M2, G]
        manifest.json
        regions.json
        temperatures.json
      frames/                             [M2, G]
      assets/                             [M1, NEW]

    src/
      main.tsx                            [M4, S]
      App.tsx                             [M1, S]
      styles/                             [M1]
        tokens.css
        global.css
      pages/                              [M1, NEW]
        PlanetaryExplorer.tsx
        EarthSymphonyStudio.tsx
        RegionalCompare.tsx
        DataSourcesMethodology.tsx
      types/
        dataset.ts                        [M2, S]
        playback.ts                       [M4, S]
        audio.ts                          [M3, S, NEW]
      config/
        defaults.ts                       [M4, S]
        audioMapping.ts                   [M3, S, NEW]
      data/                               [M2]
        loadDataset.ts
        validateDataset.ts
        selectors.ts
      state/                              [M4, S]
        AppProvider.tsx
        appReducer.ts
      playback/                           [M4]
        PlaybackController.ts
        createPlaybackEvents.ts
      audio/                              [M3]
        AudioEngine.ts
        temperatureMapping.ts
      visualization/                      [M2]
        geoToPixel.ts
        chartScales.ts
      components/
        layout/                           [M1, NEW]
          AppHeader.tsx
          AppFooter.tsx
        EarthViewer.tsx                   [M2]
        TemperatureChart.tsx              [M2]
        MeasurementPanel.tsx              [M2]
        RegionSelector.tsx                [M1]
        PlaybackControls.tsx              [M1]
        ComparisonPanel.tsx               [M1]
        SoundLegend.tsx                   [M3; M1 reviews appearance]
        DataTable.tsx                     [M1; M2 supplies scientific fields]
        StatusMessage.tsx                 [M1]
      tests/
        temperatureMapping.test.ts        [M3]
        audioEngine.test.ts               [M3, NEW]
        playbackTransitions.test.ts       [M4]
        datasetValidation.test.ts         [M2]
        fixtures/                         [M2, NEW]
          sampleDataset.json
```

The tree describes the agreed target, not a request to create empty files unnecessarily. `package-lock.json` is produced by npm, not manually written. Raw data and intermediate outputs stay outside Git. Public bundles are reproducible outputs: correct the preparation code and regenerate them rather than manually patching values.

Styling must retain the exported Tailwind theme and custom CSS. M1 and M4 should agree on the compatible build configuration before adding any version-specific Tailwind configuration file. Do not migrate styling versions as an incidental part of HTML-to-React conversion.

## 3. M1 — UI and design integration

### Files and tasks

| Folder / file | What M1 implements | Collaborator |
|---|---|---|
| `design-reference/stitch/` | Preserve original exports and screenshots; record subsequent export versions | Original UI designer |
| `docs/UI_HANDOFF.md` | Record export date/version, changed pages, reference viewport sizes, visual acceptance notes | M2, M3 |
| `client/src/pages/*.tsx` | Convert each page's markup into React and compose functional components | M2, M4 |
| `client/src/styles/tokens.css` | Shared design values matching the approved visual design | M4 for build setup |
| `client/src/styles/global.css` | Global styling, custom rules, focus states, responsive behaviour | UI designer |
| `client/src/components/layout/` | Header, navigation, footer | M4 for application state |
| `RegionSelector.tsx` | Render regions and emit selection callbacks | M2 supplies options; M4 handles actions |
| `PlaybackControls.tsx` | Play/pause/stop/date/speed/volume controls | M4 supplies actions and current state |
| `ComparisonPanel.tsx` | Region A/B selection and comparison interface | M4 owns comparison sequence |
| `DataTable.tsx` | Accessible table presentation | M2 supplies records, labels, and units |
| `StatusMessage.tsx` | Loading, missing-data, error, and unavailable-feature states | M2/M4 supply status |
| `App.tsx` | Page selection/routing and composition | M4 reviews controller/provider wiring |
| `client/index.html` | Application entry markup, title, font loading as agreed | M4 reviews build compatibility |

### Boundaries

- Preserve layout, typography, colours, spacing, and approved assets.
- Do not create a separate play timer inside the controls.
- Do not place a complete exported HTML document into `App.tsx` or replace the React entry with it.
- Replace `class` with `className` and convert handlers as needed while preserving styling.
- Keep scientific values supplied through props/state rather than hard-coding them.
- Ask the UI designer to approve unavoidable visual differences or revised content states.

**Done when:** the page matches the agreed reference at chosen viewport sizes, controls are keyboard usable, and actions reach M4's controller. Appearance and functionality are verified separately.

## 4. M2 — Data preparation and scientific visualization

### Files and tasks

| Folder / file | What M2 implements |
|---|---|
| `data-pipeline/config/regions.json` | Region identifiers and geographic boundaries |
| `data-pipeline/config/pipeline.json` | Selected dates, sources, processing settings, coverage policy |
| `requirements.txt` | Tested Python dependencies |
| `download.py` | NASA data discovery/retrieval and provenance recording |
| `preprocess.py` | Unit conversion, masks, missing data, regional aggregation |
| `prepare_frames.py` | Match dates and prepare aligned visual assets |
| `export_bundle.py` | Export browser-readable records and manifest |
| `validate.py` | Validate generated scientific bundle before use |
| `data-pipeline/tests/` | Check units, masking, aggregation, and frame/date matching |
| `client/public/data/` | Generated validated records and metadata |
| `client/public/frames/` | Generated/prepared dated frames |
| `types/dataset.ts` | Shared scientific data types |
| `data/loadDataset.ts` | Fetch prepared bundle; report loading failures |
| `data/validateDataset.ts` | Check browser input schema and references |
| `data/selectors.ts` | Select records by region/date; no independent timer |
| `visualization/geoToPixel.ts` | Coordinate-to-overlay conversion for the documented projection |
| `visualization/chartScales.ts` | Date/value plotting coordinates |
| `EarthViewer.tsx` | Frame display and scientific region overlay |
| `TemperatureChart.tsx` | Plot values and highlight the selected observation |
| `MeasurementPanel.tsx` | Display exact values, units, footprint, and source |
| `tests/datasetValidation.test.ts` | Browser data validation checks |
| `tests/fixtures/sampleDataset.json` | Small, explicitly labelled synthetic development fixture |
| `docs/DATA_SOURCES.md` | Dataset versions, links, units, assumptions, provenance |
| `docs/DATA_CONTRACT.md` | Explain schema fields, identifiers, nulls, and joining rules |
| `.env.example` | Names/descriptions of required preparation settings; no secrets |

**Boundary:** supply scientific values, not musical frequencies. Do not change pitch mapping or playback position. Use M1's visual styles for scientific components; coordinate appearance changes.

**Done when:** a small real dataset is reproducible and verified, the map/chart/value panel agree, missing observations are explicit, and the selected region is scientifically appropriate for the dataset.

## 5. M3 — Your sonification work

| Folder / file | What you implement | Input / output |
|---|---|---|
| `types/audio.ts` | Types used between your engine and M4's controller | Shared audio event and engine interface |
| `config/audioMapping.ts` | Declared default pitch range and mapping identifier | Default configuration for the bundle/engine |
| `audio/temperatureMapping.ts` | Pure temperature-to-frequency mapping | Temperature + mapping config → frequency/null + clipping status |
| `audio/AudioEngine.ts` | Initialize sound, schedule notes, envelopes, gain, cancel, dispose | Scheduled frequency events → generated sound |
| `components/SoundLegend.tsx` | Play labelled reference examples | Reference values → explanatory tones |
| `tests/temperatureMapping.test.ts` | Equal-value, monotonicity, boundary, invalid-config, missing-data tests | Deterministic checks |
| `tests/audioEngine.test.ts` | Lifecycle and cancellation checks where testable | Engine behaviour; supplement with actual listening |
| `docs/AUDIO_CONTRACT.md` | Define time units, volume range, note scheduling, stop semantics | Agreement with M4 |

### Your starting order

1. Agree with M4 on `audio.ts` and the meaning of scheduled times.
2. Implement mapping independently of React.
3. Test known inputs before connecting real NASA records.
4. Implement one instrument, comfortable volume, and short attack/release.
5. Expose reliable stop/cancel/dispose behaviour.
6. Connect to M4's controller.
7. Implement the sound legend with M1's styling and M4's pause coordination.

**Boundary:** you own what a measurement sounds like. M4 owns when it plays and which observation is active. Do not fetch NASA data or create another date-selection state inside the audio engine.

**Done when:** the mapping is consistent, missing data is not converted to a temperature note, scheduled sound starts at the requested audio time, and cancellation prevents future notes as well as stopping current voices.

## 6. M4 — Playback, shared state, and integration

| Folder / file | What M4 implements |
|---|---|
| `types/playback.ts` | Shared actions, playback state, observation-event structure |
| `state/AppProvider.tsx` | Provide shared state/controller access and lifecycle |
| `state/appReducer.ts` | Predictable user-action/state transitions |
| `playback/createPlaybackEvents.ts` | Turn records into single-region or alternating A/B event sequences |
| `playback/PlaybackController.ts` | Schedule events, synchronize visuals, handle pause/seek/speed/region changes |
| `config/defaults.ts` | UI/playback defaults such as initial speed; no duplicate scientific/audio constants |
| `main.tsx` | Root mounting and agreed provider setup |
| `tests/playbackTransitions.test.ts` | Verify cancellation and state transitions |
| `package.json`, `package-lock.json` | Coordinate frontend dependencies and scripts |
| `vite.config.ts`, `tsconfig.json` | Build and type-check configuration |
| `.gitignore` | Exclude credentials, local data, dependencies, and generated build folders appropriately |
| Root documentation and `docs/VALIDATION.md` | Coordinate instructions, status, and consolidated verification evidence |

### Important responsibilities

- Use one timeline for sound and visuals.
- Never let old scheduled notes survive a seek or region change.
- Match display updates to scheduled observation events; account for browser/device timing limits.
- Keep an audio-engine instance outside render-time construction and clean it up properly.
- Pause/coordinate normal playback when M3's sound legend is played.
- Make end-of-sequence and hidden-tab behaviour explicit.
- Coordinate the production build and integration review, rather than taking over every member's implementation.

Audio export can be assigned to M4 later, with M3 reviewing sound generation. It is not a prerequisite for the first working playback experience.

## 7. Common files — who can change what?

| Shared file or group | Primary editor | Required reviewers | Reason it is common |
|---|---|---|---|
| `types/dataset.ts`, `docs/DATA_CONTRACT.md` | M2 | M3 + M4; M1 for displayed field changes | All outputs depend on record meaning |
| `types/audio.ts`, `docs/AUDIO_CONTRACT.md` | M3 | M4 | Controller and engine must agree on event semantics |
| `types/playback.ts` | M4 | M1 + M3; M2 for observation identifiers | UI, sound, and chart follow the same event |
| `state/AppProvider.tsx`, `state/appReducer.ts` | M4 | Affected UI/data/audio owner | Shared interaction state |
| `App.tsx` | M1 | M4 | Page composition and integration |
| `main.tsx` | M4 | M1 | Root lifecycle and provider placement |
| `config/defaults.ts` | M4 | Owner affected by the setting | Shared initial behaviour |
| `config/audioMapping.ts` | M3 | M2 + M4 | Scientific interpretation and audio consistency |
| `package.json`, `package-lock.json` | M4 | Member requesting dependency change | Everyone must install the same dependencies |
| `vite.config.ts`, `tsconfig.json` | M4 | M1 for styling/build effects | Shared build behaviour |
| `styles/` and theme configuration | M1 | Affected component owner | All pages depend on the same appearance |
| `.env.example` | M2 | M4 | Reproducible preparation setup |
| `.gitignore` | M4 | M2 | Data and credential handling |
| `README.md`, `CLAUDE.md`, `Architechture.md`, `TEAM_ROLES.md` | M4 | All members for cross-team changes | Team agreements and setup instructions |
| `PROGRESS.md`, `docs/VALIDATION.md` | M4 | Each member confirms their entries | Shared status and evidence |

A shared file should have a single active editor at a time. Other members propose the change, or explicitly agree on a temporary handoff. Do not interpret ownership as a requirement for a meeting over every small local change; coordinate changes that affect another member's interface or files.

### Generated files are common inputs, not common editing targets

`client/public/data/*.json` and `client/public/frames/` are used by everyone, but M2 regenerates them. `package-lock.json` is generated by npm under coordinated dependency updates. Do not resolve conflicts in generated scientific data by guessing which values to keep.

### One source for audio settings

M3 owns the default mapping definition. The published dataset manifest records the actual mapping configuration or a resolvable versioned mapping identifier. At runtime, the application uses one validated configuration for the whole comparison. Do not let M2 export one range while M3 silently uses another, or duplicate conflicting defaults across files.

## 8. Shared contracts before parallel implementation

### A. Scientific observation

M2 defines the final schema. A minimum example is:

```ts
type Observation = {
  id: string;
  regionId: string;
  timestamp: string;
  frameId: string;
  temperatureC: number | null;
};
```

The architecture's coverage/quality fields remain necessary in the full contract. The additional `id` proposed here should be documented as a stable unique observation identifier. Decide and version the schema once, rather than maintaining different versions in each member's code.

Agree on units, timestamp timezone, missing values, region boundaries, unique identifiers, and frame matching. A null measurement is not zero temperature. A regional mean is not a point measurement.

### B. Audio contract

M3 and M4 jointly settle:

- How the controller accesses the audio clock.
- Whether start times are absolute audio-clock seconds (recommended for this design).
- Note duration units and allowed volume range.
- Initialization after a user gesture.
- How pending events and active voices are cancelled.
- How missing observations preserve timeline position without generating temperature notes.
- How resources are disposed on application teardown.

M3 documents the interface in `types/audio.ts`; M4 imports it rather than creating a competing definition.

### C. UI actions and playback position

M1 sends actions such as `PLAY`, `PAUSE`, `STOP`, `SEEK`, `SELECT_REGION`, `SET_SPEED`, `SET_VOLUME`, and `SET_COMPARISON`. M4 owns their exact payload types and behaviour. M2's visuals consume the current observation identity from the shared state.

M1 does not operate a separate button timer. M2 does not independently advance chart dates. M3 does not independently select the next measurement.

## 9. Handoffs between members

| From → to | Deliverable | Receiver checks |
|---|---|---|
| M2 → everyone | Schema, labelled fixture, then validated real bundle | Fields, units, dates, region identifiers, missing data |
| M1 → M2/M3 | Approved component markup/styles and reference screenshots | Functional integration preserves appearance |
| M3 → M4 | Audio engine and timing/cancellation contract | Known note plays and cancellation works |
| M4 → M1 | State values and typed callbacks | Every control dispatches the correct action |
| M4 → M2 | Current observation/date/active comparison slot | Frame, chart cursor, and measurement agree |
| M2 + M3 → M4 | Validated dataset and audio mapping | Events preserve shared scale and scientific meaning |

If data retrieval is delayed, all members use the same labelled fixture temporarily. Never let fabricated development values appear as verified NASA measurements in the demonstration.

## 10. Work order and integration checkpoints

### Checkpoint 1 — contracts and repository foundation

- M1 preserves design exports and prepares the page shell.
- M2 supplies schema and a small labelled fixture.
- M3 supplies the mapping/audio interface draft.
- M4 establishes state/actions and build scripts.

Pass when each member can consume the same record and explain its fields.

### Checkpoint 2 — independent modules

- M1 creates the stable Explorer layout and control callbacks.
- M2 prepares one real region and a few matching dates.
- M3 generates and stops individual mapped tones.
- M4 builds event scheduling with a temporary audio test double if needed.

Pass when each module's input/output contract is demonstrated.

### Checkpoint 3 — first end-to-end observation

Select a region/date, show its real measurement and matched frame, press Play, hear its mapped tone, advance to the next observation, and stop. Confirm that all representations agree. This checkpoint happens before polishing all four pages.

### Checkpoint 4 — expand and harden

Add more dates/regions, A/B comparison, seek/speed changes, the legend, keyboard access, error states, and source explanations. Test rapid interactions to expose stale notes or mismatched frames.

### Checkpoint 5 — release review

M1 checks visual fidelity; M2 checks scientific provenance; M3 checks audio behaviour; M4 checks integration and production deployment. Each records actual results, not just a checklist marked complete.

## 11. Git workflow without unnecessary conflicts

1. Use one repository and small feature branches, such as `feat/explorer-layout`, `feat/nasa-bundle`, `feat/audio-engine`, and `feat/playback-controller`.
2. Start from the team's current main branch and preserve uncommitted work before updating.
3. Agree before editing a shared contract or another owner's file.
4. Keep each change focused; avoid unrelated formatting across the whole repository.
5. Before requesting review, run the relevant checks and explain the result.
6. The file owner reviews; M4 coordinates cross-module integration.
7. Merge working slices frequently instead of maintaining four long-diverging branches.
8. If a conflict affects a scientific rule or interface, resolve it with that owner. Do not blindly choose all “ours” or all “theirs.”

For dependency changes, M4 coordinates updates to both `package.json` and its generated lockfile. Other members do not independently upgrade shared packages while integration is in progress.

### Pull request template

```text
Task:
Primary owner:
Files changed:
Behaviour implemented:
Shared contracts changed: yes/no; describe
Checks performed and results:
Visual changes: none / describe and obtain UI review
Remaining limitations:
What another member must do:
```

### Status updates

Each member reports completed work, current blocker, next task, and any interface change. M4 consolidates these into `PROGRESS.md` to avoid four people editing the same status paragraph simultaneously.

## 12. Preserve the unfinished UI and control scope

The uploaded design includes multiple environmental quantities and advanced studio/export features. Our first functional pipeline remains the selected ocean-temperature experience unless the team explicitly agrees to broaden it.

- Preserve the teammate's UI; M1 owns visual integration and sign-off.
- M2 identifies which visible values can be supported by the chosen dataset.
- M3 identifies which sound controls are functional and scientifically explained.
- M4 identifies which playback/export controls are implemented.
- Unsupported features receive an agreed unavailable/demo state; do not simulate successful scientific processing or downloads in the final product.
- Ocean SST must not be presented as a city's land-temperature anomaly or air quality.
- Performance/confidence/live-data claims in mockup copy require verification before publication.

Keep new design exports as references and record changed pages in `UI_HANDOFF.md`. Do not overwrite an integrated React page with an updated raw HTML file. Incorporate the design changes while preserving functional contracts.

## 13. Individual completion checks

| Owner | Required evidence |
|---|---|
| M1 | Matched reference screenshots, functional navigation/control callbacks, keyboard checks |
| M2 | Verified sample records, correct units/masks/aggregation, matched frames, reproducible bundle |
| M3 | Deterministic mapping checks, audible reference tones, no-data behaviour, reliable cancellation |
| M4 | Successful play/pause/seek/speed/region/A-B transitions with no stale audio or mismatched displays |

**Joint completion:** on the target demonstration device, a user can select a supported region, inspect a real dated measurement, hear its explained mapping, compare it consistently, and stop playback. Sources and remaining limitations are visible.
