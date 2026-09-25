import React from "react";
import { Crosshair, AlertCircle } from "lucide-react";

export default function TrackingTelemetryCard({
  activeTracksCount = 0,
  totalTracksCount = 0,
  currentFrame = 1,
  totalFrames = 15,
  fps = 30.0,
  isTracking = false,
  healthData = null,
}) {
  const detector = healthData?.model || "RT-DETRv2 R18";
  const tracker = "ByteTrack";
  const device = healthData?.device ? healthData.device.toUpperCase() : "CUDA";
  const gpu = healthData?.gpu || "NVIDIA GeForce RTX 2050";

  return (
    <div className="tracking-telemetry-card">
      <div className="tracking-card-header">
        <div className="card-header-left">
          <Crosshair size={16} className="telemetry-icon-green" aria-hidden="true" focusable="false" />
          <span className="card-header-title">TRACKING TELEMETRY</span>
        </div>
        <div className={`tracking-live-pill ${isTracking ? "active" : ""}`}>
          <span className="live-dot-pulse"></span>
          <span>{isTracking ? "TRACKING ACTIVE" : "STANDBY"}</span>
        </div>
      </div>

      <div className="tracking-spec-grid">
        {/* Playback rate clearly labeled as prototype demo sequence rate */}
        <div className="track-tile">
          <span className="tile-label">PLAYBACK RATE (DEMO)</span>
          <span className="tile-val mono highlight-cyan">{fps.toFixed(1)} FPS</span>
          <span className="tile-sub">Prototype sequence playback rate</span>
        </div>

        {/* Calculated demo playback timing */}
        <div className="track-tile">
          <span className="tile-label">PLAYBACK INTERVAL</span>
          <span className="tile-val mono highlight-cyan">{(1000 / fps).toFixed(1)} ms / frame</span>
          <span className="tile-sub">Calculated demo display delta</span>
        </div>

        {/* Measured GPU Inference FPS Notice - clearly stating not measured */}
        <div className="track-tile full-width">
          <span className="tile-label">MEASURED INFERENCE FPS</span>
          <span className="tile-val highlight-amber" style={{ fontSize: "12.5px" }}>
            Not measured (Sequence replay)
          </span>
          <span className="tile-sub">
            Upstream {detector} on {device} ({gpu})
          </span>
        </div>

        {/* Actual tracker calculation outputs */}
        <div className="track-tile highlight-border">
          <span className="tile-label">ACTIVE TRACKS</span>
          <span className="tile-val-large highlight-green">{activeTracksCount}</span>
          <span className="tile-sub">Persistent in current FOV</span>
        </div>

        <div className="track-tile">
          <span className="tile-label">TOTAL TRACKS CREATED</span>
          <span className="tile-val-large highlight-cyan">{totalTracksCount}</span>
          <span className="tile-sub">Cumulative ID assignment</span>
        </div>

        {/* Tracker Engine Specification */}
        <div className="track-tile">
          <span className="tile-label">TRACKER ENGINE</span>
          <span className="tile-val highlight-green">{tracker}</span>
          <span className="tile-sub">Client-side 2-tier association</span>
        </div>

        <div className="track-tile">
          <span className="tile-label">MOTION MODEL</span>
          <span className="tile-val highlight-cyan">Kalman 8-State</span>
          <span className="tile-sub">[cx, cy, a, h, vcx, vcy, va, vh]</span>
        </div>

        {/* Sequence Progress */}
        <div className="track-tile full-width">
          <div className="frame-progress-header">
            <span className="tile-label">TEMPORAL FRAME SEQUENCE</span>
            <span className="frame-counter mono">
              Frame {currentFrame} / {totalFrames}
            </span>
          </div>
          <div className="frame-progress-bar">
            <div
              className="frame-progress-fill"
              style={{ width: `${totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Explicit Data Honesty Disclaimer */}
      <div className="telemetry-disclaimer-box">
        <AlertCircle size={13} className="disclaimer-icon-amber" aria-hidden="true" focusable="false" />
        <span className="disclaimer-text">
          These are prototype demonstrator results, not UVH-26 validation benchmark metrics.
        </span>
      </div>

      <div className="telemetry-card-footer">
        <div className="footer-protocol">
          <span className="protocol-dot"></span>
          <span>Association Protocol: 2-Tier Bipartite IoU</span>
        </div>
        <div className="footer-id-mode">Persistent Track IDs</div>
      </div>
    </div>
  );
}
