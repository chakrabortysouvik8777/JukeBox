import type { Location } from "../types/location";

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export function parseCoordinates(query: string): Location | null {
  const match = query.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );

  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {
    name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    country: "Coordinates",
    lat,
    lng,
  };
}

export async function searchLocation(
  query: string,
  signal: AbortSignal,
): Promise<Location | null> {
  const coordinates = parseCoordinates(query);
  if (coordinates) return coordinates;

  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    q: query,
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(`Location search failed (${response.status}).`);
  }

  const results = (await response.json()) as GeocodingResult[];
  const result = results[0];
  if (!result) return null;

  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error("Location search returned invalid coordinates.");
  }

  const address = result.address;
  const name =
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    address?.county ??
    address?.state ??
    result.display_name.split(",")[0];

  return {
    name,
    country: address?.country ?? "Unknown region",
    lat,
    lng,
  };
}
