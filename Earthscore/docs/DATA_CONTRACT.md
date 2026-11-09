# DATA_CONTRACT — Earth Information Jukebox

Owner: M2 (currently handled by M3). Reviewers: M3 (audio), M4 (playback), M1 (displayed fields).

This document defines what a temperature record means. Every part of the app
(panels, charts, sound, playback) must use these records, not its own copy.

## 1. Approach

The app fetches data live from public APIs in the browser.
There is no backend and no credentials. The Python `data-pipeline/` folder
is not used in the current version.

Every API response is validated before use (see section 4).

## 2. Temperature observation

Defined in `client/src/types/dataset.ts`.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable unique id: `"<lat>,<lng>:<YYYY-MM>"`, coordinates to 4 decimals |
| `date` | string | Calendar month `"YYYY-MM"` |
| `year` | number | e.g. 2016 |
| `month` | number | 1–12 |
| `temperatureC` | number or null | Monthly mean air temperature 2 m above the surface, °C |

### Rules

- Units are always °C. Kelvin or anomalies are never stored in `temperatureC`.
- `null` means missing. It is never replaced with 0.
- A value is a point estimate from NASA POWER's gridded data at the
  selected coordinates, not a city-wide or regional average.
- Observations are sorted by `date`, one per month, no duplicates.

## 3. Temperature series

| Field | Meaning |
|---|---|
| `latitude`, `longitude` | Requested point |
| `source` | Name, parameter, units, resolution and exact request URL |
| `observations` | Sorted monthly observations |
| `missingCount` | How many observations are `null` |

## 4. Validation (`client/src/data/validateDataset.ts`)

| Raw input | Result |
|---|---|
| Key not in `YYYYMM` form | Ignored |
| Month `13` (POWER annual mean) | Dropped |
| `-999` or header `fill_value` | `null` |
| Not a finite number | `null` |
| Below -90 °C or above 60 °C | `null` (implausible) |
| Units reported and not °C | Whole response rejected |
| No T2M block / no monthly values | Whole response rejected (`DatasetError`) |

Tests: `client/src/tests/datasetValidation.test.ts` (`npm run test:data`).
Test fixtures are small synthetic responses and are not real measurements.

## 5. Selecting data (`client/src/data/selectors.ts`)

- `selectYear(observations, year)` — the months of one year, in order.
- `availableYears(observations)` — years present.
- `meanTemperature(observations)` — mean of non-missing values, or null.

Selectors never fetch data and never keep their own timer or position.

## 6. Fetching (`client/src/services/nasaAPI.ts`)

- `fetchTemperatureSeries(lat, lng, signal?)` returns a validated series.
- Results are cached per location for the browser session.
- Failed requests are not cached, so retrying works.
- Aborting (e.g. location changed) stops the caller from waiting only.

## 7. Joining with sound

The audio engine receives `temperatureC` exactly as stored here.
Pitch uses mapping `t2m-pitch-v1` (see AUDIO_CONTRACT.md), the same for
every location and year. A `null` observation produces no tone.