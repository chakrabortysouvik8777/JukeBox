
export interface GasObservation {
  date: string;
  value: number;
}

export interface GreenhouseGasData {
  co2: GasObservation[];
  methane: GasObservation[];
  latestCO2: GasObservation;
  latestMethane: GasObservation;
}

const CO2_URL =
  "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_gl.csv";

const CH4_URL =
  "https://gml.noaa.gov/webdata/ccgg/trends/ch4/ch4_mm_gl.csv";

// NOAA CSV files contain comment lines beginning with #.
// Columns: year, month, decimal date, average, uncertainty, trend, ...
function parseNOAACSV(csv: string): GasObservation[] {
  return csv
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const columns = line.split(",").map((value) => value.trim());

      const year = Number(columns[0]);
      const month = Number(columns[1]);
      const value = Number(columns[3]);

      if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(value) ||
        month < 1 ||
        month > 12 ||
        value <= 0
      ) {
        return null;
      }

      return {
        date: `${year}-${String(month).padStart(2, "0")}`,
        value,
      };
    })
    .filter((item): item is GasObservation => item !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchCSV(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch NOAA data (${response.status}).`);
  }

  return response.text();
}

export async function fetchGreenhouseGases(): Promise<GreenhouseGasData> {
  const [co2CSV, methaneCSV] = await Promise.all([
    fetchCSV(CO2_URL),
    fetchCSV(CH4_URL),
  ]);

  const co2 = parseNOAACSV(co2CSV);
  const methane = parseNOAACSV(methaneCSV);

  if (!co2.length || !methane.length) {
    throw new Error("NOAA returned no valid greenhouse-gas observations.");
  }

  return {
    co2,
    methane,
    latestCO2: co2[co2.length - 1],
    latestMethane: methane[methane.length - 1],
  };
}
