import React, { useRef, useState } from "react";
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function VideoUploadControl({
  videoMetadata,
  isPlaying,
  currentFrame,
  totalFrames,
  playbackSpeed,
  onTogglePlay,
  onReset,
  onStepForward,
  onChangeSpeed,
  onLoadPrototypeSequence,
  onVideoSelected,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      onVideoSelected(files[0]);
    }
  };

  return (
    <div className="video-control-card">
      <div className="video-control-header">
        <div className="header-left-title">
          <Film size={16} className="film-icon" aria-hidden="true" focusable="false" />
          <span className="control-title">VIDEO INGESTION & TRACKING CONTROLS</span>
        </div>
        <span className="control-badge">ByteTrack Sequential Engine</span>
      </div>

      {/* Video Ingestion Area */}
      <div
        className={`video-dropzone ${isDragOver ? "drag-over" : ""}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="video/mp4,video/webm,video/avi,image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onVideoSelected(e.target.files[0]);
            }
          }}
        />

        <div className="dropzone-inner-row">
          <div className="video-meta-badge">
            <Film size={22} className="meta-icon" aria-hidden="true" focusable="false" />
          </div>
          <div className="video-meta-info">
            <div className="video-filename" title={videoMetadata.filename}>
              {videoMetadata.filename}
            </div>
            <div className="video-meta-pills">
              <span className="meta-pill pill-cyan">
                {videoMetadata.resolution.width} × {videoMetadata.resolution.height}
              </span>
              <span className="meta-pill pill-subtle">
                {videoMetadata.fps} FPS
              </span>
              <span className="meta-pill pill-green">
                <CheckCircle2 size={11} aria-hidden="true" focusable="false" />
                {totalFrames} Frames Buffered
              </span>
            </div>
          </div>

          <button
            type="button"
            className="prototype-load-btn"
            onClick={(e) => {
              e.stopPropagation();
              onLoadPrototypeSequence();
            }}
            title="Load calibrated Indian road prototype driving video sequence"
          >
            <Sparkles size={13} aria-hidden="true" focusable="false" />
            <span>Load Prototype Demo Sequence</span>
          </button>
        </div>
      </div>

      {/* Primary Tracking Playback Control Bar */}
      <div className="playback-controls-bar">
        {/* Play/Pause Button */}
        <button
          type="button"
          className={`btn-play-pause ${isPlaying ? "playing" : ""}`}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <>
              <Pause size={15} aria-hidden="true" focusable="false" />
              <span>PAUSE TRACKING</span>
            </>
          ) : (
            <>
              <Play size={15} aria-hidden="true" focusable="false" />
              <span>{currentFrame >= totalFrames ? "REPLAY TRACKING" : "START TRACKING"}</span>
            </>
          )}
        </button>

        {/* Step Forward */}
        <button
          type="button"
          className="btn-control-ghost"
          onClick={onStepForward}
          disabled={isPlaying || currentFrame >= totalFrames}
          title="Advance 1 frame"
        >
          <SkipForward size={14} aria-hidden="true" focusable="false" />
          <span>Step</span>
        </button>

        {/* Reset */}
        <button
          type="button"
          className="btn-control-ghost"
          onClick={onReset}
          title="Reset tracker to frame 1"
        >
          <RotateCcw size={14} aria-hidden="true" focusable="false" />
          <span>Reset</span>
        </button>

        {/* Speed Selector */}
        <div className="speed-toggle-group">
          {[0.5, 1.0, 2.0].map((spd) => (
            <button
              key={spd}
              type="button"
              className={`speed-pill ${playbackSpeed === spd ? "active" : ""}`}
              onClick={() => onChangeSpeed(spd)}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
