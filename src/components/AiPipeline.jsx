import React from "react";
import {
  Scan,
  Crosshair,
  TrendingUp,
  ShieldAlert,
  Compass,
  ArrowRight,
  Zap,
} from "lucide-react";
import { indraData } from "../data/mockData";

const pipelineIcons = {
  Scan: Scan,
  Crosshair: Crosshair,
  TrendingUp: TrendingUp,
  ShieldAlert: ShieldAlert,
  Compass: Compass,
};

export default function AiPipeline() {
  return (
    <section className="indra-pipeline-section">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">End-to-End Autonomous Pipeline</h2>
          <p className="section-subtitle">
            Synchronized multi-stage perception, prediction, and hybrid control loop
          </p>
        </div>
        <div className="pipeline-sync-badge">
          <Zap size={13} className="sync-icon" />
          <span>CYCLE LATENCY: 30.8 ms</span>
        </div>
      </div>

      <div className="pipeline-track">
        {indraData.aiPipeline.map((node, index) => {
          const IconComponent = pipelineIcons[node.icon] || Scan;
          const isLast = index === indraData.aiPipeline.length - 1;

          return (
            <React.Fragment key={node.step}>
              <div className="pipeline-node-card">
                <div className="node-step-header">
                  <span className="step-number">{node.step}</span>
                  <span className="step-name">{node.name}</span>
                </div>

                <div className="node-icon-display">
                  <div className="node-icon-glow"></div>
                  <IconComponent size={24} className="node-icon" />
                </div>

                <div className="node-model-title">{node.model}</div>

                <p className="node-description">{node.description}</p>

                <div className="node-specs-footer">
                  <div className="spec-pill">
                    <span className="spec-k">Lat:</span>
                    <span className="spec-v">{node.latency}</span>
                  </div>
                  <div className="spec-pill">
                    <span className="spec-k">Perf:</span>
                    <span className="spec-v">{node.accuracy}</span>
                  </div>
                </div>

                <div className="node-glow-ring"></div>
              </div>

              {!isLast && (
                <div className="pipeline-connector">
                  <div className="connector-line">
                    <div className="connector-pulse"></div>
                  </div>
                  <div className="connector-arrow">
                    <ArrowRight size={14} />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}
