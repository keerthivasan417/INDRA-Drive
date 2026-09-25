import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import TrackingViewport from "../components/tracking/TrackingViewport";
import TrackTable from "../components/tracking/TrackTable";
import TrackingTelemetryCard from "../components/tracking/TrackingTelemetryCard";
import TrackingPreprocessorCard from "../components/tracking/TrackingPreprocessorCard";
import VideoUploadControl from "../components/tracking/VideoUploadControl";
import Footer from "../components/Footer";
import { evaluateSequenceUpToFrame } from "../utils/byteTrack";
import {
  TRACKING_DEMO_FRAMES,
  PROTOTYPE_TRACKING_METADATA,
  TOTAL_DEMO_FRAMES,
} from "../data/trackingDemoSequence";
import { getBackendHealth } from "../services/api";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import "./ObjectTracking.css";

export default function ObjectTracking({ onReturnOverview }) {
  const { updateTrackingState } = useIndraRuntime();

  // Single source of truth for total sequence length
  const totalFrames = TOTAL_DEMO_FRAMES;

  // Frame & Playback State
  const [currentFrameIndex, setCurrentFrameIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);

  // Active tracks and preprocessor stats initialized from Frame 1
  const [activeTracks, setActiveTracks] = useState(() => evaluateSequenceUpToFrame(1, TRACKING_DEMO_FRAMES).activeTracks);
  const [allRegisteredTracks, setAllRegisteredTracks] = useState(() => evaluateSequenceUpToFrame(1, TRACKING_DEMO_FRAMES).allRegisteredTracks);
  const [preprocessorStats, setPreprocessorStats] = useState(() => evaluateSequenceUpToFrame(1, TRACKING_DEMO_FRAMES).stats);

  // Video metadata
  const [videoMeta, setVideoMeta] = useState(PROTOTYPE_TRACKING_METADATA);
  const [healthData, setHealthData] = useState(null);

  // Synchronize state to shared runtime context whenever frame/tracks change
  useEffect(() => {
    updateTrackingState({
      activeTrackCount: activeTracks.length,
      totalTrackCount: allRegisteredTracks.length,
      currentFrame: currentFrameIndex,
      totalFrames,
      activeTracks,
      allRegisteredTracks,
    });
  }, [activeTracks, allRegisteredTracks, currentFrameIndex, totalFrames, updateTrackingState]);

  // Synchronize state deterministically to a specific frame
  const applyFrameState = useCallback((frameIdx) => {
    const res = evaluateSequenceUpToFrame(frameIdx, TRACKING_DEMO_FRAMES);
    setActiveTracks(res.activeTracks);
    setAllRegisteredTracks(res.allRegisteredTracks);
    setPreprocessorStats(res.stats);
  }, []);

  // Fetch backend health on mount
  useEffect(() => {
    let isMounted = true;
    getBackendHealth()
      .then((data) => {
        if (isMounted) setHealthData(data);
      })
      .catch(() => {
        if (isMounted) {
          setHealthData({
            model: "RT-DETRv2 R18",
            device: "cuda",
            gpu: "NVIDIA GeForce RTX 2050",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Animation playback loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      const frameDuration = (1000 / videoMeta.fps) / playbackSpeed;
      interval = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = prev + 1;
          if (next > totalFrames) {
            setIsPlaying(false);
            return prev;
          }
          applyFrameState(next);
          return next;
        });
      }, frameDuration);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, videoMeta.fps, totalFrames, applyFrameState]);

  // Handlers
  const handleTogglePlay = () => {
    if (currentFrameIndex >= totalFrames) {
      // Replay from start
      setCurrentFrameIndex(1);
      applyFrameState(1);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(1);
    applyFrameState(1);
  };

  const handleStepForward = () => {
    if (currentFrameIndex < totalFrames) {
      const next = currentFrameIndex + 1;
      setCurrentFrameIndex(next);
      applyFrameState(next);
    }
  };

  const handleLoadPrototype = () => {
    handleReset();
    setVideoMeta(PROTOTYPE_TRACKING_METADATA);
  };

  const handleVideoSelected = (file) => {
    setVideoMeta({
      title: file.name,
      filename: file.name,
      fps: 30.0,
      totalFrames,
      resolution: { width: 1920, height: 1080 },
      cameraFOV: "68° Monocular Forward",
      status: "PROTOTYPE / DEMO EXPERIMENT",
      disclaimer: "These are prototype demonstrator results, not UVH-26 validation benchmark metrics.",
    });
    handleReset();
  };

  return (
    <div className="object-tracking-page">
      {/* Top Header */}
      <div className="tracking-page-header">
        <div className="header-breadcrumbs">
          <button
            type="button"
            className="breadcrumb-back-btn"
            onClick={onReturnOverview}
          >
            <ArrowLeft size={14} aria-hidden="true" focusable="false" />
            <span>Overview</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Object Tracking</span>
        </div>

        <div className="header-headline-row">
          <div className="headline-text-group">
            <div className="tracking-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>BYTETRACK • SPATIOTEMPORAL DATA ASSOCIATION</span>
              <span className="eyebrow-pill">PREPROCESSOR + KALMAN FILTER</span>
            </div>
            <h1 className="tracking-title">
              Multi-Object Tracking & Spatiotemporal Association
            </h1>
            <p className="tracking-subtitle">
              Sequential monocular tracking pipeline fusing RT-DETRv2 transformer detections, IoU-based hypothesis preprocessing, and ByteTrack Kalman state estimation for unstructured Indian road navigation.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="action-ghost-btn"
              onClick={handleReset}
              title="Reset tracker state"
            >
              <RotateCcw size={14} aria-hidden="true" focusable="false" />
              <span>Reset Tracker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="tracking-workstation-grid">
        {/* Left Column: Video Ingestion, Telemetry, and Preprocessor Cards */}
        <div className="tracking-left-col">
          {/* Tracking Telemetry Card */}
          <TrackingTelemetryCard
            activeTracksCount={activeTracks.length}
            totalTracksCount={allRegisteredTracks.length}
            currentFrame={currentFrameIndex}
            totalFrames={totalFrames}
            fps={videoMeta.fps}
            isTracking={isPlaying || currentFrameIndex > 1}
            healthData={healthData}
          />

          {/* Video Ingestion & Playback Controls */}
          <VideoUploadControl
            videoMetadata={videoMeta}
            isTracking={isPlaying || currentFrameIndex > 1}
            isPlaying={isPlaying}
            currentFrame={currentFrameIndex}
            totalFrames={totalFrames}
            playbackSpeed={playbackSpeed}
            onTogglePlay={handleTogglePlay}
            onStop={handleStop}
            onReset={handleReset}
            onStepForward={handleStepForward}
            onChangeSpeed={setPlaybackSpeed}
            onLoadPrototypeSequence={handleLoadPrototype}
            onVideoSelected={handleVideoSelected}
          />

          {/* Tracking Detection Preprocessor Card */}
          <TrackingPreprocessorCard
            rawCount={preprocessorStats.rawCount}
            preprocessedCount={preprocessorStats.preprocessedCount}
            suppressedCount={preprocessorStats.suppressedCount}
            iouThreshold={0.90}
          />
        </div>

        {/* Right Column: Viewport (Video + Trailing Paths) & Track Registry Table */}
        <div className="tracking-right-col">
          {/* Main Optical Tracking Viewport */}
          <TrackingViewport
            currentFrameIndex={currentFrameIndex}
            totalFrames={totalFrames}
            activeTracks={activeTracks}
            hoveredTrackId={hoveredTrackId}
            onHoverTrack={setHoveredTrackId}
            resolution={videoMeta.resolution}
            backgroundImage="/sample_road.png"
          />

          {/* Persistent Object Track Registry Table */}
          <TrackTable
            tracks={allRegisteredTracks}
            hoveredTrackId={hoveredTrackId}
            onHoverTrack={setHoveredTrackId}
            currentFrame={currentFrameIndex}
            totalFrames={totalFrames}
          />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
