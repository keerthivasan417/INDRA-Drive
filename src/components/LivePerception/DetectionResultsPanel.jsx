import React from "react";
import {
  Layers,
  Sparkles,
  Info,
  Box,
  Cpu,
  AlertCircle,
} from "lucide-react";
import { getClassColor } from "../../utils/perceptionConstants";

export default function DetectionResultsPanel({
  detections = [],
  hoveredIndex = null,
  onHoverDetection = () => {},
  hasInferred = false,
  isLoading = false,
}) {
  // Aggregate count by class
  const classCounts = detections.reduce((acc, det) => {
    acc[det.class_name] = (acc[det.class_name] || 0) + 1;
    return acc;
  }, {});

  // Identify bounding box clusters (overlapping or identical boxes)
  const clusters = [];
  detections.forEach((det, originalIndex) => {
    const [x1, y1, x2, y2] = det.box;
    const existing = clusters.find((c) => {
      const [cx1, cy1, cx2, cy2] = c.box;
      return (
        Math.abs(x1 - cx1) <= 3 &&
        Math.abs(y1 - cy1) <= 3 &&
        Math.abs(x2 - cx2) <= 3 &&
        Math.abs(y2 - cy2) <= 3
      );
    });

    if (existing) {
      existing.items.push({ ...det, originalIndex });
    } else {
      clusters.push({
        id: `roi-${clusters.length + 1}`,
        box: [x1, y1, x2, y2],
        items: [{ ...det, originalIndex }],
      });
    }
  });

  const overlappingClusters = clusters.filter((c) => c.items.length > 1);
  const hasOverlapping = overlappingClusters.length > 0;

  return (
    <div className="detection-results-panel">
      {/* Panel Header */}
      <div className="results-panel-header">
        <div className="panel-title-group">
          <Layers size={16} className="panel-title-icon" aria-hidden="true" focusable="false" />
          <span className="panel-title-text">DETECTION TARGET MATRIX</span>
          <span className="raw-predictions-badge">
            <Cpu size={12} className="raw-badge-icon" aria-hidden="true" focusable="false" />
            RAW RT-DETRv2 PREDICTIONS
          </span>
        </div>

        <div className="panel-badge-group">
          <span className="total-objects-badge">
            <Sparkles size={12} aria-hidden="true" focusable="false" />
            {detections.length} {detections.length === 1 ? "PREDICTION" : "PREDICTIONS"}
          </span>
        </div>
      </div>

      {/* 1. Category summary: rendered as separate compact chips [Category Count] */}
      {detections.length > 0 && (
        <div className="category-chips-wrapper">
          <div className="category-chips-label">DETECTED CLASSES:</div>
          <div className="category-chips-list">
            {Object.entries(classCounts).map(([className, count]) => {
              const colorInfo = getClassColor(className);
              return (
                <div
                  key={className}
                  className="category-compact-chip"
                  style={{
                    borderColor: colorInfo.border,
                    backgroundColor: colorInfo.bg,
                    color: colorInfo.text,
                  }}
                >
                  <span
                    className="category-chip-dot"
                    style={{ backgroundColor: colorInfo.border }}
                  ></span>
                  <span className="category-chip-name">{className}</span>
                  <span
                    className="category-chip-count"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Overlapping predictions compact summary */}
      {hasOverlapping && (
        <div className="overlapping-predictions-card">
          <div className="overlapping-card-header">
            <div className="overlapping-header-title">
              <AlertCircle size={14} className="overlap-alert-icon" aria-hidden="true" focusable="false" />
              <span>OVERLAPPING PREDICTIONS DETECTED</span>
            </div>
            <span className="overlapping-count-tag">
              {overlappingClusters.length} shared bounding regions
            </span>
          </div>

          <div className="overlapping-groups-container">
            {overlappingClusters.map((cluster, cIdx) => {
              const classNamesStr = cluster.items
                .map((item) => item.class_name)
                .join(" / ");
              return (
                <div key={cIdx} className="overlapping-group-row">
                  <span className="overlapping-group-bullet"></span>
                  <span className="overlapping-group-classes">
                    {classNamesStr}
                  </span>
                  <span className="overlapping-group-text">
                    share the same bounding box
                  </span>
                  <span className="overlapping-group-coords mono">
                    [{cluster.box.map((v) => v.toFixed(1)).join(", ")}]
                  </span>
                </div>
              );
            })}
          </div>

          {/* 7. Informational Note */}
          <div className="transparency-info-note">
            <Info size={13} className="transparency-icon" aria-hidden="true" focusable="false" />
            <span>
              Multiple class hypotheses may overlap at low confidence. The raw model output is preserved for transparency.
            </span>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="results-table-container">
        {!hasInferred && !isLoading ? (
          <div className="results-empty-state">
            <Box size={28} className="empty-state-icon" aria-hidden="true" focusable="false" />
            <div className="empty-state-title">No Perception Data Loaded</div>
            <div className="empty-state-desc">
              Upload a road scene image and click <strong>Run Perception</strong> to view real-time RT-DETRv2 bounding box telemetry.
            </div>
          </div>
        ) : detections.length === 0 ? (
          <div className="results-empty-state">
            <Info size={28} className="empty-state-icon text-cyan" aria-hidden="true" focusable="false" />
            <div className="empty-state-title">Zero Objects Detected</div>
            <div className="empty-state-desc">
              The model completed inference but detected 0 objects above the 0.05 confidence threshold.
            </div>
          </div>
        ) : (
          <table className="detection-table">
            <thead>
              <tr>
                <th className="col-idx">#</th>
                <th className="col-class">CLASS</th>
                <th className="col-conf">CONFIDENCE</th>
                <th className="col-coord">X1</th>
                <th className="col-coord">Y1</th>
                <th className="col-coord">X2</th>
                <th className="col-coord">Y2</th>
                <th className="col-dim">DIMENSIONS</th>
              </tr>
            </thead>
            <tbody>
              {/* 5. Visually group the overlapping predictions */}
              {clusters.map((cluster, clusterIdx) => {
                const isMulti = cluster.items.length > 1;

                return (
                  <React.Fragment key={cluster.id || clusterIdx}>
                    {/* Visual Group Banner Header when cluster has overlapping predictions */}
                    {isMulti && (
                      <tr className="cluster-header-row">
                        <td colSpan={8} className="cluster-header-cell">
                          <div className="cluster-header-content">
                            <span className="cluster-tag">
                              Shared Region {clusterIdx + 1}
                            </span>
                            <span className="cluster-classes">
                              {cluster.items.map((it) => it.class_name).join(" / ")}
                            </span>
                            <span className="cluster-note">
                              ({cluster.items.length} overlapping hypotheses at same coordinates)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Detections within this cluster */}
                    {cluster.items.map((det) => {
                      const idx = det.originalIndex;
                      const [x1, y1, x2, y2] = det.box;
                      const width = Math.round(x2 - x1);
                      const height = Math.round(y2 - y1);
                      const colorInfo = getClassColor(det.class_name);
                      const isHovered = hoveredIndex === idx;
                      const confPercent = (det.confidence * 100).toFixed(1);

                      return (
                        <tr
                          key={idx}
                          className={`detection-row ${
                            isHovered ? "row-hovered" : ""
                          } ${isMulti ? "row-in-cluster" : ""}`}
                          onMouseEnter={() => onHoverDetection(idx)}
                          onMouseLeave={() => onHoverDetection(null)}
                        >
                          <td className="cell-idx">
                            <span className="idx-number">{idx + 1}</span>
                            {isMulti && (
                              <span
                                className="cluster-marker-dot"
                                title="Overlapping prediction"
                              ></span>
                            )}
                          </td>
                          <td className="cell-class">
                            <span
                              className="class-badge-pill"
                              style={{
                                borderColor: colorInfo.border,
                                backgroundColor: colorInfo.bg,
                                color: colorInfo.text,
                              }}
                            >
                              <span
                                className="badge-color-dot"
                                style={{ backgroundColor: colorInfo.border }}
                              ></span>
                              {det.class_name}
                            </span>
                          </td>
                          <td className="cell-conf">
                            <div className="conf-cell-content">
                              <span className="conf-value-txt">{confPercent}%</span>
                              <div className="conf-progress-track">
                                <div
                                  className="conf-progress-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(5, det.confidence * 100)
                                    )}%`,
                                    backgroundColor: colorInfo.border,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="cell-coord mono">{x1.toFixed(1)}</td>
                          <td className="cell-coord mono">{y1.toFixed(1)}</td>
                          <td className="cell-coord mono">{x2.toFixed(1)}</td>
                          <td className="cell-coord mono">{y2.toFixed(1)}</td>
                          <td className="cell-dim mono">
                            {width} × {height}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer / Summary */}
      {detections.length > 0 && (
        <div className="results-table-footer">
          <div className="footer-legend">
            <span className="legend-label">Target Association:</span>
            <span className="legend-val">UVH-26 Class Taxonomy</span>
            <span className="legend-sep">•</span>
            <span className="legend-label">Total Predictions:</span>
            <span className="legend-val">{detections.length}</span>
            {hasOverlapping && (
              <>
                <span className="legend-sep">•</span>
                <span className="legend-label">Unique Regions:</span>
                <span className="legend-val">{clusters.length}</span>
              </>
            )}
          </div>
          <div className="footer-counter">
            Raw model output preserved
          </div>
        </div>
      )}
    </div>
  );
}
