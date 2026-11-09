
interface LocationResult {
  name: string;
  city: string;
  state: string;
  country: string;
  displayName: string;
}

export async function getPlaceName(
  latitude: number,
  longitude: number
): Promise<LocationResult | null> {

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch location");
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      name: data.name || address.city || address.town ||
            address.village || address.state || "Unknown place",
      city: address.city || address.town || address.village || "",
      state: address.state || "",
      country: address.country || "",
      displayName: data.display_name || ""
    };

  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
