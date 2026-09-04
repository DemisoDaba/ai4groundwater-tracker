"use client";

import { useEffect, useState } from "react";
import "./kulfogw.css";

type LocationResult = {
  latitude: number;
  longitude: number;
  value: number | null;
  interpretation: string;
};

type Zone = {
  id: number;
  name: string;
  threshold: string;
  pixels: number;
  percentage: number;
};

type ZonesResult = {
  zones: Zone[];
  total_pixels: number;
};

type HotspotZone = {
  pixels: number;
  percentage: number;
};

type HotspotResults = {
  "Very High Depletion": HotspotZone;
  "High Depletion": HotspotZone;
  "Moderate / Near Reference": HotspotZone;
  "High Recharge": HotspotZone;
  "Very High Recharge": HotspotZone;
  "Reference condition": {
    "Wet season": string;
    "Dry season": string;
  };
  "Dominant spatial zone": string;
};

type HotspotsResult = {
  results: HotspotResults;
  interpretation: string;
};

export default function KulfoGWPage() {
  const [activeSection, setActiveSection] = useState("overview");

  /* =====================================================
     LOCATION QUERY
  ====================================================== */

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [result, setResult] =
    useState<LocationResult | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================================================
     GROUNDWATER MAP
  ====================================================== */

  const [mapImage, setMapImage] = useState("");
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");

  /* =====================================================
     GROUNDWATER ZONES
  ====================================================== */

  const [zones, setZones] =
    useState<ZonesResult | null>(null);

  const [zonesLoading, setZonesLoading] =
    useState(false);

  const [zonesError, setZonesError] =
    useState("");

  /* =====================================================
     HOTSPOTS & PATTERNS
  ====================================================== */

  const [hotspots, setHotspots] =
    useState<HotspotsResult | null>(null);

  const [hotspotsLoading, setHotspotsLoading] =
    useState(false);

  const [hotspotsError, setHotspotsError] =
    useState("");

  /* =====================================================
     LOCATION QUERY FUNCTION
  ====================================================== */

  async function queryLocation() {
    setError("");
    setResult(null);

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      !latitude ||
      !longitude ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      setError(
        "Please enter valid latitude and longitude."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/kulfogw/location",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: lat,
            longitude: lon,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to query location."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to query groundwater data."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     GROUNDWATER MAP FUNCTION
  ====================================================== */

  async function loadGroundwaterMap() {
    setMapError("");
    setMapImage("");
    setMapLoading(true);

    try {
      const response = await fetch(
        "/api/kulfogw/map",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          data?.error ||
            "Unable to load groundwater map."
        );
      }

      const blob = await response.blob();

      if (!blob.type.includes("image/png")) {
        throw new Error(
          "The KulfoGW map was not returned as a PNG image."
        );
      }

      const imageUrl =
        URL.createObjectURL(blob);

      setMapImage(imageUrl);
    } catch (err) {
      setMapError(
        err instanceof Error
          ? err.message
          : "Unable to load groundwater map."
      );
    } finally {
      setMapLoading(false);
    }
  }

  /* =====================================================
     LOAD GROUNDWATER ZONES
  ====================================================== */

  async function loadGroundwaterZones() {
    setZonesError("");
    setZonesLoading(true);

    try {
      const response = await fetch(
        "/api/kulfogw/zones",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load groundwater zones."
        );
      }

      setZones(data);
    } catch (err) {
      setZonesError(
        err instanceof Error
          ? err.message
          : "Unable to load groundwater zones."
      );
    } finally {
      setZonesLoading(false);
    }
  }

  /* =====================================================
     LOAD HOTSPOTS
  ====================================================== */

  async function loadHotspots() {
    setHotspotsError("");
    setHotspotsLoading(true);

    try {
      const response = await fetch(
        "/api/kulfogw/hotspots",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load groundwater hotspots."
        );
      }

      setHotspots(data);
    } catch (err) {
      setHotspotsError(
        err instanceof Error
          ? err.message
          : "Unable to load groundwater hotspots."
      );
    } finally {
      setHotspotsLoading(false);
    }
  }

  /* =====================================================
     LOAD DATA WHEN SECTION IS OPENED
  ====================================================== */

  useEffect(() => {
    if (
      activeSection === "zones" &&
      !zones &&
      !zonesLoading
    ) {
      loadGroundwaterZones();
    }

    if (
      activeSection === "hotspots" &&
      !hotspots &&
      !hotspotsLoading
    ) {
      loadHotspots();
    }
  }, [activeSection]);

  return (
    <main className="kulfogw-page">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="kulfogw-sidebar">

        <div className="kulfogw-brand">

          <div className="kulfogw-logo">
            K
          </div>

          <div>
            <h1>KulfoGW</h1>
            <span>Groundwater Analysis</span>
          </div>

        </div>

        <nav className="kulfogw-nav">

          <div className="nav-section">

            <div className="nav-title">
              SPATIAL GROUNDWATER
            </div>

            <button
              className={`nav-item ${
                activeSection === "overview"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("overview")
              }
            >
              <span>◉</span>
              Overview
            </button>

            <button
              className={`nav-item ${
                activeSection === "location"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("location")
              }
            >
              <span>⌖</span>
              Location Query
            </button>

            <button
              className={`nav-item ${
                activeSection === "map"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("map")
              }
            >
              <span>▧</span>
              Groundwater Map
            </button>

            <button
              className={`nav-item ${
                activeSection === "zones"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("zones")
              }
            >
              <span>◫</span>
              Groundwater Zones
            </button>

            <button
              className={`nav-item ${
                activeSection === "hotspots"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("hotspots")
              }
            >
              <span>◈</span>
              Hotspots & Patterns
            </button>

          </div>

          <div className="nav-section">

            <div className="nav-title">
              TEMPORAL GROUNDWATER
            </div>

            <button
              className="nav-item disabled"
              disabled
            >
              <span>◷</span>
              Overview
              <small>Later</small>
            </button>

            <button
              className="nav-item disabled"
              disabled
            >
              <span>⌁</span>
              Time Series
              <small>Later</small>
            </button>

            <button
              className="nav-item disabled"
              disabled
            >
              <span>↗</span>
              Trends
              <small>Later</small>
            </button>

          </div>

        </nav>

        <div className="kulfogw-sidebar-footer">

          <span className="status-dot"></span>

          Spatial module active

        </div>

      </aside>

      {/* =====================================================
          RIGHT CONTENT
      ====================================================== */}

      <section className="kulfogw-content">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="kulfogw-header">

          <div>

            <div className="breadcrumb">
              AI4Groundwater / KulfoGW
            </div>

            <h2>
              Spatial Groundwater
            </h2>

            <p>
              High-resolution groundwater analysis
              for the Kulfo Watershed.
            </p>

          </div>

          <div className="header-badge">

            <span></span>

            30 m Spatial Model

          </div>

        </header>

        {/* =====================================================
            OVERVIEW
        ====================================================== */}

        {activeSection === "overview" && (

          <div className="kulfogw-overview">

            <div className="welcome-card">

              <div className="welcome-icon">
                K
              </div>

              <div>

                <h3>
                  Kulfo Groundwater Analysis
                </h3>

                <p>
                  Explore spatial groundwater
                  conditions, query individual
                  locations, view groundwater zones,
                  and identify spatial hotspots and
                  patterns.
                </p>

              </div>

            </div>

            <div className="module-grid">

              <button
                className="module-card"
                onClick={() =>
                  setActiveSection("location")
                }
              >

                <div className="module-icon">
                  ⌖
                </div>

                <div>

                  <h3>
                    Location Query
                  </h3>

                  <p>
                    Query groundwater conditions at
                    a specific location.
                  </p>

                </div>

                <span className="arrow">
                  →
                </span>

              </button>

              <button
                className="module-card"
                onClick={() =>
                  setActiveSection("map")
                }
              >

                <div className="module-icon">
                  ▧
                </div>

                <div>

                  <h3>
                    Groundwater Map
                  </h3>

                  <p>
                    View the 30 m groundwater
                    anomaly distribution.
                  </p>

                </div>

                <span className="arrow">
                  →
                </span>

              </button>

              <button
                className="module-card"
                onClick={() =>
                  setActiveSection("zones")
                }
              >

                <div className="module-icon">
                  ◫
                </div>

                <div>

                  <h3>
                    Groundwater Zones
                  </h3>

                  <p>
                    View spatial groundwater
                    condition classes.
                  </p>

                </div>

                <span className="arrow">
                  →
                </span>

              </button>

              <button
                className="module-card"
                onClick={() =>
                  setActiveSection("hotspots")
                }
              >

                <div className="module-icon">
                  ◈
                </div>

                <div>

                  <h3>
                    Hotspots & Patterns
                  </h3>

                  <p>
                    Explore major spatial
                    groundwater patterns.
                  </p>

                </div>

                <span className="arrow">
                  →
                </span>

              </button>

            </div>

            <div className="info-section">

              <div className="info-card">

                <span className="info-label">
                  STUDY AREA
                </span>

                <strong>
                  Kulfo Watershed
                </strong>

              </div>

              <div className="info-card">

                <span className="info-label">
                  SPATIAL RESOLUTION
                </span>

                <strong>
                  30 m
                </strong>

              </div>

              <div className="info-card">

                <span className="info-label">
                  ANALYSIS TYPE
                </span>

                <strong>
                  Groundwater Anomaly
                </strong>

              </div>

              <div className="info-card">

                <span className="info-label">
                  CURRENT MODULE
                </span>

                <strong>
                  Spatial
                </strong>

              </div>

            </div>

          </div>

        )}

        {/* =====================================================
            LOCATION QUERY
        ====================================================== */}

        {activeSection === "location" && (

          <section className="location-query">

            <div className="query-header">

              <div>

                <span className="section-label">
                  SPATIAL QUERY
                </span>

                <h3>
                  Location Query
                </h3>

                <p>
                  Enter a location to retrieve the
                  predicted groundwater anomaly from
                  the 30 m spatial model.
                </p>

              </div>

            </div>

            <div className="coordinate-form">

              {/* LATITUDE */}

              <div className="coordinate-field">

                <label htmlFor="latitude">
                  Latitude
                </label>

                <input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 6.15"
                  value={latitude}
                  onChange={(e) =>
                    setLatitude(e.target.value)
                  }
                />

                <span>
                  Decimal degrees (° N)
                </span>

              </div>

              {/* LONGITUDE */}

              <div className="coordinate-field">

                <label htmlFor="longitude">
                  Longitude
                </label>

                <input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 37.45"
                  value={longitude}
                  onChange={(e) =>
                    setLongitude(e.target.value)
                  }
                />

                <span>
                  Decimal degrees (° E)
                </span>

              </div>

              {/* QUERY LOCATION */}

              <div className="coordinate-field query-field">

                <label htmlFor="query-location">
                  Query Location
                </label>

                <button
                  id="query-location"
                  className="query-button"
                  onClick={queryLocation}
                  disabled={loading}
                >
                  {loading
                    ? "Querying..."
                    : "Query Location"}
                </button>

                <span>
                  Retrieve the groundwater condition
                  at this location.
                </span>

              </div>

            </div>

            {error && (

              <div className="query-error">

                <strong>
                  Query error
                </strong>

                <p>
                  {error}
                </p>

              </div>

            )}

            {result && (

              <div className="query-result">

                <div className="result-top">

                  <div>

                    <span className="section-label">
                      QUERY RESULT
                    </span>

                    <h3>
                      Groundwater Condition
                    </h3>

                  </div>

                  {/* SELECTED LOCATION */}

                  <div className="result-coordinate">

                    <span className="selected-location-label">
                      Selected Location
                    </span>

                    <strong className="selected-location-coordinates">
                      {result.latitude.toFixed(5)}
                      ° N,&nbsp;&nbsp;
                      {result.longitude.toFixed(5)}
                      ° E
                    </strong>

                  </div>

                </div>

                <div className="result-grid">

                  <div className="result-value-card">

                    <span>
                      Predicted groundwater anomaly
                    </span>

                    <strong>
                      {result.anomaly === null
                        ? "No data"
                        : result.anomaly.toFixed(4)}
                    </strong>

                  </div>

                  <div className="result-interpretation">

                    <span>
                      Interpretation
                    </span>

                    <p>
                      {result.interpretation}
                    </p>

                  </div>

                </div>

              </div>

            )}

          </section>

        )}

        {/* =====================================================
            GROUNDWATER MAP
        ====================================================== */}

        {activeSection === "map" && (

          <section className="groundwater-map">

            <div className="map-header">

              <div>

                <span className="section-label">
                  SPATIAL MAP
                </span>

                <h3>
                  Groundwater Map
                </h3>

                <p>
                  Explore the 30 m groundwater
                  anomaly distribution for the Kulfo
                  Watershed.
                </p>

              </div>

              <button
                className="map-button"
                onClick={loadGroundwaterMap}
                disabled={mapLoading}
              >
                {mapLoading
                  ? "Loading..."
                  : "Load Groundwater Map"}
              </button>

            </div>

            <div className="map-display">

              {!mapImage &&
                !mapError &&
                !mapLoading && (

                  <div className="map-placeholder">

                    <div className="map-placeholder-icon">
                      ▧
                    </div>

                    <h4>
                      Groundwater Spatial Map
                    </h4>

                    <p>
                      Load the 30 m groundwater
                      anomaly map for the Kulfo
                      Watershed.
                    </p>

                  </div>

                )}

              {mapLoading && (

                <div className="map-placeholder">

                  <div className="map-placeholder-icon">
                    ◌
                  </div>

                  <h4>
                    Loading groundwater map...
                  </h4>

                  <p>
                    Loading the Kulfo 30 m spatial
                    groundwater map.
                  </p>

                </div>

              )}

              {mapError && (

                <div className="query-error">

                  <strong>
                    Map error
                  </strong>

                  <p>
                    {mapError}
                  </p>

                </div>

              )}

              {mapImage && (

                <div className="map-image-container">

                  <img
                    src={mapImage}
                    alt="Kulfo 30 m groundwater anomaly map"
                    className="groundwater-map-image"
                  />

                </div>

              )}

            </div>

          </section>

        )}

        {/* =====================================================
            GROUNDWATER ZONES
        ====================================================== */}

        {activeSection === "zones" && (

          <section className="groundwater-zones">

            <div className="query-header">

              <div>

                <span className="section-label">
                  SPATIAL ANALYSIS
                </span>

                <h3>
                  Groundwater Zones
                </h3>

                <p>
                  View spatial groundwater condition
                  classes across the Kulfo Watershed.
                </p>

              </div>

            </div>

            {zonesLoading && (

              <div className="map-placeholder">

                <div className="map-placeholder-icon">
                  ◌
                </div>

                <h4>
                  Loading groundwater zones...
                </h4>

                <p>
                  Calculating the five spatial
                  groundwater condition zones.
                </p>

              </div>

            )}

            {zonesError && (

              <div className="query-error">

                <strong>
                  Zones error
                </strong>

                <p>
                  {zonesError}
                </p>

                <button
                  className="query-button"
                  onClick={loadGroundwaterZones}
                >
                  Try Again
                </button>

              </div>

            )}

            {zones && !zonesLoading && (

              <div className="zones-content">

                <div className="zones-summary">

                  <div className="info-card">

                    <span className="info-label">
                      TOTAL VALID PIXELS
                    </span>

                    <strong>
                      {zones.total_pixels.toLocaleString()}
                    </strong>

                  </div>

                  <div className="info-card">

                    <span className="info-label">
                      SPATIAL RESOLUTION
                    </span>

                    <strong>
                      30 m
                    </strong>

                  </div>

                  <div className="info-card">

                    <span className="info-label">
                      NUMBER OF ZONES
                    </span>

                    <strong>
                      5
                    </strong>

                  </div>

                </div>

                <div className="zones-grid">

                  {zones.zones.map((zone) => (

                    <div
                      className="result-card"
                      key={zone.id}
                    >

                      <span className="section-label">
                        ZONE {zone.id}
                      </span>

                      <h4>
                        {zone.name}
                      </h4>

                      <p>
                        Anomaly threshold:{" "}
                        <strong>
                          {zone.threshold}
                        </strong>
                      </p>

                      <div className="result-grid">

                        <div className="result-value-card">

                          <span>
                            Pixels
                          </span>

                          <strong>
                            {zone.pixels.toLocaleString()}
                          </strong>

                        </div>

                        <div className="result-value-card">

                          <span>
                            Area share
                          </span>

                          <strong>
                            {zone.percentage.toFixed(1)}%
                          </strong>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </section>

        )}

        {/* =====================================================
            HOTSPOTS & PATTERNS
        ====================================================== */}

        {activeSection === "hotspots" && (

          <section className="groundwater-hotspots">

            <div className="query-header">

              <div>

                <span className="section-label">
                  SPATIAL ANALYSIS
                </span>

                <h3>
                  Hotspots & Patterns
                </h3>

                <p>
                  Explore major spatial groundwater
                  patterns across the Kulfo Watershed.
                </p>

              </div>

            </div>

            {hotspotsLoading && (

              <div className="map-placeholder">

                <div className="map-placeholder-icon">
                  ◌
                </div>

                <h4>
                  Analyzing spatial patterns...
                </h4>

                <p>
                  Calculating groundwater depletion,
                  recharge, and near-reference areas.
                </p>

              </div>

            )}

            {hotspotsError && (

              <div className="query-error">

                <strong>
                  Hotspots error
                </strong>

                <p>
                  {hotspotsError}
                </p>

                <button
                  className="query-button"
                  onClick={loadHotspots}
                >
                  Try Again
                </button>

              </div>

            )}

            {hotspots && !hotspotsLoading && (

              <div className="hotspots-content">

                <div className="zones-summary">

                  <div className="info-card">

                    <span className="info-label">
                      DEPLETION ZONES
                    </span>

                    <strong>
                      {(
                        hotspots.results[
                          "Very High Depletion"
                        ].percentage +
                        hotspots.results[
                          "High Depletion"
                        ].percentage
                      ).toFixed(1)}
                      %
                    </strong>

                  </div>

                  <div className="info-card">

                    <span className="info-label">
                      NEAR REFERENCE
                    </span>

                    <strong>
                      {hotspots.results[
                        "Moderate / Near Reference"
                      ].percentage.toFixed(1)}
                      %
                    </strong>

                  </div>

                  <div className="info-card">

                    <span className="info-label">
                      HIGHER STORAGE
                    </span>

                    <strong>
                      {(
                        hotspots.results[
                          "High Recharge"
                        ].percentage +
                        hotspots.results[
                          "Very High Recharge"
                        ].percentage
                      ).toFixed(1)}
                      %
                    </strong>

                  </div>

                </div>

                <div className="query-result">

                  <div className="result-top">

                    <div>

                      <span className="section-label">
                        DOMINANT SPATIAL ZONE
                      </span>

                      <h3>
                        {hotspots.results[
                          "Dominant spatial zone"
                        ]}
                      </h3>

                    </div>

                  </div>

                  <div className="result-interpretation">

                    <span>
                      Spatial pattern interpretation
                    </span>

                    <p>
                      {hotspots.interpretation}
                    </p>

                  </div>

                </div>

                <div className="zones-grid">

                  <div className="result-card">

                    <span className="section-label">
                      DEPLETION
                    </span>

                    <h4>
                      Very High Depletion
                    </h4>

                    <p>
                      {hotspots.results[
                        "Very High Depletion"
                      ].pixels.toLocaleString()}{" "}
                      pixels
                    </p>

                    <strong>
                      {hotspots.results[
                        "Very High Depletion"
                      ].percentage.toFixed(1)}
                      %
                    </strong>

                    <hr />

                    <h4>
                      High Depletion
                    </h4>

                    <p>
                      {hotspots.results[
                        "High Depletion"
                      ].pixels.toLocaleString()}{" "}
                      pixels
                    </p>

                    <strong>
                      {hotspots.results[
                        "High Depletion"
                      ].percentage.toFixed(1)}
                      %
                    </strong>

                  </div>

                  <div className="result-card">

                    <span className="section-label">
                      NEAR REFERENCE
                    </span>

                    <h4>
                      Moderate / Near Reference
                    </h4>

                    <p>
                      {hotspots.results[
                        "Moderate / Near Reference"
                      ].pixels.toLocaleString()}{" "}
                      pixels
                    </p>

                    <strong>
                      {hotspots.results[
                        "Moderate / Near Reference"
                      ].percentage.toFixed(1)}
                      %
                    </strong>

                  </div>

                  <div className="result-card">

                    <span className="section-label">
                      HIGHER STORAGE
                    </span>

                    <h4>
                      High Recharge
                    </h4>

                    <p>
                      {hotspots.results[
                        "High Recharge"
                      ].pixels.toLocaleString()}{" "}
                      pixels
                    </p>

                    <strong>
                      {hotspots.results[
                        "High Recharge"
                      ].percentage.toFixed(1)}
                      %
                    </strong>

                    <hr />

                    <h4>
                      Very High Recharge
                    </h4>

                    <p>
                      {hotspots.results[
                        "Very High Recharge"
                      ].pixels.toLocaleString()}{" "}
                      pixels
                    </p>

                    <strong>
                      {hotspots.results[
                        "Very High Recharge"
                      ].percentage.toFixed(1)}
                      %
                    </strong>

                  </div>

                </div>

                <div className="info-section">

                  <div className="info-card">

                    <span className="info-label">
                      WET-SEASON REFERENCE
                    </span>

                    <strong>
                      {hotspots.results[
                        "Reference condition"
                      ]["Wet season"]}
                    </strong>

                  </div>

                  <div className="info-card">

                    <span className="info-label">
                      DRY-SEASON REFERENCE
                    </span>

                    <strong>
                      {hotspots.results[
                        "Reference condition"
                      ]["Dry season"]}
                    </strong>

                  </div>

                </div>

              </div>

            )}

          </section>

        )}

      </section>

    </main>
  );
}