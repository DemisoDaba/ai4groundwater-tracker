"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "./gwtimeseries.css";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DATA_REPO =
  "https://raw.githubusercontent.com/DemisoDaba/kulfo-gw-monitor/main/data";

type Row = {
  date: string;
  gwsa: number;
};

export default function GWTimeSeriesPage() {
  const [activeTab, setActiveTab] = useState<"basin" | "point">("basin");

  /* =========================================================
     BASIN-AVERAGE DATA
  ========================================================= */
  const [basinData, setBasinData] = useState<Row[]>([]);
  const [basinLoading, setBasinLoading] = useState(false);
  const [basinError, setBasinError] = useState("");

  async function loadBasin() {
    setBasinLoading(true);
    setBasinError("");

    try {
      const r = await fetch(`${DATA_REPO}/kulfo_gwsa_forecasts.csv`);
      if (!r.ok) throw new Error("Basin CSV not found");

      const text = await r.text();
      const lines = text.trim().split("\n").slice(1);

      const rows: Row[] = lines.map((line) => {
        const cols = line.split(",");
        return {
          date: cols[0].trim(),
          gwsa: Number(cols[1]),
        };
      });

      setBasinData(rows);
    } catch (err) {
      setBasinError(
        err instanceof Error ? err.message : "Failed to load basin data."
      );
    } finally {
      setBasinLoading(false);
    }
  }

  useEffect(() => {
    loadBasin();
  }, []);

  /* =========================================================
     POINT-SPECIFIC DATA
  ========================================================= */
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

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

    if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setPointError("Enter valid latitude and longitude.");
      return;
    }

    setPointLoading(true);

    const fname = `kulfo_point_${lat.toFixed(4)}_${lon.toFixed(4)}.csv`;
    const url = `${DATA_REPO}/${fname}`;

    try {
      const r = await fetch(url);
      if (!r.ok) {
        throw new Error(
          `No time series for (${lat}, ${lon}). Only pre-generated points are available.`
        );
      }

      const text = await r.text();
      const lines = text.trim().split("\n").slice(1);

      const rows: Row[] = lines.map((line) => {
        const cols = line.split(",");
        return {
          date: cols[0].trim(),
          gwsa: Number(cols[3]),
        };
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

  /* =========================================================
     CHART HELPER
  ========================================================= */
  function renderChart(data: Row[], title: string) {
    return (
      <Plot
        data={[
          {
            x: data.map((r) => r.date),
            y: data.map((r) => r.gwsa),
            type: "scatter",
            mode: "lines+markers",
            line: { color: "#D55E00", width: 2 },
            marker: { size: 4 },
            hovertemplate:
              "Date: %{x}<br>GWSA: %{y:.2f} mm<extra></extra>",
          },
        ]}
        layout={{
          title: { text: title, font: { size: 16 } },
          xaxis: { title: "Date", showgrid: true },
          yaxis: { title: "GWSA (mm)", showgrid: true, zeroline: true },
          height: 500,
          margin: { l: 60, r: 30, t: 60, b: 60 },
          template: "plotly_white",
        }}
        config={{ displaylogo: false, responsive: true }}
        style={{ width: "100%" }}
        useResizeHandler
      />
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <main className="gwt-page">
      <header className="gwt-header">
        <div>
          <div className="gwt-breadcrumb">
            AI4Groundwater / KulfoGW / Time Series
          </div>
          <h1>Groundwater Time Series</h1>
          <p>
            Monthly groundwater storage anomaly (GWSA) for the Kulfo
            watershed and any pre-generated point inside it.
          </p>
        </div>
      </header>

      <div className="gwt-tabs">
        <button
          className={activeTab === "basin" ? "active" : ""}
          onClick={() => setActiveTab("basin")}
        >
          Basin Average
        </button>
        <button
          className={activeTab === "point" ? "active" : ""}
          onClick={() => setActiveTab("point")}
        >
          Specific Point
        </button>
      </div>

      {/* =====================================================
          BASIN TAB
      ===================================================== */}
      {activeTab === "basin" && (
        <section className="gwt-panel">
          <div className="gwt-panel-header">
            <h2>Kulfo Basin — Monthly GWSA</h2>
            <p>
              One value per month for the entire watershed, updated
              automatically on the 1st of every month.
            </p>
            <a
              href={`${DATA_REPO}/kulfo_gwsa_forecasts.csv`}
              download
              className="gwt-download"
            >
              Download CSV
            </a>
          </div>

          {basinLoading && <div className="gwt-status">Loading basin data...</div>}
          {basinError && <div className="gwt-error">{basinError}</div>}

          {basinData.length > 0 && !basinLoading && (
            <div className="gwt-chart">
              {renderChart(basinData, "Kulfo Basin — GWSA (mm)")}
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          POINT TAB
      ===================================================== */}
      {activeTab === "point" && (
        <section className="gwt-panel">
          <div className="gwt-panel-header">
            <h2>Point-Specific GWSA</h2>
            <p>
              Enter coordinates inside the Kulfo watershed. Only
              pre-generated points are available.
            </p>
          </div>

          <div className="gwt-form">
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

          {pointError && <div className="gwt-error">{pointError}</div>}

          {pointData.length > 0 && !pointLoading && (
            <>
              <div className="gwt-chart">
                {renderChart(
                  pointData,
                  `GWSA at ${Number(latitude).toFixed(4)}°N, ${Number(longitude).toFixed(4)}°E`
                )}
              </div>

              <div className="gwt-actions">
                <a href={pointUrl} download className="gwt-download">
                  Download CSV
                </a>
              </div>
            </>
          )}
        </section>
      )}

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
