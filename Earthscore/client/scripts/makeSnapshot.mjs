// Saves NASA POWER T2M data for the preset locations into
// public/data/power-t2m-snapshot.json, so the demo still works
// if NASA is slow or offline.
//
// Run from the client folder:  npm run snapshot
// Re-run whenever preset locations change.

import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL =
  process.env.POWER_BASE_URL ??
  "https://power.larc.nasa.gov/api/temporal/monthly/point";

// Keep in sync with the presets in src/components/globe/GlobePanel.tsx.
const PRESETS = [
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Svalbard", lat: 78.2232, lng: 15.6469 },
  { name: "Amazon", lat: -3.4653, lng: -62.2159 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Sahara", lat: 23.4162, lng: 25.6628 },
  { name: "Tuvalu", lat: -7.1095, lng: 177.6493 },
];

const OUTPUT = new URL("../public/data/power-t2m-snapshot.json", import.meta.url);

// Must match buildTemperatureUrl() in src/services/nasaAPI.ts.
function buildUrl(lat, lng) {
  const params = new URLSearchParams({
    parameters: "T2M",
    community: "SB",
    longitude: lng.toFixed(4),
    latitude: lat.toFixed(4),
    start: "2016",
    end: "2025",
    format: "JSON",
  });
  return `${BASE_URL}?${params.toString()}`;
}

// Must match locationKey() in src/data/validateDataset.ts.
function locationKey(lat, lng) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

const entries = {};
let failures = 0;

for (const preset of PRESETS) {
  const url = buildUrl(preset.lat, preset.lng);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const t2m = json?.properties?.parameter?.T2M;
    if (!t2m || typeof t2m !== "object") throw new Error("no T2M values");

    // Keep only what the app needs, to keep the file small.
    entries[locationKey(preset.lat, preset.lng)] = {
      name: preset.name,
      url,
      response: {
        header: { fill_value: json?.header?.fill_value ?? -999 },
        parameters: { T2M: { units: json?.parameters?.T2M?.units ?? "C" } },
        properties: { parameter: { T2M: t2m } },
      },
    };

    console.log(`OK    ${preset.name} (${Object.keys(t2m).length} values)`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${preset.name}: ${error.message}`);
  }
}

if (Object.keys(entries).length === 0) {
  console.error("No data downloaded. Snapshot not written.");
  process.exit(1);
}

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });

await writeFile(
  OUTPUT,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      note: "Saved NASA POWER responses (T2M, monthly). Real data, used only when the live API fails.",
      entries,
    },
    null,
    2,
  ) + "\n",
);

console.log(`\nSaved ${Object.keys(entries).length} locations to public/data/power-t2m-snapshot.json`);
if (failures > 0) {
  console.log(`${failures} location(s) failed. Run again to retry.`);
  process.exit(1);
}