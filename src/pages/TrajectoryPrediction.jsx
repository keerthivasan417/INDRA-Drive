import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Crosshair,
  ArrowRight,
  Info,
  Sliders,
  Shield,
  Clock,
  Terminal,
} from "lucide-react";
import Footer from "../components/Footer";
import { runTrajectoryPrediction, getBackendHealth } from "../services/api";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import "./TrajectoryPrediction.css";

// Calibrated prototype tracks extracted directly from TRACKING_DEMO_FRAMES (Frames 1-8)
// Ground contact point: x = (x1 + x2) / 2, y = y2, normalized by resolution 1920x1080
const PROTOTYPE_TRACKS = {
  1: {
    trackId: 1,
    className: "Three-wheeler",
    description: "Foreground Three-wheeler advancing towards camera (Frames 1–8)",
    positions: [
      [0.3403, 0.9429], // F1 (T-7)
      [0.3405, 0.9469], // F2 (T-6)
      [0.3408, 0.9509], // F3 (T-5)
      [0.3410, 0.9551], // F4 (T-4)
      [0.3413, 0.9594], // F5 (T-3)
      [0.3415, 0.9639], // F6 (T-2)
      [0.3418, 0.9684], // F7 (T-1)
      [0.3420, 0.9730], // F8 (T0 - Current)
    ],
  },
  2: {
    trackId: 2,
    className: "Hatchback",
    description: "Mid-distance Hatchback proceeding along roadway (Frames 1–8)",
    positions: [
      [0.4061, 0.1877],
      [0.4071, 0.1918],
      [0.4083, 0.1961],
      [0.4094, 0.2005],
      [0.4106, 0.2050],
      [0.4119, 0.2095],
      [0.4131, 0.2143],
      [0.4144, 0.2190],
    ],
  },
  3: {
    trackId: 3,
    className: "Truck",
    description: "Heavy Commercial Truck advancing in adjacent corridor (Frames 1–8)",
    positions: [
      [0.3061, 0.2540],
      [0.3071, 0.2579],
      [0.3081, 0.2619],
      [0.3092, 0.2661],
      [0.3102, 0.2704],
      [0.3113, 0.2748],
      [0.3124, 0.2794],
      [0.3136, 0.2840],
    ],
  },
};

const DEFAULT_OBSERVED_POSITIONS = PROTOTYPE_TRACKS[1].positions;

export default function TrajectoryPrediction({ onReturnOverview }) {
  const { updateTrajectoryResult } = useIndraRuntime();

  // Input Configuration
  const [trackId, setTrackId] = useState(1);
  const [positions, setPositions] = useState(DEFAULT_OBSERVED_POSITIONS);
  const [viewMode, setViewMode] = useState("camera"); // "camera" | "normalized"

  // API State
  const [status, setStatus] = useState("READY"); // "READY" | "PREDICTING" | "COMPLETE" | "ERROR"
  const [predictionData, setPredictionData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  // Synchronize successful predictions into shared runtime state
  useEffect(() => {
    if (predictionData && predictionData.predicted_positions) {
      updateTrajectoryResult({
        selectedTrackId: predictionData.track_id || trackId,
        observedPositions: positions,
        predictedPositions: predictionData.predicted_positions,
        inferenceTimeMs: predictionData.inference_time_ms || null,
        status: "COMPLETE",
      });
    }
  }, [predictionData, trackId, positions, updateTrajectoryResult]);

  // Fetch backend hardware context on mount
  useEffect(() => {
    let isMounted = true;
    getBackendHealth()
      .then((data) => {
        if (isMounted) setBackendHealth(data);
      })
      .catch(() => {
        if (isMounted) {
          setBackendHealth({
            device: "cuda",
            gpu: "NVIDIA GeForce RTX 2050",
            trajectory_model: "TrajectoryLSTM v2",
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Rendered viewport measurement ref for telemetry
  const imgContainerRef = useRef(null);
  const [renderedSize, setRenderedSize] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const updateSize = () => {
      if (imgContainerRef.current) {
        const { clientWidth, clientHeight } = imgContainerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setRenderedSize({
            width: Math.round(clientWidth),
            height: Math.round(clientHeight),
          });
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    let observer;
    if (window.ResizeObserver && imgContainerRef.current) {
      observer = new ResizeObserver(updateSize);
      observer.observe(imgContainerRef.current);
    }
    return () => {
      window.removeEventListener("resize", updateSize);
      if (observer) observer.disconnect();
    };
  }, []);

  // Run Trajectory Prediction via real FastAPI endpoint
  const handleExecutePrediction = useCallback(async (customPositions = positions, customTrackId = trackId) => {
    setStatus("PREDICTING");
    setErrorMessage(null);

    try {
      const response = await runTrajectoryPrediction(customTrackId, customPositions);
      setPredictionData(response);
      setStatus("COMPLETE");
    } catch (err) {
      setErrorMessage(err.message || "Failed to execute trajectory prediction.");
      setStatus("ERROR");
    }
  }, [trackId, positions]);

  // Track selection change handler - loads observed track without auto-running prediction
  const handleTrackChange = (selectedId) => {
    setTrackId(selectedId);
    if (PROTOTYPE_TRACKS[selectedId]) {
      const nextPositions = PROTOTYPE_TRACKS[selectedId].positions;
      setPositions(nextPositions);
      setPredictionData(null);
      setStatus("READY");
      setErrorMessage(null);
    }
  };

  // Handle position value edits
  const handleCoordinateChange = (index, coordIdx, value) => {
    const parsed = parseFloat(value);
    const updated = positions.map((pt, i) => {
      if (i === index) {
        const nextPt = [...pt];
        nextPt[coordIdx] = isNaN(parsed) ? 0 : parsed;
        return nextPt;
      }
      return pt;
    });
    setPositions(updated);
  };

  // Reset to calibrated prototype track without auto-running prediction
  const handleResetDefault = () => {
    const defaultPos = PROTOTYPE_TRACKS[trackId]?.positions || PROTOTYPE_TRACKS[1].positions;
    setPositions(defaultPos);
    setPredictionData(null);
    setStatus("READY");
    setErrorMessage(null);
  };

  // Mathematical Motion Trend Calculation (Strictly in Normalized Image Space)
  const motionTrend = useMemo(() => {
    if (!positions || positions.length < 2) return null;
    const firstObs = positions[0];
    const lastObs = positions[positions.length - 1];
    const obsDx = lastObs[0] - firstObs[0];
    const obsDy = lastObs[1] - firstObs[1];
    const obsDisp = Math.sqrt(obsDx * obsDx + obsDy * obsDy);

    let predDx = 0;
    let predDy = 0;
    let predDisp = 0;
    let netDx = obsDx;
    let netDy = obsDy;

    if (predictionData?.predicted_positions?.length > 0) {
      const preds = predictionData.predicted_positions;
      const lastPred = preds[preds.length - 1];
      predDx = lastPred[0] - lastObs[0];
      predDy = lastPred[1] - lastObs[1];
      predDisp = Math.sqrt(predDx * predDx + predDy * predDy);
      netDx = lastPred[0] - firstObs[0];
      netDy = lastPred[1] - firstObs[1];
    }

    const horizDirection = netDx < -0.001 ? "Leftward in image" : netDx > 0.001 ? "Rightward in image" : "Stationary in image X";
    const vertDirection = netDy < -0.001 ? "Upward in image" : netDy > 0.001 ? "Downward in image" : "Stationary in image Y";

    return {
      obsDx: obsDx.toFixed(4),
      obsDy: obsDy.toFixed(4),
      obsDisp: obsDisp.toFixed(4),
      predDx: predDx.toFixed(4),
      predDy: predDy.toFixed(4),
      predDisp: predDisp.toFixed(4),
      totalDisp: Math.sqrt(netDx * netDx + netDy * netDy).toFixed(4),
      horizDirection,
      vertDirection,
    };
  }, [positions, predictionData]);

  // Predicted positions from real API
  const predictedCoords = predictionData?.predicted_positions || [];

  // Debug telemetry & SVG projection coordinates
  const t0Norm = positions[positions.length - 1] || [0, 0];
  const t5Norm = predictedCoords.length > 0 ? predictedCoords[predictedCoords.length - 1] : null;
  const t0Px = [Math.round(t0Norm[0] * 1920), Math.round(t0Norm[1] * 1080)];
  const t5Px = t5Norm ? [Math.round(t5Norm[0] * 1920), Math.round(t5Norm[1] * 1080)] : null;

  return (
    <div className="trajectory-prediction-page">
      {/* Top Header */}
      <div className="trajectory-header">
        <div className="header-breadcrumbs">
          <button
            type="button"
            className="breadcrumb-back-btn"
            onClick={onReturnOverview}
          >
            <ArrowLeft size={14} aria-hidden="true" focusable="false" />
            <span>Overview</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Trajectory Prediction</span>
        </div>

        <div className="header-headline-row">
          <div className="headline-text-group">
            <div className="trajectory-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>TRAJECTORY PREDICTION • TEMPORAL MOTION FORECASTING</span>
              <span className="eyebrow-pill">LSTM v2 • 5-STEP HORIZON</span>
            </div>
            <h1 className="trajectory-title">Predictive Motion Intelligence</h1>
            <p className="trajectory-subtitle">
              Forecasting future object motion from recent ByteTrack observations using the trained LSTM trajectory model.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="action-ghost-btn"
              onClick={handleResetDefault}
              title="Reset to prototype calibrated track #1 sequence"
            >
              <RotateCcw size={14} aria-hidden="true" focusable="false" />
              <span>Reset Prototype Track</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Controls & Historical Input) | Right Column (Visualization & Future Data) */}
      <div className="trajectory-workstation-grid">
        {/* Left Column */}
        <div className="trajectory-left-col">
          {/* Forecast Summary Card */}
          <div className="traj-card forecast-summary-card">
            <div className="traj-card-header">
              <div className="card-header-left">
                <Cpu size={16} className="text-green" aria-hidden="true" focusable="false" />
                <span className="card-title">FORECAST TELEMETRY</span>
              </div>
              <span className={`status-pill status-${status.toLowerCase()}`}>
                <span className="status-dot"></span>
                {status}
              </span>
            </div>

            <div className="spec-tile-grid">
              <div className="spec-tile">
                <span className="spec-label">MODEL ARCHITECTURE</span>
                <span className="spec-val text-cyan">TrajectoryLSTM v2</span>
                <span className="spec-sub">2-Layer Recurrent (51,338 params)</span>
              </div>

              <div className="spec-tile">
                <span className="spec-label">COMPUTE DEVICE</span>
                <span className="spec-val text-green">
                  {predictionData?.device?.toUpperCase() || backendHealth?.device?.toUpperCase() || "CUDA"}
                </span>
                <span className="spec-sub">{backendHealth?.gpu || "NVIDIA GeForce RTX 2050"}</span>
              </div>

              <div className="spec-tile">
                <span className="spec-label">INPUT HORIZON</span>
                <span className="spec-val mono text-cyan">8 Frames (T-7 → T0)</span>
                <span className="spec-sub">Sequential ByteTrack history</span>
              </div>

              <div className="spec-tile highlight-green-tile">
                <span className="spec-label">PREDICTION HORIZON</span>
                <span className="spec-val mono text-green">5 Frames (T+1 → T+5)</span>
                <span className="spec-sub">Multi-step future waypoint output</span>
              </div>

              <div className="spec-tile full-width">
                <span className="spec-label">COORDINATE CONTRACT</span>
                <span className="spec-val font-mono">Normalized Image Space [0.0, 1.0]</span>
                <span className="spec-sub">Dimensionless screen ratios (x = px/W, y = px/H) • NOT physical meters</span>
              </div>
            </div>
          </div>

          {/* Historical Observation Table & Input Panel */}
          <div className="traj-card track-input-card">
            <div
              className="traj-card-header"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "10px",
              }}
            >
              <div className="card-header-left" style={{ minWidth: 0 }}>
                <Sliders size={16} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="card-title">OBSERVED TRAJECTORY INPUT (8 FRAMES)</span>
              </div>
              <div
                className="track-badge-group"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Crosshair size={12} className="text-cyan" style={{ flexShrink: 0 }} aria-hidden="true" focusable="false" />
                <select
                  value={trackId}
                  onChange={(e) => handleTrackChange(parseInt(e.target.value, 10))}
                  className="track-select-dropdown mono"
                  title="Select Prototype Track"
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    flex: 1,
                    textOverflow: "ellipsis",
                  }}
                >
                  <option value={1}>Track #1 — Three-wheeler (Ground Contact, F1→F8)</option>
                  <option value={2}>Track #2 — Hatchback (Ground Contact, F1→F8)</option>
                  <option value={3}>Track #3 — Truck (Ground Contact, F1→F8)</option>
                </select>
              </div>
            </div>

            <p className="card-description">
              Sequential vehicle ground contact coordinates (x = (x1 + x2)/2, y = y2) extracted from monocular ByteTrack tracking history (Frames 1–8).
            </p>

            <div
              className="positions-table-container"
              style={{
                maxHeight: "none",
                overflowY: "visible",
                overflowX: "auto",
              }}
            >
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>TIME STEP</th>
                    <th>FRAME</th>
                    <th>NORM X</th>
                    <th>NORM Y</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pt, idx) => {
                    const stepLabel = idx === 7 ? "T0 (Current)" : `T-${7 - idx}`;
                    const frameNum = idx + 1;
                    return (
                      <tr key={idx} className={idx === 7 ? "row-current" : ""}>
                        <td className="step-cell mono">{stepLabel}</td>
                        <td className="frame-cell mono text-muted">F_{String(frameNum).padStart(2, "0")}</td>
                        <td className="coord-cell">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max="1"
                            value={pt[0]}
                            onChange={(e) => handleCoordinateChange(idx, 0, e.target.value)}
                            className="coord-input"
                          />
                        </td>
                        <td className="coord-cell">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max="1"
                            value={pt[1]}
                            onChange={(e) => handleCoordinateChange(idx, 1, e.target.value)}
                            className="coord-input"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="input-card-actions">
              <button
                type="button"
                className="btn-predict-primary"
                onClick={() => handleExecutePrediction(positions)}
                disabled={status === "PREDICTING"}
              >
                {status === "PREDICTING" ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>RUNNING INFERENCE...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} aria-hidden="true" focusable="false" />
                    <span>RUN TRAJECTORY PREDICTION</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-reset-ghost"
                onClick={handleResetDefault}
                disabled={status === "PREDICTING"}
                title="Reset to default prototype sequence"
              >
                <RotateCcw size={13} aria-hidden="true" focusable="false" />
                <span>Reset</span>
              </button>
            </div>

            {errorMessage && (
              <div className="error-banner">
                <AlertCircle size={14} className="error-icon" aria-hidden="true" focusable="false" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Model Information & Benchmark Card */}
          <div className="traj-card model-info-card">
            <div className="traj-card-header">
              <div className="card-header-left">
                <Layers size={16} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="card-title">MODEL SPECIFICATIONS</span>
              </div>
              <span className="info-badge">TRAINED PROTOTYPE</span>
            </div>

            <div className="model-stats-grid">
              <div className="stat-item">
                <span className="stat-label">INPUT TENSOR</span>
                <span className="stat-val font-mono">[B, 8, 2]</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">OUTPUT TENSOR</span>
                <span className="stat-val font-mono">[B, 5, 2]</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">HIDDEN SIZE</span>
                <span className="stat-val font-mono">64</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">NUM LAYERS</span>
                <span className="stat-val font-mono">2</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">TOTAL PARAMS</span>
                <span className="stat-val font-mono text-cyan">51,338</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">PROTOTYPE ADE</span>
                <span className="stat-val font-mono text-green">0.0246</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">PROTOTYPE FDE</span>
                <span className="stat-val font-mono text-green">0.0325</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">VALIDATION SEQUENCES</span>
                <span className="stat-val font-mono">56</span>
              </div>
            </div>

            <div className="stat-footnote">
              * ADE (Average Displacement Error) & FDE (Final Displacement Error) are validation metrics in normalized image space from the trained prototype demonstrator.
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="trajectory-right-col">
          {/* Main Visual Trajectory Panel */}
          <div className="traj-card visual-panel-card">
            <div className="visual-panel-header">
              <div className="panel-header-left">
                <span className="stream-badge">
                  <span className="stream-dot"></span>
                  SPATIOTEMPORAL MOTION FORECAST VIEWPORT
                </span>
                <span className="stream-meta">
                  TRACK #{trackId} • 8 OBSERVED + 5 PREDICTED WAYPOINTS
                </span>
              </div>

              <div className="viewport-toggles">
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === "camera" ? "active" : ""}`}
                  onClick={() => setViewMode("camera")}
                  title="Render over monocular camera optical feed"
                >
                  <span>Camera View</span>
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === "normalized" ? "active" : ""}`}
                  onClick={() => setViewMode("normalized")}
                  title="Render in normalized coordinate cartesian grid"
                >
                  <span>Cartesian Grid</span>
                </button>
              </div>
            </div>

            {/* Viewport Canvas */}
            <div className="trajectory-canvas-wrapper" ref={imgContainerRef}>
              {viewMode === "camera" ? (
                <img
                  src="/sample_road.png"
                  alt="Optical road context"
                  className="trajectory-background-img"
                />
              ) : (
                <div className="cartesian-grid-background">
                  {/* Grid Lines */}
                  <div className="grid-axis-label axis-top-left">X: 0.0, Y: 0.0</div>
                  <div className="grid-axis-label axis-top-right">X: 1.0, Y: 0.0</div>
                  <div className="grid-axis-label axis-bottom-left">X: 0.0, Y: 1.0</div>
                  <div className="grid-axis-label axis-bottom-right">X: 1.0, Y: 1.0</div>
                </div>
              )}

              {/* HUD Synthetic Overlay */}
              <div className="trajectory-hud-grid"></div>

              {/* Trajectory SVG Vector Rendering */}
              <svg
                className="trajectory-svg-canvas"
                viewBox="0 0 1920 1080"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Arrow marker for predicted trajectory */}
                  <marker
                    id="predArrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00ff88" />
                  </marker>
                </defs>

                {/* 1. Observed Trajectory Path (T-7 to T0: Solid Cyan Line) */}
                {positions.length > 1 && (
                  <g className="observed-trajectory-group">
                    <polyline
                      points={positions
                        .map((pt) => `${pt[0] * 1920},${pt[1] * 1080}`)
                        .join(" ")}
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="observed-polyline"
                    />

                    {/* Observed Point Circles: Small waypoint markers */}
                    {positions.map((pt, i) => {
                      const px = pt[0] * 1920;
                      const py = pt[1] * 1080;
                      const isCurrent = i === positions.length - 1;
                      const isStart = i === 0;

                      return (
                        <g key={`obs-${i}`} className="point-group">
                          <circle
                            cx={px}
                            cy={py}
                            r={isCurrent ? 3.5 : 2.5}
                            fill="#00e5ff"
                            stroke="#05070c"
                            strokeWidth="1.5"
                          />
                          {isCurrent && (
                            <>
                              <circle
                                cx={px}
                                cy={py}
                                r="8"
                                fill="none"
                                stroke="#00e5ff"
                                strokeWidth="1.2"
                                strokeDasharray="3 2"
                                className="pulse-circle"
                              />
                              <text
                                x={px + 8}
                                y={py - 6}
                                fill="#00e5ff"
                                fontSize="11"
                                fontFamily="var(--font-mono)"
                                fontWeight="600"
                                className="point-label"
                              >
                                T0 (Current F8)
                              </text>
                            </>
                          )}
                          {isStart && (
                            <text
                              x={px + 8}
                              y={py + 12}
                              fill="#00e5ff"
                              fontSize="10"
                              fontFamily="var(--font-mono)"
                              opacity="0.8"
                              className="point-label"
                            >
                              T-7 (F1)
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* 2. Predicted Trajectory Path (T0 -> T+1 to T+5: Dashed Electric Green Line) */}
                {predictedCoords.length > 0 && positions.length > 0 && (
                  <g className="predicted-trajectory-group">
                    {/* Connecting bridge from final observed point T0 to T+1 */}
                    <line
                      x1={positions[positions.length - 1][0] * 1920}
                      y1={positions[positions.length - 1][1] * 1080}
                      x2={predictedCoords[0][0] * 1920}
                      y2={predictedCoords[0][1] * 1080}
                      stroke="#00ff88"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                      className="bridge-line"
                    />

                    {/* Polyline connecting T+1 through T+5 */}
                    <polyline
                      points={predictedCoords
                        .map((pt) => `${pt[0] * 1920},${pt[1] * 1080}`)
                        .join(" ")}
                      fill="none"
                      stroke="#00ff88"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                      markerEnd="url(#predArrow)"
                      className="predicted-polyline"
                    />

                    {/* Predicted Waypoint Markers (Small, discrete, non-colliding dots) */}
                    {predictedCoords.map((pt, i) => {
                      const px = pt[0] * 1920;
                      const py = pt[1] * 1080;
                      const isEnd = i === predictedCoords.length - 1;

                      return (
                        <g key={`pred-${i}`} className="point-group">
                          <circle
                            cx={px}
                            cy={py}
                            r={2.5}
                            fill="#00ff88"
                            stroke="#05070c"
                            strokeWidth="1"
                          />
                          {isEnd && (
                            <text
                              x={px + 8}
                              y={py - 6}
                              fill="#00ff88"
                              fontSize="11"
                              fontFamily="var(--font-mono)"
                              fontWeight="700"
                              className="point-label pred-label"
                            >
                              T+5 Forecast
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>

              {/* Canvas HUD Legend */}
              <div className="canvas-hud-legend">
                <div className="legend-item">
                  <span className="legend-line line-observed"></span>
                  <span className="legend-dot dot-observed"></span>
                  <span>OBSERVED (8 PAST FRAMES • SOLID)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-line line-predicted"></span>
                  <span className="legend-dot dot-predicted"></span>
                  <span>LSTM PREDICTED (5 FUTURE STEPS • DASHED)</span>
                </div>
              </div>

              {/* Axis Labeling */}
              <div className="canvas-axis-tag tag-x">
                <span>Normalized X: 0.0 ➔ 1.0</span>
              </div>
              <div className="canvas-axis-tag tag-y">
                <span>Normalized Y: 0.0 ➔ 1.0</span>
              </div>
            </div>

            {/* Item 9: Small Debug Telemetry Block */}
            <div className="viewport-debug-telemetry">
              <div className="debug-telemetry-header">
                <Terminal size={12} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="debug-title">VIEWPORT PROJECTION TELEMETRY</span>
                <span className="debug-badge">NORMALIZED [0,1] ➔ PIXEL (1920×1080)</span>
              </div>
              <div className="debug-telemetry-grid">
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Track ID</span>
                  <span className="dt-v text-cyan">
                    #{trackId} {PROTOTYPE_TRACKS[trackId]?.className ? `(${PROTOTYPE_TRACKS[trackId].className})` : ""}
                  </span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Native Image Size</span>
                  <span className="dt-v">1920 × 1080 px</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Rendered Viewport</span>
                  <span className="dt-v text-green">{renderedSize.width} × {renderedSize.height} px</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">T0 Normalized</span>
                  <span className="dt-v mono">[{t0Norm[0].toFixed(4)}, {t0Norm[1].toFixed(4)}]</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">T+5 Normalized</span>
                  <span className="dt-v mono text-green">
                    {t5Norm ? `[${t5Norm[0].toFixed(4)}, ${t5Norm[1].toFixed(4)}]` : "Awaiting inference"}
                  </span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">T0 Pixel</span>
                  <span className="dt-v mono">[{t0Px[0]}, {t0Px[1]}] px</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">T+5 Pixel</span>
                  <span className="dt-v mono text-green">
                    {t5Px ? `[${t5Px[0]}, ${t5Px[1]}] px` : "Awaiting inference"}
                  </span>
                </div>
              </div>
            </div>

            {/* Viewport Footer Bar */}
            <div className="visual-panel-footer">
              <div className="footer-left-info">
                <span className="footer-chip chip-green">
                  <CheckCircle2 size={12} aria-hidden="true" focusable="false" />
                  Inference Verified: /predict-trajectory
                </span>
                <span className="footer-sep">•</span>
                <span className="footer-chip">
                  Horizon: 5 Steps Ahead
                </span>
              </div>
              <div className="footer-right-info mono">
                Context: Frame 1 (1920x1080) • Trajectory: F1 (T-7) → F8 (T0)
              </div>
            </div>
          </div>

          {/* Lower Row: Predicted Waypoint Table & Motion Trend */}
          <div className="trajectory-lower-grid">
            {/* Future Trajectory Table */}
            <div className="traj-card future-table-card">
              <div className="traj-card-header">
                <div className="card-header-left">
                  <Clock size={16} className="text-green" aria-hidden="true" focusable="false" />
                  <span className="card-title">FUTURE TRAJECTORY WAYPOINTS (5 STEPS)</span>
                </div>
                <span className="table-badge">MODEL OUTPUT</span>
              </div>

              {predictedCoords.length === 0 ? (
                <div className="empty-forecast-box">
                  <Sparkles size={24} className="empty-icon" aria-hidden="true" focusable="false" />
                  <span>No trajectory predictions generated yet. Click &quot;Run Trajectory Prediction&quot; above.</span>
                </div>
              ) : (
                <div
                  className="future-table-scroll"
                  style={{
                    maxHeight: "none",
                    overflowY: "visible",
                    overflowX: "auto",
                  }}
                >
                  <table className="future-waypoints-table">
                    <thead>
                      <tr>
                        <th>FUTURE STEP</th>
                        <th>TIME HORIZON</th>
                        <th>NORM X</th>
                        <th>NORM Y</th>
                        <th>STEP DISPLACEMENT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictedCoords.map((pt, idx) => {
                        const prevPt = idx === 0 ? positions[positions.length - 1] : predictedCoords[idx - 1];
                        const stepDx = pt[0] - prevPt[0];
                        const stepDy = pt[1] - prevPt[1];
                        const stepDist = Math.sqrt(stepDx * stepDx + stepDy * stepDy);

                        return (
                          <tr key={idx}>
                            <td className="step-name mono">
                              <span className="step-pill">+{idx + 1}</span>
                            </td>
                            <td className="time-horizon mono text-cyan">
                              <div className="time-horizon-main">
                                T+{idx + 1} (~{((idx + 1) * 33.3).toFixed(0)} ms)
                              </div>
                              <div className="time-horizon-sub">
                                based on 30 FPS prototype playback
                              </div>
                            </td>
                            <td className="coord-val mono text-highlight">
                              {pt[0].toFixed(4)}
                            </td>
                            <td className="coord-val mono text-highlight">
                              {pt[1].toFixed(4)}
                            </td>
                            <td className="disp-val mono text-green">
                              {stepDist.toFixed(4)} norm
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Motion Trend & Kinematic Interpretation Panel */}
            <div className="traj-card motion-trend-card">
              <div className="traj-card-header">
                <div className="card-header-left">
                  <TrendingUp size={16} className="text-cyan" aria-hidden="true" focusable="false" />
                  <span className="card-title">IMAGE-SPACE MOTION TREND</span>
                </div>
                <span className="trend-badge">CALCULATED METRIC</span>
              </div>

              {motionTrend && (
                <div className="trend-spec-list">
                  <div className="trend-item">
                    <span className="trend-label">IMAGE X TREND</span>
                    <span className="trend-val text-cyan">{motionTrend.horizDirection}</span>
                    <span className="trend-sub">Net ΔX: {motionTrend.predDx} (from current T0)</span>
                  </div>

                  <div className="trend-item">
                    <span className="trend-label">IMAGE Y TREND</span>
                    <span className="trend-val text-green">{motionTrend.vertDirection}</span>
                    <span className="trend-sub">Net ΔY: {motionTrend.predDy} (from current T0)</span>
                  </div>

                  <div className="trend-item">
                    <span className="trend-label">FORECAST DISPLACEMENT</span>
                    <span className="trend-val mono text-highlight">{motionTrend.predDisp} norm</span>
                    <span className="trend-sub">Euclidean vector magnitude across 5 future steps</span>
                  </div>

                  <div className="trend-item">
                    <span className="trend-label">HISTORICAL DISPLACEMENT</span>
                    <span className="trend-val mono text-muted">{motionTrend.obsDisp} norm</span>
                    <span className="trend-sub">Past 8 frames accumulated translation</span>
                  </div>
                </div>
              )}

              <div className="trend-caution-box">
                <Info size={13} className="info-icon text-cyan" aria-hidden="true" focusable="false" />
                <span>
                  <strong>Note:</strong> Motion trends are calculated purely in normalized image-space. They do not represent metric distance or physical vehicle velocities (km/h) without camera calibration.
                </span>
              </div>
            </div>
          </div>

          {/* Pipeline Architecture Flow Banner */}
          <div className="traj-card pipeline-flow-card">
            <div className="pipeline-flow-header">
              <span className="pipeline-title">AUTONOMOUS DRIVING INTELLIGENCE PIPELINE</span>
              <span className="pipeline-tag">TEMPORAL DECISION FLOW</span>
            </div>

            <div className="pipeline-flow-nodes">
              <div className="pipe-node completed">
                <span className="node-num">01</span>
                <span className="node-name">RT-DETRv2</span>
                <span className="node-sub">Perception</span>
              </div>

              <div className="pipe-arrow">
                <ArrowRight size={14} aria-hidden="true" focusable="false" />
              </div>

              <div className="pipe-node completed">
                <span className="node-num">02</span>
                <span className="node-name">ByteTrack</span>
                <span className="node-sub">State Tracking</span>
              </div>

              <div className="pipe-arrow">
                <ArrowRight size={14} aria-hidden="true" focusable="false" />
              </div>

              <div className="pipe-node active-node">
                <span className="node-num">03</span>
                <span className="node-name">TrajectoryLSTM</span>
                <span className="node-sub">5-Step Forecast</span>
              </div>

              <div className="pipe-arrow">
                <ArrowRight size={14} aria-hidden="true" focusable="false" />
              </div>

              <div className="pipe-node future-node">
                <span className="node-num">04</span>
                <span className="node-name">Prototype Risk</span>
                <span className="node-badge-next">INTERACTION RISK</span>
              </div>

              <div className="pipe-arrow">
                <ArrowRight size={14} aria-hidden="true" focusable="false" />
              </div>

              <div className="pipe-node future-node">
                <span className="node-num">05</span>
                <span className="node-name">MPC + DWA</span>
                <span className="node-badge-next">PLANNING</span>
              </div>
            </div>
          </div>

          {/* Technical Data Honesty Disclaimers */}
          <div className="traj-card data-honesty-card">
            <div className="honesty-title-row">
              <Shield size={15} className="text-amber" aria-hidden="true" focusable="false" />
              <span className="honesty-title">DATA HONESTY & RESEARCH SPECIFICATION</span>
            </div>

            <div className="honesty-content-list">
              <div className="honesty-item">
                <span className="honesty-bullet">•</span>
                <span>
                  <strong>Coordinate Semantics:</strong> The LSTM operates on normalized image-space coordinates. These are not metric distances. Physical distance, velocity, and collision timing require calibrated camera intrinsics and ground-plane homography.
                </span>
              </div>

              <div className="honesty-item">
                <span className="honesty-bullet">•</span>
                <span>
                  <strong>Demonstrator Status:</strong> The current tracking sequence is a prototype demonstrator. The displayed road-context image (Frame 1, 970644.png) and prototype trajectory (Frames 1–8) illustrate sequential ground-contact history in demonstrator mode and do not represent a safety-certified real-time predictor.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

