/**
 * INDRA-Drive Closed-Loop Perception-to-Planning Prototype Bridge
 * 
 * Chains the end-to-end autonomous driving pipeline:
 * RT-DETRv2 (Perception)
 *   ↓
 * ByteTrack (Object Tracking)
 *   ↓
 * LSTM v2 (Trajectory Prediction)
 *   ↓
 * Prototype Risk (TTC & Interaction Heuristic)
 *   ↓
 * Coordinate Projection (Uncalibrated Ground-Plane Pinhole Bridge)
 *   ↓
 * MPC / DWA (Optimal Control & Evasive Corridors)
 * 
 * CRITICAL DATA HONESTY SPECIFICATION:
 * - The perception-to-planner projection is an UNCALIBRATED PROTOTYPE.
 * - No physical metric accuracy or calibrated homography is claimed.
 * - Out-of-bounds or above-horizon inputs are safely intercepted and flagged.
 * - Calculated live prototype values are strictly segregated from historical saved benchmarks.
 */

import { projectImageToPlanner, DEFAULT_PROTOTYPE_CALIBRATION } from "./coordinateProjection.js";
import { RiskLevel, PROTOTYPE_RISK_THRESHOLDS, euclideanDist } from "./riskCalculator.js";

/**
 * Standard prototype tracks from verified perception & tracking modules
 */
export const CLOSED_LOOP_PROTOTYPE_TRACKS = [
  {
    id: "track-1",
    trackId: 1,
    className: "Three-wheeler",
    label: "Auto-Rickshaw (Lateral Evasion)",
    description: "Drifting auto-rickshaw intruding into ego lane. Triggers High/Critical risk and DWA velocity fallback.",
    confidence: 0.89,
    box: [550, 750, 760, 1050],
    positions: [
      [0.3403, 0.9429],
      [0.3405, 0.9469],
      [0.3408, 0.9509],
      [0.3410, 0.9551],
      [0.3413, 0.9594],
      [0.3415, 0.9639],
      [0.3418, 0.9684],
      [0.3420, 0.9730], // T0: Ground contact (x: 0.342, y: 0.973)
    ],
    // 5-step LSTM v2 predictions in normalized image coordinates (drifting right into ego lane)
    predictedPositions: [
      [0.3550, 0.9780], // T+1
      [0.3720, 0.9830], // T+2
      [0.3920, 0.9880], // T+3
      [0.4150, 0.9925], // T+4
      [0.4400, 0.9970], // T+5 (converging toward ego centerline)
    ],
  },
  {
    id: "track-2",
    trackId: 2,
    className: "Hatchback",
    label: "Lead Hatchback (Car-Following)",
    description: "Forward lead vehicle in ego corridor at mid distance. Smooth MPC curvature adaptation.",
    confidence: 0.93,
    box: [880, 680, 1100, 830],
    positions: [
      [0.5080, 0.7020],
      [0.5090, 0.7045],
      [0.5100, 0.7070],
      [0.5110, 0.7098],
      [0.5120, 0.7125],
      [0.5135, 0.7150],
      [0.5150, 0.7175],
      [0.5165, 0.7200], // T0
    ],
    predictedPositions: [
      [0.5175, 0.7250],
      [0.5185, 0.7310],
      [0.5195, 0.7380],
      [0.5210, 0.7450],
      [0.5225, 0.7530],
    ],
  },
  {
    id: "track-3",
    trackId: 3,
    className: "Pedestrian",
    label: "Shoulder Pedestrian (Boundary Obstacle)",
    description: "Pedestrian near road edge/shoulder. Clearance satisfies safety margin; MPC tracks nominal corridor.",
    confidence: 0.85,
    box: [280, 760, 360, 920],
    positions: [
      [0.1720, 0.8050],
      [0.1730, 0.8070],
      [0.1740, 0.8090],
      [0.1750, 0.8115],
      [0.1760, 0.8140],
      [0.1770, 0.8165],
      [0.1780, 0.8190],
      [0.1790, 0.8210], // T0
    ],
    predictedPositions: [
      [0.1798, 0.8235],
      [0.1805, 0.8260],
      [0.1812, 0.8285],
      [0.1820, 0.8310],
      [0.1828, 0.8335],
    ],
  },
  {
    id: "track-4",
    trackId: 4,
    className: "Truck",
    label: "Far Truck (Above Horizon Safeguard Demo)",
    description: "Distant vehicle near/above vanishing horizon. Triggers uncalibrated horizon safeguard with safe range clamp.",
    confidence: 0.88,
    box: [580, 200, 750, 320],
    positions: [
      [0.4100, 0.2050],
      [0.4110, 0.2070],
      [0.4120, 0.2095],
      [0.4130, 0.2120],
      [0.4135, 0.2145],
      [0.4140, 0.2165],
      [0.4142, 0.2180],
      [0.4144, 0.2190], // T0: Above horizon threshold (y < 0.48)
    ],
    predictedPositions: [
      [0.4146, 0.2205],
      [0.4148, 0.2220],
      [0.4150, 0.2238],
      [0.4152, 0.2255],
      [0.4155, 0.2275],
    ],
  },
  {
    id: "track-5",
    trackId: 5,
    className: "Motorcycle",
    label: "Off-Sensor Vehicle (Out-of-Bounds Demo)",
    description: "Object at sensor peripheral boundary (x < 0.0). Safely intercepted and flagged as OUT_OF_BOUNDS.",
    confidence: 0.78,
    box: [-50, 800, 80, 960],
    positions: [
      [-0.040, 0.8500],
      [-0.045, 0.8550],
      [-0.050, 0.8600],
      [-0.055, 0.8650],
      [-0.060, 0.8700],
      [-0.065, 0.8750],
      [-0.070, 0.8800],
      [-0.075, 0.8850], // T0
    ],
    predictedPositions: [
      [-0.080, 0.8900],
      [-0.085, 0.8950],
      [-0.090, 0.9000],
      [-0.095, 0.9050],
      [-0.100, 0.9100],
    ],
  },
];

/**
 * Execute closed-loop state computation from perception track to planner response
 * 
 * @param {Object} track - Perception track with positions and predictions
 * @param {Object} [overridePoint] - Optional override { xNorm, yNorm } for live slider testing
 * @returns {Object} Comprehensive closed-loop state
 */
export function computeClosedLoopState(track, overridePoint = null) {
  const currentNorm = overridePoint
    ? [overridePoint.xNorm, overridePoint.yNorm]
    : track.positions[track.positions.length - 1];

  const [x0, y0] = currentNorm;

  // 1. Perception & Tracking telemetry
  const perceptionData = {
    class_name: track.className,
    confidence: track.confidence,
    box: track.box,
    groundContactNorm: { x: x0, y: y0 },
  };

  const trackingData = {
    trackId: track.trackId,
    historyLength: track.positions.length,
    historyTrail: track.positions,
  };

  // 2. Trajectory Prediction (LSTM v2)
  // If overridden, offset predictions accordingly
  const offsetX = overridePoint ? x0 - track.positions[track.positions.length - 1][0] : 0;
  const offsetY = overridePoint ? y0 - track.positions[track.positions.length - 1][1] : 0;

  const predictedTrajectory = (track.predictedPositions || []).map(([px, py]) => [
    Number((px + offsetX).toFixed(4)),
    Number((py + offsetY).toFixed(4)),
  ]);

  // 3. Prototype Image-Space Risk & TTC heuristic
  // Compare against ego camera center ground baseline (approximated near [0.50, 1.00])
  const egoImageRef = [0.50, 1.00];
  const d0 = euclideanDist(currentNorm, egoImageRef);

  let minSeparation = d0;
  let minStep = 1;
  const stepDistances = [];

  for (let k = 0; k < predictedTrajectory.length; k++) {
    const d = euclideanDist(predictedTrajectory[k], egoImageRef);
    stepDistances.push(d);
    if (d < minSeparation) {
      minSeparation = d;
      minStep = k + 1;
    }
  }

  const isConverging = minSeparation < d0;
  const dt = 0.0333; // 30 FPS prototype interval
  const closureRate = isConverging ? (d0 - minSeparation) / (minStep * dt) : 0;

  let ttc = null;
  let riskLevel = RiskLevel.LOW;

  if (isConverging) {
    ttc = closureRate > 0.001 ? Number((d0 / closureRate).toFixed(2)) : 9.99;
    if (ttc < PROTOTYPE_RISK_THRESHOLDS.CRITICAL) {
      riskLevel = RiskLevel.CRITICAL;
    } else if (ttc < PROTOTYPE_RISK_THRESHOLDS.HIGH) {
      riskLevel = RiskLevel.HIGH;
    } else if (ttc < PROTOTYPE_RISK_THRESHOLDS.MEDIUM) {
      riskLevel = RiskLevel.MEDIUM;
    } else {
      riskLevel = RiskLevel.LOW;
    }
  } else {
    riskLevel = RiskLevel.LOW;
  }

  // 4. Coordinate Projection Bridge (Pinhole Ground Plane - Prototype)
  const currentProjection = projectImageToPlanner(x0, y0);
  const predictedProjections = predictedTrajectory.map(([px, py]) =>
    projectImageToPlanner(px, py)
  );

  const isAboveHorizon = currentProjection.status === "ABOVE_HORIZON";
  const isOutOfBounds = currentProjection.status === "OUT_OF_BOUNDS";
  const isProjectionValid = currentProjection.status === "VALID";

  // 5. Reactive MPC / DWA Controller State
  const obsX = currentProjection.plannerMetric.xMeters;
  const obsY = currentProjection.plannerMetric.yMeters;

  // Ego starts at origin (0, 0)
  const dynamicClearance = Math.sqrt(obsX * obsX + obsY * obsY);

  let controllerMode = "MPC_OPTIMAL_TRACKING";
  let recommendedAction = "Nominal trajectory tracking along road centerline.";
  let lateralDeflectionMeters = 0.0;
  let targetSpeedKmh = 32.0;
  let safeguardTriggered = false;
  let safeguardMessage = null;

  if (isAboveHorizon) {
    safeguardTriggered = true;
    controllerMode = "CONSERVATIVE_CRUISE_SAFEGUARD";
    safeguardMessage = "Horizon Cutoff Engaged: Target is above ground-plane intersection. Clamped to +40.0m range.";
    recommendedAction = "Maintain forward cruise with conservative situational awareness buffer.";
    targetSpeedKmh = 28.0;
  } else if (isOutOfBounds) {
    safeguardTriggered = true;
    controllerMode = "SAFEGUARD_PERIPHERAL_HOLD";
    safeguardMessage = "Out of Sensor Bounds: Horizontal coordinate exceeds valid camera FOV. Retaining +1.50m margin.";
    recommendedAction = "Expand dynamic clearance envelope to road edge and slow to 22.0 km/h.";
    targetSpeedKmh = 22.0;
    lateralDeflectionMeters = obsX < 0 ? 0.60 : -0.60;
  } else {
    // Valid ground-plane projection
    // Check if obstacle poses a lateral threat (within road corridor |X| < 1.8m and Y < 16m)
    const inCorridor = Math.abs(obsX) <= 1.80 && obsY <= 16.0;

    if (inCorridor && (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH)) {
      controllerMode = "DWA_FALLBACK_EVASION";
      // Deflect away from obstacle
      lateralDeflectionMeters = obsX >= 0 ? -1.35 : 1.35;
      targetSpeedKmh = 19.5;
      recommendedAction = `Instant DWA velocity-space evasive maneuver: Deflecting ${Math.abs(lateralDeflectionMeters).toFixed(2)}m ${lateralDeflectionMeters < 0 ? "Left" : "Right"} to preserve safety margin.`;
    } else if (inCorridor && riskLevel === RiskLevel.MEDIUM) {
      controllerMode = "MPC_CURVATURE_ADAPTATION";
      lateralDeflectionMeters = obsX >= 0 ? -0.70 : 0.70;
      targetSpeedKmh = 25.5;
      recommendedAction = `MPC predictive curvature shift: Smooth lateral deviation ${Math.abs(lateralDeflectionMeters).toFixed(2)}m around lead obstacle.`;
    } else if (dynamicClearance < 3.0) {
      controllerMode = "ADAPTIVE_PROXIMITY_MARGIN";
      lateralDeflectionMeters = obsX >= 0 ? -0.50 : 0.50;
      targetSpeedKmh = 24.0;
      recommendedAction = "Proximity margin active: Moderate lateral bias away from vehicle footprint.";
    } else {
      controllerMode = "MPC_OPTIMAL_TRACKING";
      lateralDeflectionMeters = 0.0;
      targetSpeedKmh = 31.2;
      recommendedAction = "Obstacle outside immediate evasion threshold. Nominal MPC trajectory active.";
    }
  }

  return {
    trackId: track.trackId,
    trackLabel: track.label,
    trackDescription: track.description,
    perception: perceptionData,
    tracking: trackingData,
    prediction: {
      trajectory: predictedTrajectory,
      steps: predictedTrajectory.length,
      coordinateSpace: "NORMALIZED_IMAGE_COORDINATES",
    },
    risk: {
      d0: Number(d0.toFixed(4)),
      minSeparation: Number(minSeparation.toFixed(4)),
      closureRate: Number(closureRate.toFixed(4)),
      ttc: ttc !== null ? `${ttc.toFixed(2)} s` : "N/A",
      riskLevel,
      isConverging,
    },
    projection: {
      isCalibrated: false,
      disclaimer: DEFAULT_PROTOTYPE_CALIBRATION.disclaimer,
      method: DEFAULT_PROTOTYPE_CALIBRATION.method,
      status: currentProjection.status,
      currentPoseMeters: {
        x: currentProjection.plannerMetric.xMeters,
        y: currentProjection.plannerMetric.yMeters,
      },
      groundPixel: currentProjection.groundPixel,
      predictedPathMeters: predictedProjections.map((p) => ({
        x: p.plannerMetric.xMeters,
        y: p.plannerMetric.yMeters,
        status: p.status,
      })),
      isAboveHorizon,
      isOutOfBounds,
      isProjectionValid,
    },
    control: {
      controllerMode,
      recommendedAction,
      lateralDeflectionMeters,
      targetSpeedKmh,
      dynamicClearanceMeters: Number(dynamicClearance.toFixed(2)),
      safeguardTriggered,
      safeguardMessage,
    },
    timestamp: Date.now(),
  };
}
