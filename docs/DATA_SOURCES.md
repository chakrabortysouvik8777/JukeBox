# DATA_SOURCES — Earth Information Jukebox

All data is fetched live in the browser from public endpoints.
No API keys or credentials are used. There is no backend and no Python
pipeline (the unused `data-pipeline/` folder was removed).

## Used for sound (validated)

### NASA POWER — T2M (monthly)

| Item | Value |
|---|---|
| Provider | NASA Langley Research Center, POWER project |
| Endpoint | `https://power.larc.nasa.gov/api/temporal/monthly/point` |
| Parameter | `T2M` — monthly mean air temperature at 2 m above the ground |
| Community | `SB` |
| Period requested | 2016–2025 |
| Units | °C |
| Missing value | `-999` (also read from `header.fill_value`) → missing, never 0 |
| Extra key | Month `13` = annual mean (dropped) |
| Absent months | Inserted as missing, so timing stays even |
| Spatial meaning | Value of POWER's gridded product at the requested point; not a station measurement |
| Timeout | 15 s, then the saved snapshot (preset locations only) |
| Code | `services/nasaAPI.ts`, validated by `data/validateDataset.ts` |

### NASA POWER — PRECTOTCORR (monthly rainfall)

| Item | Value |
|---|---|
| Endpoint | same as T2M, `parameters=PRECTOTCORR` |
| Parameter | `PRECTOTCORR` — bias-corrected precipitation, monthly mean |
| Units | mm/day (response units checked; other units rejected) |
| Valid range | 0 … 200 mm/day; outside → missing. A real 0 (dry month) stays 0 |
| Missing value, month 13, absent months | same rules as T2M |
| Timeout / backup | 15 s, then the saved snapshot if it contains PRECTOTCORR |
| Code | `services/monthlySeries.ts`, `parsePowerMonthly()` in `data/validateDataset.ts` |

### NOAA GML — global monthly CO₂ and CH₄ (not NASA)

| Item | Value |
|---|---|
| Files | `co2_mm_gl.csv` (ppm), `ch4_mm_gl.csv` (ppb) from `gml.noaa.gov/webdata/ccgg/trends/` |
| Meaning | Global monthly mean of the atmosphere — the same for every location |
| Period | 2016-01 to the latest month NOAA has published (≤ 2025-12); months before the first value or between values are missing |
| Code | `services/greenhouseGasAPI.ts`, `gasSeries()` in `services/monthlySeries.ts` |

### Not sonified (yet)

| Data | Reason |
|---|---|
| Air quality | Panel shows a current model value, not a monthly series. NASA POWER aerosol optical depth is a candidate, not yet verified. |
| Vegetation (NDVI) | About 23 MODIS requests per location for 10 years — too slow live. |
| Population | One value per year, not monthly. |

## Shown in panels

| Panel | Source | Endpoint | Checks in the app |
|---|---|---|---|
| Current weather | Open-Meteo forecast API (model, not NASA) | `api.open-meteo.com/v1/forecast` | Labelled as a current model estimate |
| Air quality | Open-Meteo air-quality API (model, not NASA) | `air-quality-api.open-meteo.com` | Missing/invalid values shown as "N/A" |
| Rainfall | Open-Meteo historical API, ERA5 / ERA5-Land reanalysis (not NASA) | `archive-api.open-meteo.com/v1/archive` | Years with < 95 % of days are flagged and excluded from the average and the comparison; "last 30 days" = last 30 calendar days of the data, with dates and gap count; soil moisture shown with its date; data date range shown (`data/rainfall.ts`) |
| Vegetation (NDVI) | NASA MODIS MOD13Q1 (250 m, 16-day) via ORNL DAAC | `modis.ornl.gov/rst/api/v1` | Centre pixel computed from the reported grid (`nrows × ncols`); band length checked; NDVI kept only in −2000…10000 and with pixel reliability 0 (good) or 1 (marginal); excluded composites counted and shown |
| Greenhouse gases | NOAA GML global monthly CO₂ and CH₄ (not NASA) | `gml.noaa.gov/webdata/ccgg/trends/` | Labelled as global averages, not values for the selected point |
| Population | WorldPop (modelled estimate, not NASA) | `api.worldpop.org/v3/point` | Missing / negative (no-data) values rejected; density only with a valid cell area; cell size shown from the data |

## Offline backup

`client/public/data/power-t2m-snapshot.json` holds saved NASA POWER T2M
and PRECTOTCORR responses for the six preset locations (re-run
`npm run snapshot` once so the file also contains rainfall). It is created by `npm run snapshot`
(script: `client/scripts/makeSnapshot.mjs`) and used only when the live API
fails. The app says when saved data is shown and when it was downloaded.
Re-run the script if the presets change. Do not edit the file by hand.

## Known limitations

- Live APIs can be slow or unavailable. For temperature, preset locations fall back to the snapshot; other locations and other panels show an error instead of fake values.
- The globe badge compares the selected year with the average of complete years 2016–2025 at that point. It is not an official climate anomaly (30-year baseline). Years with a missing month show "NO FULL YEAR".
