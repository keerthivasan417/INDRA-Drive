import React, { useState, useEffect } from "react";
import {
  Radio,
  Sliders,
  Bell,
  Cpu,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { indraData } from "../data/mockData";

export default function Header() {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="indra-header">
      <div className="header-left">
        <div className="brand-badge">
          <div className="brand-emblem">
            <Zap className="emblem-icon" size={20} />
            <div className="emblem-pulse"></div>
          </div>
          <div className="brand-text-group">
            <div className="brand-row">
              <span className="brand-name">{indraData.system.name}</span>
              <span className="brand-version">{indraData.system.version}</span>
            </div>
            <span className="brand-subtitle">{indraData.system.subtitle}</span>
          </div>
        </div>
      </div>

      <div className="header-center">
        <div className="system-status-pill">
          <span className="status-beacon">
            <span className="beacon-dot"></span>
            <span className="beacon-ring"></span>
          </span>
          <span className="status-label">{indraData.system.status}</span>
        </div>

        <div className="demo-mode-badge" title="Simulated real-time telemetry stream">
          <Radio size={13} className="demo-icon" />
          <span>{indraData.system.mode}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="time-telemetry">
          <span className="time-label">UTC+05:30</span>
          <span className="time-display">{timeStr || "12:00:00 IST"}</span>
        </div>

        <div className="fps-counter" title="Inference Frame Rate">
          <Cpu size={14} className="fps-icon" />
          <span>{indraData.system.fps} FPS</span>
        </div>

        <div className="header-actions">
          <button className="action-btn" title="Sensory Telemetry Diagnostics" aria-label="Diagnostics">
            <Bell size={17} />
            <span className="action-notification-dot"></span>
          </button>
          <button className="action-btn" title="Cockpit Settings" aria-label="Settings">
            <Sliders size={17} />
          </button>
          <div className="user-profile-badge" title="Lead Research Operator">
            <ShieldCheck size={18} className="profile-icon" />
            <span className="profile-id">PILOT_01</span>
          </div>
        </div>
      </div>
    </header>
  );
}
