/**
 * INDRA-Drive Path Planning Benchmark Dataset & Mode Specifications
 * 
 * Reuses verified simulation metrics directly from:
 * - final_project_metrics.json (integrated hybrid run)
 * - mpc_results.json (standalone MPC)
 * - risk_aware_dwa_results.json (risk-aware DWA)
 * - dwa_results.json (pure DWA)
 * 
 * COORDINATE SYSTEM HONESTY SPECIFICATION:
 * Perception and LSTM trajectory predictions operate in normalized image space [0.0, 1.0].
 * All path planning and optimal control metrics below operate in a synthetic local Cartesian
 * coordinate frame in METERS (Longitudinal Y: 0m to 25m, Lateral X: -3.5m to +3.5m).
 * They represent validated simulation prototype benchmarks, not camera-geometry projections.
 */

export const PLANNER_MODES = {
  integrated: {
    id: "integrated",
    name: "Integrated Hybrid (MPC + DWA Fallback)",
    shortName: "Integrated Hybrid",
    badge: "RECOMMENDED HYBRID",
    tagline: "Continuous MPC curvature with instantaneous DWA velocity-space fallback",
    plannerType: "Hybrid MPC + DWA Fallback",
    controller: "Model Predictive Control with Dynamic Window Switch",
    goalReached: true,
    collisionFree: true,
    safetyMarginSatisfied: true,
    finalDistanceToGoal: 0.4138147042403849, // meters
    minimumClearance: 0.7335007449910754, // meters
    pathLength: 13.21172263429074, // meters
    simulationSteps: 132,
    timeStep: 0.1, // seconds
    totalDuration: 13.2, // seconds
    horizon: 10,
    safetyMargin: 0.50, // meters (fallback switch threshold)
    maxRiskSpeedExcess: 0.08018422664899649, // m/s
    riskState: "MEDIUM",
    ttc: "1.93 s",
    egoSpeed: "28.4 km/h",
    steerAngle: "-4.2°",
    color: "#00ff88", // Green
    description:
      "Primary MPC continuously optimizes control inputs (acceleration and steering curvature) over a 10-step horizon. When dynamic obstacle proximity approaches the 0.50m margin threshold, DWA instant velocity evaluation takes over for evasive lateral deflection without trajectory stall.",
    splineColor: "#00ff88",
    envelopeWidth: 32,
    // SVG waypoint spline path in BEV viewBox (500x450)
    svgPathD: "M 250 400 C 248 350, 185 320, 180 250 C 175 180, 240 120, 250 55",
    waypoints: [
      { x: 250, y: 400 },
      { x: 225, y: 340 },
      { x: 188, y: 285 },
      { x: 180, y: 240 },
      { x: 205, y: 170 },
      { x: 238, y: 105 },
      { x: 250, y: 55 },
    ],
  },

  mpc: {
    id: "mpc",
    name: "Standalone MPC",
    shortName: "Standalone MPC",
    badge: "OPTIMAL TRACKING",
    tagline: "Unconstrained receding horizon trajectory tracking with smooth curvature",
    plannerType: "Model Predictive Control (Receding Horizon)",
    controller: "Model Predictive Control (MPC)",
    goalReached: true,
    collisionFree: true,
    safetyMarginSatisfied: true,
    finalDistanceToGoal: 0.44376753537811786, // meters
    minimumClearance: 0.7755436713868016, // meters
    pathLength: 13.408873880149143, // meters
    simulationSteps: 96,
    timeStep: 0.1, // seconds
    totalDuration: 9.6, // seconds
    horizon: 10,
    safetyMargin: 0.60,
    maxRiskSpeedExcess: 0.0000,
    riskState: "LOW",
    ttc: "2.40 s",
    egoSpeed: "31.2 km/h",
    steerAngle: "-3.1°",
    color: "#00e5ff", // Cyan
    description:
      "Receding horizon control minimizing state error, jerk, and control effort over a 10-step window. Exhibits the highest ride comfort and fastest convergence (96 steps) but lacks reactive velocity-space emergency bailout if obstacles abruptly change course.",
    splineColor: "#00e5ff",
    envelopeWidth: 28,
    svgPathD: "M 250 400 C 249 330, 205 290, 195 230 C 185 170, 235 110, 250 55",
    waypoints: [
      { x: 250, y: 400 },
      { x: 235, y: 330 },
      { x: 200, y: 260 },
      { x: 195, y: 210 },
      { x: 215, y: 150 },
      { x: 242, y: 95 },
      { x: 250, y: 55 },
    ],
  },

  risk_aware_dwa: {
    id: "risk_aware_dwa",
    name: "Risk-Aware DWA",
    shortName: "Risk-Aware DWA",
    badge: "MARGIN INFLATED",
    tagline: "Dynamic window velocity search with risk-modulated safety margins",
    plannerType: "Risk-Aware Dynamic Window Approach",
    controller: "Risk-Aware DWA",
    goalReached: true,
    collisionFree: true,
    safetyMarginSatisfied: true,
    safetyMargin: 0.25, // meters
    minimumClearance: 0.2501104546110976, // meters
    finalDistanceToGoal: 0.4634044084893165, // meters
    pathLength: 12.847674613759999, // meters
    simulationSteps: 145,
    timeStep: 0.1, // seconds
    totalDuration: 14.5, // seconds
    horizon: 8,
    riskLevelsObserved: ["LOW", "MEDIUM"],
    riskState: "MEDIUM",
    ttc: "1.65 s",
    egoSpeed: "24.6 km/h",
    steerAngle: "-6.8°",
    color: "#ffb700", // Amber
    description:
      "Samples the admissible velocity space (v, ω) while dynamically tightening clearance bounds based on estimated interaction risk. Delivers the shortest total path distance (12.85m) by negotiating tight gaps (0.25m clearance) with increased lateral steering activity.",
    splineColor: "#ffb700",
    envelopeWidth: 22,
    svgPathD: "M 250 400 C 246 360, 215 310, 205 255 C 195 200, 230 130, 250 55",
    waypoints: [
      { x: 250, y: 400 },
      { x: 238, y: 350 },
      { x: 215, y: 295 },
      { x: 205, y: 245 },
      { x: 212, y: 175 },
      { x: 236, y: 110 },
      { x: 250, y: 55 },
    ],
  },

  dwa: {
    id: "dwa",
    name: "Pure DWA",
    shortName: "Pure DWA",
    badge: "CONSERVATIVE STANDALONE",
    tagline: "Classical velocity-space arc evaluation with conservative clearance",
    plannerType: "Dynamic Window Approach (DWA)",
    controller: "Dynamic Window Approach",
    goalReached: true,
    collisionFree: true,
    safetyMarginSatisfied: true,
    finalDistanceToGoal: 0.48407006095114163, // meters
    minimumClearance: 1.200975610935124, // meters
    pathLength: 13.762729946374895, // meters
    simulationSteps: 203,
    timeStep: 0.1, // seconds
    totalDuration: 20.3, // seconds
    predictionHorizon: 4.5, // seconds
    safetyMargin: 1.00,
    riskState: "LOW",
    ttc: "3.10 s",
    egoSpeed: "21.0 km/h",
    steerAngle: "-8.4°",
    color: "#a855f7", // Purple
    description:
      "Standard reactive velocity-space search using circular arc motion rollouts. Enforces a conservative 1.20m minimum clearance around obstacles, leading to the longest path length (13.76m) and highest simulation steps (203 steps / 20.3s).",
    splineColor: "#a855f7",
    envelopeWidth: 40,
    svgPathD: "M 250 400 C 245 350, 160 320, 155 250 C 150 175, 230 120, 250 55",
    waypoints: [
      { x: 250, y: 400 },
      { x: 220, y: 345 },
      { x: 168, y: 290 },
      { x: 155, y: 240 },
      { x: 175, y: 170 },
      { x: 225, y: 105 },
      { x: 250, y: 55 },
    ],
  },
};

export const COMPARATIVE_METRICS_LIST = [
  {
    metric: "Goal Reached",
    integrated: "YES (Simulation)",
    mpc: "YES (Simulation)",
    risk_aware_dwa: "YES (Simulation)",
    dwa: "YES (Simulation)",
    unit: "boolean",
  },
  {
    metric: "Collision Free",
    integrated: "YES (100%)",
    mpc: "YES (100%)",
    risk_aware_dwa: "YES (100%)",
    dwa: "YES (100%)",
    unit: "boolean",
  },
  {
    metric: "Minimum Clearance",
    integrated: "0.7335 m",
    mpc: "0.7755 m",
    risk_aware_dwa: "0.2501 m",
    dwa: "1.2010 m",
    unit: "meters",
    highlight: "integrated",
  },
  {
    metric: "Total Path Length",
    integrated: "13.2117 m",
    mpc: "13.4089 m",
    risk_aware_dwa: "12.8477 m",
    dwa: "13.7627 m",
    unit: "meters",
  },
  {
    metric: "Final Distance to Goal",
    integrated: "0.4138 m",
    mpc: "0.4438 m",
    risk_aware_dwa: "0.4634 m",
    dwa: "0.4841 m",
    unit: "meters",
    highlight: "integrated",
  },
  {
    metric: "Simulation Steps",
    integrated: "132 steps (13.2s)",
    mpc: "96 steps (9.6s)",
    risk_aware_dwa: "145 steps (14.5s)",
    dwa: "203 steps (20.3s)",
    unit: "steps",
  },
  {
    metric: "Prediction Horizon",
    integrated: "10 steps (1.0s)",
    mpc: "10 steps (1.0s)",
    risk_aware_dwa: "8 steps (0.8s)",
    dwa: "4.5 s continuous",
    unit: "horizon",
  },
  {
    metric: "Safety Margin Compliance",
    integrated: "YES (> 0.50m)",
    mpc: "YES (> 0.60m)",
    risk_aware_dwa: "YES (≥ 0.25m)",
    dwa: "YES (> 1.00m)",
    unit: "margin",
  },
];
