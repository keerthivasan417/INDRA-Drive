import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Crosshair,
  Camera,
  Sparkles,
  Info,
} from "lucide-react";
import { getClassColor } from "../../utils/perceptionConstants";

export default function BoundingBoxOverlay({
  imageUrl,
  originalWidth,
  originalHeight,
  detections = [],
  hoveredIndex = null,
  onHoverDetection = () => {},
  filename = "frame.png",
}) {
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Use ResizeObserver to reliably monitor image element dimensions on resize
  useEffect(() => {
    if (!imageRef.current) return;

    const updateDimensions = () => {
      if (imageRef.current) {
        setRenderedSize({
          width: imageRef.current.clientWidth,
          height: imageRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(imageRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageUrl]);

  const handleImageLoaded = (e) => {
    setRenderedSize({
      width: e.target.clientWidth,
      height: e.target.clientHeight,
    });
  };

  // Safe dimension defaults
  const origW = originalWidth || 1920;
  const origH = originalHeight || 1080;

  return (
    <div className="perception-overlay-card">
      {/* Top Viewport Header */}
      <div className="overlay-viewport-header">
        <div className="header-left-meta">
          <span className="live-perception-pill">
            <span className="pill-pulse-dot"></span>
            RT-DETRv2 INFERENCE VIEWPORT
          </span>
          <span className="stream-cam-id">
            <Camera size={13} className="cam-icon" />
            {filename}
          </span>
        </div>

        <div className="header-viewport-controls">
          <button
            type="button"
            className={`tool-toggle-btn ${showBoxes ? "active" : ""}`}
            onClick={() => setShowBoxes(!showBoxes)}
            title="Toggle Bounding Boxes"
          >
            <Crosshair size={13} />
            <span>Boxes</span>
          </button>
          <button
            type="button"
            className={`tool-toggle-btn ${showLabels ? "active" : ""}`}
            onClick={() => setShowLabels(!showLabels)}
            title="Toggle Labels & Confidence"
          >
            <Layers size={13} />
            <span>Labels</span>
          </button>
          <span className="resolution-badge">
            Orig: {origW}×{origH} • Render: {renderedSize.width}×{renderedSize.height}
          </span>
          <span className="detection-count-badge">
            <Sparkles size={12} />
            {detections.length} {detections.length === 1 ? "Target" : "Targets"}
          </span>
        </div>
      </div>

      {/* Main Image Viewport & Scaled Bounding Box Overlay */}
      <div className="perception-image-viewport" ref={containerRef}>
        {/* Synthetic Scanlines Overlay */}
        <div className="hud-scanline-layer" pointerEvents="none"></div>

        {/* Responsive Base Image */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Perception frame"
          className="perception-base-image"
          onLoad={handleImageLoaded}
        />

        {/* Scaled Bounding Boxes Layer */}
        {showBoxes && detections && detections.length > 0 && (
          <div className="boxes-overlay-layer">
            {detections.map((det, idx) => {
              const [x1, y1, x2, y2] = det.box;
              const colorInfo = getClassColor(det.class_name);
              const isHovered = hoveredIndex === idx;

              // Exact responsive percentage scaling from original image space
              const leftPct = (x1 / origW) * 100;
              const topPct = (y1 / origH) * 100;
              const widthPct = ((x2 - x1) / origW) * 100;
              const heightPct = ((y2 - y1) / origH) * 100;

              // Format confidence percentage
              const confPct = (det.confidence * 100).toFixed(1);

              // Calculate overlap offset so overlapping bounding box labels do not occlude each other
              let overlapIndex = 0;
              for (let i = 0; i < idx; i++) {
                const [px1, py1, px2, py2] = detections[i].box;
                if (
                  Math.abs(x1 - px1) <= 3 &&
                  Math.abs(y1 - py1) <= 3 &&
                  Math.abs(x2 - px2) <= 3 &&
                  Math.abs(y2 - py2) <= 3
                ) {
                  overlapIndex++;
                }
              }

              const tagYOffset = overlapIndex * 22;
              const isTopClose = topPct < 8;
              const tagTransform = isTopClose
                ? `translateY(calc(100% + ${tagYOffset}px))`
                : `translateY(calc(-100% - ${tagYOffset}px))`;

              return (
                <div
                  key={idx}
                  className={`hud-bounding-box ${isHovered ? "box-highlighted" : ""}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderColor: colorInfo.border,
                    backgroundColor: isHovered
                      ? colorInfo.bg.replace("0.15", "0.28")
                      : colorInfo.bg,
                    boxShadow: isHovered
                      ? `0 0 16px ${colorInfo.border}, inset 0 0 10px ${colorInfo.border}`
                      : `0 0 6px ${colorInfo.border}`,
                    zIndex: isHovered ? 40 : 10 + overlapIndex,
                  }}
                  onMouseEnter={() => onHoverDetection(idx)}
                  onMouseLeave={() => onHoverDetection(null)}
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

                  {/* Floating Tag: Class Name & Confidence Percentage */}
                  {showLabels && (
                    <div
                      className="hud-box-tag"
                      style={{
                        backgroundColor: "rgba(5, 7, 12, 0.9)",
                        borderColor: colorInfo.border,
                        color: colorInfo.text,
                        transform: tagTransform,
                        zIndex: isHovered ? 45 : 15 + overlapIndex,
                      }}
                    >
                      <span
                        className="class-indicator-dot"
                        style={{ backgroundColor: colorInfo.border }}
                      ></span>
                      <span className="tag-class-name">{det.class_name}</span>
                      <span className="tag-conf-val">{confPct}%</span>
                    </div>
                  )}

                  {/* Crosshair Center when Hovered */}
                  {isHovered && (
                    <div className="box-center-crosshair">
                      <div className="cross-h"></div>
                      <div className="cross-v"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State Overlay when no detections */}
        {detections && detections.length === 0 && (
          <div className="no-detections-overlay">
            <Info size={20} className="no-det-icon" />
            <span>No objects detected above threshold (0.05)</span>
          </div>
        )}
      </div>

      {/* Viewport Bottom Status Bar */}
      <div className="overlay-viewport-footer">
        <div className="footer-left-status">
          <span className="fov-metric">FOV: 68° Forward Monocular</span>
          <span className="divider">•</span>
          <span className="fov-metric">Coordinate Frame: Camera Optical [u, v]</span>
        </div>
        <div className="footer-right-status">
          <span className="scale-metric">
            Aspect: {(origW / origH).toFixed(2)}:1
          </span>
        </div>
      </div>
    </div>
  );
}
