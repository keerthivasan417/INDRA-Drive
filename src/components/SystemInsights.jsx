import React from "react";
import { Eye, Shield, Compass, Sparkles, ArrowUpRight } from "lucide-react";
import { indraData } from "../data/mockData";

const insightIcons = {
  cyan: Eye,
  green: Shield,
  purple: Compass,
};

export default function SystemInsights() {
  return (
    <section className="indra-insights-section">
      <div className="section-title-row">
        <div>
          <h2 className="section-title">Research & System Insights</h2>
          <p className="section-subtitle">
            Core technical achievements and validation benchmarks on unstructured Indian road domains
          </p>
        </div>
        <div className="research-chip">
          <Sparkles size={13} className="spark-icon" />
          <span>RESEARCH HIGHLIGHTS</span>
        </div>
      </div>

      <div className="insights-grid">
        {indraData.systemInsights.map((card) => {
          const IconComponent = insightIcons[card.accent] || Eye;

          return (
            <div key={card.id} className={`insight-card card-${card.accent}`}>
              <div className="insight-card-header">
                <div className={`insight-icon-box icon-${card.accent}`}>
                  <IconComponent size={20} />
                </div>
                <span className="insight-category">{card.category}</span>
                <span className="insight-badge">{card.badge}</span>
              </div>

              <h3 className="insight-title">{card.title}</h3>

              <p className="insight-text">{card.text}</p>

              <div className="insight-footer">
                <span className="insight-metric-label">Benchmark:</span>
                <span className="insight-metric-value">{card.metric}</span>
              </div>

              <div className="card-ambient-glow"></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
