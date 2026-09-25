import React from "react";
import { Crosshair, Sparkles } from "lucide-react";
import { getClassColor } from "../../utils/perceptionConstants";

export default function TrackTable({
  tracks = [],
  hoveredTrackId = null,
  onHoverTrack = () => {},
  currentFrame = 1,
  totalFrames = 15,
}) {
  return (
    <div className="track-table-card">
      {/* Table Header Bar */}
      <div className="track-table-header">
        <div className="table-header-title">
          <Crosshair size={15} className="table-title-icon" aria-hidden="true" focusable="false" />
          <span className="title-text">PERSISTENT OBJECT TRACK REGISTRY</span>
        </div>
        <div className="table-header-badge">
          <span className="active-badge">
            <Sparkles size={12} aria-hidden="true" focusable="false" />
            {tracks.length} {tracks.length === 1 ? "Track Registered" : "Tracks Registered"} (Frame F_{String(currentFrame).padStart(2, "0")}/{totalFrames})
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="track-table-scroll-container">
        {tracks.length === 0 ? (
          <div className="track-table-empty">
            <Crosshair size={28} className="empty-track-icon" aria-hidden="true" focusable="false" />
            <div className="empty-track-title">No Active Tracks</div>
            <div className="empty-track-desc">
              Click <strong>Start Tracking</strong> to begin sequential ByteTrack state estimation.
            </div>
          </div>
        ) : (
          <table className="track-registry-table">
            <thead>
              <tr>
                <th className="th-id">TRACK ID</th>
                <th className="th-class">CLASS</th>
                <th className="th-conf">CONFIDENCE</th>
                <th className="th-seen">FIRST SEEN</th>
                <th className="th-curr">CURRENT FRAME</th>
                <th className="th-obs">OBSERVATIONS</th>
                <th className="th-speed">VELOCITY</th>
                <th className="th-status">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => {
                const colorInfo = getClassColor(track.className);
                const isHovered = hoveredTrackId === track.trackId;
                const vel = track.getVelocity ? track.getVelocity() : { speed: 0 };
                const confPercent = (track.confidence * 100).toFixed(1);

                return (
                  <tr
                    key={track.trackId}
                    className={`track-table-row ${isHovered ? "row-highlighted" : ""}`}
                    onMouseEnter={() => onHoverTrack(track.trackId)}
                    onMouseLeave={() => onHoverTrack(null)}
                  >
                    {/* Track ID */}
                    <td className="cell-track-id">
                      <span className="track-id-chip">
                        #{track.trackId}
                      </span>
                    </td>

                    {/* Class */}
                    <td className="cell-track-class">
                      <span
                        className="track-class-pill"
                        style={{
                          borderColor: colorInfo.border,
                          backgroundColor: colorInfo.bg,
                          color: colorInfo.text,
                        }}
                      >
                        <span
                          className="class-dot"
                          style={{ backgroundColor: colorInfo.border }}
                        ></span>
                        {track.className}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="cell-track-conf">
                      <div className="conf-bar-group">
                        <span className="conf-text mono">{confPercent}%</span>
                        <div className="conf-track-mini">
                          <div
                            className="conf-fill-mini"
                            style={{
                              width: `${Math.min(100, Math.max(5, track.confidence * 100))}%`,
                              backgroundColor: colorInfo.border,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* First Seen */}
                    <td className="cell-track-frame mono">
                      F_{String(track.startFrame).padStart(2, "0")}
                    </td>

                    {/* Current Frame */}
                    <td className="cell-track-frame mono highlight-cyan">
                      F_{String(track.frameId).padStart(2, "0")}
                    </td>

                    {/* Observation Count */}
                    <td className="cell-track-obs mono">
                      {track.observationCount} hits
                    </td>

                    {/* Velocity */}
                    <td className="cell-track-speed mono">
                      {vel.speed > 0 ? `${vel.speed} px/f` : "0.0 px/f"}
                    </td>

                    {/* Status */}
                    <td className="cell-track-status">
                      <span className={`status-pill pill-${(track.state || "tracked").toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {track.state || "TRACKED"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      {tracks.length > 0 && (
        <div className="track-table-footer">
          <span className="footer-note">
            State vector: [cx, cy, a, h, vcx, vcy, va, vh] Kalman filter prediction
          </span>
          <span className="footer-track-count mono">
            {tracks.filter((t) => t.state === "TRACKED").length} Active / {tracks.length} Total
          </span>
        </div>
      )}
    </div>
  );
}
