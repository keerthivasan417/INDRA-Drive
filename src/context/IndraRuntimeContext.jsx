/* oxlint-disable react/only-export-components, react/set-state-in-effect */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getBackendHealth } from "../services/api";

const IndraRuntimeContext = createContext(null);

const INITIAL_RUNTIME_STATE = {
  perception: {
    hasData: false,
    source: "DEMO",
    filename: null,
    imageWidth: null,
    imageHeight: null,
    detectionCount: null,
    detections: [],
    previewUrl: null,
    inferenceTimeMs: null,
    timestamp: null,
  },
  tracking: {
    hasData: false,
    source: "DEMO",
    activeTrackCount: null,
    totalTrackCount: null,
    currentFrame: null,
    totalFrames: null,
    activeTracks: [],
    allRegisteredTracks: [],
    timestamp: null,
  },
  trajectory: {
    hasData: false,
    source: "DEMO",
    selectedTrackId: null,
    observedPositions: [],
    predictedPositions: [],
    inferenceTimeMs: null,
    status: null,
    timestamp: null,
  },
  risk: {
    hasData: false,
    source: "DEMO",
    riskLevel: null,
    ttc: null,
    minSeparation: null,
    isConverging: null,
    highestRiskPair: null,
    timestamp: null,
  },
  planning: {
    hasData: false,
    source: "DEMO",
    modeKey: "integrated",
    modeName: "Integrated Hybrid (MPC + DWA Fallback)",
    minimumClearance: null,
    pathLength: null,
    goalReached: true,
    finalDistanceToGoal: null,
    timestamp: null,
  },
  backendHealth: {
    hasData: false,
    status: "STANDBY",
    model: null,
    checkpoint: null,
    trajectory_model: null,
    trajectory_device: null,
    num_classes: null,
    device: null,
    gpu: null,
    lastChecked: null,
    error: null,
  },
};

export function IndraRuntimeProvider({ children }) {
  const [runtimeState, setRuntimeState] = useState(INITIAL_RUNTIME_STATE);

  const updatePerceptionResult = useCallback((data) => {
    if (!data) return;
    setRuntimeState((prev) => ({
      ...prev,
      perception: {
        hasData: true,
        source: "LIVE MODEL",
        filename: data.filename || "Uploaded Frame",
        imageWidth: data.image_width || data.imageWidth || null,
        imageHeight: data.image_height || data.imageHeight || null,
        detectionCount:
          typeof data.detection_count === "number"
            ? data.detection_count
            : Array.isArray(data.detections)
            ? data.detections.length
            : 0,
        detections: data.detections || [],
        previewUrl: data.previewUrl || null,
        inferenceTimeMs: data.inferenceTimeMs || null,
        timestamp: Date.now(),
      },
    }));
  }, []);

  const updateTrackingState = useCallback((data) => {
    if (!data) return;
    setRuntimeState((prev) => ({
      ...prev,
      tracking: {
        hasData: true,
        source: "PROTOTYPE TRACKING",
        activeTrackCount:
          typeof data.activeTrackCount === "number" ? data.activeTrackCount : null,
        totalTrackCount:
          typeof data.totalTrackCount === "number" ? data.totalTrackCount : null,
        currentFrame: data.currentFrame || null,
        totalFrames: data.totalFrames || null,
        activeTracks: data.activeTracks || [],
        allRegisteredTracks: data.allRegisteredTracks || [],
        timestamp: Date.now(),
      },
    }));
  }, []);

  const updateTrajectoryResult = useCallback((data) => {
    if (!data) return;
    setRuntimeState((prev) => ({
      ...prev,
      trajectory: {
        hasData: true,
        source: "LSTM v2 / CALCULATED",
        selectedTrackId: data.selectedTrackId ?? null,
        observedPositions: data.observedPositions || [],
        predictedPositions: data.predictedPositions || [],
        inferenceTimeMs: data.inferenceTimeMs || null,
        status: data.status || "COMPLETE",
        timestamp: Date.now(),
      },
    }));
  }, []);

  const updateRiskResult = useCallback((data) => {
    if (!data) return;
    setRuntimeState((prev) => ({
      ...prev,
      risk: {
        hasData: true,
        source: "PROTOTYPE IMAGE-SPACE RISK",
        riskLevel: data.riskLevel || "LOW",
        ttc: data.ttc !== undefined ? data.ttc : null,
        minSeparation: data.minSeparation !== undefined ? data.minSeparation : null,
        isConverging: data.isConverging ?? false,
        highestRiskPair: data.highestRiskPair || null,
        timestamp: Date.now(),
      },
    }));
  }, []);

  const updatePlanningState = useCallback((data) => {
    if (!data) return;
    setRuntimeState((prev) => ({
      ...prev,
      planning: {
        hasData: true,
        source: "PLANNER SIMULATION",
        modeKey: data.modeKey || "integrated",
        modeName: data.modeName || "Integrated Hybrid (MPC + DWA Fallback)",
        minimumClearance:
          data.minimumClearance !== undefined ? data.minimumClearance : null,
        pathLength: data.pathLength !== undefined ? data.pathLength : null,
        goalReached: data.goalReached ?? true,
        finalDistanceToGoal:
          data.finalDistanceToGoal !== undefined ? data.finalDistanceToGoal : null,
        timestamp: Date.now(),
      },
    }));
  }, []);

  const fetchBackendHealth = useCallback(async () => {
    try {
      const data = await getBackendHealth();
      setRuntimeState((prev) => ({
        ...prev,
        backendHealth: {
          hasData: true,
          status: data.status || "healthy",
          model: data.model || null,
          checkpoint: data.checkpoint || null,
          trajectory_model: data.trajectory_model || null,
          trajectory_device: data.trajectory_device || null,
          num_classes: data.num_classes || null,
          device: data.device || null,
          gpu: data.gpu || null,
          lastChecked: Date.now(),
          error: null,
        },
      }));
      return data;
    } catch (err) {
      setRuntimeState((prev) => ({
        ...prev,
        backendHealth: {
          hasData: false,
          status: "UNREACHABLE",
          model: null,
          checkpoint: null,
          trajectory_model: null,
          trajectory_device: null,
          num_classes: null,
          device: null,
          gpu: null,
          lastChecked: Date.now(),
          error: err.message || "Failed to connect to backend",
        },
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    fetchBackendHealth();
  }, [fetchBackendHealth]);

  const resetRuntimeState = useCallback(() => {
    setRuntimeState(INITIAL_RUNTIME_STATE);
  }, []);

  const value = {
    ...runtimeState,
    updatePerceptionResult,
    updateTrackingState,
    updateTrajectoryResult,
    updateRiskResult,
    updatePlanningState,
    fetchBackendHealth,
    resetRuntimeState,
  };

  return (
    <IndraRuntimeContext.Provider value={value}>
      {children}
    </IndraRuntimeContext.Provider>
  );
}

export function useIndraRuntime() {
  const context = useContext(IndraRuntimeContext);
  if (!context) {
    throw new Error("useIndraRuntime must be used within an IndraRuntimeProvider");
  }
  return context;
}
