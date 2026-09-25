import React, { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import HeroSection from "./components/HeroSection";
import MetricCards from "./components/MetricCards";
import AiPipeline from "./components/AiPipeline";
import PathPlanningView from "./components/PathPlanningView";
import SystemInsights from "./components/SystemInsights";
import PlaceholderModule from "./components/PlaceholderModule";
import Footer from "./components/Footer";
import LivePerception from "./pages/LivePerception";
import ObjectTracking from "./pages/ObjectTracking";
import TrajectoryPrediction from "./pages/TrajectoryPrediction";
import RiskAnalysis from "./pages/RiskAnalysis";
import PathPlanning from "./pages/PathPlanning";
import SystemMetrics from "./pages/SystemMetrics";
import { indraData } from "./data/mockData";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");

  const currentNav = indraData.navigation.find((item) => item.id === activeTab);
  const currentNavLabel = currentNav ? currentNav.label : "Module View";

  return (
    <div className="indra-cockpit-app">
      {/* Top Header */}
      <Header />

      {/* Main Cockpit Layout: Sidebar + Viewport Content */}
      <div className="indra-cockpit-body">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="indra-main-viewport">
          {activeTab === "overview" ? (
            <div className="overview-flow-container">
              {/* Hero Section with Perception Stream */}
              <HeroSection onExplorePipeline={() => setActiveTab("planning")} />

              {/* 4 Primary Metric Cards + 5 Vehicle-Class Cards */}
              <MetricCards />

              {/* AI Pipeline Horizontal Connected Flow */}
              <AiPipeline />

              {/* Adaptive Path Planning Section (BEV + Telemetry) */}
              <PathPlanningView />

              {/* System Insights Section (3 Cards) */}
              <SystemInsights />

              {/* Research Demonstrator Footer */}
              <Footer />
            </div>
          ) : activeTab === "perception" ? (
            <div className="submodule-container">
              <LivePerception onReturnOverview={() => setActiveTab("overview")} />
            </div>
          ) : activeTab === "tracking" ? (
            <div className="submodule-container">
              <ObjectTracking onReturnOverview={() => setActiveTab("overview")} />
            </div>
          ) : activeTab === "risk" ? (
            <div className="submodule-container">
              <RiskAnalysis onReturnOverview={() => setActiveTab("overview")} />
            </div>
          ) : activeTab === "trajectory" || activeTab === "prediction" ? (
            <div className="submodule-container">
              <TrajectoryPrediction onReturnOverview={() => setActiveTab("overview")} />
            </div>
          ) : activeTab === "planning" ? (
            <div className="submodule-container">
              <PathPlanning onReturnOverview={() => setActiveTab("overview")} />
            </div>
          ) : activeTab === "metrics" || activeTab === "system" ? (
            <div className="submodule-container">
              <SystemMetrics onReturnOverview={() => setActiveTab("overview")} />
            </div>
          ) : (
            <div className="submodule-container">
              <PlaceholderModule
                moduleName={currentNavLabel}
                onReturnOverview={() => setActiveTab("overview")}
              />
              <Footer />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
