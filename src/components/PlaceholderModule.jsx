import React from "react";
import {
  Clock,
  ArrowLeft,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
} from "lucide-react";

export default function PlaceholderModule({ moduleName, onReturnOverview }) {
  return (
    <div className="placeholder-module-view">
      <div className="placeholder-card">
        <div className="placeholder-status-banner">
          <Clock size={16} className="clock-icon" />
          <span>MODULE COMING NEXT — PHASE 2 ENGINE INTEGRATION</span>
        </div>

        <div className="placeholder-content">
          <div className="placeholder-icon-halo">
            <Cpu size={40} className="module-halo-icon" />
          </div>

          <h2 className="placeholder-module-title">{moduleName}</h2>
          <p className="placeholder-module-desc">
            The dedicated full-screen telemetry interface for{" "}
            <strong>{moduleName}</strong> is currently staged for backend live
            bridge connection.
          </p>

          <div className="module-specs-box">
            <div className="spec-row">
              <span className="spec-name">Runtime Execution:</span>
              <span className="spec-state">Standby / Bridge Listener Active</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Target Endpoint:</span>
              <span className="spec-state mono">/api/{moduleName.toLowerCase().replace(/\s+/g, "_")}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Pipeline Status:</span>
              <span className="spec-state green">
                <CheckCircle2 size={13} /> Verified on Epoch 12 Checkpoint
              </span>
            </div>
          </div>

          <button className="return-overview-btn" onClick={onReturnOverview}>
            <ArrowLeft size={16} />
            <span>Return to Overview Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
