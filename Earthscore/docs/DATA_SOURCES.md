# DATA_SOURCES — Earth Information Jukebox

All data is fetched live in the browser from public endpoints.
No API keys or credentials are used.

## Used for sound (validated)

### NASA POWER — T2M (monthly)

| Item | Value |
|---|---|
| Provider | NASA Langley Research Center, POWER project |
| Endpoint | `https://power.larc.nasa.gov/api/temporal/monthly/point` |
| Parameter | `T2M` — air temperature at 2 m above the surface |
| Community | `SB` |
| Period requested | 2016–2025 |
| Units | °C |
| Missing value | `-999` (also read from `header.fill_value`) |
| Extra key | Month `13` = annual mean (dropped by the app) |
| Spatial meaning | Value of POWER's gridded product at the requested point; not a station measurement |
| Code | `client/src/services/nasaAPI.ts`, validated by `client/src/data/validateDataset.ts` |

## Shown in panels (not used for sound yet)

| Panel | Source | Endpoint | Code |
|---|---|---|---|
| Current weather | Open-Meteo forecast API (not NASA) | `https://api.open-meteo.com/v1/forecast` | `services/currentWeatherAPI.ts` |
| Vegetation (NDVI) | NASA MODIS MOD13Q1 via ORNL DAAC web service | `https://modis.ornl.gov/rst/api/v1` | `services/vegetationAPI.ts` |
| Greenhouse gases | NOAA GML global monthly CO₂ and CH₄ (not NASA) | `https://gml.noaa.gov/webdata/ccgg/trends/` | `services/greenhouseGasAPI.ts` |
| Population | WorldPop API (not NASA) | `https://api.worldpop.org/v3/point` | `services/populationAPI.ts` |

## Offline backup

`client/public/data/power-t2m-snapshot.json` holds saved NASA POWER T2M responses
for the six preset locations. It is created by `npm run snapshot` (script:
`client/scripts/makeSnapshot.mjs`) and used only when the live API fails.
Re-run the script if the presets change. Do not edit the file by hand.

## Known limitations

- Live APIs can be slow or unavailable. For temperature, the preset locations fall back to the saved snapshot; other locations and other panels show an error message instead of fake values.
- `client/src/data/demoData.ts` contains illustrative values. They must not be presented as measurements.
- The "Surface Temp" sensor card label says GISTEMP v4, but the app uses NASA POWER T2M. The label should be corrected (M1).