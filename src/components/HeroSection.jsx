import React from "react";
import { Sparkles, Shield, Cpu, Compass, Layers, ArrowRight } from "lucide-react";
import { indraData } from "../data/mockData";
import PerceptionPreview from "./PerceptionPreview";

export default function HeroSection({ onExplorePipeline }) {
  return (
    <section className="indra-hero-section">
      <div className="hero-left-col">
        <div className="hero-eyebrow">
          <Sparkles size={14} className="eyebrow-icon" />
          <span>ADVANCED DRIVER ASSISTANCE & UNSTRUCTURED NAVIGATION</span>
        </div>

        <h1 className="hero-title">{indraData.hero.heading}</h1>

        <p className="hero-description">{indraData.hero.description}</p>

        {/* Feature Capability Tags */}
        <div className="hero-tags-list">
          {indraData.hero.tags.map((tag, idx) => (
            <span key={idx} className="hero-tag-pill">
              <span className="tag-dot"></span>
              {tag}
            </span>
          ))}
        </div>

        {/* Hero Quick Telemetry Banner */}
        <div className="hero-quick-specs">
          <div className="quick-spec-item">
            <span className="spec-label">PERCEPTION CORE</span>
            <span className="spec-val">RT-DETRv2</span>
            <span className="spec-sub">14 Classes (UVH-26)</span>
          </div>
          <div className="spec-divider"></div>
          <div className="quick-spec-item">
            <span className="spec-label">TRACKING & PREDICTION</span>
            <span className="spec-val">ByteTrack + LSTM</span>
            <span className="spec-sub">50 Tracks | 5-Step Horiz</span>
          </div>
          <div className="spec-divider"></div>
          <div className="quick-spec-item">
            <span className="spec-label">PATH PLANNING</span>
            <span className="spec-val">MPC + DWA</span>
            <span className="spec-sub">Dynamic Margin Guard</span>
          </div>
        </div>
      </div>

      {/* Hero Right Column: Perception Stream Panel */}
      <div className="hero-right-col">
        <PerceptionPreview />
      </div>
    </section>
  );
}
