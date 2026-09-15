"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "./kulfogw.css";

const Plot = dynamic(
  () => import("react-plotly.js"),
  {
    ssr: false,
  }
);

type ViewerData = {
  gw: (number | null)[][];
  longitude: number[];
  latitude: number[];
  easting: number[];
  northing: number[];
  height: number;
  width: number;
  resolution_x: number;
  resolution_y: number;
  crs: string;
  bounds: {
    left: number;
    right: number;
    bottom: number;
    top: number;
  };
  default_row: number;
  default_col: number;
};

type LocationResult = {
  latitude: number;
  longitude: number;
  anomaly: number | null;
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

type HotspotsResult = {
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

type HotspotsResponse = {
  results: HotspotsResult;
  interpretation: string;
};

export default function KulfoGWPage() {
  const [activeSection, setActiveSection] =
    useState("overview");

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
     INTERACTIVE VIEWER
  ====================================================== */

  const [viewerData, setViewerData] =
    useState<ViewerData | null>(null);

  const [viewerLoading, setViewerLoading] =
    useState(false);

  const [viewerError, setViewerError] =
    useState("");

  const [selectedRow, setSelectedRow] =
    useState<number | null>(null);

  const [selectedCol, setSelectedCol] =
    useState<number | null>(null);

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
     HOTSPOTS
  ====================================================== */

  const [hotspots, setHotspots] =
    useState<HotspotsResponse | null>(null);

  const [hotspotsLoading, setHotspotsLoading] =
    useState(false);

  const [hotspotsError, setHotspotsError] =
    useState("");

  /* =====================================================
     LOAD INTERACTIVE VIEWER
  ====================================================== */

  async function loadViewer() {
    if (viewerData || viewerLoading) {
      return;
    }

    setViewerLoading(true);
    setViewerError("");

    try {
      const response = await fetch(
        "/api/kulfogw/viewer/data",
        {
          cache: "force-cache",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load Kulfo interactive viewer."
        );
      }

      setViewerData(data);

      setSelectedRow(data.default_row);
      setSelectedCol(data.default_col);

    } catch (err) {
      setViewerError(
        err instanceof Error
          ? err.message
          : "Unable to load Kulfo interactive viewer."
      );
    } finally {
      setViewerLoading(false);
    }
  }

  /* =====================================================
     LOCATION QUERY
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
     LOAD ZONES
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
     LOAD SECTION DATA
  ====================================================== */

  useEffect(() => {
    if (
      activeSection === "map" &&
      !viewerData &&
      !viewerLoading
    ) {
      loadViewer();
    }

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
  }, [
    activeSection,
    viewerData,
    viewerLoading,
    zones,
    zonesLoading,
    hotspots,
    hotspotsLoading,
  ]);

  /* =====================================================
     VIEWER FIGURE
  ====================================================== */

  function createViewerFigure() {
    if (!viewerData) {
      return null;
    }

    const row =
      selectedRow ??
      viewerData.default_row;

    const col =
      selectedCol ??
      viewerData.default_col;

    const selectedLatitude =
      viewerData.latitude[row];

    const selectedLongitude =
      viewerData.longitude[col];

    const selectedValue =
      viewerData.gw[row]?.[col] ?? null;

    /* -------------------------------------------------
       PROFILES
    -------------------------------------------------- */

    const ewProfile =
      viewerData.gw[row];

    const nsProfile =
      viewerData.gw.map(
        (values) =>
          values[col] ?? null
      );

    /* -------------------------------------------------
       ZONE
    -------------------------------------------------- */

    let zone = "NoData";

    if (
      selectedValue !== null &&
      Number.isFinite(selectedValue)
    ) {
      if (selectedValue < -2) {
        zone = "Very High Depletion";
      } else if (selectedValue < -1) {
        zone = "High Depletion";
      } else if (selectedValue <= 1) {
        zone = "Moderate / Near Reference";
      } else if (selectedValue <= 2) {
        zone = "High Recharge";
      } else {
        zone = "Very High Recharge";
      }
    }

    /* =================================================
       TRACES
    ================================================== */

    const traces: any[] = [];

    /* =================================================
       MAIN GROUNDWATER ANOMALY HEATMAP
    ================================================== */

    traces.push({
      type: "heatmap",

      z: viewerData.gw,

      x: viewerData.longitude,

      y: viewerData.latitude,

      colorscale: [
        [0.00, "#313695"],
        [0.15, "#4575B4"],
        [0.30, "#74ADD1"],
        [0.45, "#ABD9E9"],
        [0.50, "#F7F7F7"],
        [0.55, "#FEE090"],
        [0.70, "#FDAE61"],
        [0.85, "#F46D43"],
        [1.00, "#A50026"],
      ],

      zmid: 0,

      colorbar: {
        title: {
          text: "GW anomaly",
        },

        thickness: 18,
      },

      hovertemplate:
        "Longitude: %{x:.6f}°E<br>" +
        "Latitude: %{y:.6f}°N<br>" +
        "GW anomaly: %{z:.4f}" +
        "<extra></extra>",

      connectgaps: false,

      xaxis: "x",

      yaxis: "y",
    });

    /* =================================================
       SELECTED LOCATION ON MAP
    ================================================== */

    if (
      selectedValue !== null &&
      Number.isFinite(selectedValue)
    ) {
      traces.push({
        type: "scatter",

        x: [selectedLongitude],

        y: [selectedLatitude],

        mode: "markers",

        marker: {
          size: 15,

          symbol: "circle",

          color: "white",

          line: {
            width: 3,

            color: "black",
          },
        },

        hovertemplate:
          "Longitude: " +
          selectedLongitude.toFixed(6) +
          "°E<br>" +
          "Latitude: " +
          selectedLatitude.toFixed(6) +
          "°N<br>" +
          "GW anomaly: " +
          selectedValue.toFixed(4) +
          "<extra></extra>",

        showlegend: false,

        xaxis: "x",

        yaxis: "y",
      });
    }

    /* =================================================
       NORTH–SOUTH PROFILE
    ================================================== */

    traces.push({
      type: "scatter",

      x: nsProfile,

      y: viewerData.latitude,

      mode: "lines",

      line: {
        width: 2,
      },

      hovertemplate:
        "GW anomaly: %{x:.4f}<br>" +
        "Latitude: %{y:.6f}°N" +
        "<extra></extra>",

      showlegend: false,

      connectgaps: false,

      xaxis: "x2",

      yaxis: "y2",
    });

    /* SELECTED N-S POINT */

    if (
      selectedValue !== null &&
      Number.isFinite(selectedValue)
    ) {
      traces.push({
        type: "scatter",

        x: [selectedValue],

        y: [selectedLatitude],

        mode: "markers",

        marker: {
          size: 10,

          color: "black",
        },

        showlegend: false,

        xaxis: "x2",

        yaxis: "y2",
      });
    }

    /* =================================================
       EAST–WEST PROFILE
    ================================================== */

    traces.push({
      type: "scatter",

      x: viewerData.longitude,

      y: ewProfile,

      mode: "lines",

      line: {
        width: 2,
      },

      hovertemplate:
        "Longitude: %{x:.6f}°E<br>" +
        "GW anomaly: %{y:.4f}" +
        "<extra></extra>",

      showlegend: false,

      connectgaps: false,

      xaxis: "x3",

      yaxis: "y3",
    });

    /* SELECTED E-W POINT */

    if (
      selectedValue !== null &&
      Number.isFinite(selectedValue)
    ) {
      traces.push({
        type: "scatter",

        x: [selectedLongitude],

        y: [selectedValue],

        mode: "markers",

        marker: {
          size: 10,

          color: "black",
        },

        showlegend: false,

        xaxis: "x3",

        yaxis: "y3",
      });
    }

    /* =================================================
       SELECTED LOCATION TABLE
    ================================================== */

    traces.push({
      type: "table",

      domain: {
        x: [0.718, 1.0],
        y: [0.0, 0.288],
      },

      header: {
        values: [
          "<b>Parameter</b>",
          "<b>Value</b>",
        ],

        align: "left",

        font: {
          size: 12,
        },

        height: 28,
      },

      cells: {
        values: [
          [
            "Longitude",
            "Latitude",
            "Easting",
            "Northing",
            "GW anomaly",
            "Zone",
            "Pixel row",
            "Pixel column",
            "CRS",
          ],

          [
            selectedLongitude.toFixed(6) +
              "°E",

            selectedLatitude.toFixed(6) +
              "°N",

            viewerData.easting[col].toFixed(2) +
              " m",

            viewerData.northing[row].toFixed(2) +
              " m",

            selectedValue === null ||
            !Number.isFinite(selectedValue)
              ? "NoData"
              : selectedValue.toFixed(4),

            zone,

            String(row),

            String(col),

            viewerData.crs,
          ],
        ],

        align: "left",

        font: {
          size: 11,
        },

        height: 25,
      },

      columnwidth: [0.42, 0.58],
    });

    /* =================================================
       LAYOUT
    ================================================== */

    return {
      data: traces,

      layout: {
        height: 850,

        margin: {
          l: 45,
          r: 45,
          t: 65,
          b: 40,
        },

        template: "plotly_white",

        hovermode: "closest",

        showlegend: false,

        clickmode: "event",

        /* -------------------------------------------------
           DASH SUBPLOT PARAMETERS

           column_widths = [0.70, 0.30]
           row_heights   = [0.68, 0.32]
           horizontal_spacing = 0.06
           vertical_spacing   = 0.10
        -------------------------------------------------- */

        grid: {
          rows: 2,

          columns: 2,

          pattern: "independent",

          xgap: 0.06,

          ygap: 0.10,
        },

        /* =================================================
           MAIN MAP
        ================================================== */

        xaxis: {
          domain: [0.0, 0.658],

          title: {
            text: "Longitude (°E)",
          },

          showgrid: true,

          zeroline: false,
        },

        yaxis: {
          domain: [0.388, 1.0],

          title: {
            text: "Latitude (°N)",
          },

          showgrid: true,

          zeroline: false,

          scaleanchor: "x",

          scaleratio: 1,
        },

        /* =================================================
           NORTH–SOUTH PROFILE
        ================================================== */

        xaxis2: {
          domain: [0.718, 1.0],

          anchor: "y2",

          title: {
            text: "GW anomaly",
          },

          showgrid: true,
        },

        yaxis2: {
          domain: [0.388, 1.0],

          anchor: "x2",

          title: {
            text: "Latitude (°N)",
          },

          showgrid: true,
        },

        /* =================================================
           EAST–WEST PROFILE
        ================================================== */

        xaxis3: {
          domain: [0.0, 0.658],

          anchor: "y3",

          title: {
            text: "Longitude (°E)",
          },

          showgrid: true,
        },

        yaxis3: {
          domain: [0.0, 0.288],

          anchor: "x3",

          title: {
            text: "GW anomaly",
          },

          showgrid: true,
        },

        /* =================================================
           CROSSHAIRS
        ================================================== */

        shapes: [
          {
            type: "line",

            x0: viewerData.longitude[0],

            x1:
              viewerData.longitude[
                viewerData.longitude.length - 1
              ],

            y0: selectedLatitude,

            y1: selectedLatitude,

            line: {
              color: "black",

              width: 1.5,

              dash: "dash",
            },

            xref: "x",

            yref: "y",
          },

          {
            type: "line",

            x0: selectedLongitude,

            x1: selectedLongitude,

            y0: viewerData.latitude[0],

            y1:
              viewerData.latitude[
                viewerData.latitude.length - 1
              ],

            line: {
              color: "black",

              width: 1.5,

              dash: "dash",
            },

            xref: "x",

            yref: "y",
          },
        ],

        /* =================================================
           PANEL TITLES
        ================================================== */

        annotations: [
          {
            text: "Groundwater anomaly",

            x: 0.329,

            y: 1.035,

            xref: "paper",

            yref: "paper",

            showarrow: false,

            font: {
              size: 15,
            },
          },

          {
            text: "North–South profile",

            x: 0.859,

            y: 1.035,

            xref: "paper",

            yref: "paper",

            showarrow: false,

            font: {
              size: 15,
            },
          },

          {
            text: "East–West profile",

            x: 0.329,

            y: 0.325,

            xref: "paper",

            yref: "paper",

            showarrow: false,

            font: {
              size: 15,
            },
          },

          {
            text: "Selected location",

            x: 0.859,

            y: 0.325,

            xref: "paper",

            yref: "paper",

            showarrow: false,

            font: {
              size: 15,
            },
          },
        ],
      },

      /* =================================================
         PLOTLY CONFIG
      ================================================== */

      config: {
        displaylogo: false,

        scrollZoom: true,

        responsive: true,
      },
    };
  }

  /* =====================================================
     HANDLE MAP CLICK
  ====================================================== */

  function handleViewerClick(event: any) {
    if (!viewerData) {
      return;
    }

    const point =
      event?.points?.[0];

    if (!point) {
      return;
    }

    const clickedLon =
      Number(point.x);

    const clickedLat =
      Number(point.y);

    if (
      !Number.isFinite(clickedLon) ||
      !Number.isFinite(clickedLat)
    ) {
      return;
    }

    let closestCol = 0;
    let closestRow = 0;

    let minLonDistance =
      Infinity;

    let minLatDistance =
      Infinity;

    for (
      let i = 0;
      i < viewerData.longitude.length;
      i++
    ) {
      const distance =
        Math.abs(
          viewerData.longitude[i] -
            clickedLon
        );

      if (distance < minLonDistance) {
        minLonDistance = distance;
        closestCol = i;
      }
    }

    for (
      let i = 0;
      i < viewerData.latitude.length;
      i++
    ) {
      const distance =
        Math.abs(
          viewerData.latitude[i] -
            clickedLat
        );

      if (distance < minLatDistance) {
        minLatDistance = distance;
        closestRow = i;
      }
    }

    setSelectedRow(closestRow);
    setSelectedCol(closestCol);
  }

  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <main className="kulfogw-page">

      {/* =================================================
          SIDEBAR
      ================================================== */}

      <aside className="kulfogw-sidebar">

        <div className="kulfogw-brand">

          <div className="kulfogw-logo">
            K
          </div>

          <div>
            <h1>KulfoGW</h1>

            <span>
              Groundwater Analysis
            </span>
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
              Interactive Map
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

      {/* =================================================
          CONTENT
      ================================================== */}

      <section className="kulfogw-content">

        <header className="kulfogw-header">

          <div>

            <div className="breadcrumb">
              AI4Groundwater / KulfoGW
            </div>

            <h2>
              Spatial Groundwater
            </h2>

            <p>
              High-resolution groundwater
              analysis for the Kulfo Watershed.
            </p>

          </div>

          <div className="header-badge">

            <span></span>

            30 m Spatial Model

          </div>

        </header>

        {/* =================================================
            OVERVIEW
        ================================================== */}

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
                  locations, interactively examine
                  the 30 m U-Net groundwater anomaly
                  map, view groundwater zones, and
                  identify spatial hotspots and
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
                    Interactive Map
                  </h3>

                  <p>
                    Explore the 30 m groundwater
                    anomaly map and click any
                    location to examine profiles.
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

        {/* =================================================
            LOCATION
        ================================================== */}

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

              <div className="coordinate-field query-field">

                <label>
                  Query Location
                </label>

                <button
                  className="query-button"
                  onClick={queryLocation}
                  disabled={loading}
                >
                  {loading
                    ? "Querying..."
                    : "Query Location"}
                </button>

                <span>
                  Retrieve the groundwater
                  condition at this location.
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

        {/* =================================================
            INTERACTIVE MAP
        ================================================== */}

        {activeSection === "map" && (

          <section className="groundwater-map">

            <div className="map-header">

              <div>

                <span className="section-label">
                  INTERACTIVE SPATIAL VIEWER
                </span>

                <h3>
                  Kulfo U-Net Groundwater Viewer
                </h3>

                <p>
                  Click any valid raster location to
                  examine the groundwater anomaly,
                  North–South profile, East–West
                  profile, and selected-location
                  information.
                </p>

              </div>

            </div>

            {viewerLoading && (

              <div className="map-placeholder">

                <div className="map-placeholder-icon">
                  ◌
                </div>

                <h4>
                  Loading interactive viewer...
                </h4>

                <p>
                  Loading the 30 m Kulfo U-Net
                  groundwater raster.
                </p>

              </div>

            )}

            {viewerError && (

              <div className="query-error">

                <strong>
                  Viewer error
                </strong>

                <p>
                  {viewerError}
                </p>

                <button
                  className="query-button"
                  onClick={loadViewer}
                >
                  Try Again
                </button>

              </div>

            )}

            {viewerData && !viewerLoading && (

              <div
                className="map-image-container"
                style={{
                  width: "100%",
                  overflowX: "auto",
                }}
              >

                {(() => {

                  const figure =
                    createViewerFigure();

                  if (!figure) {
                    return null;
                  }

                  return (
                    <Plot
                      data={figure.data}
                      layout={figure.layout}
                      config={figure.config}
                      onClick={handleViewerClick}
                      style={{
                        width: "100%",
                        minWidth: "950px",
                      }}
                      useResizeHandler={true}
                    />
                  );

                })()}

              </div>

            )}

          </section>

        )}

        {/* =================================================
            ZONES
        ================================================== */}

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

        {/* =================================================
            HOTSPOTS
        ================================================== */}

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