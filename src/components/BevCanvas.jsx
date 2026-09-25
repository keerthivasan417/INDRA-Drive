import React, { useMemo } from "react";
import { PLANNER_MODES } from "../data/plannerBenchmarks";

/**
 * Computes 2D cubic Bezier position and tangent heading
 */
function evaluateBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  // Tangent
  const dx = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
  const dy = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);
  const angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;

  return { x, y, angle: angleDeg };
}

export default function BevCanvas({
  activeModeKey = "integrated",
  currentStep = null,
  showClearanceEnvelope = true,
  showPredictionHorizon = true,
  closedLoopObstacle = null,
}) {
  const modeData = PLANNER_MODES[activeModeKey] || PLANNER_MODES.integrated;
  const maxSteps = modeData?.simulationSteps || 132;
  const step = currentStep !== null && currentStep !== undefined
    ? Math.max(0, Math.min(maxSteps, currentStep))
    : maxSteps;
  const progress = maxSteps > 0 ? Math.max(0, Math.min(1, step / maxSteps)) : 0;

  // Mode-specific Bezier control points matching SVG paths
  const bezierConfigs = useMemo(() => ({
    integrated: {
      p0: { x: 250, y: 400 },
      p1: { x: 185, y: 320 },
      p2: { x: 180, y: 250 },
      p3: { x: 250, y: 55 },
    },
    mpc: {
      p0: { x: 250, y: 400 },
      p1: { x: 205, y: 290 },
      p2: { x: 195, y: 230 },
      p3: { x: 250, y: 55 },
    },
    risk_aware_dwa: {
      p0: { x: 250, y: 400 },
      p1: { x: 215, y: 310 },
      p2: { x: 205, y: 255 },
      p3: { x: 250, y: 55 },
    },
    dwa: {
      p0: { x: 250, y: 400 },
      p1: { x: 160, y: 320 },
      p2: { x: 155, y: 250 },
      p3: { x: 250, y: 55 },
    },
  }), []);

  const cfg = bezierConfigs[activeModeKey] || bezierConfigs.integrated;
  const egoPose = useMemo(() => {
    return evaluateBezier(cfg.p0, cfg.p1, cfg.p2, cfg.p3, progress);
  }, [cfg, progress]);

  // Obstacle rickshaw drifting left along prediction curve during playback
  const obsPose = useMemo(() => {
    const obsProgress = Math.min(1, progress * 1.2);
    // Path from (285, 240) to (240, 160)
    const ox = 285 - 45 * obsProgress;
    const oy = 240 - 80 * obsProgress;
    return { x: ox, y: oy };
  }, [progress]);

  const pathColor = modeData?.splineColor || "#00ff88";
  const waypoints = Array.isArray(modeData?.waypoints) ? modeData.waypoints : [];
  const minClearanceStr = typeof modeData?.minimumClearance === "number" ? modeData.minimumClearance.toFixed(2) : "0.73";
  const pathLengthStr = typeof modeData?.pathLength === "number" ? modeData.pathLength.toFixed(1) : "13.2";

  // Map Closed-Loop Projected Obstacle from local Cartesian (X_m, Y_m) to SVG coordinates
  const closedLoopSvgPose = useMemo(() => {
    if (!closedLoopObstacle) return null;
    const {
      xMeters = 0,
      yMeters = 5,
      status = "VALID",
      predictedPathMeters = [],
      riskLevel = "LOW",
      label = "Perception Obstacle",
      safeguardTriggered = false,
    } = closedLoopObstacle;

    // Longitudinal scale: Y=0m at y=400, Y=20m at y=100 -> 15 px/m
    // Lateral scale: X=0m at x=250, road asphalt width 330px for 7.0m -> 47.14 px/m
    let svgX = 250 + xMeters * 47.14;
    let svgY = 400 - yMeters * 15;

    // Safety boundary clamping for SVG viewport
    if (status === "ABOVE_HORIZON") {
      svgY = 45; // Clamped near horizon ceiling
      svgX = Math.max(85, Math.min(415, svgX));
    } else if (status === "OUT_OF_BOUNDS") {
      svgX = xMeters < 0 ? 45 : 455; // Rendered on outer shoulder
      svgY = Math.max(60, Math.min(420, svgY));
    } else {
      svgX = Math.max(30, Math.min(470, svgX));
      svgY = Math.max(40, Math.min(430, svgY));
    }

    // Convert predicted path points
    const svgPath = (predictedPathMeters || []).map((pt) => ({
      x: Math.max(30, Math.min(470, 250 + pt.x * 47.14)),
      y: pt.status === "ABOVE_HORIZON" ? 45 : Math.max(40, Math.min(430, 400 - pt.y * 15)),
      status: pt.status,
    }));

    const distMeters = Math.sqrt(xMeters * xMeters + yMeters * yMeters);

    return {
      svgX,
      svgY,
      svgPath,
      distMeters,
      status,
      riskLevel,
      label,
      safeguardTriggered,
      xMeters,
      yMeters,
    };
  }, [closedLoopObstacle]);

  return (
    <div className="bev-viewport">
      <svg
        className="bev-svg"
        viewBox="0 0 500 450"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Dynamic mode color glow filter */}
          <filter id="plannerPathGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Amber glow for predicted path */}
          <filter id="amberGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grid pattern */}
          <pattern id="bevGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
          </pattern>

          {/* Radial gradient for Ego vehicle sensor sweep */}
          <radialGradient id="sensorLidarGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 255, 136, 0.25)" />
            <stop offset="70%" stopColor="rgba(0, 240, 255, 0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Background Grid */}
        <rect x="0" y="0" width="500" height="450" fill="#070b13" />
        <rect x="0" y="0" width="500" height="450" fill="url(#bevGrid)" />

        {/* Road Corridors (Indian 2-lane road with dirt shoulders) */}
        {/* Left Dirt Verge */}
        <rect x="0" y="0" width="85" height="450" fill="#13100c" opacity="0.7" />
        <line x1="85" y1="0" x2="85" y2="450" stroke="#854d0e" strokeWidth="2" strokeDasharray="8 8" opacity="0.6" />

        {/* Right Dirt Verge */}
        <rect x="415" y="0" width="85" height="450" fill="#13100c" opacity="0.7" />
        <line x1="415" y1="0" x2="415" y2="450" stroke="#854d0e" strokeWidth="2" strokeDasharray="8 8" opacity="0.6" />

        {/* Road Asphalt */}
        <rect x="85" y="0" width="330" height="450" fill="#0a0f1d" />

        {/* Center Lane Divider (faded unstructured dashes) */}
        <line
          x1="250"
          y1="0"
          x2="250"
          y2="450"
          stroke="#e2e8f0"
          strokeWidth="2"
          strokeDasharray="18 16"
          opacity="0.3"
        />

        {/* Road Distance Markers */}
        <text x="95" y="100" fill="#64748b" fontSize="10" fontFamily="monospace">Y = +20m</text>
        <line x1="85" y1="95" x2="415" y2="95" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />

        <text x="95" y="200" fill="#64748b" fontSize="10" fontFamily="monospace">Y = +14m</text>
        <line x1="85" y1="195" x2="415" y2="195" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />

        <text x="95" y="300" fill="#64748b" fontSize="10" fontFamily="monospace">Y = +08m</text>
        <line x1="85" y1="295" x2="415" y2="295" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />

        {/* ================================================================= */}
        {/* PREDICTED TRAJECTORY (LSTM) - Obstacle Auto-rickshaw path         */}
        {/* ================================================================= */}
        {showPredictionHorizon && (
          <g id="predicted-obstacle-path">
            {/* Amber dashed future path of auto drifting left into ego lane */}
            <path
              d="M 285 240 Q 260 210 240 160"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="5 5"
              filter="url(#amberGlow)"
              opacity="0.9"
            />
            {/* Future predicted positions (5 frames) */}
            <circle cx="280" cy="230" r="3" fill="#f59e0b" opacity="0.6" />
            <circle cx="272" cy="215" r="3.5" fill="#f59e0b" opacity="0.7" />
            <circle cx="260" cy="195" r="4" fill="#f59e0b" opacity="0.85" />
            <circle cx="248" cy="175" r="4.5" fill="#f59e0b" opacity="0.95" />
            <circle cx="240" cy="160" r="5" fill="#ef4444" />
            <text x="248" y="156" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="600">
              LSTM t+1.5s
            </text>
          </g>
        )}

        {/* ================================================================= */}
        {/* PLANNED TRAJECTORY (Mode-Specific Spline)                         */}
        {/* ================================================================= */}
        <g id="planned-ego-path">
          {/* Dynamic Clearance Safety Envelope Tube */}
          {showClearanceEnvelope && (
            <path
              d={modeData.svgPathD}
              fill="none"
              stroke={pathColor}
              strokeOpacity="0.12"
              strokeWidth={modeData.envelopeWidth || 30}
              strokeLinecap="round"
            />
          )}

          {/* Primary Planned Trajectory */}
          <path
            d={modeData.svgPathD}
            fill="none"
            stroke={pathColor}
            strokeWidth="3.5"
            filter="url(#plannerPathGlow)"
            className="planned-path-animated"
          />

          {/* Waypoint Waymarkers */}
          {waypoints.map((wp, idx) => (
            <circle
              key={`wp-${idx}`}
              cx={wp.x}
              cy={wp.y}
              r={idx === 0 || idx === waypoints.length - 1 ? 4 : 3}
              fill={pathColor}
              opacity={0.9}
            />
          ))}

          {/* Traveled History Breadcrumb (from start to current ego pose) */}
          {progress > 0.05 && (
            <circle
              cx={egoPose.x}
              cy={egoPose.y}
              r="6"
              fill={pathColor}
              stroke="#05070c"
              strokeWidth="2"
            />
          )}
        </g>

        {/* ================================================================= */}
        {/* OBSTACLES (Top-Down Vector Graphics)                             */}
        {/* ================================================================= */}
        {/* Obstacle 1: Auto Rickshaw at animated position */}
        <g id="bev-obstacle-rickshaw" transform={`translate(${obsPose.x}, ${obsPose.y})`}>
          {/* Clearance zone */}
          <circle
            cx="0"
            cy="0"
            r="24"
            fill="rgba(245, 158, 11, 0.12)"
            stroke="#f59e0b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          {/* Rickshaw body */}
          <rect x="-10" y="-15" width="20" height="30" rx="4" fill="#065f46" stroke="#ca8a04" strokeWidth="1.5" />
          {/* Yellow roof */}
          <path d="M -8 -13 L 8 -13 L 9 2 L -9 2 Z" fill="#eab308" />
          <rect x="-8" y="5" width="16" height="8" rx="1" fill="#1e293b" />
          {/* Label */}
          <text x="24" y="4" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
            AUTO #02 ({minClearanceStr}m CLEAR)
          </text>
        </g>

        {/* Obstacle 2: Two-Wheeler at (130, 310) */}
        <g id="bev-obstacle-bike" transform="translate(130, 310)">
          <circle cx="0" cy="0" r="16" fill="rgba(0, 240, 255, 0.12)" stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="-4" y="-12" width="8" height="24" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="0" cy="-2" r="5" fill="#38bdf8" />
          <text x="-95" y="4" fill="#00f0ff" fontSize="9" fontFamily="monospace">
            BIKE #04 (2.1m)
          </text>
        </g>

        {/* Obstacle 3: Road Pothole / Hazard at (345, 150) */}
        <g id="bev-obstacle-pothole" transform="translate(345, 150)">
          <ellipse cx="0" cy="0" rx="18" ry="12" fill="#261010" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="-12" y="3" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">HAZARD</text>
        </g>

        {/* ================================================================= */}
        {/* GOAL / DESTINATION MARKER at (250, 55)                            */}
        {/* ================================================================= */}
        <g id="bev-goal-marker" transform="translate(250, 55)">
          <circle cx="0" cy="0" r="18" fill="none" stroke={pathColor} strokeWidth="1.5" opacity="0.5" className="pulse-ring" />
          <circle cx="0" cy="0" r="11" fill="rgba(0, 255, 136, 0.2)" stroke={pathColor} strokeWidth="2" />
          <circle cx="0" cy="0" r="4" fill={pathColor} />
          <rect x="-45" y="-30" width="90" height="18" rx="4" fill="#06121f" stroke={pathColor} strokeWidth="1" />
          <text x="0" y="-18" fill={pathColor} fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
            ★ GOAL ({pathLengthStr}m)
          </text>
        </g>

        {/* ================================================================= */}
        {/* CLOSED-LOOP PERCEPTION PROJECTION OVERLAY (UNCALIBRATED PROTOTYPE) */}
        {/* ================================================================= */}
        {closedLoopSvgPose && (
          <g id="bev-closed-loop-layer">
            {/* Header uncalibrated watermark banner */}
            <rect x="40" y="8" width="420" height="18" rx="4" fill="#0b1120" stroke="#f59e0b" strokeWidth="1" opacity="0.9" />
            <text x="250" y="20" fill="#f59e0b" fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight="600" letterSpacing="0.5">
              PROTOTYPE CLOSED-LOOP PROJECTION — UNCALIBRATED
            </text>

            {/* Dynamic Clearance Ray to Ego Vehicle */}
            <line
              x1={egoPose.x}
              y1={egoPose.y}
              x2={closedLoopSvgPose.svgX}
              y2={closedLoopSvgPose.svgY}
              stroke={closedLoopSvgPose.riskLevel === "CRITICAL" ? "#ef4444" : "#f59e0b"}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.8"
            />
            {/* Distance label pill */}
            <rect
              x={(egoPose.x + closedLoopSvgPose.svgX) / 2 - 48}
              y={(egoPose.y + closedLoopSvgPose.svgY) / 2 - 16}
              width="96"
              height="15"
              rx="3"
              fill="#050811"
              stroke={closedLoopSvgPose.riskLevel === "CRITICAL" ? "#ef4444" : "#f59e0b"}
              strokeWidth="1"
            />
            <text
              x={(egoPose.x + closedLoopSvgPose.svgX) / 2}
              y={(egoPose.y + closedLoopSvgPose.svgY) / 2 - 5}
              fill={closedLoopSvgPose.riskLevel === "CRITICAL" ? "#ef4444" : "#f59e0b"}
              fontSize="8"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              d = {closedLoopSvgPose.distMeters.toFixed(2)}m (proj)
            </text>

            {/* Projected Predicted Trajectory Spline in Planner Space */}
            {closedLoopSvgPose.svgPath.length > 0 && (
              <g id="closed-loop-predicted-spline">
                {closedLoopSvgPose.svgPath.map((pt, idx) => (
                  <circle
                    key={`cl-pt-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={3.5}
                    fill={pt.status === "VALID" ? "#00f0ff" : "#ef4444"}
                    stroke="#050811"
                    strokeWidth="1"
                    opacity={0.85}
                  />
                ))}
              </g>
            )}

            {/* Projected Target Footprint */}
            <g transform={`translate(${closedLoopSvgPose.svgX}, ${closedLoopSvgPose.svgY})`}>
              {/* Outer halo */}
              <circle
                cx="0"
                cy="0"
                r="22"
                fill={closedLoopSvgPose.riskLevel === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : "rgba(0, 240, 255, 0.15)"}
                stroke={closedLoopSvgPose.riskLevel === "CRITICAL" ? "#ef4444" : "#00f0ff"}
                strokeWidth="1.5"
                strokeDasharray="3 2"
                className="pulse-ring"
              />
              {/* Vehicle / Obstacle Icon */}
              <rect
                x="-12"
                y="-18"
                width="24"
                height="36"
                rx="4"
                fill="#0f172a"
                stroke={closedLoopSvgPose.riskLevel === "CRITICAL" ? "#ef4444" : "#00f0ff"}
                strokeWidth="2"
              />
              <circle cx="0" cy="0" r="4" fill={closedLoopSvgPose.riskLevel === "CRITICAL" ? "#ef4444" : "#00f0ff"} />

              {/* Status and Tag text */}
              <rect x="-65" y="-34" width="130" height="14" rx="3" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="0" y="-24" fill="#38bdf8" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                PROJ: ({closedLoopSvgPose.xMeters.toFixed(1)}m, {closedLoopSvgPose.yMeters.toFixed(1)}m)
              </text>

              {/* Safeguard Alert Pill if triggered */}
              {closedLoopSvgPose.safeguardTriggered && (
                <g transform="translate(0, 24)">
                  <rect x="-55" y="0" width="110" height="14" rx="3" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                  <text x="0" y="10" fill="#fca5a5" fontSize="7.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                    ⚠️ {closedLoopSvgPose.status}
                  </text>
                </g>
              )}
            </g>
          </g>
        )}

        {/* ================================================================= */}
        {/* EGO VEHICLE (Animated pose during playback scrubber)             */}
        {/* ================================================================= */}
        <g
          id="bev-ego-vehicle"
          transform={`translate(${egoPose.x}, ${egoPose.y}) rotate(${egoPose.angle})`}
          style={{ transition: "transform 0.08s ease-out" }}
        >
          {/* Lidar range ring */}
          <circle
            cx="0"
            cy="0"
            r="48"
            fill="url(#sensorLidarGrad)"
            stroke={pathColor}
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          {/* Ego Vehicle Body */}
          <rect x="-14" y="-28" width="28" height="56" rx="6" fill="#0d1b2a" stroke={pathColor} strokeWidth="2" />
          {/* Windshield & Rear glass */}
          <rect x="-10" y="-18" width="20" height="12" rx="2" fill="#1b2e4b" stroke="#38bdf8" strokeWidth="1" />
          <rect x="-10" y="8" width="20" height="8" rx="2" fill="#1b2e4b" stroke="#38bdf8" strokeWidth="1" />
          {/* Autonomous Sensor Dome */}
          <circle cx="0" cy="-2" r="5" fill={pathColor} />
          <circle cx="0" cy="-2" r="2" fill="#000" />
          {/* Headlights */}
          <rect x="-12" y="-29" width="5" height="3" fill="#00f0ff" />
          <rect x="7" y="-29" width="5" height="3" fill="#00f0ff" />

          <text
            x="0"
            y="42"
            fill={pathColor}
            fontSize="9.5"
            textAnchor="middle"
            fontFamily="monospace"
            fontWeight="bold"
            transform={`rotate(${-egoPose.angle})`}
          >
            EGO ({modeData.egoSpeed})
          </text>
        </g>
      </svg>
    </div>
  );
}
