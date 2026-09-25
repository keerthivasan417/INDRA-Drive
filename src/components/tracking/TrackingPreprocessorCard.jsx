import React from "react";
import {
  ArrowDown,
  Cpu,
  Crosshair,
  Filter,
  Info,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function TrackingPreprocessorCard({
  rawCount = 0,
  preprocessedCount = 0,
  suppressedCount = 0,
  iouThreshold = 0.90,
}) {
  return (
    <div className="tracking-preprocessor-card">
      {/* Header */}
      <div className="preprocessor-header">
        <div className="preprocessor-header-left">
          <Filter size={16} className="preprocessor-icon" aria-hidden="true" focusable="false" />
          <span className="preprocessor-title">TRACKING DETECTION PREPROCESSOR</span>
        </div>
        <span className="preprocessor-badge">IoU &ge; {iouThreshold.toFixed(2)} Grouping</span>
      </div>

      {/* Pipeline Flow Architecture Display */}
      <div className="preprocessor-architecture-flow">
        <div className="arch-node">
          <div className="arch-node-box node-rtdetr">
            <Cpu size={14} className="node-icon" aria-hidden="true" focusable="false" />
            <span className="node-title">RT-DETRv2</span>
            <span className="node-sub">Raw Predictions ({rawCount})</span>
          </div>
        </div>

        <div className="arch-arrow">
          <ArrowDown size={14} className="arrow-down-icon" aria-hidden="true" focusable="false" />
        </div>

        <div className="arch-node">
          <div className="arch-node-box node-preprocessor">
            <Filter size={14} className="node-icon" aria-hidden="true" focusable="false" />
            <span className="node-title">Detection Preprocessor</span>
            <span className="node-sub">IoU &ge; 0.90 Semantic Grouping</span>
          </div>
        </div>

        <div className="arch-arrow">
          <ArrowDown size={14} className="arrow-down-icon" aria-hidden="true" focusable="false" />
        </div>

        <div className="arch-node">
          <div className="arch-node-box node-bytetrack">
            <Crosshair size={14} className="node-icon" aria-hidden="true" focusable="false" />
            <span className="node-title">ByteTrack</span>
            <span className="node-sub">Track Inputs ({preprocessedCount})</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="preprocessor-metrics-row">
        <div className="prep-metric-cell">
          <span className="prep-label">RAW HYPOTHESES</span>
          <span className="prep-val highlight-cyan">{rawCount}</span>
          <span className="prep-note">Multi-class detector output</span>
        </div>

        <div className="prep-metric-cell">
          <span className="prep-label">FILTERED SECONDARIES</span>
          <span className="prep-val highlight-amber">
            {suppressedCount} {suppressedCount === 1 ? "Hypothesis" : "Hypotheses"}
          </span>
          <span className="prep-note">Preserved separately in raw set</span>
        </div>

        <div className="prep-metric-cell">
          <span className="prep-label">TRACKER INPUT CANDIDATES</span>
          <span className="prep-val highlight-green">{preprocessedCount}</span>
          <span className="prep-note">Highest-confidence per ROI</span>
        </div>
      </div>

      {/* Preprocessor Technical Notes & Honesty Disclaimers */}
      <div className="preprocessor-info-box">
        <div className="prep-info-line">
          <Info size={13} className="info-icon-cyan" aria-hidden="true" focusable="false" />
          <span className="info-text">
            <strong>Technical Note:</strong> Tracking uses sequential detections to maintain object identity across frames.
          </span>
        </div>

        <div className="prep-info-line">
          <ShieldCheck size={13} className="info-icon-green" aria-hidden="true" focusable="false" />
          <span className="info-text">
            When several class hypotheses correspond to the same region (e.g. Truck vs Mini-bus sharing a bounding box), the preprocessor keeps the highest-confidence semantic hypothesis for tracker input while preserving the complete raw prediction set separately. This is labeled as tracking preprocessing, not ground-truth correction.
          </span>
        </div>

        <div className="prep-info-line data-honesty-line">
          <AlertCircle size={13} className="info-icon-amber" aria-hidden="true" focusable="false" />
          <span className="info-text">
            <strong>Data Honesty:</strong> Video sequence demonstrates ByteTrack persistent association on heterogeneous Indian traffic. These are prototype demonstrator results, not UVH-26 validation benchmark metrics.
          </span>
        </div>
      </div>
    </div>
  );
}
