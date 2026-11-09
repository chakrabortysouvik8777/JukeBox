
export interface VegetationObservation {
  date: string;
  ndvi: number;
}

export interface VegetationData {
  observations: VegetationObservation[];
  latestNDVI: number;
  latestDate: string;
  condition: string;
}

interface ModisDate {
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
  subset: ModisBand[];
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

  const observations: VegetationObservation[] = [];

  // The API returns a 9 x 9 pixel subset.
  // Index 40 is the centre pixel (the selected coordinate).
  const centerPixel = 40;

  for (const date of recentDates) {
    const ndviBand = subsetResult.subset.find(
      (item) =>
        item.band === NDVI_BAND &&
        item.modis_date === date.modis_date
    );

    const reliabilityBand = subsetResult.subset.find(
      (item) =>
        item.band === RELIABILITY_BAND &&
        item.modis_date === date.modis_date
    );

    if (!ndviBand || ndviBand.data.length <= centerPixel) {
      continue;
    }

    const rawNDVI = ndviBand.data[centerPixel];

    // Exclude invalid fill values.
    if (!Number.isFinite(rawNDVI) || rawNDVI < -2000 || rawNDVI > 10000) {
      continue;
    }

    // Reliability 0 = good, 1 = marginal.
    // Skip pixels marked as snow/ice, cloudy or otherwise unusable.
    const reliability = reliabilityBand?.data[centerPixel];

    if (reliability !== undefined && reliability > 1) {
      continue;
    }

    observations.push({
      date: date.calendar_date,
      ndvi: Number((rawNDVI * 0.0001).toFixed(3)),
    });
  }

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
  };
}
