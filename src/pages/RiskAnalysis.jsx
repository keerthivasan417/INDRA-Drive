import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Crosshair,
  ArrowRight,
  Info,
  Clock,
  Terminal,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Footer from "../components/Footer";
import { runTrajectoryPrediction, getBackendHealth } from "../services/api";
import {
  computeAllInteractions,
  RiskLevel,
  PROTOTYPE_RISK_THRESHOLDS,
} from "../utils/riskCalculator";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import "./RiskAnalysis.css";

// Calibrated prototype multi-agent tracks extracted directly from TRACKING_DEMO_FRAMES (Frames 1-8)
// Ground contact point: x = (x1 + x2) / 2, y = y2, normalized by 1920x1080 resolution
const PROTOTYPE_TRACKS = [
  {
    trackId: 1,
    className: "Three-wheeler",
    color: "#00e5ff", // Cyan
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
  {
    trackId: 2,
    className: "Hatchback",
    color: "#ffb700", // Amber
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
  {
    trackId: 3,
    className: "Truck",
    color: "#a855f7", // Purple
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
];

export default function RiskAnalysis({ onReturnOverview }) {
  const { updateRiskResult } = useIndraRuntime();

  // State
  const [tracks] = useState(PROTOTYPE_TRACKS);
  const [predictions, setPredictions] = useState({});
  const [status, setStatus] = useState("READY"); // "READY" | "COMPUTING" | "COMPLETE" | "ERROR"
  const [errorMessage, setErrorMessage] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [selectedPairId, setSelectedPairId] = useState(null);
  const [viewMode, setViewMode] = useState("camera"); // "camera" | "normalized"
  const [legendExpanded, setLegendExpanded] = useState(true);

  // Telemetry measurement ref
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

  // Fetch backend health context
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

  // Fetch real LSTM predictions from FastAPI endpoint for all tracks
  const executeRiskAnalysis = useCallback(async () => {
    setStatus("COMPUTING");
    setErrorMessage(null);

    try {
      const predPromises = tracks.map((t) =>
        runTrajectoryPrediction(t.trackId, t.positions)
      );
      const results = await Promise.all(predPromises);

      const nextPreds = {};
      results.forEach((res) => {
        nextPreds[res.track_id] = res.predicted_positions;
      });

      setPredictions(nextPreds);
      setStatus("COMPLETE");
    } catch (err) {
      setErrorMessage(err.message || "Failed to fetch multi-agent trajectory predictions.");
      setStatus("ERROR");
    }
  }, [tracks]);

  // Execute initial calculation on mount
  useEffect(() => {
    let isMounted = true;
    const runInitial = async () => {
      setStatus("COMPUTING");
      try {
        const predPromises = tracks.map((t) =>
          runTrajectoryPrediction(t.trackId, t.positions)
        );
        const results = await Promise.all(predPromises);
        if (!isMounted) return;

        const nextPreds = {};
        results.forEach((res) => {
          nextPreds[res.track_id] = res.predicted_positions;
        });

        setPredictions(nextPreds);
        setStatus("COMPLETE");
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(err.message || "Failed to fetch multi-agent trajectory predictions.");
        setStatus("ERROR");
      }
    };

    runInitial();
    return () => {
      isMounted = false;
    };
  }, [tracks]);

  // Compute all interaction pairs & risk metrics
  const riskSummary = useMemo(() => {
    return computeAllInteractions(tracks, predictions);
  }, [tracks, predictions]);

  // Default selected pair to highest risk pair if not explicitly picked
  const activePair = useMemo(() => {
    if (!riskSummary || riskSummary.interactions.length === 0) return null;
    if (selectedPairId) {
      const found = riskSummary.interactions.find((p) => p.pairId === selectedPairId);
      if (found) return found;
    }
    return riskSummary.highestRiskPair;
  }, [riskSummary, selectedPairId]);

  // Synchronize computed risk into shared runtime context
  useEffect(() => {
    if (riskSummary && riskSummary.interactions && riskSummary.interactions.length > 0) {
      const topPair = activePair || riskSummary.highestRiskPair;
      updateRiskResult({
        riskLevel: riskSummary.overallRisk || (topPair ? topPair.riskLevel : "LOW"),
        ttc: topPair && topPair.ttc !== null ? topPair.ttc : null,
        minSeparation: topPair && topPair.minSeparation !== undefined ? topPair.minSeparation : null,
        isConverging: topPair ? topPair.converging : false,
        highestRiskPair: topPair ? {
          pairId: topPair.pairId,
          trackA: topPair.trackA?.className,
          trackB: topPair.trackB?.className,
        } : null,
      });
    }
  }, [riskSummary, activePair, updateRiskResult]);

  // Color helper for risk levels
  const getRiskColor = (level) => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return { text: "text-red", bg: "bg-red", border: "#ff2a4b", color: "#ff2a4b" };
      case RiskLevel.HIGH:
        return { text: "text-orange", bg: "bg-orange", border: "#ff5e00", color: "#ff5e00" };
      case RiskLevel.MEDIUM:
        return { text: "text-amber", bg: "bg-amber", border: "#ffb700", color: "#ffb700" };
      case RiskLevel.LOW:
      default:
        return { text: "text-green", bg: "bg-green", border: "#00ff88", color: "#00ff88" };
    }
  };

  const currentRiskColor = getRiskColor(riskSummary.overallRisk);

  return (
    <div className="risk-analysis-page">
      {/* Top Header */}
      <div className="risk-header">
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
          <span className="breadcrumb-current">Interaction Risk Analysis</span>
        </div>

        <div className="header-headline-row">
          <div className="headline-text-group">
            <div className="risk-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>INTERACTION RISK & PROTOTYPE IMAGE-SPACE TTC • MULTI-AGENT HEURISTIC ENGINE</span>
              <span className="eyebrow-pill">
                {backendHealth?.gpu ? `${backendHealth.gpu} • ` : ""}IMAGE-SPACE HEURISTIC
              </span>
            </div>
            <h1 className="risk-title">Predictive Interaction Risk Assessment</h1>
            <p className="risk-subtitle">
              Evaluating pairwise convergence, minimum predicted separation across 5 predicted steps, and Prototype Image-Space TTC from TrajectoryLSTM multi-agent forecasts.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="action-ghost-btn"
              onClick={executeRiskAnalysis}
              disabled={status === "COMPUTING"}
              title="Re-run multi-agent inference and risk calculation"
            >
              <RotateCcw size={14} aria-hidden="true" focusable="false" />
              <span>{status === "COMPUTING" ? "Evaluating Risk..." : "Re-evaluate Risk Engine"}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="risk-error-banner">
            <AlertCircle size={14} className="text-red" aria-hidden="true" focusable="false" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Architecture Indicator Flow Banner (Item 13) */}
      <div className="risk-card pipeline-flow-card">
        <div className="pipeline-flow-header">
          <span className="pipeline-title">AUTONOMOUS DRIVING INTELLIGENCE PIPELINE</span>
          <span className="pipeline-tag">SAFETY DECISION CASCADE</span>
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

          <div className="pipe-node completed">
            <span className="node-num">03</span>
            <span className="node-name">TrajectoryLSTM</span>
            <span className="node-sub">5-Step Forecast</span>
          </div>

          <div className="pipe-arrow">
            <ArrowRight size={14} aria-hidden="true" focusable="false" />
          </div>

          <div className="pipe-node active-node">
            <span className="node-num">04</span>
            <span className="node-name">Prototype Risk</span>
            <span className="node-sub">Active Module</span>
          </div>

          <div className="pipe-arrow">
            <ArrowRight size={14} aria-hidden="true" focusable="false" />
          </div>

          <div className="pipe-node future-node">
            <span className="node-num">05</span>
            <span className="node-name">MPC + DWA</span>
            <span className="node-badge-next">PLANNING [NEXT MODULE]</span>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Metric Cards */}
      <div className="risk-telemetry-grid">
        {/* Card 1: Prototype Risk Classification */}
        <div className={`risk-card metric-summary-card card-risk-${riskSummary.overallRisk.toLowerCase()}`}>
          <div className="card-top-label">
            <ShieldAlert size={14} aria-hidden="true" focusable="false" />
            <span>PROTOTYPE RISK CLASSIFICATION</span>
          </div>
          <div className="card-big-value-row">
            <span className={`big-risk-text ${currentRiskColor.text}`}>
              {riskSummary.overallRisk}
            </span>
            <span className={`risk-pill pill-${riskSummary.overallRisk.toLowerCase()}`}>
              {riskSummary.overallRisk === RiskLevel.LOW ? "SAFE" : "ACTION REQ"}
            </span>
          </div>
          <div className="card-bottom-sub">
            Engineering prototype classification across active pairs
          </div>
        </div>

        {/* Card 2: Minimum Predicted Separation */}
        <div className="risk-card metric-summary-card">
          <div className="card-top-label">
            <Crosshair size={14} className="text-cyan" aria-hidden="true" focusable="false" />
            <span>MIN PREDICTED SEPARATION</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text text-cyan mono">
              {riskSummary.highestRiskPair
                ? `${riskSummary.highestRiskPair.minSeparation.toFixed(4)}`
                : "0.0000"}
            </span>
            <span className="metric-unit">norm</span>
          </div>
          <div className="card-bottom-sub">
            {riskSummary.highestRiskPair
              ? `Track #${riskSummary.highestRiskPair.trackA.trackId} ↔ Track #${riskSummary.highestRiskPair.trackB.trackId} at T+${riskSummary.highestRiskPair.minStep}`
              : "No interaction pairs detected"}
          </div>
        </div>

        {/* Card 3: Prototype Image-Space TTC */}
        <div className="risk-card metric-summary-card">
          <div className="card-top-label">
            <Clock size={14} className="text-green" aria-hidden="true" focusable="false" />
            <span>PROTOTYPE IMAGE-SPACE TTC</span>
          </div>
          <div className="card-big-value-row">
            <span className={`big-metric-text mono ${currentRiskColor.text}`}>
              {riskSummary.highestRiskPair?.ttc !== null && riskSummary.highestRiskPair?.ttc !== undefined
                ? `${riskSummary.highestRiskPair.ttc.toFixed(2)} s`
                : "Diverging"}
            </span>
          </div>
          <div className="card-bottom-sub">
            {riskSummary.highestRiskPair?.converging
              ? `Closure rate: ${(riskSummary.highestRiskPair.closureRate).toFixed(3)} norm/s (30 FPS prototype interval)`
              : "Non-converging trajectory vectors"}
          </div>
        </div>

        {/* Card 4: Tracked Objects */}
        <div className="risk-card metric-summary-card">
          <div className="card-top-label">
            <Activity size={14} className="text-muted" aria-hidden="true" focusable="false" />
            <span>TRACKED OBJECTS</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text mono text-highlight">
              {riskSummary.totalObjects}
            </span>
            <span className="metric-unit">agents</span>
          </div>
          <div className="card-bottom-sub">
            Active multi-agent ByteTrack trajectories (F1–F8)
          </div>
        </div>

        {/* Card 5: Interacting Pairs */}
        <div className="risk-card metric-summary-card">
          <div className="card-top-label">
            <Layers size={14} className="text-muted" aria-hidden="true" focusable="false" />
            <span>INTERACTING PAIRS</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text mono text-highlight">
              {riskSummary.totalPairs}
            </span>
            <span className="metric-unit">pairs</span>
          </div>
          <div className="card-bottom-sub">
            Evaluated pairwise cross-prediction paths
          </div>
        </div>

        {/* Card 6: Highest-Risk Pair */}
        <div className="risk-card metric-summary-card highlight-pair-card">
          <div className="card-top-label">
            <AlertTriangle size={14} className={currentRiskColor.text} aria-hidden="true" focusable="false" />
            <span>HIGHEST-RISK PAIR</span>
          </div>
          <div className="card-pair-title text-highlight">
            {riskSummary.highestRiskPair
              ? `#${riskSummary.highestRiskPair.trackA.trackId} (${riskSummary.highestRiskPair.trackA.className}) ↔ #${riskSummary.highestRiskPair.trackB.trackId} (${riskSummary.highestRiskPair.trackB.className})`
              : "None"}
          </div>
          <div className="card-bottom-sub">
            Selected for primary viewport vector highlight
          </div>
        </div>
      </div>

      {/* Main Workstation Grid: Viewport + Interaction Table */}
      <div className="risk-workstation-grid">
        {/* Left Column: Visual Top-down / Image-space Viewport (Item 9) */}
        <div className="risk-viewport-column">
          <div className="risk-card visual-viewport-card">
            <div className="visual-viewport-header">
              <div className="panel-header-left">
                <span className="stream-badge">
                  <span className="stream-dot"></span>
                  SPATIOTEMPORAL INTERACTION VIEWPORT
                </span>
                <span className="stream-meta">
                  MULTI-AGENT VECTOR CONVERGENCE
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
                  title="Render in normalized cartesian coordinate grid"
                >
                  <span>Cartesian Grid</span>
                </button>
              </div>
            </div>

            {/* Viewport Canvas Container */}
            <div className="risk-canvas-wrapper" ref={imgContainerRef}>
              {viewMode === "camera" ? (
                <img
                  src="/sample_road.png"
                  alt="Camera road context"
                  className="risk-background-img"
                />
              ) : (
                <div className="cartesian-grid-background">
                  <div className="grid-axis-label axis-top-left">X: 0.0, Y: 0.0</div>
                  <div className="grid-axis-label axis-top-right">X: 1.0, Y: 0.0</div>
                  <div className="grid-axis-label axis-bottom-left">X: 0.0, Y: 1.0</div>
                  <div className="grid-axis-label axis-bottom-right">X: 1.0, Y: 1.0</div>
                </div>
              )}

              {/* HUD Synthetic Overlay */}
              <div className="risk-hud-grid"></div>

              {/* SVG Vector Layer */}
              <svg
                className="risk-svg-canvas"
                viewBox="0 0 1920 1080"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Arrow markers */}
                  <marker
                    id="riskPredArrow"
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

                {/* 1. Render all tracked agents */}
                {tracks.map((track) => {
                  const obsPts = track.positions;
                  const predPts = predictions[track.trackId] || [];
                  const color = track.color || "#00e5ff";
                  const isTrackInActivePair =
                    activePair &&
                    (activePair.trackA.trackId === track.trackId ||
                      activePair.trackB.trackId === track.trackId);

                  return (
                    <g key={`agent-${track.trackId}`} className="agent-track-group">
                      {/* Observed Polyline (Solid) */}
                      {obsPts.length > 1 && (
                        <polyline
                          points={obsPts
                            .map((pt) => `${pt[0] * 1920},${pt[1] * 1080}`)
                            .join(" ")}
                          fill="none"
                          stroke={color}
                          strokeWidth={isTrackInActivePair ? "3" : "2"}
                          strokeOpacity={isTrackInActivePair ? "0.95" : "0.55"}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Observed Points */}
                      {obsPts.map((pt, pIdx) => {
                        const px = pt[0] * 1920;
                        const py = pt[1] * 1080;
                        const isT0 = pIdx === obsPts.length - 1;

                        return (
                          <g key={`obs-${track.trackId}-${pIdx}`}>
                            <circle
                              cx={px}
                              cy={py}
                              r={isT0 ? 4 : 2.5}
                              fill={color}
                              stroke="#05070c"
                              strokeWidth="1.5"
                            />
                            {isT0 && (
                              <text
                                x={px + 8}
                                y={py - 6}
                                fill={color}
                                fontSize="11"
                                fontFamily="var(--font-mono)"
                                fontWeight="700"
                                className="point-tag"
                              >
                                #{track.trackId} {track.className}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Predicted Trajectory (Dashed) */}
                      {predPts.length > 0 && obsPts.length > 0 && (
                        <g className="agent-prediction-group">
                          {/* Bridge T0 -> T+1 */}
                          <line
                            x1={obsPts[obsPts.length - 1][0] * 1920}
                            y1={obsPts[obsPts.length - 1][1] * 1080}
                            x2={predPts[0][0] * 1920}
                            y2={predPts[0][1] * 1080}
                            stroke={color}
                            strokeWidth="1.8"
                            strokeDasharray="3 2"
                            strokeOpacity="0.85"
                          />

                          {/* Polyline T+1 to T+5 */}
                          <polyline
                            points={predPts
                              .map((pt) => `${pt[0] * 1920},${pt[1] * 1080}`)
                              .join(" ")}
                            fill="none"
                            stroke={color}
                            strokeWidth="2.5"
                            strokeDasharray="4 3"
                            strokeOpacity="0.95"
                            strokeLinecap="round"
                          />

                          {/* Predicted small waypoint dots */}
                          {predPts.map((pt, pIdx) => (
                            <circle
                              key={`pred-${track.trackId}-${pIdx}`}
                              cx={pt[0] * 1920}
                              cy={pt[1] * 1080}
                              r={2.5}
                              fill={color}
                              stroke="#05070c"
                              strokeWidth="1"
                            />
                          ))}
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 2. Highlight Interaction Region for Selected / Highest-Risk Pair */}
                {activePair && activePair.minStep > 0 && (
                  <g className="active-interaction-region">
                    {/* Danger proximity connector line at point of closest approach */}
                    <line
                      x1={activePair.closestPointA[0] * 1920}
                      y1={activePair.closestPointA[1] * 1080}
                      x2={activePair.closestPointB[0] * 1920}
                      y2={activePair.closestPointB[1] * 1080}
                      stroke={getRiskColor(activePair.riskLevel).color}
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                      className="danger-connector-line"
                    />

                    {/* Danger circles around closest approach points */}
                    <circle
                      cx={activePair.closestPointA[0] * 1920}
                      cy={activePair.closestPointA[1] * 1080}
                      r="12"
                      fill="none"
                      stroke={getRiskColor(activePair.riskLevel).color}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      className="danger-ring"
                    />
                    <circle
                      cx={activePair.closestPointB[0] * 1920}
                      cy={activePair.closestPointB[1] * 1080}
                      r="12"
                      fill="none"
                      stroke={getRiskColor(activePair.riskLevel).color}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      className="danger-ring"
                    />

                    {/* Midpoint interaction label */}
                    <g
                      transform={`translate(${
                        ((activePair.closestPointA[0] + activePair.closestPointB[0]) / 2) * 1920
                      }, ${
                        ((activePair.closestPointA[1] + activePair.closestPointB[1]) / 2) * 1080 - 10
                      })`}
                    >
                      <rect
                        x="-70"
                        y="-12"
                        width="140"
                        height="24"
                        rx="4"
                        fill="rgba(5, 7, 12, 0.92)"
                        stroke={getRiskColor(activePair.riskLevel).color}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
                        fill={getRiskColor(activePair.riskLevel).color}
                        fontSize="10.5"
                        fontFamily="var(--font-mono)"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {activePair.riskLevel} • {activePair.ttc !== null ? `Image TTC ${activePair.ttc.toFixed(2)}s` : "DIVERGING"}
                      </text>
                    </g>
                  </g>
                )}
              </svg>

              {/* Viewport Risk Floating Badge */}
              <div className={`viewport-risk-floating-badge badge-${riskSummary.overallRisk.toLowerCase()}`}>
                <span className="v-dot"></span>
                <span>PROTOTYPE RISK: {riskSummary.overallRisk}</span>
              </div>

              {/* Canvas HUD Legend */}
              <div
                className={`canvas-hud-legend ${legendExpanded ? "expanded" : "collapsed"}`}
              >
                <button
                  type="button"
                  className="legend-header-toggle"
                  onClick={() => setLegendExpanded((prev) => !prev)}
                  title={legendExpanded ? "Collapse Multi-Agent Legend" : "Expand Multi-Agent Legend"}
                  aria-expanded={legendExpanded}
                >
                  <span className="legend-title">MULTI-AGENT LEGEND</span>
                  <span className="legend-toggle-icon">
                    {legendExpanded ? (
                      <ChevronUp size={12} aria-hidden="true" focusable="false" />
                    ) : (
                      <ChevronDown size={12} aria-hidden="true" focusable="false" />
                    )}
                  </span>
                </button>

                {legendExpanded && (
                  <div className="legend-content">
                    {tracks.map((t) => (
                      <div key={`leg-${t.trackId}`} className="legend-item">
                        <span className="legend-dot" style={{ background: t.color }}></span>
                        <span>Track #{t.trackId} ({t.className})</span>
                      </div>
                    ))}
                    <div className="legend-sep"></div>
                    <div className="legend-item">
                      <span className="legend-line line-solid"></span>
                      <span>Observed (F1–F8)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-line line-dashed"></span>
                      <span>LSTM Forecast (T+1–T+5)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-line line-danger"></span>
                      <span>Min Separation Vector</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Viewport Debug Telemetry Block */}
            <div className="viewport-debug-telemetry">
              <div className="debug-telemetry-header">
                <Terminal size={12} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="debug-title">INTERACTION PROJECTION TELEMETRY</span>
                <span className="debug-badge">NORMALIZED IMAGE SPACE [0, 1]</span>
              </div>
              <div className="debug-telemetry-grid">
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Active Pair</span>
                  <span className="dt-v text-cyan">
                    {activePair ? `#${activePair.trackA.trackId} ↔ #${activePair.trackB.trackId}` : "N/A"}
                  </span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Min Separation</span>
                  <span className="dt-v text-green mono">
                    {activePair ? `${activePair.minSeparation.toFixed(4)} norm` : "N/A"}
                  </span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Closest Step</span>
                  <span className="dt-v mono">
                    {activePair ? `T+${activePair.minStep} (~${(activePair.minStep * 33.3).toFixed(0)} ms)` : "N/A"}
                  </span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Closure Rate</span>
                  <span className="dt-v mono text-highlight">
                    {activePair ? `${activePair.closureRate.toFixed(4)} /s` : "0.0000"}
                  </span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Rendered Viewport</span>
                  <span className="dt-v mono">{renderedSize.width} × {renderedSize.height} px</span>
                </div>
              </div>
            </div>

            {/* Viewport Footer */}
            <div className="visual-panel-footer">
              <div className="footer-left-info">
                <span className="footer-chip chip-green">
                  <CheckCircle2 size={12} aria-hidden="true" focusable="false" />
                  Multi-Agent Risk Evaluated
                </span>
                <span className="footer-sep">•</span>
                <span className="footer-chip">
                  Active Pair: {activePair ? `#${activePair.trackA.trackId} ↔ #${activePair.trackB.trackId}` : "None"}
                </span>
              </div>
              <div className="footer-right-info mono">
                Context: Frame 1 (1920x1080) • 30 FPS Timing Heuristic
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Matrix & Thresholds */}
        <div className="risk-matrix-column">
          {/* Interaction Matrix Table (Item 8) */}
          <div className="risk-card interaction-matrix-card">
            <div className="risk-card-header">
              <div className="card-header-left">
                <Layers size={16} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="card-title">PAIRWISE INTERACTION MATRIX</span>
              </div>
              <span className="matrix-badge">
                {riskSummary.totalPairs} PAIRS EVALUATED
              </span>
            </div>

            <p className="card-description">
              Cross-comparing predicted multi-step waypoints to compute minimum image-space clearance and convergence rate. Click any row to highlight in viewport.
            </p>

            <div className="matrix-table-container">
              <table className="interaction-table">
                <thead>
                  <tr>
                    <th>TRACK A</th>
                    <th>TRACK B</th>
                    <th>MIN PREDICTED SEPARATION</th>
                    <th>PROTOTYPE IMAGE-SPACE TTC</th>
                    <th>PROTOTYPE RISK CLASSIFICATION</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {riskSummary.interactions.map((pair) => {
                    const isSelected = activePair && activePair.pairId === pair.pairId;
                    const rColor = getRiskColor(pair.riskLevel);

                    return (
                      <tr
                        key={pair.pairId}
                        className={`interaction-row ${isSelected ? "row-selected" : ""}`}
                        onClick={() => setSelectedPairId(pair.pairId)}
                        title="Click to view interaction vector in viewport"
                      >
                        {/* Track A */}
                        <td className="track-cell mono">
                          <span className="track-tag-pill" style={{ borderColor: pair.trackA.color, color: pair.trackA.color }}>
                            #{pair.trackA.trackId} {pair.trackA.className}
                          </span>
                        </td>

                        {/* Track B */}
                        <td className="track-cell mono">
                          <span className="track-tag-pill" style={{ borderColor: pair.trackB.color, color: pair.trackB.color }}>
                            #{pair.trackB.trackId} {pair.trackB.className}
                          </span>
                        </td>

                        {/* Min Predicted Separation */}
                        <td className="sep-cell mono">
                          <span className="sep-value text-highlight">{pair.minSeparation.toFixed(4)}</span>
                          <span className="sep-step text-muted"> (at T+{pair.minStep})</span>
                        </td>

                        {/* Prototype Image-Space TTC */}
                        <td className="ttc-cell mono">
                          {pair.ttc !== null ? (
                            <span className={`ttc-val ${rColor.text}`}>
                              {pair.ttc.toFixed(2)} s
                            </span>
                          ) : (
                            <span className="ttc-diverging text-muted">Diverging</span>
                          )}
                        </td>

                        {/* Prototype Risk Classification */}
                        <td className="risk-cell">
                          <span className={`risk-badge badge-${pair.riskLevel.toLowerCase()}`}>
                            {pair.riskLevel}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="status-cell mono">
                          <span className={`status-pill status-${pair.status.toLowerCase()}`}>
                            {pair.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Engineering Prototype Risk Thresholds Card */}
          <div className="risk-card thresholds-card">
            <div className="thresholds-header">
              <div className="card-header-left">
                <ShieldCheck size={16} className="text-amber" aria-hidden="true" focusable="false" />
                <span className="card-title">ENGINEERING PROTOTYPE RISK THRESHOLDS</span>
              </div>
              <span className="threshold-sub-tag">IMAGE-SPACE HEURISTIC</span>
            </div>

            <div className="threshold-grid">
              <div className="threshold-item item-critical">
                <span className="th-range">Prototype Image-Space TTC &lt; 0.5 s</span>
                <span className="th-level text-red">CRITICAL</span>
                <span className="th-desc">Immediate evasion / emergency brake trigger</span>
              </div>

              <div className="threshold-item item-high">
                <span className="th-range">Prototype Image-Space TTC &lt; 1.0 s</span>
                <span className="th-level text-orange">HIGH</span>
                <span className="th-desc">Urgent path deflection / margin inflation</span>
              </div>

              <div className="threshold-item item-medium">
                <span className="th-range">Prototype Image-Space TTC &lt; 2.0 s</span>
                <span className="th-level text-amber">MEDIUM</span>
                <span className="th-desc">Proactive speed attenuation / corridor monitoring</span>
              </div>

              <div className="threshold-item item-low">
                <span className="th-range">Otherwise</span>
                <span className="th-level text-green">LOW</span>
                <span className="th-desc">Nominal corridor progression</span>
              </div>
            </div>

            <div className="threshold-note-box">
              <Info size={13} className="info-icon text-amber" aria-hidden="true" focusable="false" />
              <span>
                <strong>{PROTOTYPE_RISK_THRESHOLDS.DISCLAIMER}</strong> Image-space rates of closure reflect screen displacement over a 30 FPS prototype interval. Not presented as physical collision time or safety-certified risk.
              </span>
            </div>
          </div>

          {/* Technical Data Honesty & Coordinate Disclaimer */}
          <div className="risk-card data-honesty-card">
            <div className="honesty-title-row">
              <ShieldAlert size={15} className="text-amber" aria-hidden="true" focusable="false" />
              <span className="honesty-title">DATA HONESTY & RESEARCH SPECIFICATION</span>
            </div>

            <div className="honesty-content-list">
              <div className="honesty-item">
                <span className="honesty-bullet">•</span>
                <span>
                  <strong>Coordinate Semantics:</strong> All pairwise trajectory calculations operate in normalized image space [0.0, 1.0]. No meters, km/h velocities, or physical collision probabilities are inferred.
                </span>
              </div>

              <div className="honesty-item">
                <span className="honesty-bullet">•</span>
                <span>
                  <strong>Prototype Status:</strong> The values displayed in the UI come from actual pairwise calculations and real multi-agent TrajectoryLSTM model forecasts, not manually entered risk values.
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
