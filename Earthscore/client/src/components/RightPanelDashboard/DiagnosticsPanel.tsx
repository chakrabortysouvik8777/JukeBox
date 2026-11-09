
import { useState } from "react";

import type { Location } from "../../types/location";

import TemperaturePanel from "../TemparatureAPI/TemparaturePanel";
import AirQualityPanel from "../AirQuality/AirQualityPanel";
import RainfallHydroPanel from "../RainfallHydro/RainfallHydroPanel";
import PopulationPanel from "../Population/PopulationPanel";
import VegetationPanel from "../Vegetation/VegetationPanel";
import GreenhouseGasPanel from "../GreenhouseGases/GreenhouseGasPanel";

import "./DiagnosticsPanel.css";

// Environmental data categories
type DataCategory =
  | "temperature"
  | "air"
  | "rainfall"
  | "vegetation"
  | "gases"
  | "population";

// Category button information
const dataCategories: {
  id: DataCategory;
  label: string;
  icon: string;
}[] = [
  {
    id: "temperature",
    label: "Temperature",
    icon: "🌡️",
  },
  {
    id: "air",
    label: "Air Quality",
    icon: "🌫️",
  },
  {
    id: "rainfall",
    label: "Rainfall & Hydro",
    icon: "🌧️",
  },
  {
    id: "vegetation",
    label: "Vegetation",
    icon: "🌳",
  },
  {
    id: "gases",
    label: "Greenhouse Gases",
    icon: "☁️",
  },
  {
    id: "population",
    label: "Population",
    icon: "👥",
  },
];

// Component props
interface DiagnosticPanelProps {
  selectedLocation: Location;
}

const DiagnosticPanel = ({
  selectedLocation,
}: DiagnosticPanelProps) => {

  // Currently selected environmental category
  const [selectedData, setSelectedData] =
    useState<DataCategory>("temperature");

  return (
    <section className="diagnostic-panel">

      {/* Dashboard Header */}
      <div className="diagnostic-header">

        <div className="diagnostic-top">
          <span>REGIONAL DIAGNOSTIC PORTAL</span>

          <span className="coordinate-system">
            WGS84 EPSG:4326
          </span>
        </div>

        <h1>
          {selectedLocation.name === "Selected Location"
            ? "Custom Region"
            : selectedLocation.name}
          , {selectedLocation.country} — Environmental Assessment
        </h1>

        <p className="diagnostic-description">
          Explore environmental indicators using satellite
          observations and environmental datasets.
        </p>

        <div className="location-coordinates">
          LAT: {selectedLocation.lat.toFixed(4)}° |
          LNG: {selectedLocation.lng.toFixed(4)}°
        </div>

      </div>

      {/* Environmental Data Explorer */}
      <div className="data-explorer">

        <div className="data-explorer-header">

          <div>
            <h2>EARTH DATA EXPLORER</h2>

            <p>
              Select one environmental parameter to explore
            </p>
          </div>

          <span className="data-count">
            06 PARAMETERS
          </span>

        </div>

        {/* Category Buttons */}
        <div className="data-category-selector">

          {dataCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`data-category-btn ${
                selectedData === category.id ? "active" : ""
              }`}
              onClick={() => setSelectedData(category.id)}
              aria-pressed={selectedData === category.id}
            >
              <span className="category-icon">
                {category.icon}
              </span>

              <span>{category.label}</span>
            </button>
          ))}

        </div>

      </div>

      {/* Selected Environmental Data */}
      <div className="selected-data-content">

        {/* 1. Temperature */}
        {selectedData === "temperature" && (
          <div className="correlation-section">

            <TemperaturePanel
              latitude={selectedLocation.lat}
              longitude={selectedLocation.lng}
            />

          </div>
        )}

        {/* 2. Air Quality */}
        {selectedData === "air" && (
          <div className="correlation-section">

            <AirQualityPanel
              latitude={selectedLocation.lat}
              longitude={selectedLocation.lng}
            />

          </div>
        )}

        {/* 3. Rainfall and Hydrology */}
        {selectedData === "rainfall" && (
          <div className="correlation-section">

            <RainfallHydroPanel
              latitude={selectedLocation.lat}
              longitude={selectedLocation.lng}
            />

          </div>
        )}

        {/* 4. Vegetation */}
        {selectedData === "vegetation" && (
          <div className="correlation-section">

            <VegetationPanel
              selectedLocation={selectedLocation}
            />

          </div>
        )}

        {/* 5. Greenhouse Gases */}
        {selectedData === "gases" && (
          <div className="correlation-section">

            <GreenhouseGasPanel
              selectedLocation={selectedLocation}
            />

          </div>
        )}

        {/* 6. Population */}
        {selectedData === "population" && (
          <div className="correlation-section">

            <PopulationPanel
              selectedLocation={selectedLocation}
            />

          </div>
        )}

      </div>

      {/* Data Sources Disclaimer */}
      <div className="data-disclaimer">

        Temperature: Open-Meteo Current Weather API |
        Air Quality: Open-Meteo |
        Rainfall: Open-Meteo Historical Weather API |
        Vegetation: NASA MODIS via ORNL DAAC |
        Greenhouse Gases: NOAA GML |
        Population: WorldPop

      </div>

    </section>
  );
};

export default DiagnosticPanel;
