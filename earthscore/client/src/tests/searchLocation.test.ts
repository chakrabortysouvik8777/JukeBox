import { afterEach, describe, expect, it, vi } from "vitest";

import { parseCoordinates, searchLocation } from "../utils/searchLocation";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseCoordinates", () => {
  it("parses valid latitude and longitude", () => {
    expect(parseCoordinates("22.5726, 88.3639")).toEqual({
      name: "22.5726, 88.3639",
      country: "Coordinates",
      lat: 22.5726,
      lng: 88.3639,
    });
  });

  it("rejects out-of-range and non-coordinate input", () => {
    expect(parseCoordinates("91, 0")).toBeNull();
    expect(parseCoordinates("0, -181")).toBeNull();
    expect(parseCoordinates("Kolkata")).toBeNull();
  });
});

describe("searchLocation", () => {
  it("uses geocoding results for place names", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "22.5726",
          lon: "88.3639",
          display_name: "Kolkata, West Bengal, India",
          address: { city: "Kolkata", country: "India" },
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchLocation("Kolkata", new AbortController().signal),
    ).resolves.toEqual({
      name: "Kolkata",
      country: "India",
      lat: 22.5726,
      lng: 88.3639,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not call geocoding for coordinates", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchLocation("22.5, 88.3", new AbortController().signal),
    ).resolves.toMatchObject({ lat: 22.5, lng: 88.3 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
