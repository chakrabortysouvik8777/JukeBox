
export interface PopulationData {
  population: number;
  cell_area_km2: number;
  data_year: number;
  country: string;
  unit: string;
  iso3: string;
  lat: number;
  lon: number;
  density_per_km2: number;
}

// WorldPop uses large negative numbers (e.g. −99999) for "no data".
function finiteNonNegative(value: unknown): number | null {
  // null / "" / booleans must not become 0 (Number(null) === 0).
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Check a WorldPop point response. Throws if the population is missing,
 * negative (no-data value, e.g. ocean) or not a number. Density is only
 * computed when the cell area is a valid positive number.
 */
export function parsePopulation(result: unknown): PopulationData {
  const r = (result ?? {}) as Record<string, unknown>;

  const population = finiteNonNegative(r.population);
  if (population === null) {
    throw new Error("No population data available for this location (e.g. ocean or no-data cell).");
  }

  const cellArea = finiteNonNegative(r.cell_area_km2);
  const year = Number(r.data_year);

  return {
    population,
    cell_area_km2: cellArea !== null && cellArea > 0 ? cellArea : NaN,
    data_year: Number.isInteger(year) ? year : NaN,
    country: typeof r.country === "string" ? r.country : "Unknown",
    unit: typeof r.unit === "string" ? r.unit : "Unknown",
    iso3: typeof r.iso3 === "string" ? r.iso3 : "",
    lat: Number(r.lat),
    lon: Number(r.lon),
    density_per_km2:
      cellArea !== null && cellArea > 0 ? population / cellArea : NaN,
  };
}

export async function fetchPopulation(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<PopulationData> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    year: "2025",
  });

  const response = await fetch(
    `https://api.worldpop.org/v3/point?${params.toString()}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("Unable to fetch population data.");
  }

  return parsePopulation(await response.json());
}
