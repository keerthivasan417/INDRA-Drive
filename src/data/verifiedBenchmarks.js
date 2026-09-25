/**
 * INDRA-Drive: Verified Project Benchmarks & Model Metadata
 *
 * PROVENANCE CONTRACT:
 * All values in this module correspond directly to verified project artifacts
 * and models. Zero values are fabricated.
 *
 * Sources:
 * 1. RT-DETRv2 R18 Epoch 12 Validation:
 *    Source file: evaluation_epoch12.json
 * 2. TrajectoryLSTM v2:
 *    Source file: models/trajectory_lstm_v2/lstm_v2_info.json
 * 3. ByteTrack Test Tracking Record:
 *    Source file: final_project_metrics.json (tracking section)
 * 4. Path Planning Simulation Benchmarks:
 *    Source file: src/data/plannerBenchmarks.js (derived from final_project_metrics.json, mpc_results.json, dwa_results.json)
 */

import { PLANNER_MODES } from "./plannerBenchmarks.js";

export { PLANNER_MODES };

/**
 * RT-DETRv2 R18 Perception Validation Metrics (Epoch 12 Checkpoint)
 * Source: verified 800-image validation evaluation (same evaluation setup used
 * for the checkpoint comparison across Epochs 7, 9, 10, 11, 12, 13 and 14).
 */
export const PERCEPTION_BENCHMARK = {
  model: "RT-DETRv2 R18",
  checkpoint: "epoch12",
  dataset: "UVH-26",
  trainImages: 3000,
  trainAnnotations: 38881,
  validationImages: 800,
  validationAnnotations: 11064,
  numClasses: 14,
  classes: [
    "Hatchback",
    "Sedan",
    "SUV",
    "MUV",
    "Bus",
    "Truck",
    "Three-wheeler",
    "Two-wheeler",
    "LCV",
    "Mini-bus",
    "Tempo-traveller",
    "Bicycle",
    "Van",
    "Others",
  ],
  metrics: {
    mAP_50_95: 0.3530,
    mAP_50: 0.4347,
    mAP_75: 0.3925,
    mAR_100: 0.7385,
  },
  provenance: "Epoch 12 evaluation on 800-image validation set",
};

/**
 * TrajectoryLSTM v2 Architecture & Training Record
 * Source: models/trajectory_lstm_v2/lstm_v2_info.json
 */
export const LSTM_V2_METRICS = {
  model: "TrajectoryLSTM",
  inputFrames: 8,
  predictionFrames: 5,
  inputFeatures: 2,
  hiddenSize: 64,
  numLayers: 2,
  parameters: 51338,
  trainingTracks: 50,
  validationTracks: 13,
  trainingSequences: 176,
  validationSequences: 56,
  bestValidationLoss: 0.0005568118367591524,
  ADE_normalized: 0.024637794122099876,
  FDE_normalized: 0.03248562663793564,
  coordinateSpace: "Normalized Image Space [0.0, 1.0]",
  provenance: "models/trajectory_lstm_v2/lstm_v2_info.json",
};

/**
 * ByteTrack Tracking Test Record
 * Source: final_project_metrics.json (tracking)
 */
export const TRACKING_BENCHMARK = {
  tracker: "ByteTrack",
  associationMethod: "2-Stage High/Low Confidence Matching + Kalman Filter",
  tracksCreatedInTest: 50,
  validTrajectories: 38, // >= 8 sequential frames
  provenance: "final_project_metrics.json",
};

/**
 * Risk / TTC Estimation Specifications
 * Source: final_project_metrics.json (risk_estimation)
 */
export const RISK_SPECIFICATION = {
  method: "Prototype TTC-based Risk Estimation",
  riskLevels: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  coordinateSpace: "Prototype Image-Space Center Ray Projections",
  calibrationStatus: "Uncalibrated Camera Geometry (Dimensionless Ratio)",
  provenance: "final_project_metrics.json / riskCalculator.js",
};

