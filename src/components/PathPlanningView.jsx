import React, { useState } from "react";
import {
  Compass,
  CheckCircle2,
  Shield,
  Gauge,
} from "lucide-react";
import { indraData } from "../data/mockData";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import BevCanvas from "./BevCanvas";

export default function PathPlanningView() {
  const { planning } = useIndraRuntime();
  const [showClearanceEnvelope, setShowClearanceEnvelope] = useState(true);
  const [showPredictionHorizon, setShowPredictionHorizon] = useState(true);

  const { telemetry } = indraData.pathPlanning;
  const activeModeKey = planning.hasData ? planning.modeKey : "integrated";
  const activePlannerTitle = planning.hasData ? planning.modeName : telemetry.planner;
  const activeClearance = planning.hasData && typeof planning.minimumClearance === "number"
    ? `${planning.minimumClearance.toFixed(2)} m`
    : telemetry.obstacleClearance;
  const activePathLength = planning.hasData && typeof planning.pathLength === "number"
    ? `${planning.pathLength.toFixed(1)} m`
    : telemetry.pathLength;

  return (
    <section className="indra-planning-section">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">{indraData.pathPlanning.title}</h2>
          <p className="section-subtitle">{indraData.pathPlanning.subtitle}</p>
        </div>
        <div className="planner-status-pills">
          <span className={`source-indicator-tag ${planning.hasData ? "source-planner" : "source-demo"}`}>
            {planning.hasData ? "PLANNER SIMULATION" : "DEMO SIMULATION"}
          </span>
          <span className="planner-badge mpc">MODE: {activeModeKey.toUpperCase()}</span>
        </div>
      </div>

      <div className="planning-grid-card">
        {/* Left Column: Top-down Bird's-Eye Road Visualization */}
        <div className="planning-canvas-wrapper">
          <div className="canvas-header-bar">
            <div className="canvas-title">
              <Compass size={14} className="canvas-icon" />
              <span>BIRD'S EYE VIEW (BEV) — SPATIAL LOCAL PLANNER</span>
            </div>
            <div className="canvas-controls">
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
            </div>
          </div>

          <BevCanvas
            activeModeKey={activeModeKey}
            currentStep={null}
            showClearanceEnvelope={showClearanceEnvelope}
            showPredictionHorizon={showPredictionHorizon}
          />

          {/* Visual Legend for the BEV */}
          <div className="canvas-legend">
            <div className="legend-item">
              <span className="legend-sample cyan-solid"></span>
              <span>Observed Objects</span>
            </div>
            <div className="legend-item">
              <span className="legend-sample amber-dotted"></span>
              <span>Predicted (LSTM)</span>
            </div>
            <div className="legend-item">
              <span className="legend-sample green-glow"></span>
              <span>Planned Path (MPC)</span>
            </div>
            <div className="legend-item">
              <span className="legend-sample envelope-fill"></span>
              <span>Safety Clearance Envelope</span>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry & Planner Execution Details */}
        <div className="planning-telemetry-panel">
          <div className="telemetry-panel-header">
            <Gauge size={16} className="panel-hdr-icon" />
            <span>PATH GENERATION TELEMETRY (LOCAL FRAME SIMULATION)</span>
          </div>

          {/* Core Planner KPIs as requested */}
          <div className="telemetry-specs-list">
            <div className="spec-row">
              <span className="spec-key">Planner:</span>
              <span className="spec-val-highlight green">{activePlannerTitle}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Fallback:</span>
              <span className="spec-val-highlight cyan">{telemetry.fallback}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Risk state:</span>
              <span className="risk-state-tag warning">{telemetry.riskState}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Prototype TTC Estimate:</span>
              <span className="spec-val-num">{telemetry.ttc}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Obstacle clearance (Sim):</span>
              <span className="spec-val-num green">{activeClearance}</span>
            </div>
            <div className="spec-row">
              <span className="spec-key">Goal status:</span>
              <span className="status-goal-reached">
                <CheckCircle2 size={13} />
                {telemetry.goalStatus}
              </span>
            </div>
          </div>

          {/* Supplementary Autonomous Driving Metrics */}
          <div className="sub-telemetry-card">
            <div className="sub-card-title">SIMULATED CONTROL METRICS (LOCAL FRAME)</div>
            <div className="mini-telemetry-grid">
              <div className="mini-cell">
                <span className="cell-label">Path Length (Sim)</span>
                <span className="cell-value">{activePathLength}</span>
              </div>
              <div className="mini-cell">
                <span className="cell-label">Ego Velocity (Sim)</span>
                <span className="cell-value">{telemetry.egoSpeed}</span>
              </div>
              <div className="mini-cell">
                <span className="cell-label">Steering Angle</span>
                <span className="cell-value">{telemetry.steerAngle}</span>
              </div>
              <div className="mini-cell">
                <span className="cell-label">Collision-Free (Sim)</span>
                <span className="cell-value green-text">{telemetry.collisionFree}</span>
              </div>
            </div>
          </div>

          {/* Algorithm Strategy Banner */}
          <div className="strategy-card">
            <div className="strategy-header">
              <Shield size={14} className="strategy-icon" />
              <span>HYBRID MPC-DWA SWITCH LOGIC</span>
            </div>
            <p className="strategy-text">
              MPC optimizes continuous acceleration and steering over a 2.5s horizon in synthetic local Cartesian frame. If dynamic
              obstacles violate the 0.50m simulation margin threshold, DWA instant velocity evaluation takes over
              for evasive lateral maneuvering.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
