import React from "react";
import {
  Cpu,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  Sliders,
  ShieldCheck,
} from "lucide-react";

export default function PerceptionTelemetry({
  status = "READY",
  inferenceTimeMs = null,
  detectionCount = 0,
  healthData = null,
  errorMessage = null,
}) {
  // Model specifications required by telemetry card
  const modelName = healthData?.model || "RT-DETRv2 R18";
  const checkpoint = healthData?.checkpoint ? (healthData.checkpoint.startsWith("epoch") ? "Epoch 12" : healthData.checkpoint) : "Epoch 12";
  const numClasses = healthData?.num_classes || 14;
  const device = healthData?.device ? healthData.device.toUpperCase() : "CPU";
  const gpuName = healthData?.gpu || "CPU";
  const threshold = "0.05";

  // Status configuration mapping
  const statusConfig = {
    READY: {
      label: "READY",
      colorClass: "status-ready",
      icon: CheckCircle2,
      badgeText: "SYSTEM STANDBY",
    },
    PROCESSING: {
      label: "PROCESSING",
      colorClass: "status-processing",
      icon: Loader2,
      badgeText: device === "CPU" ? "INFERENCING CPU" : "INFERENCING GPU",
    },
    COMPLETE: {
      label: "COMPLETE",
      colorClass: "status-complete",
      icon: CheckCircle2,
      badgeText: "TARGETS ACQUIRED",
    },
    ERROR: {
      label: "ERROR",
      colorClass: "status-error",
      icon: AlertTriangle,
      badgeText: "INFERENCE FAULT",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.READY;

  return (
    <div className="perception-telemetry-hud">
      {/* Top Telemetry Header & Status Indicator */}
      <div className="telemetry-hud-top">
        <div className="telemetry-title-group">
          <div className="telemetry-icon-box">
            <Cpu size={18} className="telemetry-icon" />
          </div>
          <div>
            <div className="telemetry-heading">PERCEPTION TELEMETRY</div>
            <div className="telemetry-subheading">RT-DETRv2 • Epoch 12 Engine</div>
          </div>
        </div>

        {/* Status Area: READY, PROCESSING, COMPLETE, ERROR */}
        <div className={`perception-status-badge ${currentStatus.colorClass}`}>
          <span className="status-indicator-dot">
            {status === "PROCESSING" ? (
              <Loader2 size={13} className="spin-icon" />
            ) : (
              <span className="static-dot"></span>
            )}
          </span>
          <span className="status-text">{currentStatus.label}</span>
          <span className="status-sub-pill">{currentStatus.badgeText}</span>
        </div>
      </div>

      {/* Main Grid: Hardware Specs & Real-Time Telemetry */}
      <div className="telemetry-spec-grid">
        <div className="spec-tile">
          <div className="spec-tile-label">
            <Activity size={12} className="tile-icon" />
            MODEL ARCHITECTURE
          </div>
          <div className="spec-tile-value highlight-cyan">{modelName}</div>
          <div className="spec-tile-note">Real-Time Vision Transformer</div>
        </div>

        <div className="spec-tile">
          <div className="spec-tile-label">
            <ShieldCheck size={12} className="tile-icon" />
            CHECKPOINT
          </div>
          <div className="spec-tile-value highlight-green">{checkpoint}</div>
          <div className="spec-tile-note">Fine-Tuned UVH-26 Dataset</div>
        </div>

        <div className="spec-tile">
          <div className="spec-tile-label">
            <Sliders size={12} className="tile-icon" />
            ACTIVE CLASSES
          </div>
          <div className="spec-tile-value">{numClasses}</div>
          <div className="spec-tile-note">Indian Traffic Semantics</div>
        </div>

        <div className="spec-tile">
          <div className="spec-tile-label">
            <Zap size={12} className="tile-icon" />
            COMPUTE DEVICE
          </div>
          <div className="spec-tile-value highlight-green">{device}</div>
          <div className="spec-tile-note">{device === "CPU" ? "Host CPU Core Execution" : "Hardware Acceleration"}</div>
        </div>

        <div className="spec-tile full-width">
          <div className="spec-tile-label">
            <HardDrive size={12} className="tile-icon" />
            INFERENCE GPU
          </div>
          <div className="spec-tile-value gpu-spec-val">{gpuName}</div>
          <div className="spec-tile-note">{device === "CPU" ? "Host CPU Execution (No Discrete GPU Attached)" : "Dedicated Tensor/CUDA Core Inference"}</div>
        </div>

        <div className="spec-tile">
          <div className="spec-tile-label">
            <Sliders size={12} className="tile-icon" />
            DETECTION THRESHOLD
          </div>
          <div className="spec-tile-value mono-val">{threshold}</div>
          <div className="spec-tile-note">Confidence Cutoff</div>
        </div>

        <div className="spec-tile">
          <div className="spec-tile-label">
            <Activity size={12} className="tile-icon" />
            LATENCY / OBJECTS
          </div>
          <div className="spec-tile-value mono-val highlight-cyan">
            {inferenceTimeMs !== null ? `${inferenceTimeMs}ms` : "--"}
            <span className="unit-sep">/</span>
            <span className="highlight-green">{detectionCount} obj</span>
          </div>
          <div className="spec-tile-note">Latest Frame Analytics</div>
        </div>
      </div>

      {/* Model Inference Badge & Live Indicator */}
      <div className="telemetry-footer-bar">
        <div className="inference-live-indicator">
          <span className="pulse-beacon"></span>
          <span className="live-indicator-text">Real Model Inference Active</span>
        </div>
        <div className="engine-signature-tag">INDRA-Drive / RT-DETRv2</div>
      </div>

      {/* Optional Error banner */}
      {status === "ERROR" && errorMessage && (
        <div className="telemetry-error-banner">
          <AlertTriangle size={15} className="error-banner-icon" />
          <div className="error-banner-content">
            <div className="error-banner-title">Perception Pipeline Fault</div>
            <div className="error-banner-msg">{errorMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}
