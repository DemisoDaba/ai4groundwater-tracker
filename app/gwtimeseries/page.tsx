"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "./gwtimeseries.css";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((m) => m.GeoJSON),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

const DATA_REPO =
  "https://raw.githubusercontent.com/DemisoDaba/kulfo-gw-monitor/main/data";
const KULFO_GEOJSON_URL = `${DATA_REPO}/kulfo_watershed.geojson`;
const KULFO_CENTER: [number, number] = [6.15, 37.45];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Row = { date: string; gwsa: number };

function formatMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

function formatRange(rows: Row[]) {
  if (rows.length === 0) return "Loading…";
  return `${formatMonth(rows[0].date)} → ${formatMonth(
    rows[rows.length - 1].date
  )}`;
}

export default function GWTimeSeriesPage() {
  const [activeTab, setActiveTab] = useState<"basin" | "point">("basin");

  const [kulfoGeoJson, setKulfoGeoJson] = useState<any>(null);
  useEffect(() => {
    fetch(KULFO_GEOJSON_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then(setKulfoGeoJson)
      .catch(() => setKulfoGeoJson(null));
  }, []);

  const [basinData, setBasinData] = useState<Row[]>([]);
  const [basinLoading, setBasinLoading] = useState(false);
  const [basinError, setBasinError] = useState("");

  useEffect(() => {
    (async () => {
      setBasinLoading(true);
      try {
        const r = await fetch(`${DATA_REPO}/kulfo_gwsa_forecasts.csv`);
        if (!r.ok) throw new Error("Basin CSV not found");
        const text = await r.text();
        const rows: Row[] = text
          .trim()
          .split("\n")
          .slice(1)
          .map((line) => {
            const c = line.split(",");
            return { date: c[0].trim(), gwsa: Number(c[1]) };
          });
        setBasinData(rows);
      } catch (err) {
        setBasinError(
          err instanceof Error ? err.message : "Failed to load basin data."
        );
      } finally {
        setBasinLoading(false);
      }
    })();
  }, []);

  const [latitude, setLatitude] = useState("6.15");
  const [longitude, setLongitude] = useState("37.45");
  const [pointData, setPointData] = useState<Row[]>([]);
  const [pointLoading, setPointLoading] = useState(false);
  const [pointError, setPointError] = useState("");
  const [pointUrl, setPointUrl] = useState("");

  async function loadPoint() {
    setPointError("");
    setPointData([]);
    setPointUrl("");
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (
      !latitude ||
      !longitude ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      setPointError("Enter valid latitude and longitude.");
      return;
    }
    setPointLoading(true);
    const fname = `kulfo_point_${lat.toFixed(4)}_${lon.toFixed(4)}.csv`;
    const url = `${DATA_REPO}/${fname}`;
    try {
      const r = await fetch(url);
      if (!r.ok)
        throw new Error(
          `No time series for (${lat}, ${lon}). Only pre-generated points are available.`
        );
      const text = await r.text();
      const rows: Row[] = text
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => {
          const c = line.split(",");
          return { date: c[0].trim(), gwsa: Number(c[3]) };
        });
      setPointData(rows);
      setPointUrl(url);
    } catch (err) {
      setPointError(
        err instanceof Error ? err.message : "Failed to load point data."
      );
    } finally {
      setPointLoading(false);
    }
  }

  function renderChart(data: Row[], title: string) {
    const last = data[data.length - 1];
    return (
      <Plot
        data={[
          {
            x: data.map((r) => r.date),
            y: data.map((r) => r.gwsa),
            type: "scatter",
            mode: "lines",
            fill: "tozeroy",
            fillcolor: "rgba(213, 94, 0, 0.12)",
            line: { color: "#D55E00", width: 2.5 },
            hovertemplate:
              "<b>%{x}</b><br>GWSA: %{y:.2f} mm<extra></extra>",
          },
          {
            x: [last.date],
            y: [last.gwsa],
            type: "scatter",
            mode: "markers+text",
            marker: {
              size: 12,
              color: "#D55E00",
              line: { color: "white", width: 2 },
            },
            text: [`${last.gwsa.toFixed(1)} mm`],
            textposition: "top center",
            textfont: { size: 12, color: "#D55E00" },
            hoverinfo: "skip",
            showlegend: false,
          },
        ]}
        layout={{
          title: { text: title, font: { size: 16, color: "#0f172a" } },
          xaxis: {
            title: "Date",
            showgrid: true,
            gridcolor: "#e2e8f0",
            tickformat: "%b %Y",
          },
          yaxis: {
            title: "GWSA (mm)",
            showgrid: true,
            gridcolor: "#e2e8f0",
            zeroline: true,
            zerolinecolor: "#94a3b8",
          },
          height: 480,
          margin: { l: 60, r: 30, t: 60, b: 60 },
          template: "plotly_white",
          hovermode: "x unified",
        }}
        config={{ displaylogo: false, responsive: true }}
        style={{ width: "100%" }}
        useResizeHandler
      />
    );
  }

  return (
    <main className="gwt-page">
      <div className="gwt-container">
        <aside className="gwt-left">
          <div className="gwt-left-top">
            <div className="gwt-breadcrumb">
              AI4Groundwater / KulfoGW / Time Series
            </div>
            <h1>Groundwater Time Series</h1>
            <p className="gwt-intro">
              Monthly groundwater storage anomaly (GWSA) for the Kulfo
              watershed and any point inside it. Data is updated
              automatically on the <strong>1st of every month</strong>.
            </p>
          </div>

          <div className="gwt-header-badge">
            <span className="gwt-badge-dot" />
            {formatRange(basinData)}
          </div>

          <div className="gwt-tabs">
            <button
              className={activeTab === "basin" ? "active" : ""}
              onClick={() => setActiveTab("basin")}
            >
              <span className="gwt-tab-icon">◉</span>
              <span>Basin Average</span>
            </button>
            <button
              className={activeTab === "point" ? "active" : ""}
              onClick={() => setActiveTab("point")}
            >
              <span className="gwt-tab-icon">⌖</span>
              <span>Specific Point</span>
            </button>
          </div>

          <div className="gwt-info-list">
            <div className="gwt-info-row">
              <span>Study area</span>
              <strong>Kulfo Watershed</strong>
            </div>
            <div className="gwt-info-row">
              <span>Frequency</span>
              <strong>Monthly</strong>
            </div>
            <div className="gwt-info-row">
              <span>Update</span>
              <strong>1st of each month</strong>
            </div>
            <div className="gwt-info-row">
              <span>Model</span>
              <strong>Ridge (R² = 0.899)</strong>
            </div>
          </div>

          {activeTab === "basin" && (
            <a
              href={`${DATA_REPO}/kulfo_gwsa_forecasts.csv`}
              download
              className="gwt-download"
            >
              ⬇ Download basin CSV
            </a>
          )}
        </aside>

        <section className="gwt-right">
          {activeTab === "basin" && (
            <div className="gwt-panel">
              <div className="gwt-panel-header">
                <h2>Kulfo Basin — Monthly GWSA</h2>
                <p>
                  One value per month for the entire watershed. Updated
                  on the 1st of every month.
                </p>
              </div>

              {basinLoading && (
                <div className="gwt-status">Loading basin data...</div>
              )}
              {basinError && <div className="gwt-error">{basinError}</div>}

              {basinData.length > 0 && !basinLoading && (
                <div className="gwt-chart">
                  {renderChart(basinData, "Kulfo Basin — GWSA (mm)")}
                </div>
              )}
            </div>
          )}

          {activeTab === "point" && (
            <div className="gwt-panel">
              <div className="gwt-panel-header">
                <h2>Point-Specific GWSA</h2>
                <p>
                  Monthly series for any lat/lon inside the Kulfo
                  watershed.
                </p>
              </div>

              <div className="gwt-point-layout">
                <div className="gwt-map">
                  <MapContainer
                    center={KULFO_CENTER}
                    zoom={11}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap"
                    />

                    {kulfoGeoJson && (
                      <GeoJSON
                        data={kulfoGeoJson}
                        style={{
                          color: "#0072B2",
                          weight: 2.5,
                          fillColor: "#ABD9E9",
                          fillOpacity: 0.25,
                        }}
                      />
                    )}

                    {latitude &&
                      longitude &&
                      Number.isFinite(Number(latitude)) && (
                        <Marker
                          position={[Number(latitude), Number(longitude)]}
                        >
                          <Popup>
                            {Number(latitude).toFixed(4)}°N,{" "}
                            {Number(longitude).toFixed(4)}°E
                          </Popup>
                        </Marker>
                      )}
                  </MapContainer>
                </div>

                <div className="gwt-form-vertical">
                  <div className="gwt-field">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 6.15"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </div>
                  <div className="gwt-field">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 37.45"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </div>
                  <button
                    className="gwt-query-btn"
                    onClick={loadPoint}
                    disabled={pointLoading}
                  >
                    {pointLoading ? "Loading..." : "Load Time Series"}
                  </button>
                </div>
              </div>

              {pointError && <div className="gwt-error">{pointError}</div>}

              {pointData.length > 0 && !pointLoading && (
                <>
                  <div className="gwt-chart">
                    {renderChart(
                      pointData,
                      `GWSA at ${Number(latitude).toFixed(4)}°N, ${Number(
                        longitude
                      ).toFixed(4)}°E`
                    )}
                  </div>
                  <div className="gwt-actions">
                    <a href={pointUrl} download className="gwt-download">
                      ⬇ Download CSV
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="gwt-footer">
        Data source:{" "}
        <a
          href="https://github.com/DemisoDaba/kulfo-gw-monitor"
          target="_blank"
          rel="noreferrer"
        >
          kulfo-gw-monitor
        </a>
      </footer>
    </main>
  );
}