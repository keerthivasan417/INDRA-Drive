import React from "react";
import { Zap, Terminal } from "lucide-react";
import { indraData } from "../data/mockData";

export default function Footer() {
  return (
    <footer className="indra-footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-brand">
            <Zap size={16} className="footer-brand-icon" />
            <span className="footer-brand-name">{indraData.footer.brand}</span>
            <span className="footer-badge">{indraData.footer.type}</span>
          </div>
          <p className="footer-tagline">"{indraData.footer.title}"</p>
          <span className="footer-lab">{indraData.footer.academicInfo}</span>
        </div>

        <div className="footer-right">
          <div className="footer-tech-stack">
            <span className="tech-pill">React 19</span>
            <span className="tech-pill">RT-DETRv2</span>
            <span className="tech-pill">ByteTrack</span>
            <span className="tech-pill">LSTM</span>
            <span className="tech-pill">Hybrid MPC-DWA</span>
            <span className="tech-pill">FastAPI Ready</span>
            <span className="tech-pill">Developed with Antigravity</span>
          </div>

          <div className="footer-build-info">
            <Terminal size={12} className="terminal-icon" />
            <span>{indraData.footer.build}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}