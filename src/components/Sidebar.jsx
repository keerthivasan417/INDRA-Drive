import React from "react";
import {
  LayoutDashboard,
  Eye,
  Crosshair,
  ShieldAlert,
  TrendingUp,
  Compass,
  Activity,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import { indraData } from "../data/mockData";

const iconMap = {
  LayoutDashboard: LayoutDashboard,
  Eye: Eye,
  Crosshair: Crosshair,
  ShieldAlert: ShieldAlert,
  TrendingUp: TrendingUp,
  Compass: Compass,
  Activity: Activity,
};

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="indra-sidebar">
      <div className="sidebar-section-title">
        <span>MISSION CONTROL</span>
      </div>

      <nav className="sidebar-nav">
        {indraData.navigation.map((item) => {
          const IconComponent = iconMap[item.icon] || LayoutDashboard;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.id)}
            >
              <div className="nav-item-content">
                <span className="nav-icon-wrapper">
                  <IconComponent size={18} className="nav-icon" />
                </span>
                <span className="nav-label">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`nav-badge ${isActive ? "badge-active" : ""}`}>
                  {item.badge}
                </span>
              )}
              {isActive && <div className="nav-active-glow"></div>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer-telemetry">
        <div className="telemetry-hardware-card">
          <div className="card-top-row">
            <span className="hw-label">
              <HardDrive size={13} className="hw-icon" />
              EDGE COMPUTE
            </span>
            <span className="hw-status">
              <CheckCircle2 size={11} className="hw-ok-icon" /> READY
            </span>
          </div>
          <div className="hw-name">NVIDIA RTX AI CORE</div>
          <div className="hw-metrics">
            <div className="hw-metric-cell">
              <span className="cell-num">{indraData.system.latencyMs}</span>
              <span className="cell-unit">ms lat</span>
            </div>
            <div className="hw-metric-cell">
              <span className="cell-num">14</span>
              <span className="cell-unit">classes</span>
            </div>
            <div className="hw-metric-cell">
              <span className="cell-num">32.4</span>
              <span className="cell-unit">fps</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
