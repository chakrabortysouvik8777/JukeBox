
export interface VegetationObservation {
  date: string;
  ndvi: number;
}

export interface VegetationData {
  observations: VegetationObservation[];
  latestNDVI: number;
  latestDate: string;
  condition: string;
  // Quality report for the requested composites.
  requestedCount: number; // composites asked for (up to 10)
  excludedCount: number; // dropped: fill value, snow/ice, cloud, no data
  gridSize: string; // e.g. "9 × 9 pixels"
}

export interface ModisDate {
  modis_date: string;
  calendar_date: string;
}

interface ModisDatesResponse {
  dates: ModisDate[];
}

interface ModisBand {
  band: string;
  data: number[];
  modis_date: string;
}

interface ModisSubsetResponse {
  nrows?: number;
  ncols?: number;
  subset: ModisBand[];
}

// MOD13Q1 NDVI: valid range −2000…10000 (scale 0.0001); −3000 = fill.
const NDVI_MIN = -2000;
const NDVI_MAX = 10000;

// Pixel reliability: 0 = good, 1 = marginal (both usable);
// −1 = fill/no data, 2 = snow/ice, 3 = cloudy (not usable).
const USABLE_RELIABILITY = new Set([0, 1]);

export interface CenterSeries {
  observations: VegetationObservation[];
  excludedCount: number;
  gridSize: string;
}

/**
 * Pick the centre pixel (the selected point) from an ORNL MODIS subset and
 * keep only valid, reliable NDVI values. The grid size is read from the
 * response (nrows × ncols) and checked against each band's data length.
 */
export function extractCenterSeries(
  subset: ModisSubsetResponse,
  dates: readonly ModisDate[],
): CenterSeries {
  const nrows = Number(subset.nrows);
  const ncols = Number(subset.ncols);

  if (
    !Number.isInteger(nrows) || !Number.isInteger(ncols) ||
    nrows < 1 || ncols < 1 || nrows % 2 === 0 || ncols % 2 === 0
  ) {
    throw new Error("MODIS response has an unexpected pixel grid.");
  }

  const pixelCount = nrows * ncols;
  const center = Math.floor(nrows / 2) * ncols + Math.floor(ncols / 2);

  const observations: VegetationObservation[] = [];
  let excludedCount = 0;

  for (const date of dates) {
    const ndviBand = subset.subset.find(
      (item) => item.band === NDVI_BAND && item.modis_date === date.modis_date,
    );
    const reliabilityBand = subset.subset.find(
      (item) => item.band === RELIABILITY_BAND && item.modis_date === date.modis_date,
    );

    const raw = ndviBand?.data.length === pixelCount ? ndviBand.data[center] : undefined;
    const reliability =
      reliabilityBand?.data.length === pixelCount ? reliabilityBand.data[center] : undefined;

    const usable =
      typeof raw === "number" &&
      Number.isFinite(raw) &&
      raw >= NDVI_MIN &&
      raw <= NDVI_MAX &&
      reliability !== undefined &&
      USABLE_RELIABILITY.has(reliability);

    if (!usable) {
      excludedCount += 1;
      continue;
    }

    observations.push({
      date: date.calendar_date,
      ndvi: Number((raw * 0.0001).toFixed(3)),
    });
  }

  return { observations, excludedCount, gridSize: `${nrows} × ${ncols} pixels` };
}

const BASE_URL = "https://modis.ornl.gov/rst/api/v1";
const NDVI_BAND = "250m_16_days_NDVI";
const RELIABILITY_BAND = "250m_16_days_pixel_reliability";

// Interpret NDVI as a broad indicator, not a universal land-cover classification.
function getCondition(ndvi: number): string {
  if (ndvi < 0) return "Water, snow or non-vegetated surface";
  if (ndvi < 0.2) return "Very sparse vegetation";
  if (ndvi < 0.4) return "Sparse to moderate vegetation";
  if (ndvi < 0.6) return "Moderate to healthy vegetation";
  return "Dense green vegetation";
}

export async function fetchVegetation(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<VegetationData> {
  const coordinates = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
  });

  // Get available MODIS composite dates for this location.
  const datesResponse = await fetch(
  `${BASE_URL}/MOD13Q1/dates?${coordinates.toString()}`,
  { signal }
);

  if (!datesResponse.ok) {
    throw new Error("Could not retrieve MODIS observation dates.");
  }

  const datesResult: ModisDatesResponse = await datesResponse.json();

  if (!datesResult.dates?.length) {
    throw new Error("No vegetation observations found for this location.");
  }

  // Keep the latest 10 available observations.
  const availableDates = [...datesResult.dates]
    .sort((a, b) => a.modis_date.localeCompare(b.modis_date));

  const recentDates = availableDates.slice(-10);
  const startDate = recentDates[0].modis_date;
  const endDate = recentDates[recentDates.length - 1].modis_date;

  const subsetParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    startDate,
    endDate,
    kmAboveBelow: "1",
    kmLeftRight: "1",
  });

  const subsetResponse = await fetch(
  `${BASE_URL}/MOD13Q1/subset?${subsetParams.toString()}`,
  { signal }
);

  if (!subsetResponse.ok) {
    throw new Error("Could not retrieve MODIS vegetation data.");
  }

  const subsetResult: ModisSubsetResponse =
    await subsetResponse.json();

  if (!Array.isArray(subsetResult.subset)) {
    throw new Error("MODIS response did not contain vegetation data.");
  }

  const { observations, excludedCount, gridSize } = extractCenterSeries(
    subsetResult,
    recentDates,
  );

  if (observations.length === 0) {
    throw new Error(
      "No reliable NDVI observations are available for this location."
    );
  }

  const latest = observations[observations.length - 1];

  return {
    observations,
    latestNDVI: latest.ndvi,
    latestDate: latest.date,
    condition: getCondition(latest.ndvi),
    requestedCount: recentDates.length,
    excludedCount,
    gridSize,
  };
}
