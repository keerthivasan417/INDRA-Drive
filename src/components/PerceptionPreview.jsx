import React, { useState } from "react";
import {
  Camera,
  Crosshair,
  Layers,
  ShieldCheck,
  Eye,
  Activity,
} from "lucide-react";
import { indraData } from "../data/mockData";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import BoundingBoxOverlay from "./LivePerception/BoundingBoxOverlay";

export default function PerceptionPreview() {
  const { perception } = useIndraRuntime();
  const [selectedDet, setSelectedDet] = useState(null);
  const [showMasks, setShowMasks] = useState(true);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  return (
    <div className="perception-card">
      {/* Header bar of the perception stream */}
      <div className="perception-card-header">
        <div className="stream-badge-group">
          <span className="live-demo-tag">
            <span className="live-dot"></span>
            {perception.hasData
              ? `LIVE RESULT — ${perception.filename}`
              : indraData.perceptionPreview.title}
          </span>
          <span className={`source-indicator-tag ${perception.hasData ? "source-live" : "source-demo"}`}>
            {perception.hasData ? "LIVE MODEL" : "DEMO"}
          </span>
          <span className="stream-cam-id">
            <Camera size={13} className="cam-icon" />
            {perception.hasData && perception.imageWidth
              ? `${perception.imageWidth}×${perception.imageHeight}`
              : "CAM_01_FRONT"}
          </span>
        </div>

        <div className="stream-controls">
          <button
            className={`tool-toggle-btn ${showBoundingBoxes ? "active" : ""}`}
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            title="Toggle Bounding Boxes"
          >
            <Crosshair size={13} />
            <span>B-Boxes</span>
          </button>
          <button
            className={`tool-toggle-btn ${showMasks ? "active" : ""}`}
            onClick={() => setShowMasks(!showMasks)}
            title="Toggle Segment Contours"
          >
            <Layers size={13} />
            <span>Semantics</span>
          </button>
          <span className="resolution-tag">1080p • 32.4 FPS</span>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="perception-viewport">
        {perception.hasData && perception.previewUrl ? (
          <div className="live-preview-embed">
            <BoundingBoxOverlay
              imageUrl={perception.previewUrl}
              originalWidth={perception.imageWidth}
              originalHeight={perception.imageHeight}
              detections={perception.detections}
              filename={perception.filename}
            />
          </div>
        ) : (
          <>
            {/* Synthetic Road Surface & Perspective Elements (Pure SVG & CSS) */}
            <svg
              className="perception-road-svg"
              viewBox="0 0 800 450"
              preserveAspectRatio="none"
            >
          <defs>
            {/* Horizon sky gradient */}
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#050811" />
              <stop offset="85%" stopColor="#0a1224" />
              <stop offset="100%" stopColor="#0f1a30" />
            </linearGradient>

            {/* Asphalt road gradient */}
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0b101c" />
              <stop offset="60%" stopColor="#090d18" />
              <stop offset="100%" stopColor="#060910" />
            </linearGradient>

            {/* Shoulder dust gradient (Indian road edge simulation) */}
            <linearGradient id="shoulderGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a150e" />
              <stop offset="85%" stopColor="#120e09" />
              <stop offset="100%" stopColor="#0d1320" />
            </linearGradient>
            <linearGradient id="shoulderGradRight" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1a150e" />
              <stop offset="85%" stopColor="#120e09" />
              <stop offset="100%" stopColor="#0d1320" />
            </linearGradient>

            {/* Laser scanline gradient */}
            <linearGradient id="lidarScanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(0, 240, 255, 0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="boxGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Sky & Distant Horizon */}
          <rect x="0" y="0" width="800" height="150" fill="url(#skyGrad)" />

          {/* Distant Urban Landscape Silhouette */}
          <path
            d="M0,150 L30,142 L65,142 L70,146 L110,146 L130,138 L160,138 L180,148 L250,148 L270,135 L310,135 L330,148 L460,148 L480,132 L520,132 L540,148 L620,148 L640,139 L690,139 L710,149 L800,150 L800,152 L0,152 Z"
            fill="#09101f"
            opacity="0.6"
          />

          {/* Left Unpaved Shoulder / Earth Verge (typical of Indian road environment) */}
          <polygon points="0,150 280,150 0,450" fill="url(#shoulderGradLeft)" opacity="0.8" />

          {/* Right Road Edge / Verge */}
          <polygon points="800,150 520,150 800,450" fill="url(#shoulderGradRight)" opacity="0.8" />

          {/* Main Asphalt Road Surface */}
          <polygon points="280,150 520,150 720,450 80,450" fill="url(#roadGrad)" />

          {/* Indian Road Side Dirt / Curb Kerbs */}
          <line x1="280" y1="150" x2="80" y2="450" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="14 12" opacity="0.5" />
          <line x1="520" y1="150" x2="720" y2="450" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="14 12" opacity="0.5" />

          {/* Road Perspective Lane Dividers (unstructured/faded dashes) */}
          <line
            x1="360"
            y1="150"
            x2="293"
            y2="450"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="20 22"
            opacity="0.25"
          />
          <line
            x1="440"
            y1="150"
            x2="507"
            y2="450"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="20 22"
            opacity="0.25"
          />

          {/* Distance depth grids */}
          <line x1="240" y1="200" x2="560" y2="200" stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.2" />
          <text x="568" y="203" fill="#00f0ff" fontSize="9" fontFamily="monospace" opacity="0.5">30m</text>

          <line x1="180" y1="260" x2="620" y2="260" stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.25" />
          <text x="628" y="263" fill="#00f0ff" fontSize="9" fontFamily="monospace" opacity="0.5">20m</text>

          <line x1="120" y1="340" x2="680" y2="340" stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.3" />
          <text x="688" y="343" fill="#00f0ff" fontSize="9" fontFamily="monospace" opacity="0.5">10m</text>

          {/* Synthetic Ego Vehicle Hood Edge at bottom */}
          <path
            d="M200,450 C320,410 480,410 600,450 Z"
            fill="#0b1322"
            stroke="#00ff88"
            strokeWidth="1.5"
            opacity="0.9"
          />
          <line x1="380" y1="428" x2="420" y2="428" stroke="#00ff88" strokeWidth="2" opacity="0.8" />

          {/* ========================================================================= */}
          {/* VECTOR OBJECT 1: BUS (Long passenger bus in right-center lane)            */}
          {/* ========================================================================= */}
          <g id="vector-bus" transform="translate(480, 165)">
            {/* Bus shadow */}
            <ellipse cx="65" cy="115" rx="55" ry="12" fill="#000" opacity="0.6" />

            {/* Bus Body */}
            <rect x="15" y="10" width="100" height="98" rx="8" fill="#1b253b" stroke="#f59e0b" strokeWidth="1.5" />
            {/* Roof / Luggage Rack */}
            <rect x="22" y="5" width="86" height="10" rx="3" fill="#2d3748" stroke="#4a5568" strokeWidth="1" />
            <line x1="35" y1="5" x2="35" y2="15" stroke="#718096" strokeWidth="1" />
            <line x1="55" y1="5" x2="55" y2="15" stroke="#718096" strokeWidth="1" />
            <line x1="75" y1="5" x2="75" y2="15" stroke="#718096" strokeWidth="1" />
            <line x1="95" y1="5" x2="95" y2="15" stroke="#718096" strokeWidth="1" />

            {/* Rear Windshield */}
            <rect x="25" y="22" width="80" height="32" rx="4" fill="#0c1322" stroke="#38bdf8" strokeWidth="1" />
            <path d="M28,26 L65,50" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />

            {/* Bus Tail Lamps & Reflectors */}
            <rect x="20" y="65" width="10" height="18" rx="2" fill="#ef4444" />
            <rect x="100" y="65" width="10" height="18" rx="2" fill="#ef4444" />
            <rect x="20" y="85" width="10" height="8" rx="1" fill="#f59e0b" />
            <rect x="100" y="85" width="10" height="8" rx="1" fill="#f59e0b" />

            {/* Commercial Plate & Emergency Exit markings */}
            <rect x="52" y="86" width="26" height="9" fill="#fbbf24" rx="1" />
            <rect x="42" y="68" width="46" height="12" fill="#111827" rx="2" />
            <text x="65" y="77" fill="#94a3b8" fontSize="7" textAnchor="middle" fontFamily="monospace">INDIAN BUS</text>

            {/* Wheels */}
            <rect x="18" y="98" width="14" height="12" rx="3" fill="#090d16" stroke="#2d3748" strokeWidth="1" />
            <rect x="98" y="98" width="14" height="12" rx="3" fill="#090d16" stroke="#2d3748" strokeWidth="1" />
          </g>

          {/* ========================================================================= */}
          {/* VECTOR OBJECT 2: THREE-WHEELER (Auto-Rickshaw in center-right)            */}
          {/* ========================================================================= */}
          <g id="vector-rickshaw" transform="translate(390, 235)">
            {/* Shadow */}
            <ellipse cx="48" cy="88" rx="42" ry="11" fill="#000" opacity="0.7" />

            {/* Rickshaw Yellow Canopy Top */}
            <path
              d="M16,28 Q48,10 80,28 L84,52 L12,52 Z"
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="1.5"
            />
            {/* Green Lower Body (Iconic Indian CNG Auto Colors) */}
            <path
              d="M12,52 L84,52 L88,78 L8,78 Z"
              fill="#065f46"
              stroke="#10b981"
              strokeWidth="1.5"
            />

            {/* Rear Window & Open Cabin */}
            <rect x="24" y="32" width="48" height="18" rx="2" fill="#060c18" stroke="#60a5fa" strokeWidth="0.8" />
            <line x1="48" y1="32" x2="48" y2="50" stroke="#334155" strokeWidth="1.5" />

            {/* Tail lights & Number plate */}
            <circle cx="16" cy="68" r="4" fill="#ef4444" />
            <circle cx="80" cy="68" r="4" fill="#ef4444" />
            <rect x="36" y="64" width="24" height="9" fill="#fef08a" rx="1" />
            <text x="48" y="71" fill="#000" fontSize="6" textAnchor="middle" fontWeight="bold">DL 1R</text>

            {/* Wide Rear Wheels & mudflaps */}
            <rect x="6" y="72" width="8" height="16" rx="2" fill="#0f172a" />
            <rect x="82" y="72" width="8" height="16" rx="2" fill="#0f172a" />
          </g>

          {/* ========================================================================= */}
          {/* VECTOR OBJECT 3: TWO-WHEELER (Motorcycle / Scooter with rider in left)   */}
          {/* ========================================================================= */}
          <g id="vector-bike" transform="translate(235, 245)">
            {/* Shadow */}
            <ellipse cx="28" cy="102" rx="22" ry="8" fill="#000" opacity="0.65" />

            {/* Rider Helmet */}
            <circle cx="28" cy="22" r="10" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M22,23 Q28,27 34,23" stroke="#00f0ff" strokeWidth="2" fill="none" />

            {/* Rider Torso & Jacket */}
            <path d="M16,34 L40,34 L44,64 L12,64 Z" fill="#1e293b" stroke="#00f0ff" strokeWidth="1" />
            {/* Arms / Handlebars grip */}
            <line x1="16" y1="38" x2="8" y2="52" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="40" y1="38" x2="48" y2="52" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="6" y1="52" x2="50" y2="52" stroke="#94a3b8" strokeWidth="2" />

            {/* Rear View Mirrors */}
            <circle cx="6" cy="50" r="2.5" fill="#38bdf8" />
            <circle cx="50" cy="50" r="2.5" fill="#38bdf8" />

            {/* Motorcycle Chassis & Seat */}
            <rect x="18" y="62" width="20" height="24" rx="3" fill="#0f172a" stroke="#00f0ff" strokeWidth="1" />
            {/* Red Tail Lamp */}
            <rect x="22" y="74" width="12" height="6" rx="2" fill="#ef4444" />
            {/* Rear Tire */}
            <rect x="23" y="86" width="10" height="18" rx="4" fill="#020617" stroke="#334155" strokeWidth="1" />
          </g>

          {/* ========================================================================= */}
          {/* VECTOR OBJECT 4: PEDESTRIAN (Crossing on left shoulder)                   */}
          {/* ========================================================================= */}
          <g id="vector-pedestrian" transform="translate(130, 260)">
            {/* Shadow */}
            <ellipse cx="20" cy="98" rx="14" ry="6" fill="#000" opacity="0.6" />

            {/* Head */}
            <circle cx="20" cy="16" r="7" fill="#e2e8f0" stroke="#a855f7" strokeWidth="1.5" />

            {/* Torso / Shirt */}
            <rect x="13" y="24" width="14" height="28" rx="3" fill="#7c3aed" stroke="#c084fc" strokeWidth="1" />

            {/* Arms */}
            <line x1="13" y1="26" x2="8" y2="44" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
            <line x1="27" y1="26" x2="31" y2="40" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

            {/* Trousers & Legs in walking stance */}
            <line x1="17" y1="52" x2="11" y2="92" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            <line x1="23" y1="52" x2="28" y2="90" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
            {/* Shoes */}
            <ellipse cx="9" cy="94" rx="4" ry="2.5" fill="#e2e8f0" />
            <ellipse cx="30" cy="92" rx="4" ry="2.5" fill="#e2e8f0" />
          </g>

          {/* Dynamic Laser Scanning Horizon Line */}
          <rect x="0" y="220" width="800" height="2" fill="url(#lidarScanGrad)" opacity="0.8" />
        </svg>

        {/* ========================================================================= */}
        {/* BOUNDING BOXES & AI LABELS OVERLAY (HTML/CSS over SVG)                    */}
        {/* ========================================================================= */}
        {showBoundingBoxes && (
          <div className="detection-overlay-layer">
            {/* Det 1: Two-wheeler */}
            <div
              className={`detection-box det-twowheeler ${selectedDet === "det-1" ? "selected" : ""}`}
              style={{ left: "28%", top: "52%", width: "10%", height: "26%" }}
              onClick={() => setSelectedDet("det-1")}
            >
              <div className="corner c-tl"></div>
              <div className="corner c-tr"></div>
              <div className="corner c-bl"></div>
              <div className="corner c-br"></div>
              <div className="det-label-tag cyan-tag">
                <span className="det-title">Two-wheeler 0.91</span>
                <span className="det-meta">14.2m • 32 km/h</span>
              </div>
              <div className="det-track-id">ID: #T04</div>
            </div>

            {/* Det 2: Three-wheeler */}
            <div
              className={`detection-box det-threewheeler ${selectedDet === "det-2" ? "selected" : ""}`}
              style={{ left: "47%", top: "48%", width: "15%", height: "26%" }}
              onClick={() => setSelectedDet("det-2")}
            >
              <div className="corner c-tl"></div>
              <div className="corner c-tr"></div>
              <div className="corner c-bl"></div>
              <div className="corner c-br"></div>
              <div className="det-label-tag green-tag">
                <span className="det-title">Three-wheeler 0.87</span>
                <span className="det-meta">18.6m • 24 km/h</span>
              </div>
              <div className="det-track-id">ID: #T02</div>
            </div>

            {/* Det 3: Bus */}
            <div
              className={`detection-box det-bus ${selectedDet === "det-3" ? "selected" : ""}`}
              style={{ left: "60%", top: "34%", width: "16%", height: "30%" }}
              onClick={() => setSelectedDet("det-3")}
            >
              <div className="corner c-tl"></div>
              <div className="corner c-tr"></div>
              <div className="corner c-bl"></div>
              <div className="corner c-br"></div>
              <div className="det-label-tag amber-tag">
                <span className="det-title">Bus 0.82</span>
                <span className="det-meta">31.0m • 18 km/h</span>
              </div>
              <div className="det-track-id">ID: #T07</div>
            </div>

            {/* Det 4: Pedestrian */}
            <div
              className={`detection-box det-pedestrian ${selectedDet === "det-4" ? "selected" : ""}`}
              style={{ left: "15%", top: "54%", width: "7%", height: "25%" }}
              onClick={() => setSelectedDet("det-4")}
            >
              <div className="corner c-tl"></div>
              <div className="corner c-tr"></div>
              <div className="corner c-bl"></div>
              <div className="corner c-br"></div>
              <div className="det-label-tag purple-tag">
                <span className="det-title">Pedestrian 0.79</span>
                <span className="det-meta">9.8m • 4 km/h</span>
              </div>
              <div className="det-track-id">ID: #T11</div>
            </div>
          </div>
        )}
          </>
        )}

        {/* HUD Crosshair Center Reticle */}
        <div className="hud-aim-reticle">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
          <div className="hud-fov-circle"></div>
        </div>

        {/* Viewport Bottom Telemetry Overlay */}
        <div className="viewport-bottom-hud">
          <div className="hud-stat-cell">
            <Eye size={12} className="hud-icon" />
            <span>RT-DETRv2 {perception.hasData ? "LIVE" : "R18"}</span>
          </div>
          <div className="hud-stat-cell">
            <ShieldCheck size={12} className="hud-icon green" />
            <span>
              {perception.hasData
                ? `${perception.detectionCount} DETECTIONS ACTIVE`
                : "12 CLUSTERS RESOLVED"}
            </span>
          </div>
          <div className="hud-stat-cell">
            <Activity size={12} className="hud-icon cyan" />
            <span>
              {perception.hasData && perception.inferenceTimeMs
                ? `LATENCY: ${perception.inferenceTimeMs}ms`
                : "FOCAL: 14.2mm"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
