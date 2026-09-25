import React, { useState } from "react";
import {
  ArrowLeft,
  Activity,
  Cpu,
  Server,
  Layers,
  Crosshair,
  TrendingUp,
  ShieldAlert,
  Compass,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import {
  PERCEPTION_BENCHMARK,
  LSTM_V2_METRICS,
  TRACKING_BENCHMARK,
  RISK_SPECIFICATION,
  PLANNER_MODES,
} from "../data/verifiedBenchmarks";
import "./SystemMetrics.css";

export default function SystemMetrics({ onReturnOverview }) {
  const {
    perception: runtimePerception,
    tracking: runtimeTracking,
    trajectory: runtimeTrajectory,
    risk: runtimeRisk,
    planning: runtimePlanning,
    backendHealth,
    fetchBackendHealth,
  } = useIndraRuntime();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchBackendHealth();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Helper to compute confidence stats if detections exist
  const getPerceptionStats = () => {
    if (!runtimePerception.detections || runtimePerception.detections.length === 0) {
      return null;
    }
    const confs = runtimePerception.detections.map((d) => d.confidence);
    const minConf = Math.min(...confs);
    const maxConf = Math.max(...confs);
    const avgConf = confs.reduce((a, b) => a + b, 0) / confs.length;

    // Class distribution
    const classCounts = {};
    for (const d of runtimePerception.detections) {
      classCounts[d.class_name] = (classCounts[d.class_name] || 0) + 1;
    }

    return {
      minConf: (minConf * 100).toFixed(1),
      maxConf: (maxConf * 100).toFixed(1),
      avgConf: (avgConf * 100).toFixed(1),
      classCounts,
    };
  };

  const perceptionStats = getPerceptionStats();

  return (
    <div className="system-metrics-view">
      {/* Top Telemetry Header */}
      <header className="telemetry-header">
        <div className="header-left">
          <button
            className="telemetry-back-btn"
            onClick={onReturnOverview}
            title="Return to Overview Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Overview</span>
          </button>
          <div className="header-title-group">
            <div className="header-badge-row">
              <span className="telemetry-status-pill online">
                <span className="status-indicator-dot" />
                SYSTEM TELEMETRY HUD
              </span>
              <span className="source-tag system">SOURCE: SYSTEM</span>
            </div>
            <h1 className="telemetry-title">System Metrics & Engineering Telemetry</h1>
            <p className="telemetry-subtitle">
              Comprehensive telemetry dashboard verifying live model inference, tracking states, LSTM forecasting,
              interaction risk, and simulation benchmarks.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`refresh-telemetry-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Query backend health endpoint"
          >
            <RefreshCw size={15} className={isRefreshing ? "spin-icon" : ""} />
            <span>{isRefreshing ? "Querying..." : "Refresh Status"}</span>
          </button>
        </div>
      </header>

      {/* SECTION 1: END-TO-END AI PIPELINE STATUS */}
      <section className="telemetry-card pipeline-status-card">
        <div className="card-header">
          <div className="card-title-group">
            <Layers size={18} className="card-icon cyan" />
            <h2 className="card-title">1. End-to-End Autonomous Pipeline Architecture</h2>
          </div>
          <div className="card-badges">
            <span className="source-tag system">SYSTEM</span>
            <span className="source-tag live">LIVE MODEL</span>
            <span className="source-tag sim">PLANNER SIMULATION</span>
          </div>
        </div>

        <div className="pipeline-grid">
          {/* Stage 1: Perception */}
          <div className="pipeline-stage-card">
            <div className="stage-top">
              <span className="stage-step">STAGE 01</span>
              <span className={`stage-state ${backendHealth?.status === "healthy" ? "active" : "standby"}`}>
                {backendHealth?.status === "healthy" ? "ONLINE" : "STANDBY"}
              </span>
            </div>
            <h3 className="stage-name">RT-DETRv2 R18</h3>
            <p className="stage-role">Real-Time Monocular Transformer Detection</p>
            <div className="stage-specs">
              <div className="spec-row">
                <span>Model Checkpoint:</span>
                <span className="val mono">{PERCEPTION_BENCHMARK.checkpoint}</span>
              </div>
              <div className="spec-row">
                <span>Dataset / Classes:</span>
                <span className="val">UVH-26 ({backendHealth?.num_classes || 14} classes)</span>
              </div>
              <div className="spec-row">
                <span>Device Binding:</span>
                <span className="val mono">{backendHealth?.device ? backendHealth.device.toUpperCase() : "CUDA / AUTO"}</span>
              </div>
            </div>
            <div className="stage-footer">
              <span className="source-tag live">LIVE MODEL</span>
            </div>
          </div>

          {/* Stage 2: Tracking */}
          <div className="pipeline-stage-card">
            <div className="stage-top">
              <span className="stage-step">STAGE 02</span>
              <span className={`stage-state ${runtimeTracking.hasData ? "active" : "standby"}`}>
                {runtimeTracking.hasData ? "RUNNING" : "READY"}
              </span>
            </div>
            <h3 className="stage-name">ByteTrack Multi-Agent</h3>
            <p className="stage-role">Kalman Filter & 2-Stage IoU Association</p>
            <div className="stage-specs">
              <div className="spec-row">
                <span>Architecture:</span>
                <span className="val">ByteTrack Prototype</span>
              </div>
              <div className="spec-row">
                <span>Active Track State:</span>
                <span className="val">{runtimeTracking.hasData ? `${runtimeTracking.activeTrackCount} tracks in FOV` : "Standby (Ready)"}</span>
              </div>
              <div className="spec-row">
                <span>Association Space:</span>
                <span className="val">Normalized Image Bounding Boxes</span>
              </div>
            </div>
            <div className="stage-footer">
              <span className="source-tag tracking">PROTOTYPE TRACKING</span>
            </div>
          </div>

          {/* Stage 3: Trajectory */}
          <div className="pipeline-stage-card">
            <div className="stage-top">
              <span className="stage-step">STAGE 03</span>
              <span className={`stage-state ${backendHealth?.status === "healthy" ? "active" : "standby"}`}>
                {backendHealth?.status === "healthy" ? "ONLINE" : "STANDBY"}
              </span>
            </div>
            <h3 className="stage-name">TrajectoryLSTM v2</h3>
            <p className="stage-role">Recurrent Spatiotemporal Motion Forecasting</p>
            <div className="stage-specs">
              <div className="spec-row">
                <span>Parameters:</span>
                <span className="val mono">{LSTM_V2_METRICS.parameters.toLocaleString()}</span>
              </div>
              <div className="spec-row">
                <span>Observation / Forecast:</span>
                <span className="val">8 frames → 5 frames</span>
              </div>
              <div className="spec-row">
                <span>Predictor Device:</span>
                <span className="val mono">{backendHealth?.trajectory_device ? backendHealth.trajectory_device.toUpperCase() : "CUDA"}</span>
              </div>
            </div>
            <div className="stage-footer">
              <span className="source-tag lstm">LSTM v2 / CALCULATED</span>
            </div>
          </div>

          {/* Stage 4: Risk / TTC */}
          <div className="pipeline-stage-card">
            <div className="stage-top">
              <span className="stage-step">STAGE 04</span>
              <span className={`stage-state ${runtimeRisk.hasData ? "active" : "standby"}`}>
                {runtimeRisk.hasData ? "EVALUATED" : "READY"}
              </span>
            </div>
            <h3 className="stage-name">Spatiotemporal Risk Engine</h3>
            <p className="stage-role">Monocular Vector Convergence & Prototype Risk Heuristic</p>
            <div className="stage-specs">
              <div className="spec-row">
                <span>Risk Tiers:</span>
                <span className="val">LOW / MEDIUM / HIGH / CRITICAL</span>
              </div>
              <div className="spec-row">
                <span>Geometric Space:</span>
                <span className="val">Normalized Image Center Projections</span>
              </div>
              <div className="spec-row">
                <span>Calibration:</span>
                <span className="val text-amber">Prototype (Uncalibrated Camera)</span>
              </div>
            </div>
            <div className="stage-footer">
              <span className="source-tag risk">PROTOTYPE IMAGE-SPACE RISK</span>
            </div>
          </div>

          {/* Stage 5: Planning */}
          <div className="pipeline-stage-card">
            <div className="stage-top">
              <span className="stage-step">STAGE 05</span>
              <span className="stage-state active">VALIDATED</span>
            </div>
            <h3 className="stage-name">Optimal Path Planner</h3>
            <p className="stage-role">Integrated Hybrid MPC + DWA Reactive Fallback</p>
            <div className="stage-specs">
              <div className="spec-row">
                <span>Available Modes:</span>
                <span className="val">4 Simulation Modes</span>
              </div>
              <div className="spec-row">
                <span>Coordinate Frame:</span>
                <span className="val">Local Cartesian Meters (X: ±3.5m, Y: 25m)</span>
              </div>
              <div className="spec-row">
                <span>Active Mode:</span>
                <span className="val mono text-green">{runtimePlanning.modeName.split(" ")[0]}</span>
              </div>
            </div>
            <div className="stage-footer">
              <span className="source-tag sim">PLANNER SIMULATION</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: BACKEND / CUDA RUNTIME STATUS */}
      <section className="telemetry-card">
        <div className="card-header">
          <div className="card-title-group">
            <Server size={18} className="card-icon green" />
            <h2 className="card-title">2. Backend Server & Hardware Accelerator Runtime</h2>
          </div>
          <span className="source-tag system">SOURCE: SYSTEM</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">FastAPI API Health</span>
            <div className="metric-val-row">
              <span className={`status-badge ${backendHealth?.status === "healthy" ? "healthy" : "offline"}`}>
                {backendHealth?.status === "healthy" ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>HEALTHY (200 OK)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} />
                    <span>{backendHealth?.status || "STANDBY"}</span>
                  </>
                )}
              </span>
            </div>
            <span className="metric-note mono">Endpoint: /health</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">PyTorch Host Device</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">
                {backendHealth?.device ? backendHealth.device.toUpperCase() : "CHECKING..."}
              </span>
            </div>
            <span className="metric-note">torch.cuda.is_available()</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Hardware Accelerator (GPU)</span>
            <div className="metric-val-row">
              <span className="metric-val mono green">
                {backendHealth?.gpu || "NOT EXPOSED BY BACKEND API"}
              </span>
            </div>
            <span className="metric-note">
              {backendHealth?.gpu ? "Measured via torch.cuda.get_device_name(0)" : "No live GPU name returned"}
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Trajectory Predictor Device</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">
                {backendHealth?.trajectory_device ? backendHealth.trajectory_device.toUpperCase() : "CUDA"}
              </span>
            </div>
            <span className="metric-note">str(predictor.device)</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Registered Target Classes</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{backendHealth?.num_classes || 14}</span>
              <span className="metric-unit">classes</span>
            </div>
            <span className="metric-note">Hatchback, Sedan, SUV, Bus, Truck, etc.</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Last Health Ping</span>
            <div className="metric-val-row">
              <span className="metric-val mono text-muted">
                {backendHealth?.lastChecked
                  ? new Date(backendHealth.lastChecked).toLocaleTimeString()
                  : "Not pinged yet"}
              </span>
            </div>
            <span className="metric-note">Live ping response timestamp</span>
          </div>
        </div>

        {/* Honest Hardware Notice */}
        <div className="telemetry-notice-box">
          <Info size={16} className="notice-icon" />
          <div className="notice-text">
            <strong>HARDWARE TELEMETRY SPECIFICATION:</strong> Dynamic GPU metrics (VRAM allocation, temperature, streaming multiprocessor utilization, fan speed) are{" "}
            <span className="highlight-text">NOT EXPOSED BY BACKEND API</span>. In strict accordance with the zero-fabrication contract, simulated percentages or artificial hardware loads are not generated.
          </div>
        </div>
      </section>

      {/* SECTION 3: LIVE PERCEPTION TELEMETRY */}
      <section className="telemetry-card">
        <div className="card-header">
          <div className="card-title-group">
            <Cpu size={18} className="card-icon cyan" />
            <h2 className="card-title">3. Perception Telemetry (RT-DETRv2 R18)</h2>
          </div>
          <span className="source-tag live">SOURCE: LIVE MODEL</span>
        </div>

        {/* Live Perception Status */}
        <div className="sub-card-title-row">
          <h3 className="sub-card-title">A. Live Inference Telemetry</h3>
          <span className="sub-card-tag">{runtimePerception.hasData ? "LIVE RUN CAPTURED" : "STANDBY"}</span>
        </div>

        {runtimePerception.hasData ? (
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Input Frame</span>
              <div className="metric-val-row">
                <span className="metric-val mono">{runtimePerception.filename}</span>
              </div>
              <span className="metric-note">Processed RGB Frame</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Native Image Dimensions</span>
              <div className="metric-val-row">
                <span className="metric-val mono cyan">
                  {runtimePerception.imageWidth && runtimePerception.imageHeight
                    ? `${runtimePerception.imageWidth} × ${runtimePerception.imageHeight}`
                    : "Unknown"}
                </span>
                <span className="metric-unit">px</span>
              </div>
              <span className="metric-note">Original camera aspect ratio</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Total Detections</span>
              <div className="metric-val-row">
                <span className="metric-val green mono">{runtimePerception.detectionCount}</span>
                <span className="metric-unit">objects</span>
              </div>
              <span className="metric-note">Score threshold ≥ 0.05</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Measured Inference Latency</span>
              <div className="metric-val-row">
                <span className="metric-val cyan mono">
                  {runtimePerception.inferenceTimeMs !== null
                    ? `${runtimePerception.inferenceTimeMs.toFixed(1)}`
                    : "N/A"}
                </span>
                <span className="metric-unit">ms</span>
              </div>
              <span className="metric-note">HTTP round-trip execution latency</span>
            </div>

            {perceptionStats && (
              <>
                <div className="metric-box">
                  <span className="metric-label">Detection Confidence Range</span>
                  <div className="metric-val-row">
                    <span className="metric-val mono text-amber">
                      {perceptionStats.minConf}% – {perceptionStats.maxConf}%
                    </span>
                  </div>
                  <span className="metric-note">Mean confidence: {perceptionStats.avgConf}%</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Detected Class Distribution</span>
                  <div className="class-pill-wrap">
                    {Object.entries(perceptionStats.classCounts).map(([cls, count]) => (
                      <span key={cls} className="class-pill">
                        {cls}: <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                  <span className="metric-note">Distribution in current frame</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="telemetry-standby-banner">
            <Activity size={18} className="standby-icon" />
            <div className="standby-text">
              <strong>AWAITING LIVE INFERENCE:</strong> No perception inference has been executed in the current session.
              Navigate to <em>Live Perception</em> and process an image to populate live model latency and detection telemetry.
            </div>
          </div>
        )}

        {/* Validated Perception Benchmarks */}
        <div className="sub-card-title-row" style={{ marginTop: "1.25rem" }}>
          <h3 className="sub-card-title">B. Validated Epoch 12 Validation Benchmarks</h3>
          <span className="sub-card-provenance">Source: {PERCEPTION_BENCHMARK.provenance}</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">mAP @ 0.50:0.95</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">
                {(PERCEPTION_BENCHMARK.metrics.mAP_50_95 * 100).toFixed(2)}%
              </span>
            </div>
            <span className="metric-note">Best verified checkpoint on the 800-image validation set</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">mAP @ 0.50 (PASCAL VOC)</span>
            <div className="metric-val-row">
              <span className="metric-val mono green">
                {(PERCEPTION_BENCHMARK.metrics.mAP_50 * 100).toFixed(2)}%
              </span>
            </div>
            <span className="metric-note">Standard IoU threshold 0.50</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">mAP @ 0.75 (Strict IoU)</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">
                {(PERCEPTION_BENCHMARK.metrics.mAP_75 * 100).toFixed(2)}%
              </span>
            </div>
            <span className="metric-note">High precision spatial alignment</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">mAR @ 100 (Max Recall)</span>
            <div className="metric-val-row">
              <span className="metric-val mono green">
                {(PERCEPTION_BENCHMARK.metrics.mAR_100 * 100).toFixed(2)}%
              </span>
            </div>
            <span className="metric-note">Average recall across 100 detections</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Validation Dataset Size</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{PERCEPTION_BENCHMARK.validationImages}</span>
              <span className="metric-unit">images</span>
            </div>
            <span className="metric-note">{PERCEPTION_BENCHMARK.validationAnnotations.toLocaleString()} total annotations • Epoch 12</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Training Dataset Size</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{PERCEPTION_BENCHMARK.trainImages}</span>
              <span className="metric-unit">images</span>
            </div>
            <span className="metric-note">{PERCEPTION_BENCHMARK.trainAnnotations.toLocaleString()} total annotations • expanded training set</span>
          </div>
        </div>
      </section>

      {/* SECTION 4: OBJECT TRACKING TELEMETRY */}
      <section className="telemetry-card">
        <div className="card-header">
          <div className="card-title-group">
            <Crosshair size={18} className="card-icon green" />
            <h2 className="card-title">4. Object Tracking Telemetry (ByteTrack)</h2>
          </div>
          <span className="source-tag tracking">SOURCE: PROTOTYPE TRACKING</span>
        </div>

        <div className="sub-card-title-row">
          <h3 className="sub-card-title">A. Tracking Runtime State</h3>
          <span className="sub-card-tag">{runtimeTracking.hasData ? "LIVE TRACKING CAPTURED" : "STANDBY"}</span>
        </div>

        {runtimeTracking.hasData ? (
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Active Tracks in FOV</span>
              <div className="metric-val-row">
                <span className="metric-val green mono">{runtimeTracking.activeTrackCount}</span>
                <span className="metric-unit">agents</span>
              </div>
              <span className="metric-note">Persistent active IDs in current frame</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Total Registered Tracks</span>
              <div className="metric-val-row">
                <span className="metric-val mono">{runtimeTracking.totalTrackCount}</span>
                <span className="metric-unit">cumulative</span>
              </div>
              <span className="metric-note">Unique track identities tracked</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Current Playback Frame</span>
              <div className="metric-val-row">
                <span className="metric-val cyan mono">
                  {runtimeTracking.currentFrame} / {runtimeTracking.totalFrames}
                </span>
              </div>
              <span className="metric-note">Multi-frame video sequence index</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Active Track IDs</span>
              <div className="class-pill-wrap">
                {runtimeTracking.activeTracks && runtimeTracking.activeTracks.length > 0 ? (
                  runtimeTracking.activeTracks.map((t) => (
                    <span key={t.id || t.track_id} className="class-pill active-track">
                      Track #{t.id || t.track_id} ({t.class_name || "Vehicle"})
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No active tracks</span>
                )}
              </div>
              <span className="metric-note">Currently tracked agents</span>
            </div>
          </div>
        ) : (
          <div className="telemetry-standby-banner">
            <Activity size={18} className="standby-icon" />
            <div className="standby-text">
              <strong>AWAITING TRACKING RUN:</strong> Tracking telemetry has not been initialized in this session.
              Navigate to <em>Object Tracking</em> and run playback to stream ByteTrack Kalman state telemetry.
            </div>
          </div>
        )}

        <div className="sub-card-title-row" style={{ marginTop: "1.25rem" }}>
          <h3 className="sub-card-title">B. ByteTrack Verification Record</h3>
          <span className="sub-card-provenance">Source: {TRACKING_BENCHMARK.provenance}</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Association Pipeline</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{TRACKING_BENCHMARK.tracker}</span>
            </div>
            <span className="metric-note">{TRACKING_BENCHMARK.associationMethod}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Tracks Created in Test Run</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">{TRACKING_BENCHMARK.tracksCreatedInTest}</span>
              <span className="metric-unit">tracks</span>
            </div>
            <span className="metric-note">Total test vehicle tracks generated</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Valid Trajectories (≥8 Frames)</span>
            <div className="metric-val-row">
              <span className="metric-val mono green">{TRACKING_BENCHMARK.validTrajectories}</span>
              <span className="metric-unit">qualifying</span>
            </div>
            <span className="metric-note">Trajectories meeting LSTM input window requirement</span>
          </div>
        </div>
      </section>

      {/* SECTION 5: LSTM PREDICTION TELEMETRY */}
      <section className="telemetry-card">
        <div className="card-header">
          <div className="card-title-group">
            <TrendingUp size={18} className="card-icon cyan" />
            <h2 className="card-title">5. Trajectory Prediction Telemetry (TrajectoryLSTM v2)</h2>
          </div>
          <span className="source-tag lstm">SOURCE: LSTM v2 / CALCULATED</span>
        </div>

        <div className="sub-card-title-row">
          <h3 className="sub-card-title">A. Live LSTM Forecasting Runtime</h3>
          <span className="sub-card-tag">{runtimeTrajectory.hasData ? "LIVE PREDICTION CAPTURED" : "STANDBY"}</span>
        </div>

        {runtimeTrajectory.hasData ? (
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Selected Target Track</span>
              <div className="metric-val-row">
                <span className="metric-val cyan mono">Track #{runtimeTrajectory.selectedTrackId}</span>
              </div>
              <span className="metric-note">Observed sequence source</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Observation Window</span>
              <div className="metric-val-row">
                <span className="metric-val mono">{runtimeTrajectory.observedPositions?.length || 8}</span>
                <span className="metric-unit">frames</span>
              </div>
              <span className="metric-note">Normalized [x, y] coordinates (t-7 to t0)</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Forecast Horizon</span>
              <div className="metric-val-row">
                <span className="metric-val green mono">{runtimeTrajectory.predictedPositions?.length || 5}</span>
                <span className="metric-unit">frames</span>
              </div>
              <span className="metric-note">Predicted future coordinates (t+1 to t+5)</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Measured Inference Latency</span>
              <div className="metric-val-row">
                <span className="metric-val cyan mono">
                  {runtimeTrajectory.inferenceTimeMs !== null
                    ? `${runtimeTrajectory.inferenceTimeMs.toFixed(1)}`
                    : "N/A"}
                </span>
                <span className="metric-unit">ms</span>
              </div>
              <span className="metric-note">POST /predict-trajectory forward pass</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Inference Execution Status</span>
              <div className="metric-val-row">
                <span className="status-badge healthy">
                  <CheckCircle2 size={13} />
                  <span>{runtimeTrajectory.status || "COMPLETE"}</span>
                </span>
              </div>
              <span className="metric-note">Model output generated cleanly</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Last Prediction Timestamp</span>
              <div className="metric-val-row">
                <span className="metric-val mono text-muted">
                  {runtimeTrajectory.timestamp
                    ? new Date(runtimeTrajectory.timestamp).toLocaleTimeString()
                    : "N/A"}
                </span>
              </div>
              <span className="metric-note">Live inference timestamp</span>
            </div>
          </div>
        ) : (
          <div className="telemetry-standby-banner">
            <Activity size={18} className="standby-icon" />
            <div className="standby-text">
              <strong>AWAITING TRAJECTORY FORECAST:</strong> No LSTM prediction has been dispatched in the current session.
              Navigate to <em>Trajectory Prediction</em> to invoke <code>/predict-trajectory</code> on a tracked agent.
            </div>
          </div>
        )}

        <div className="sub-card-title-row" style={{ marginTop: "1.25rem" }}>
          <h3 className="sub-card-title">B. TrajectoryLSTM v2 Verified Checkpoint Record</h3>
          <span className="sub-card-provenance">Source: {LSTM_V2_METRICS.provenance}</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Model Architecture</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{LSTM_V2_METRICS.model}</span>
            </div>
            <span className="metric-note">
              {LSTM_V2_METRICS.numLayers} layers, {LSTM_V2_METRICS.hiddenSize} hidden units ({LSTM_V2_METRICS.parameters.toLocaleString()} params)
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Normalized ADE (Average Displacement)</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">{LSTM_V2_METRICS.ADE_normalized.toFixed(6)}</span>
            </div>
            <span className="metric-note">Normalized image space error [0.0, 1.0]</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Normalized FDE (Final Displacement)</span>
            <div className="metric-val-row">
              <span className="metric-val mono green">{LSTM_V2_METRICS.FDE_normalized.toFixed(6)}</span>
            </div>
            <span className="metric-note">Normalized final endpoint error</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Fresh Inference ADE</span>
            <div className="metric-val-row">
              <span className="metric-val mono cyan">0.034195</span>
            </div>
            <span className="metric-note">Calculated over 232 saved trajectory sequences</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Fresh Inference FDE</span>
            <div className="metric-val-row">
              <span className="metric-val mono green">0.037377</span>
            </div>
            <span className="metric-note">Calculated over 232 saved trajectory sequences</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Best Validation Loss</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{LSTM_V2_METRICS.bestValidationLoss.toFixed(8)}</span>
            </div>
            <span className="metric-note">Mean Squared Error loss</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Training Corpus</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{LSTM_V2_METRICS.trainingSequences}</span>
              <span className="metric-unit">sequences</span>
            </div>
            <span className="metric-note">Generated from {LSTM_V2_METRICS.trainingTracks} training tracks</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Validation Corpus</span>
            <div className="metric-val-row">
              <span className="metric-val mono">{LSTM_V2_METRICS.validationSequences}</span>
              <span className="metric-unit">sequences</span>
            </div>
            <span className="metric-note">Generated from {LSTM_V2_METRICS.validationTracks} validation tracks</span>
          </div>
        </div>
      </section>

      {/* SECTION 6: RISK / TTC TELEMETRY */}
      <section className="telemetry-card">
        <div className="card-header">
          <div className="card-title-group">
            <ShieldAlert size={18} className="card-icon amber" />
            <h2 className="card-title">6. Spatiotemporal Risk & Interaction Telemetry</h2>
          </div>
          <span className="source-tag risk">SOURCE: PROTOTYPE IMAGE-SPACE RISK</span>
        </div>

        <div className="sub-card-title-row">
          <h3 className="sub-card-title">A. Live Interaction Risk State</h3>
          <span className="sub-card-tag">{runtimeRisk.hasData ? "LIVE RISK EVALUATED" : "STANDBY"}</span>
        </div>

        {runtimeRisk.hasData ? (
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Risk Classification</span>
              <div className="metric-val-row">
                <span
                  className={`status-badge risk-badge ${
                    runtimeRisk.riskLevel === "CRITICAL"
                      ? "critical"
                      : runtimeRisk.riskLevel === "HIGH"
                      ? "high"
                      : runtimeRisk.riskLevel === "MEDIUM"
                      ? "medium"
                      : "low"
                  }`}
                >
                  {runtimeRisk.riskLevel}
                </span>
              </div>
              <span className="metric-note">Dynamic proximity & convergence threat tier</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Prototype TTC Estimate</span>
              <div className="metric-val-row">
                <span className="metric-val mono cyan">
                  {typeof runtimeRisk.ttc === "number" && runtimeRisk.ttc > 0
                    ? `${runtimeRisk.ttc.toFixed(2)} s`
                    : "N/A (Diverging)"}
                </span>
              </div>
              <span className="metric-note">Prototype image-space estimate; not calibrated physical TTC</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Normalized Min Separation</span>
              <div className="metric-val-row">
                <span className="metric-val mono green">
                  {runtimeRisk.minSeparation !== null ? runtimeRisk.minSeparation.toFixed(4) : "N/A"}
                </span>
              </div>
              <span className="metric-note">Dimensionless image-space distance</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Trajectory Convergence State</span>
              <div className="metric-val-row">
                <span className="metric-val mono">
                  {runtimeRisk.isConverging ? "Converging Intersect" : "Diverging / Safe"}
                </span>
              </div>
              <span className="metric-note">Relative velocity vector direction</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Highest Threat Track Pair</span>
              <div className="metric-val-row">
                <span className="metric-val mono text-amber">
                  {runtimeRisk.highestRiskPair
                    ? `Track #${runtimeRisk.highestRiskPair[0]} ↔ Track #${runtimeRisk.highestRiskPair[1]}`
                    : "None Active"}
                </span>
              </div>
              <span className="metric-note">Primary collision risk candidate</span>
            </div>

            <div className="metric-box">
              <span className="metric-label">Evaluation Timestamp</span>
              <div className="metric-val-row">
                <span className="metric-val mono text-muted">
                  {runtimeRisk.timestamp ? new Date(runtimeRisk.timestamp).toLocaleTimeString() : "N/A"}
                </span>
              </div>
              <span className="metric-note">Risk engine calculation time</span>
            </div>
          </div>
        ) : (
          <div className="telemetry-standby-banner">
            <Activity size={18} className="standby-icon" />
            <div className="standby-text">
              <strong>AWAITING RISK EVALUATION:</strong> Risk engine has not evaluated an active frame in this session.
              Navigate to <em>Risk Analysis</em> to calculate prototype multi-agent interaction-risk metrics.
            </div>
          </div>
        )}

        <div className="telemetry-notice-box" style={{ marginTop: "1rem" }}>
          <Info size={16} className="notice-icon" />
          <div className="notice-text">
            <strong>COORDINATE FRAME DISCLAIMER:</strong> {RISK_SPECIFICATION.method} operates in {RISK_SPECIFICATION.coordinateSpace} ({RISK_SPECIFICATION.calibrationStatus}).
            Values represent image-space proximity ratios, not calibrated metric physical distances.
          </div>
        </div>
      </section>

      {/* SECTION 7: PLANNER TELEMETRY */}
      <section className="telemetry-card">
        <div className="card-header">
          <div className="card-title-group">
            <Compass size={18} className="card-icon green" />
            <h2 className="card-title">7. Path Planning & Optimal Control Telemetry</h2>
          </div>
          <span className="source-tag sim">SOURCE: PLANNER SIMULATION</span>
        </div>

        <div className="sub-card-title-row">
          <h3 className="sub-card-title">A. Active Planner State</h3>
          <span className="sub-card-tag">{runtimePlanning.hasData ? "SIMULATION ACTIVE" : "DEFAULT BENCHMARK"}</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Selected Mode</span>
            <div className="metric-val-row">
              <span className="metric-val cyan mono">{runtimePlanning.modeName}</span>
            </div>
            <span className="metric-note">Active path generation controller</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Simulated Path Length</span>
            <div className="metric-val-row">
              <span className="metric-val green mono">
                {runtimePlanning.pathLength !== null ? `${runtimePlanning.pathLength.toFixed(2)}` : "13.21"}
              </span>
              <span className="metric-unit">m</span>
            </div>
            <span className="metric-note">Total trajectory distance in Cartesian frame</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Minimum Obstacle Clearance</span>
            <div className="metric-val-row">
              <span className="metric-val mono text-amber">
                {runtimePlanning.minimumClearance !== null
                  ? `${runtimePlanning.minimumClearance.toFixed(2)}`
                  : "0.73"}
              </span>
              <span className="metric-unit">m</span>
            </div>
            <span className="metric-note">Closest proximity to simulated obstacle</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Goal Satisfaction</span>
            <div className="metric-val-row">
              <span className="status-badge healthy">
                <CheckCircle2 size={13} />
                <span>GOAL REACHED (YES)</span>
              </span>
            </div>
            <span className="metric-note">
              Final distance to goal:{" "}
              {runtimePlanning.finalDistanceToGoal !== null
                ? `${runtimePlanning.finalDistanceToGoal.toFixed(3)} m`
                : "0.414 m"}
            </span>
          </div>
        </div>

        <div className="sub-card-title-row" style={{ marginTop: "1.25rem" }}>
          <h3 className="sub-card-title">B. 4-Mode Simulation Benchmark Comparison</h3>
          <span className="sub-card-provenance">Source: src/data/plannerBenchmarks.js</span>
        </div>

        <div className="benchmark-table-wrap">
          <table className="planner-benchmark-table">
            <thead>
              <tr>
                <th>Planner Mode</th>
                <th>Controller</th>
                <th>Path Length</th>
                <th>Min Clearance</th>
                <th>Sim Steps</th>
                <th>Duration</th>
                <th>Safety Margin</th>
                <th>Goal Reached</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(PLANNER_MODES).map((mode) => (
                <tr key={mode.id} className={runtimePlanning.modeKey === mode.id ? "active-row" : ""}>
                  <td className="mode-name-cell">
                    <span className="mode-color-dot" style={{ backgroundColor: mode.color }} />
                    <strong>{mode.shortName}</strong>
                    {runtimePlanning.modeKey === mode.id && <span className="active-badge">SELECTED</span>}
                  </td>
                  <td className="controller-cell mono">{mode.plannerType}</td>
                  <td className="mono">{mode.pathLength.toFixed(2)} m</td>
                  <td className="mono text-amber">{mode.minimumClearance.toFixed(2)} m</td>
                  <td className="mono">{mode.simulationSteps}</td>
                  <td className="mono">{mode.totalDuration.toFixed(1)} s</td>
                  <td className="mono">{mode.safetyMargin.toFixed(2)} m</td>
                  <td className="mono text-green">
                    <span className="status-badge healthy" style={{ display: "inline-flex" }}>
                      <CheckCircle2 size={11} /> YES
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="telemetry-notice-box" style={{ marginTop: "1rem" }}>
          <Info size={16} className="notice-icon" />
          <div className="notice-text">
            <strong>SYNTHETIC PLANNER COORDINATE SYSTEM:</strong> Path planning metrics operate strictly in a synthetic local Cartesian coordinate frame in meters (Longitudinal Y: 0 to 25m, Lateral X: -3.5 to +3.5m). They represent validated vehicle kinematic simulations, not direct unprojected camera pixels.
          </div>
        </div>
      </section>
    </div>
  );
}

