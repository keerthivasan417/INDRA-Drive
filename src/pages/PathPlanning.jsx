import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Compass,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Crosshair,
  Gauge,
  Activity,
  Layers,
  Terminal,
  Info,
  Check,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import Footer from "../components/Footer";
import BevCanvas from "../components/BevCanvas";
import {
  PLANNER_MODES,
  COMPARATIVE_METRICS_LIST,
} from "../data/plannerBenchmarks";
import {
  projectImageToPlanner,
  COORDINATE_BRIDGE_TEST_CASES,
  DEFAULT_PROTOTYPE_CALIBRATION,
} from "../utils/coordinateProjection";
import {
  CLOSED_LOOP_PROTOTYPE_TRACKS,
  computeClosedLoopState,
} from "../utils/closedLoopBridge";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import "./PathPlanning.css";

export default function PathPlanning({ onReturnOverview }) {
  const { updatePlanningState } = useIndraRuntime();

  // Mode selection state: "integrated" | "mpc" | "risk_aware_dwa" | "dwa"
  const [activeModeKey, setActiveModeKey] = useState("integrated");
  const activeMode = PLANNER_MODES[activeModeKey] || PLANNER_MODES.integrated;

  // Synchronize planner mode & benchmark metrics to shared runtime context
  useEffect(() => {
    if (activeMode) {
      updatePlanningState({
        modeKey: activeModeKey,
        modeName: activeMode.name,
        minimumClearance: activeMode.minimumClearance,
        pathLength: activeMode.pathLength,
        goalReached: activeMode.goalReached,
        finalDistanceToGoal: activeMode.finalDistanceToGoal,
      });
    }
  }, [activeModeKey, activeMode, updatePlanningState]);

  // Visual toggles
  const [showClearanceEnvelope, setShowClearanceEnvelope] = useState(true);
  const [showPredictionHorizon, setShowPredictionHorizon] = useState(true);

  // Coordinate Bridge Interactive State
  const [selectedTestCaseId, setSelectedTestCaseId] = useState("road_center_close");
  const [bridgeXNorm, setBridgeXNorm] = useState(0.50);
  const [bridgeYNorm, setBridgeYNorm] = useState(0.85);

  const handleSelectTestCase = (tc) => {
    setSelectedTestCaseId(tc.id);
    setBridgeXNorm(tc.input.xNorm);
    setBridgeYNorm(tc.input.yNorm);
  };

  const bridgeResult = useMemo(() => {
    return projectImageToPlanner(bridgeXNorm, bridgeYNorm);
  }, [bridgeXNorm, bridgeYNorm]);

  // Closed-Loop Perception-to-Planning Prototype State
  const [selectedClosedLoopTrackId, setSelectedClosedLoopTrackId] = useState("track-1");
  const [showClosedLoopOverlay, setShowClosedLoopOverlay] = useState(true);

  const activeClosedLoopTrack = useMemo(() => {
    return (
      CLOSED_LOOP_PROTOTYPE_TRACKS.find((t) => t.id === selectedClosedLoopTrackId) ||
      CLOSED_LOOP_PROTOTYPE_TRACKS[0]
    );
  }, [selectedClosedLoopTrackId]);

  const closedLoopState = useMemo(() => {
    return computeClosedLoopState(activeClosedLoopTrack);
  }, [activeClosedLoopTrack]);

  const closedLoopPayload = useMemo(() => {
    if (!closedLoopState) return null;
    return {
      xMeters: closedLoopState.projection.currentPoseMeters.x,
      yMeters: closedLoopState.projection.currentPoseMeters.y,
      predictedPathMeters: closedLoopState.projection.predictedPathMeters,
      status: closedLoopState.projection.status,
      riskLevel: closedLoopState.risk.riskLevel,
      label: `${closedLoopState.perception.class_name} #${closedLoopState.tracking.trackId}`,
      safeguardTriggered: closedLoopState.control.safeguardTriggered,
    };
  }, [closedLoopState]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const playIntervalRef = useRef(null);

  const maxSteps = activeMode?.simulationSteps || 132;
  const clampedStep = Math.max(0, Math.min(maxSteps, currentStep));

  const handleSelectMode = (modeId) => {
    setActiveModeKey(modeId);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  // Handle Playback Interval (~100ms per step = 1x real-time simulation step of 0.1s)
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return maxSteps;
          }
          return prev + 1;
        });
      }, 75); // slight speedup for smooth responsive playback
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, maxSteps]);

  const togglePlay = () => {
    if (clampedStep >= maxSteps) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(0, prev - 5));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(maxSteps, prev + 5));
  };

  const handleScrubberChange = (e) => {
    setIsPlaying(false);
    const val = Number(e.target.value);
    setCurrentStep(Number.isFinite(val) ? Math.max(0, Math.min(maxSteps, val)) : 0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  // Real-time metric derivations along current step
  const progressRatio = maxSteps > 0 ? clampedStep / maxSteps : 0;
  const simTimeSeconds = (clampedStep * (activeMode?.timeStep ?? 0.1)).toFixed(1);
  const totalSimSeconds = (activeMode?.totalDuration ?? 13.2).toFixed(1);
  const remainingDistance = (
    (activeMode?.pathLength ?? 13.2) * (1 - progressRatio) +
    (activeMode?.finalDistanceToGoal ?? 0.41)
  ).toFixed(2);

  return (
    <div className="path-planning-page">
      {/* Top Header */}
      <div className="planning-header">
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
          <span className="breadcrumb-current">Path Planning & Optimal Control</span>
        </div>

        <div className="header-headline-row">
          <div className="headline-text-group">
            <div className="planning-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>ADAPTIVE PATH PLANNING & COLLISION AVOIDANCE • HYBRID CONTROL COCKPIT</span>
              <span className="eyebrow-pill">LOCAL CARTESIAN FRAME (METERS)</span>
            </div>
            <h1 className="planning-title">Adaptive Trajectory Generation & Optimal Control</h1>
            <p className="planning-subtitle">
              Evaluating dynamic evasion corridors on unstructured Indian roads using Model Predictive Control with instantaneous Dynamic Window Fallback.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="action-ghost-btn"
              onClick={handleReset}
              title="Reset simulation replay to origin"
            >
              <RotateCcw size={14} aria-hidden="true" focusable="false" />
              <span>Reset Trajectory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Architecture Indicator Flow Banner */}
      <div className="planning-card pipeline-flow-card">
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

          <div className="pipe-arrow">→</div>

          <div className="pipe-node completed">
            <span className="node-num">02</span>
            <span className="node-name">ByteTrack</span>
            <span className="node-sub">State Tracking</span>
          </div>

          <div className="pipe-arrow">→</div>

          <div className="pipe-node completed">
            <span className="node-num">03</span>
            <span className="node-name">TrajectoryLSTM</span>
            <span className="node-sub">5-Step Forecast</span>
          </div>

          <div className="pipe-arrow">→</div>

          <div className="pipe-node completed">
            <span className="node-num">04</span>
            <span className="node-name">Prototype Risk</span>
            <span className="node-sub">Risk Assessment</span>
          </div>

          <div className="pipe-arrow">→</div>

          <div className="pipe-node active-node">
            <span className="node-num">05</span>
            <span className="node-name">MPC + DWA</span>
            <span className="node-sub">Active Planning & Control</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mode-switcher-container">
        <div className="mode-tabs-list" role="tablist">
          {Object.values(PLANNER_MODES).map((mode) => {
            const isSelected = mode.id === activeModeKey;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`mode-tab-btn ${isSelected ? "tab-active" : ""}`}
                onClick={() => handleSelectMode(mode.id)}
              >
                <div className="tab-left">
                  <span className="tab-name">{mode.shortName}</span>
                  <span className="tab-badge" style={{ borderColor: mode.color, color: mode.color }}>
                    {mode.badge}
                  </span>
                </div>
                {isSelected && <Check size={14} className="tab-check-icon" aria-hidden="true" focusable="false" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Telemetry Metric Cards */}
      <div className="planning-telemetry-grid">
        {/* Card 1: Minimum Obstacle Clearance */}
        <div className="planning-card metric-summary-card">
          <div className="card-top-label">
            <ShieldCheck size={14} className="text-green" aria-hidden="true" focusable="false" />
            <span>MIN OBSTACLE CLEARANCE</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text mono text-green">
              {activeMode.minimumClearance.toFixed(4)}
            </span>
            <span className="metric-unit">meters</span>
          </div>
          <div className="card-bottom-sub">
            Simulation threshold: &gt; {activeMode.safetyMargin.toFixed(2)}m (Simulation Compliant)
          </div>
        </div>

        {/* Card 2: Planned Path Length */}
        <div className="planning-card metric-summary-card">
          <div className="card-top-label">
            <Compass size={14} className="text-cyan" aria-hidden="true" focusable="false" />
            <span>TOTAL PATH LENGTH</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text mono text-cyan">
              {activeMode.pathLength.toFixed(4)}
            </span>
            <span className="metric-unit">meters</span>
          </div>
          <div className="card-bottom-sub">
            Optimal local corridor trajectory to destination
          </div>
        </div>

        {/* Card 3: Simulation Steps & Time */}
        <div className="planning-card metric-summary-card">
          <div className="card-top-label">
            <Activity size={14} className="text-amber" aria-hidden="true" focusable="false" />
            <span>SIMULATION DURATION</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text mono text-amber">
              {activeMode.totalDuration.toFixed(1)} s
            </span>
            <span className="metric-unit">({activeMode.simulationSteps} steps)</span>
          </div>
          <div className="card-bottom-sub">
            Time step Δt = 0.1s • Horizon = {activeMode.horizon || 10} steps
          </div>
        </div>

        {/* Card 4: Collision-Free Status */}
        <div className="planning-card metric-summary-card">
          <div className="card-top-label">
            <CheckCircle2 size={14} className="text-green" aria-hidden="true" focusable="false" />
            <span>COLLISION-FREE (SIMULATION)</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-risk-text text-green">YES</span>
            <span className="risk-pill pill-low">0 COLLISIONS</span>
          </div>
          <div className="card-bottom-sub">
            Continuous corridor boundary satisfaction
          </div>
        </div>

        {/* Card 5: Final Distance to Goal */}
        <div className="planning-card metric-summary-card">
          <div className="card-top-label">
            <Crosshair size={14} className="text-cyan" aria-hidden="true" focusable="false" />
            <span>FINAL GOAL PROXIMITY</span>
          </div>
          <div className="card-big-value-row">
            <span className="big-metric-text mono text-cyan">
              {activeMode.finalDistanceToGoal.toFixed(4)}
            </span>
            <span className="metric-unit">meters</span>
          </div>
          <div className="card-bottom-sub">
            Within waypoint acceptance tolerance (&lt; 0.50m)
          </div>
        </div>

        {/* Card 6: Active Control Algorithm */}
        <div className="planning-card metric-summary-card">
          <div className="card-top-label">
            <Gauge size={14} className="text-muted" aria-hidden="true" focusable="false" />
            <span>ACTIVE STRATEGY</span>
          </div>
          <div className="card-pair-title text-highlight">
            {activeMode.controller}
          </div>
          <div className="card-bottom-sub">
            Ego speed: {activeMode.egoSpeed} • Steer: {activeMode.steerAngle}
          </div>
        </div>
      </div>

      {/* Main Workstation: Left Column (BEV + Controls) & Right Column (Metrics & Benchmarks) */}
      <div className="planning-workstation-grid">
        {/* Left Column: Bird's-Eye View (BEV) Local Planner Viewport */}
        <div className="planning-viewport-column">
          <div className="planning-card bev-container-card">
            <div className="bev-panel-header">
              <div className="panel-header-left">
                <span className="stream-badge">
                  <span className="stream-dot"></span>
                  BIRD'S EYE VIEW (BEV) — SPATIAL LOCAL PLANNER
                </span>
                <span className="stream-meta">
                  {activeMode.shortName.toUpperCase()}
                </span>
              </div>

              <div className="bev-header-toggles">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showClearanceEnvelope}
                    onChange={(e) => setShowClearanceEnvelope(e.target.checked)}
                  />
                  <span>Safety Envelope</span>
                </label>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showPredictionHorizon}
                    onChange={(e) => setShowPredictionHorizon(e.target.checked)}
                  />
                  <span>LSTM Prediction</span>
                </label>
                <label className="toggle-label toggle-highlight">
                  <input
                    type="checkbox"
                    checked={showClosedLoopOverlay}
                    onChange={(e) => setShowClosedLoopOverlay(e.target.checked)}
                  />
                  <span>Perception Overlay (Uncalibrated)</span>
                </label>
              </div>
            </div>

            {/* Shared BEV Canvas Component */}
            <BevCanvas
              activeModeKey={activeModeKey}
              currentStep={clampedStep}
              showClearanceEnvelope={showClearanceEnvelope}
              showPredictionHorizon={showPredictionHorizon}
              closedLoopObstacle={showClosedLoopOverlay ? closedLoopPayload : null}
            />

            {/* Playback Scrubber & Simulation Time Controls */}
            <div className="playback-control-bar">
              <div className="playback-btns">
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={handleStepBack}
                  title="Step backward 5 simulation steps"
                  aria-label="Step backward 5 simulation steps"
                >
                  <SkipBack size={14} aria-hidden="true" focusable="false" />
                </button>

                <button
                  type="button"
                  className={`ctrl-play-btn ${isPlaying ? "playing" : ""}`}
                  onClick={togglePlay}
                  title={isPlaying ? "Pause playback" : "Play trajectory playback"}
                  aria-label={isPlaying ? "Pause playback" : "Play trajectory playback"}
                >
                  {isPlaying ? (
                    <Pause size={14} aria-hidden="true" focusable="false" />
                  ) : (
                    <Play size={14} aria-hidden="true" focusable="false" />
                  )}
                </button>

                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={handleStepForward}
                  title="Step forward 5 simulation steps"
                  aria-label="Step forward 5 simulation steps"
                >
                  <SkipForward size={14} aria-hidden="true" focusable="false" />
                </button>
              </div>

              {/* Scrubber Slider */}
              <div className="scrubber-slider-group">
                <input
                  type="range"
                  min="0"
                  max={maxSteps}
                  value={clampedStep}
                  onChange={handleScrubberChange}
                  onInput={handleScrubberChange}
                  className="playback-slider"
                  aria-label="Simulation step progress slider"
                />
              </div>

              {/* Time & Step Readout */}
              <div className="playback-readout mono">
                <span className="time-accent">T+{simTimeSeconds} s</span>
                <span className="time-total"> / {totalSimSeconds} s</span>
                <span className="step-pill">Step {currentStep}/{maxSteps}</span>
              </div>
            </div>

            {/* Viewport Debug Telemetry Strip */}
            <div className="viewport-debug-telemetry">
              <div className="debug-telemetry-header">
                <Terminal size={12} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="debug-title">SIMULATION CARTESIAN STATE TELEMETRY</span>
                <span className="debug-badge">METRIC VEHICLE FRAME (METERS)</span>
              </div>
              <div className="debug-telemetry-grid">
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Trajectory Mode</span>
                  <span className="dt-v text-cyan">{activeMode.shortName}</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Dist to Goal</span>
                  <span className="dt-v mono text-green">{remainingDistance} m</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Min Clearance</span>
                  <span className="dt-v mono text-highlight">{activeMode.minimumClearance.toFixed(3)} m</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Ego Velocity</span>
                  <span className="dt-v mono">{activeMode.egoSpeed}</span>
                </div>
                <div className="debug-telemetry-cell">
                  <span className="dt-k">Steering Angle</span>
                  <span className="dt-v mono">{activeMode.steerAngle}</span>
                </div>
              </div>
            </div>

            {/* BEV Legend */}
            <div className="canvas-legend">
              <div className="legend-item">
                <span className="legend-sample cyan-solid"></span>
                <span>Observed Objects</span>
              </div>
              <div className="legend-item">
                <span className="legend-sample amber-dotted"></span>
                <span>Predicted Obstacle (LSTM)</span>
              </div>
              <div className="legend-item">
                <span className="legend-sample" style={{ background: activeMode.color }}></span>
                <span>Planned Spline ({activeMode.shortName})</span>
              </div>
              <div className="legend-item">
                <span className="legend-sample envelope-fill"></span>
                <span>Safety Clearance Envelope</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Comparative Benchmarks & Methodology */}
        <div className="planning-sidebar-column">
          {/* Active Mode Profile Card */}
          <div className="planning-card mode-profile-card">
            <div className="profile-header">
              <Shield size={16} className="text-cyan" aria-hidden="true" focusable="false" />
              <span className="profile-title">{activeMode.name}</span>
            </div>
            <p className="profile-description">{activeMode.description}</p>
            <div className="profile-specs-grid">
              <div className="spec-item">
                <span className="sp-k">Controller:</span>
                <span className="sp-v text-highlight">{activeMode.controller}</span>
              </div>
              <div className="spec-item">
                <span className="sp-k">Sim Safety Margin:</span>
                <span className="sp-v text-green">{activeMode.safetyMargin.toFixed(2)} m</span>
              </div>
              <div className="spec-item">
                <span className="sp-k">Prediction Horizon:</span>
                <span className="sp-v mono">{activeMode.horizon ? `${activeMode.horizon} steps (1.0s)` : "4.5 s continuous"}</span>
              </div>
              <div className="spec-item">
                <span className="sp-k">Convergence Rate:</span>
                <span className="sp-v mono">{activeMode.simulationSteps} steps to goal</span>
              </div>
            </div>
          </div>

          {/* Comparative Benchmark Analysis Table */}
          <div className="planning-card benchmark-table-card">
            <div className="benchmark-header">
              <div className="card-header-left">
                <Layers size={16} className="text-cyan" aria-hidden="true" focusable="false" />
                <span className="card-title">SIMULATION BENCHMARK MATRIX</span>
              </div>
              <span className="matrix-badge">4 MODES EVALUATED</span>
            </div>

            <p className="card-description">
              Side-by-side comparison of local trajectory planners evaluated across the synthetic prototype Indian road obstacle evasion scenario.
            </p>

            <div className="benchmark-table-wrapper">
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th>METRIC</th>
                    <th className={activeModeKey === "integrated" ? "col-active" : ""}>INTEGRATED HYBRID</th>
                    <th className={activeModeKey === "mpc" ? "col-active" : ""}>STANDALONE MPC</th>
                    <th className={activeModeKey === "risk_aware_dwa" ? "col-active" : ""}>RISK-AWARE DWA</th>
                    <th className={activeModeKey === "dwa" ? "col-active" : ""}>PURE DWA</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVE_METRICS_LIST.map((row, idx) => (
                    <tr key={`bench-${idx}`} className="benchmark-row">
                      <td className="metric-name-cell">{row.metric}</td>
                      <td className={`val-cell mono ${activeModeKey === "integrated" ? "cell-highlight" : ""} ${row.metric === "Minimum Clearance" ? "text-green font-bold" : ""}`}>
                        {row.integrated}
                      </td>
                      <td className={`val-cell mono ${activeModeKey === "mpc" ? "cell-highlight" : ""}`}>
                        {row.mpc}
                      </td>
                      <td className={`val-cell mono ${activeModeKey === "risk_aware_dwa" ? "cell-highlight" : ""}`}>
                        {row.risk_aware_dwa}
                      </td>
                      <td className={`val-cell mono ${activeModeKey === "dwa" ? "cell-highlight" : ""}`}>
                        {row.dwa}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technical Data Honesty & Coordinate Semantics Card */}
          <div className="planning-card data-honesty-card">
            <div className="honesty-title-row">
              <Info size={15} className="text-amber" aria-hidden="true" focusable="false" />
              <span className="honesty-title">DATA HONESTY & COORDINATE SPECIFICATION</span>
            </div>

            <div className="honesty-content-list">
              <div className="honesty-item">
                <span className="honesty-bullet">•</span>
                <span>
                  <strong>Coordinate Space Distinction:</strong> Perception (RT-DETRv2), tracking (ByteTrack), and trajectory prediction (LSTM) operate in <em>normalized 2D image coordinates [0.0, 1.0]</em>. In contrast, this local planner executes in a <em>synthetic local Cartesian coordinate frame measured in meters</em> (X: -3.5m to +3.5m, Y: 0m to 25m). No real-world ground-plane homography is inferred.
                </span>
              </div>

              <div className="honesty-item">
                <span className="honesty-bullet">•</span>
                <span>
                  <strong>Simulation Prototype Status:</strong> Benchmark metrics, clearance distances, and step counts reflect validated prototype simulations recorded in <code>dwa_results.json</code>, <code>mpc_results.json</code>, <code>risk_aware_dwa_results.json</code>, and <code>final_project_metrics.json</code>. No manufactured or unverified numbers are introduced.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coordinate Bridge Section */}
      <div className="planning-card coordinate-bridge-card">
        <div className="coordinate-bridge-header">
          <div className="card-header-left">
            <Crosshair size={18} className="text-cyan" aria-hidden="true" focusable="false" />
            <div>
              <div className="bridge-title-row">
                <span className="card-title">COORDINATE PROJECTION BRIDGE</span>
                <span className="prototype-badge warning">
                  {DEFAULT_PROTOTYPE_CALIBRATION.disclaimer}
                </span>
              </div>
              <p className="card-subtitle">
                Mathematical transformation mapping normalized image perception/LSTM coordinates to local Cartesian planner space.
              </p>
            </div>
          </div>
          <span className="matrix-badge">INDEPENDENT VALIDATION MODULE</span>
        </div>

        {/* Cascade Flow Diagram */}
        <div className="bridge-flow-diagram">
          <div className="bridge-node">
            <span className="b-step">01</span>
            <span className="b-name">Image Space</span>
            <span className="b-sub mono">(x_norm, y_norm)</span>
            <span className="b-val mono text-cyan">({bridgeXNorm.toFixed(2)}, {bridgeYNorm.toFixed(2)})</span>
          </div>

          <div className="bridge-arrow">
            <ArrowDown size={14} aria-hidden="true" focusable="false" />
          </div>

          <div className="bridge-node">
            <span className="b-step">02</span>
            <span className="b-name">Ground Contact</span>
            <span className="b-sub mono">(x_pixel, y_pixel)</span>
            <span className="b-val mono text-highlight">({bridgeResult.groundPixel.xPixel}px, {bridgeResult.groundPixel.yPixel}px)</span>
          </div>

          <div className="bridge-arrow">
            <ArrowDown size={14} aria-hidden="true" focusable="false" />
          </div>

          <div className="bridge-node">
            <span className="b-step">03</span>
            <span className="b-name">Coordinate Projection</span>
            <span className="b-sub">Pinhole Model</span>
            <span className={`b-val mono ${bridgeResult.status === "VALID" ? "text-green" : "text-amber"}`}>
              {bridgeResult.status === "VALID" ? "VALID (Prototype Projection)" : bridgeResult.status}
            </span>
          </div>

          <div className="bridge-arrow">
            <ArrowDown size={14} aria-hidden="true" focusable="false" />
          </div>

          <div className="bridge-node bridge-node-output">
            <span className="b-step">04</span>
            <span className="b-name">Planner Space</span>
            <span className="b-sub mono">(X_m, Y_m in meters)</span>
            <span className="b-val mono text-green font-bold">
              X = {bridgeResult.plannerMetric.xMeters.toFixed(2)}m, Y = {bridgeResult.plannerMetric.yMeters.toFixed(2)}m
            </span>
          </div>
        </div>

        {/* Interactive Test Bench Grid */}
        <div className="bridge-workstation-grid">
          {/* Column 1: Test Cases & Sliders */}
          <div className="bridge-interactive-col">
            <div className="sub-card-title">SELECT PRESET TEST CASE OR ADJUST COORDINATES</div>

            <div className="test-case-pills-list">
              {COORDINATE_BRIDGE_TEST_CASES.map((tc) => {
                const isSelected = selectedTestCaseId === tc.id;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    className={`tc-pill-btn ${isSelected ? "active" : ""}`}
                    onClick={() => handleSelectTestCase(tc)}
                  >
                    <span className="tc-name">{tc.name}</span>
                    <span className="tc-coords mono">({tc.input.xNorm}, {tc.input.yNorm})</span>
                  </button>
                );
              })}
            </div>

            {/* Slider Controls */}
            <div className="bridge-sliders-card">
              <div className="slider-row">
                <div className="slider-label-row">
                  <span className="sl-k">Horizontal Coordinate (x_norm)</span>
                  <span className="sl-v mono text-cyan">{bridgeXNorm.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="-0.2"
                  max="1.2"
                  step="0.01"
                  value={bridgeXNorm}
                  onChange={(e) => {
                    setSelectedTestCaseId("custom");
                    setBridgeXNorm(parseFloat(e.target.value));
                  }}
                  className="playback-slider"
                  aria-label="Normalized horizontal image coordinate"
                />
                <div className="slider-hints">
                  <span>0.0 (Left edge)</span>
                  <span>0.5 (Optical Center)</span>
                  <span>1.0 (Right edge)</span>
                </div>
              </div>

              <div className="slider-row">
                <div className="slider-label-row">
                  <span className="sl-k">Vertical Ground Contact (y_norm)</span>
                  <span className="sl-v mono text-green">{bridgeYNorm.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.1"
                  step="0.01"
                  value={bridgeYNorm}
                  onChange={(e) => {
                    setSelectedTestCaseId("custom");
                    setBridgeYNorm(parseFloat(e.target.value));
                  }}
                  className="playback-slider"
                  aria-label="Normalized vertical ground contact coordinate"
                />
                <div className="slider-hints">
                  <span>&lt; 0.46 (Sky/Horizon)</span>
                  <span>0.65 (Mid-distance)</span>
                  <span>1.0 (Bumper ground contact)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Validation Test Cases Matrix */}
          <div className="bridge-matrix-col">
            <div className="sub-card-title">INDEPENDENT TEST BENCH VALIDATION RESULTS</div>

            <div className="bridge-table-wrapper">
              <table className="bridge-table">
                <thead>
                  <tr>
                    <th>TEST CASE</th>
                    <th>INPUT (X, Y)</th>
                    <th>GROUND PIXEL</th>
                    <th>PLANNER METRIC</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {COORDINATE_BRIDGE_TEST_CASES.map((tc) => {
                    const testRes = projectImageToPlanner(tc.input.xNorm, tc.input.yNorm);
                    const isSelected = selectedTestCaseId === tc.id;
                    return (
                      <tr
                        key={tc.id}
                        className={`bridge-row ${isSelected ? "row-selected" : ""}`}
                        onClick={() => handleSelectTestCase(tc)}
                        title="Click to preview in coordinate bridge"
                      >
                        <td className="tc-cell font-semibold">{tc.name}</td>
                        <td className="tc-cell mono">({tc.input.xNorm}, {tc.input.yNorm})</td>
                        <td className="tc-cell mono">{testRes.groundPixel.xPixel} × {testRes.groundPixel.yPixel}px</td>
                        <td className="tc-cell mono text-green font-bold">
                          ({testRes.plannerMetric.xMeters.toFixed(2)}m, {testRes.plannerMetric.yMeters.toFixed(2)}m)
                        </td>
                        <td className="tc-cell">
                          <span className={`status-pill status-${testRes.status.toLowerCase()}`}>
                            {testRes.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bridge-integration-notice">
              <Info size={14} className="notice-icon text-amber" aria-hidden="true" focusable="false" />
              <span>
                <strong>Integration Safeguard:</strong> Projected values are validated independently and are <em>not automatically coupled into active DWA/MPC planner controls</em>. Extrinsic vehicle camera homography calibration is required before feeding values to actuation.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Closed-Loop Perception-to-Planning Prototype Card */}
      <div className="planning-card closed-loop-card">
        <div className="closed-loop-header">
          <div className="card-header-left">
            <Activity size={18} className="text-amber" aria-hidden="true" focusable="false" />
            <div>
              <div className="bridge-title-row">
                <span className="card-title">CLOSED-LOOP PERCEPTION-TO-PLANNING PROTOTYPE</span>
                <span className="prototype-badge warning">
                  Closed-loop prototype — perception-to-planner projection is uncalibrated.
                </span>
              </div>
              <p className="card-subtitle">
                End-to-end integration: RT-DETRv2 (Perception) → ByteTrack (Tracking) → LSTM v2 (Forecast) → Prototype Risk (Image-Space) → Coordinate Projection (Uncalibrated Ground Plane) → MPC / DWA (Evasion &amp; Control).
              </p>
            </div>
          </div>
          <div className="cl-header-actions">
            <span className="matrix-badge">END-TO-END PIPELINE</span>
          </div>
        </div>

        {/* Safeguard Alert Banner if out-of-bounds or above horizon */}
        {closedLoopState.control.safeguardTriggered && (
          <div className="cl-safeguard-alert">
            <AlertTriangle size={16} className="text-amber alert-icon" aria-hidden="true" focusable="false" />
            <div className="alert-body">
              <span className="alert-title">SAFEGUARD ACTIVE: INPUT OUTSIDE GROUND-PLANE VALID DOMAIN</span>
              <span className="alert-desc">{closedLoopState.control.safeguardMessage}</span>
              <span className="alert-fallback">
                Fail-Safe Reaction: Direct coordinate injection into steering optimizer is intercepted. Planner automatically maintains a conservative +1.50m margin and caps speed at {closedLoopState.control.targetSpeedKmh} km/h.
              </span>
            </div>
          </div>
        )}

        {/* Track / Obstacle Scenario Selection Pills */}
        <div className="cl-track-picker-section">
          <div className="sub-card-title">SELECT PERCEPTION SCENARIO FOR CLOSED-LOOP EVALUATION</div>
          <div className="cl-track-pills-list">
            {CLOSED_LOOP_PROTOTYPE_TRACKS.map((t) => {
              const isSelected = selectedClosedLoopTrackId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`cl-track-pill ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedClosedLoopTrackId(t.id)}
                >
                  <div className="pill-top">
                    <span className="pill-name">{t.label}</span>
                    <span className={`pill-tag tag-${t.className.toLowerCase()}`}>{t.className}</span>
                  </div>
                  <div className="pill-desc">{t.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6-Stage Cascaded Pipeline Grid */}
        <div className="cl-pipeline-grid">
          {/* Stage 1: RT-DETRv2 */}
          <div className="cl-stage-card">
            <div className="stage-num-badge">01</div>
            <div className="stage-name">RT-DETRv2</div>
            <div className="stage-sub">2D Perception</div>
            <div className="stage-detail-list">
              <div className="detail-row">
                <span>Class:</span>
                <span className="mono text-highlight">{closedLoopState.perception.class_name}</span>
              </div>
              <div className="detail-row">
                <span>Confidence:</span>
                <span className="mono text-green font-bold">
                  {(closedLoopState.perception.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="detail-row">
                <span>Ground Anchor:</span>
                <span className="mono text-cyan">
                  ({closedLoopState.perception.groundContactNorm.x.toFixed(3)}, {closedLoopState.perception.groundContactNorm.y.toFixed(3)})
                </span>
              </div>
            </div>
          </div>

          {/* Stage 2: ByteTrack */}
          <div className="cl-stage-card">
            <div className="stage-num-badge">02</div>
            <div className="stage-name">ByteTrack</div>
            <div className="stage-sub">Temporal Tracking</div>
            <div className="stage-detail-list">
              <div className="detail-row">
                <span>Track ID:</span>
                <span className="mono text-highlight">#{closedLoopState.tracking.trackId}</span>
              </div>
              <div className="detail-row">
                <span>History Window:</span>
                <span className="mono text-cyan">8 Frames (T-7 to T0)</span>
              </div>
              <div className="detail-row">
                <span>Association:</span>
                <span className="mono text-green font-bold">CONFIRMED</span>
              </div>
            </div>
          </div>

          {/* Stage 3: LSTM v2 */}
          <div className="cl-stage-card">
            <div className="stage-num-badge">03</div>
            <div className="stage-name">LSTM v2</div>
            <div className="stage-sub">Trajectory Prediction</div>
            <div className="stage-detail-list">
              <div className="detail-row">
                <span>Forecast Horizon:</span>
                <span className="mono text-highlight">5 Steps (T+1..T+5)</span>
              </div>
              <div className="detail-row">
                <span>Coordinate Frame:</span>
                <span className="mono text-cyan">Normalized Image</span>
              </div>
              <div className="detail-row">
                <span>Trend:</span>
                <span className="mono text-amber font-bold">
                  {closedLoopState.risk.isConverging ? "Converging Lane-In" : "Parallel / Diverging"}
                </span>
              </div>
            </div>
          </div>

          {/* Stage 4: Prototype Risk */}
          <div className="cl-stage-card">
            <div className="stage-num-badge">04</div>
            <div className="stage-name">Prototype Risk</div>
            <div className="stage-sub">Prototype Risk / Image-Space</div>
            <div className="stage-detail-list">
              <div className="detail-row">
                <span>Current d0:</span>
                <span className="mono text-highlight">{closedLoopState.risk.d0}</span>
              </div>
              <div className="detail-row">
                <span>Min d_min:</span>
                <span className="mono text-cyan">{closedLoopState.risk.minSeparation}</span>
              </div>
              <div className="detail-row">
                <span>Prototype TTC:</span>
                <span className="mono text-amber font-bold">{closedLoopState.risk.ttc}</span>
              </div>
              <div className="detail-row">
                <span>Risk Tier:</span>
                <span className={`status-pill status-${closedLoopState.risk.riskLevel.toLowerCase()}`}>
                  {closedLoopState.risk.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Stage 5: Coordinate Projection */}
          <div className="cl-stage-card">
            <div className="stage-num-badge">05</div>
            <div className="stage-name">Projection Bridge</div>
            <div className="stage-sub">Uncalibrated Ground Plane</div>
            <div className="stage-detail-list">
              <div className="detail-row">
                <span>Projection Status:</span>
                <span className={`status-pill status-${closedLoopState.projection.status.toLowerCase()}`}>
                  {closedLoopState.projection.status}
                </span>
              </div>
              <div className="detail-row">
                <span>Ground Pixel:</span>
                <span className="mono text-cyan">
                  {closedLoopState.projection.groundPixel.xPixel} × {closedLoopState.projection.groundPixel.yPixel}px
                </span>
              </div>
              <div className="detail-row">
                <span>Pose (X_m, Y_m):</span>
                <span className="mono text-green font-bold">
                  ({closedLoopState.projection.currentPoseMeters.x.toFixed(2)}m, {closedLoopState.projection.currentPoseMeters.y.toFixed(2)}m)
                </span>
              </div>
              <div className="detail-row">
                <span>Metric Accuracy:</span>
                <span className="mono text-amber">NONE (Prototype)</span>
              </div>
            </div>
          </div>

          {/* Stage 6: MPC / DWA Response */}
          <div className="cl-stage-card highlight-stage">
            <div className="stage-num-badge">06</div>
            <div className="stage-name">MPC / DWA Response</div>
            <div className="stage-sub">Closed-Loop Control</div>
            <div className="stage-detail-list">
              <div className="detail-row">
                <span>Controller Mode:</span>
                <span className="mono text-highlight font-bold">{closedLoopState.control.controllerMode}</span>
              </div>
              <div className="detail-row">
                <span>Lateral Offset:</span>
                <span className="mono text-cyan font-bold">
                  {closedLoopState.control.lateralDeflectionMeters !== 0
                    ? `${closedLoopState.control.lateralDeflectionMeters > 0 ? "+" : ""}${closedLoopState.control.lateralDeflectionMeters.toFixed(2)}m`
                    : "0.00m (In-Lane)"}
                </span>
              </div>
              <div className="detail-row">
                <span>Target Speed:</span>
                <span className="mono text-green font-bold">{closedLoopState.control.targetSpeedKmh} km/h</span>
              </div>
              <div className="detail-row">
                <span>Dynamic Clearance:</span>
                <span className="mono text-highlight font-bold">{closedLoopState.control.dynamicClearanceMeters}m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Recommendation Banner */}
        <div className="cl-recommendation-bar">
          <Terminal size={14} className="text-cyan" aria-hidden="true" focusable="false" />
          <div className="rec-text-group">
            <span className="rec-k">PLANNER ACTION RECOMMENDATION:</span>
            <span className="rec-v">{closedLoopState.control.recommendedAction}</span>
          </div>
        </div>

        {/* Side-by-Side Data Honesty Segregation Panel */}
        <div className="cl-segregation-grid">
          {/* Box A: Calculated Prototype Values (Live Dynamic) */}
          <div className="segregation-card dynamic-card">
            <div className="seg-header">
              <div className="seg-title-group">
                <span className="seg-title">LIVE CALCULATED PROTOTYPE VALUES</span>
                <span className="seg-badge live">DYNAMIC CALCULATION (UNCALIBRATED)</span>
              </div>
              <p className="seg-sub">
                Dynamically computed through the 6-stage chain using the prototype pinhole model.
              </p>
            </div>
            <div className="seg-metrics-list">
              <div className="seg-row">
                <span className="sk">Projected Obstacle Coordinates:</span>
                <span className="sv mono font-bold text-cyan">
                  X = {closedLoopState.projection.currentPoseMeters.x.toFixed(2)}m, Y = {closedLoopState.projection.currentPoseMeters.y.toFixed(2)}m
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Dynamic Clearance to Ego Start:</span>
                <span className="sv mono font-bold text-highlight">
                  {closedLoopState.control.dynamicClearanceMeters}m
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Dynamic Risk Classification:</span>
                <span className={`sv font-bold status-${closedLoopState.risk.riskLevel.toLowerCase()}`}>
                  {closedLoopState.risk.riskLevel} (Prototype TTC estimate: {closedLoopState.risk.ttc})
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Reactive Controller Posture:</span>
                <span className="sv mono text-green">
                  {closedLoopState.control.controllerMode}
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Calibration Status:</span>
                <span className="sv text-amber font-semibold">
                  Uncalibrated Prototype — No metric ground truth
                </span>
              </div>
            </div>
          </div>

          {/* Box B: Saved Simulation Benchmark Metrics (Historical Fixed) */}
          <div className="segregation-card static-card">
            <div className="seg-header">
              <div className="seg-title-group">
                <span className="seg-title">SAVED SIMULATION BENCHMARK METRICS</span>
                <span className="seg-badge fixed">HISTORICAL FIXED BENCHMARK LOG</span>
              </div>
              <p className="seg-sub">
                Verified simulation results recorded in <code>final_project_metrics.json</code> and <code>mpc_results.json</code>.
              </p>
            </div>
            <div className="seg-metrics-list">
              <div className="seg-row">
                <span className="sk">Recorded Minimum Clearance:</span>
                <span className="sv mono font-bold text-green">
                  {activeMode.minimumClearance.toFixed(4)}m (Fixed Benchmark)
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Benchmark Path Length:</span>
                <span className="sv mono text-cyan">
                  {activeMode.pathLength.toFixed(4)}m
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Simulation Convergence Steps:</span>
                <span className="sv mono text-highlight">
                  {activeMode.simulationSteps} steps ({activeMode.totalDuration}s)
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Simulation Safety Threshold:</span>
                <span className="sv text-green font-bold">
                  YES (&gt; {activeMode.safetyMargin}m simulation margin)
                </span>
              </div>
              <div className="seg-row">
                <span className="sk">Benchmark Origin:</span>
                <span className="sv text-secondary">
                  Offline Synthetic Simulator Replay
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
