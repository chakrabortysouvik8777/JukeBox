
const BASE_URL =
  "https://power.larc.nasa.gov/api/temporal/monthly/point";

export interface TemperatureData {
  date: string;
  temperature: number | null;
}

export async function fetchTemperature(
  latitude: number,
  longitude: number
): Promise<TemperatureData[]> {

  const params = new URLSearchParams({
    parameters: "T2M",
    community: "SB",
    longitude: longitude.toString(),
    latitude: latitude.toString(),
    start: "2016",
    end: "2025",
    format: "JSON",
  });

  const url = `${BASE_URL}?${params.toString()}`;

  console.log("NASA API Request:", url);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `NASA API Error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  console.log("NASA API Response:", data);

  const temperatureValues =
    data?.properties?.parameter?.T2M;

  if (!temperatureValues) {
    throw new Error(
      "Temperature data (T2M) not found in NASA response."
    );
  }

  const result: TemperatureData[] = Object.entries(
    temperatureValues
  ).map(([date, value]) => {

    const temperature = Number(value);

    return {
      date,
      temperature:
        !Number.isFinite(temperature) || temperature === -999
          ? null
          : temperature,
    };
  });

  return result;
}
