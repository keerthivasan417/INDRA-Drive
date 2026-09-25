import React, { useState } from "react";
import {
  Camera,
  Crosshair,
  TrendingUp,
  Layers,
  Navigation,
} from "lucide-react";
import { getClassColor } from "../../utils/perceptionConstants";

export default function TrackingViewport({
  currentFrameIndex = 1,
  totalFrames = 15,
  activeTracks = [],
  hoveredTrackId = null,
  onHoverTrack = () => {},
  resolution = { width: 1920, height: 1080 },
  backgroundImage = "/sample_road.png",
}) {
  const [showTrails, setShowTrails] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showTrackIds, setShowTrackIds] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);

  const origW = resolution.width || 1920;
  const origH = resolution.height || 1080;

  return (
    <div className="tracking-viewport-card">
      {/* Top Viewport Header */}
      <div className="viewport-header-bar">
        <div className="viewport-header-left">
          <span className="tracking-stream-pill">
            <span className="stream-dot"></span>
            BYTETRACK SPATIOTEMPORAL VIEWPORT
          </span>
          <span className="stream-meta">
            <Camera size={13} className="cam-icon" aria-hidden="true" focusable="false" />
            68° FORWARD OPTICAL FOV
          </span>
        </div>

        {/* Viewport Visualization Controls */}
        <div className="viewport-controls-group">
          <button
            type="button"
            className={`tool-pill-btn ${showTrails ? "active" : ""}`}
            onClick={() => setShowTrails(!showTrails)}
            title="Toggle Trajectory Trailing Paths"
          >
            <TrendingUp size={13} aria-hidden="true" focusable="false" />
            <span>Trails</span>
          </button>

          <button
            type="button"
            className={`tool-pill-btn ${showBoxes ? "active" : ""}`}
            onClick={() => setShowBoxes(!showBoxes)}
            title="Toggle Bounding Boxes"
          >
            <Crosshair size={13} aria-hidden="true" focusable="false" />
            <span>Boxes</span>
          </button>

          <button
            type="button"
            className={`tool-pill-btn ${showTrackIds ? "active" : ""}`}
            onClick={() => setShowTrackIds(!showTrackIds)}
            title="Toggle Track IDs"
          >
            <Layers size={13} aria-hidden="true" focusable="false" />
            <span>IDs</span>
          </button>

          <button
            type="button"
            className={`tool-pill-btn ${showVelocity ? "active" : ""}`}
            onClick={() => setShowVelocity(!showVelocity)}
            title="Toggle Velocity Vectors"
          >
            <Navigation size={13} aria-hidden="true" focusable="false" />
            <span>Vectors</span>
          </button>

          <span className="frame-tag-badge mono">
            F_{String(currentFrameIndex).padStart(2, "0")}/{totalFrames}
          </span>
        </div>
      </div>

      {/* Main Optical Canvas Viewport */}
      <div className="tracking-image-container">
        {/* Synthetic Horizon & Grid Lines */}
        <div className="tracking-hud-overlay-grid"></div>

        {/* Base Road Frame Image */}
        <img
          src={backgroundImage}
          alt="Tracking camera feed"
          className="tracking-base-image"
        />

        {/* SVG Layer for Trajectory History Trails and Velocity Vectors */}
        <svg
          className="tracking-svg-trail-layer"
          viewBox={`0 0 ${origW} ${origH}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Arrow marker for velocity vectors */}
            <marker
              id="velArrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#00ff88" />
            </marker>
          </defs>

          {/* 6. Track History Visualization: Trailing paths of recent object positions */}
          {showTrails &&
            activeTracks.map((track) => {
              const colorInfo = getClassColor(track.className);
              const history = track.history || [];
              if (history.length < 2) return null;

              // Build polyline points
              const pointsStr = history.map((pt) => `${pt.x},${pt.y}`).join(" ");
              const isHovered = hoveredTrackId === track.trackId;

              return (
                <g key={`trail-${track.trackId}`} className="trail-group">
                  {/* Trailing polyline path */}
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={colorInfo.border}
                    strokeWidth={isHovered ? "4" : "2.5"}
                    strokeDasharray="4 2"
                    strokeOpacity={isHovered ? "0.95" : "0.65"}
                  />

                  {/* Historical anchor dots */}
                  {history.map((pt, pIdx) => {
                    const opacity = 0.25 + (pIdx / history.length) * 0.75;
                    const radius = pIdx === history.length - 1 ? 4 : 2.5;
                    return (
                      <circle
                        key={pIdx}
                        cx={pt.x}
                        cy={pt.y}
                        r={radius}
                        fill={colorInfo.border}
                        opacity={opacity}
                      />
                    );
                  })}

                  {/* Velocity vector arrow */}
                  {showVelocity && history.length >= 2 && (
                    (() => {
                      const p1 = history[history.length - 2];
                      const p2 = history[history.length - 1];
                      const dx = (p2.x - p1.x) * 2.5;
                      const dy = (p2.y - p1.y) * 2.5;
                      return (
                        <line
                          x1={p2.x}
                          y1={p2.y}
                          x2={p2.x + dx}
                          y2={p2.y + dy}
                          stroke="#00ff88"
                          strokeWidth="2"
                          markerEnd="url(#velArrow)"
                        />
                      );
                    })()
                  )}
                </g>
              );
            })}
        </svg>

        {/* Responsive Bounding Boxes Layer */}
        {showBoxes && (
          <div className="tracking-boxes-layer">
            {activeTracks.map((track) => {
              const [x1, y1, x2, y2] = track.box;
              const colorInfo = getClassColor(track.className);
              const isHovered = hoveredTrackId === track.trackId;

              const leftPct = (x1 / origW) * 100;
              const topPct = (y1 / origH) * 100;
              const widthPct = ((x2 - x1) / origW) * 100;
              const heightPct = ((y2 - y1) / origH) * 100;

              const vel = track.getVelocity ? track.getVelocity() : { speed: 0 };

              return (
                <div
                  key={track.trackId}
                  className={`track-bounding-box ${isHovered ? "track-hovered" : ""}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderColor: colorInfo.border,
                    backgroundColor: isHovered
                      ? colorInfo.bg.replace("0.15", "0.26")
                      : colorInfo.bg,
                    boxShadow: isHovered
                      ? `0 0 16px ${colorInfo.border}`
                      : `0 0 6px ${colorInfo.border}`,
                    zIndex: isHovered ? 35 : 15,
                  }}
                  onMouseEnter={() => onHoverTrack(track.trackId)}
                  onMouseLeave={() => onHoverTrack(null)}
                >
                  {/* HUD Corner Reticles */}
                  <span
                    className="box-corner corner-tl"
                    style={{ borderColor: colorInfo.border }}
                  ></span>
                  <span
                    className="box-corner corner-tr"
                    style={{ borderColor: colorInfo.border }}
                  ></span>
                  <span
                    className="box-corner corner-bl"
                    style={{ borderColor: colorInfo.border }}
                  ></span>
                  <span
                    className="box-corner corner-br"
                    style={{ borderColor: colorInfo.border }}
                  ></span>

                  {/* Track ID & Semantic Class Tag */}
                  {showTrackIds && (
                    <div
                      className="track-hud-tag"
                      style={{
                        backgroundColor: "rgba(5, 7, 12, 0.92)",
                        borderColor: colorInfo.border,
                        color: colorInfo.text,
                        transform: topPct < 9 ? "translateY(100%)" : "translateY(-100%)",
                      }}
                    >
                      <span className="track-id-badge">#{track.trackId}</span>
                      <span className="track-class-name">{track.className}</span>
                      <span className="track-conf-pct">
                        {(track.confidence * 100).toFixed(0)}%
                      </span>
                      {showVelocity && vel.speed > 0 && (
                        <span className="track-speed-tag mono">
                          {vel.speed}px/f
                        </span>
                      )}
                    </div>
                  )}

                  {/* Center reticle */}
                  {isHovered && (
                    <div className="track-center-reticle">
                      <div className="reticle-h"></div>
                      <div className="reticle-v"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Viewport Footer Bar */}
      <div className="viewport-footer-bar">
        <div className="footer-left-status">
          <span className="footer-pill">State: Kalman Filter Active</span>
          <span className="footer-sep">•</span>
          <span className="footer-pill">Tracking Association: 2-Tier Bipartite IoU</span>
        </div>
        <div className="footer-right-status">
          <span className="footer-pill mono">
            {activeTracks.length} Tracked Targets
          </span>
        </div>
      </div>
    </div>
  );
}
