
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

export async function fetchPopulation(
  lat: number,
  lng: number
): Promise<PopulationData> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    year: "2025",
  });

  const response = await fetch(
    `https://api.worldpop.org/v3/point?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch population data.");
  }

  const result = await response.json();

  if (result.population === null || result.population === undefined) {
    throw new Error("No population data available for this location.");
  }

  const cellArea = Number(result.cell_area_km2);
  const population = Number(result.population);

  return {
    population,
    cell_area_km2: cellArea,
    data_year: Number(result.data_year),
    country: result.country,
    unit: result.unit,
    iso3: result.iso3,
    lat: Number(result.lat),
    lon: Number(result.lon),
    density_per_km2: cellArea > 0 ? population / cellArea : 0,
  };
}
