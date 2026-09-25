import React, { useMemo } from "react";
import {
  Box,
  Cpu,
  AlertTriangle,
  Timer,
  Bike,
  Car,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { indraData } from "../data/mockData";
import { useIndraRuntime } from "../context/IndraRuntimeContext";

const primaryIconMap = {
  Box: Box,
  Cpu: Cpu,
  AlertTriangle: AlertTriangle,
  Timer: Timer,
};

const classIconMap = {
  "two-wheeler": Bike,
  "three-wheeler": Zap,
  car: Car,
  bus: Truck,
  pedestrian: User,
};

export default function MetricCards() {
  const { perception, tracking, risk } = useIndraRuntime();

  // Dynamic derivations for primary metric cards
  const dynamicPrimaryCards = indraData.metrics.primary.map((card) => {
    if (card.id === "objects") {
      if (perception.hasData) {
        return {
          ...card,
          value: String(perception.detectionCount),
          unit: "targets",
          source: "LIVE MODEL",
          sourceType: "live",
          subtext: perception.filename ? `In ${perception.filename}` : "Live RT-DETRv2 inference",
          trend: perception.inferenceTimeMs ? `${perception.inferenceTimeMs} ms latency` : "Active model",
        };
      }
      return {
        ...card,
        source: "DEMO",
        sourceType: "demo",
      };
    }

    if (card.id === "tracks") {
      if (tracking.hasData) {
        return {
          ...card,
          value: String(tracking.activeTrackCount),
          unit: "tracked",
          source: "PROTOTYPE TRACKING",
          sourceType: "tracking",
          subtext: `Frame ${tracking.currentFrame}/${tracking.totalFrames} • ${tracking.totalTrackCount} total`,
          trend: "ByteTrack prototype",
        };
      }
      return {
        ...card,
        source: "DEMO",
        sourceType: "demo",
      };
    }

    if (card.id === "risk") {
      if (risk.hasData) {
        const isCritical = risk.riskLevel === "CRITICAL";
        const isHigh = risk.riskLevel === "HIGH";
        return {
          ...card,
          value: risk.riskLevel,
          unit: "level",
          source: "PROTOTYPE IMAGE-SPACE RISK",
          sourceType: "risk",
          subtext: risk.isConverging ? "Converging path detected" : "Stable / Diverging",
          trend: typeof risk.minSeparation === "number"
            ? `Min sep: ${risk.minSeparation.toFixed(3)}`
            : "Safety buffer active",
          accent: isCritical ? "amber" : (isHigh ? "amber" : "emerald"),
        };
      }
      return {
        ...card,
        source: "DEMO",
        sourceType: "demo",
      };
    }

    if (card.id === "ttc") {
      if (risk.hasData && risk.ttc !== null) {
        const formattedTtc = typeof risk.ttc === "number"
          ? risk.ttc.toFixed(2)
          : String(risk.ttc).replace(" s", "");
        return {
          ...card,
          value: formattedTtc,
          unit: "seconds",
          source: "PROTOTYPE IMAGE-SPACE RISK",
          sourceType: "risk",
          subtext: "Image-space TTC heuristic",
          trend: risk.isConverging ? "Calculated (T0 / closure rate)" : "Safe / No convergence",
        };
      }
      return {
        ...card,
        source: "DEMO",
        sourceType: "demo",
      };
    }

    return {
      ...card,
      source: "DEMO",
      sourceType: "demo",
    };
  });

  // Calculate dynamic vehicle class distribution if live detections exist
  const dynamicVehicleClasses = useMemo(() => {
    if (!perception.hasData || !Array.isArray(perception.detections) || perception.detections.length === 0) {
      return indraData.metrics.vehicleClasses;
    }

    const counts = {
      "two-wheeler": 0,
      "three-wheeler": 0,
      car: 0,
      bus: 0,
      pedestrian: 0,
    };

    perception.detections.forEach((d) => {
      const name = (d.class_name || "").toLowerCase();
      if (name.includes("two") || name.includes("motorcycle") || name.includes("bike") || name.includes("bicycle")) {
        counts["two-wheeler"]++;
      } else if (name.includes("three") || name.includes("auto") || name.includes("rickshaw")) {
        counts["three-wheeler"]++;
      } else if (name.includes("truck") || name.includes("bus") || name.includes("heavy")) {
        counts.bus++;
      } else if (name.includes("pedestrian") || name.includes("person") || name.includes("rider")) {
        counts.pedestrian++;
      } else {
        counts.car++;
      }
    });

    const total = perception.detectionCount || 1;
    return indraData.metrics.vehicleClasses.map((item) => {
      const count = counts[item.id] || 0;
      const share = Math.round((count / total) * 100);
      return {
        ...item,
        count,
        share,
      };
    });
  }, [perception]);

  return (
    <section className="metric-cards-section">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">Telemetry & Dynamic State</h2>
          <p className="section-subtitle">
            Real-time inference sensors and spatiotemporal threat metrics
          </p>
        </div>
        <div className="telemetry-chips-row">
          {perception.hasData && perception.filename && (
            <div className="telemetry-last-input-chip">
              <span className="last-input-label">Last Input:</span>
              <span className="last-input-file mono">{perception.filename}</span>
              {perception.imageWidth && perception.imageHeight && (
                <span className="last-input-dim mono">
                  ({perception.imageWidth}×{perception.imageHeight})
                </span>
              )}
            </div>
          )}
          <div className="telemetry-live-chip">
            <span className="live-blink"></span>
            <span>{perception.hasData ? "LIVE MODEL ACTIVE" : "TELEMETRY STREAM"}</span>
          </div>
        </div>
      </div>

      {/* 4 Primary Premium Cards */}
      <div className="primary-metric-grid">
        {dynamicPrimaryCards.map((card) => {
          const IconComponent = primaryIconMap[card.icon] || Box;

          return (
            <div
              key={card.id}
              className={`primary-metric-card card-${card.accent}`}
            >
              <div className="card-header-line">
                <span className="card-label">{card.label}</span>
                <div className="card-header-right">
                  <span className={`source-indicator-tag source-${card.sourceType}`}>
                    {card.source}
                  </span>
                  <div className={`card-icon-pill icon-${card.accent}`}>
                    <IconComponent size={17} />
                  </div>
                </div>
              </div>

              <div className="card-value-line">
                <span className="card-numeric">{card.value}</span>
                <span className="card-unit">{card.unit}</span>
              </div>

              <div className="card-footer-line">
                <span className="card-subtext">{card.subtext}</span>
                <span className="card-trend">{card.trend}</span>
              </div>

              {/* High-tech corner accent lines */}
              <div className="card-accent-border"></div>
            </div>
          );
        })}
      </div>

      {/* Vehicle Class Breakdown Cards */}
      <div className="vehicle-class-container">
        <div className="class-header-row">
          <span className="class-group-title">
            {perception.hasData
              ? `HETEROGENEOUS CLASS RECOGNITION (${perception.detectionCount} OBJECTS DETECTED)`
              : "HETEROGENEOUS CLASS RECOGNITION (12 OBJECTS ACTIVE)"}
          </span>
          <span className="class-dataset-tag">
            {perception.hasData ? "LIVE MODEL DETECTIONS" : "UVH-26 DATASET DISTRIBUTION • DEMO"}
          </span>
        </div>

        <div className="vehicle-class-grid">
          {dynamicVehicleClasses.map((item) => {
            const ClassIcon = classIconMap[item.id] || Car;

            return (
              <div key={item.id} className="vehicle-class-card">
                <div className="class-card-top">
                  <div className="class-icon-wrapper" style={{ color: item.color }}>
                    <ClassIcon size={16} />
                  </div>
                  <span className="class-count" style={{ color: item.color }}>
                    {item.count}
                  </span>
                </div>

                <div className="class-name">{item.label}</div>

                <div className="class-progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${item.share}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.color}66`,
                    }}
                  ></div>
                </div>

                <div className="class-share-label">
                  <span>{item.share}% of scene</span>
                  <span>Active Track</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
