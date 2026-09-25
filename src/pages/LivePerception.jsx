import React, { useState, useEffect } from "react";
import {
  Camera,
  ArrowLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import ImageUploadZone from "../components/LivePerception/ImageUploadZone";
import BoundingBoxOverlay from "../components/LivePerception/BoundingBoxOverlay";
import DetectionResultsPanel from "../components/LivePerception/DetectionResultsPanel";
import PerceptionTelemetry from "../components/LivePerception/PerceptionTelemetry";
import Footer from "../components/Footer";
import { getBackendHealth, runPerceptionPredict } from "../services/api";
import { useIndraRuntime } from "../context/IndraRuntimeContext";
import "./LivePerception.css";

export default function LivePerception({ onReturnOverview }) {
  const { perception: runtimePerception, updatePerceptionResult } = useIndraRuntime();

  // Perception state (initialized from runtime context if previous result exists)
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageMeta, setImageMeta] = useState(() => {
    if (runtimePerception.hasData) {
      return {
        width: runtimePerception.imageWidth,
        height: runtimePerception.imageHeight,
        aspectRatio: (runtimePerception.imageWidth / runtimePerception.imageHeight).toFixed(2),
        sizeBytes: null,
        previewUrl: runtimePerception.previewUrl,
      };
    }
    return null;
  });
  const [previewUrl, setPreviewUrl] = useState(() => runtimePerception.previewUrl || null);

  // Status: "READY" | "PROCESSING" | "COMPLETE" | "ERROR"
  const [status, setStatus] = useState(() => runtimePerception.hasData ? "COMPLETE" : "READY");
  const [errorMessage, setErrorMessage] = useState(null);
  const [inferenceTimeMs, setInferenceTimeMs] = useState(() => runtimePerception.inferenceTimeMs);
  const [detectionResult, setDetectionResult] = useState(() => {
    if (runtimePerception.hasData) {
      return {
        filename: runtimePerception.filename,
        image_width: runtimePerception.imageWidth,
        image_height: runtimePerception.imageHeight,
        detection_count: runtimePerception.detectionCount,
        detections: runtimePerception.detections,
      };
    }
    return null;
  });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Health and model telemetry from backend
  const [healthData, setHealthData] = useState(null);

  // Fetch backend health on mount
  useEffect(() => {
    let isMounted = true;
    async function loadHealth() {
      try {
        const data = await getBackendHealth();
        if (isMounted) {
          setHealthData(data);
        }
      } catch (err) {
        console.warn("Could not load backend health telemetries:", err.message);
        // Fallback defaults to specification values if health check fails
        if (isMounted) {
          setHealthData({
            status: "offline",
            model: "RT-DETRv2 R18",
            checkpoint: "epoch12",
            num_classes: 14,
            device: "cpu",
            gpu: "CPU",
          });
        }
      }
    }
    loadHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle image selected via browse or drag-and-drop
  const handleImageSelected = (file, meta) => {
    // Revoke previous URL if any
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setImageMeta(meta);
    setPreviewUrl(meta.previewUrl);
    setDetectionResult(null);
    setErrorMessage(null);
    setStatus("READY");
    setInferenceTimeMs(null);
  };

  // Clear/Reset current image and inference
  const handleClearImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setImageMeta(null);
    setPreviewUrl(null);
    setDetectionResult(null);
    setErrorMessage(null);
    setStatus("READY");
    setInferenceTimeMs(null);
    setHoveredIndex(null);
  };

  // Quick load sample image (970644.png from public)
  const handleLoadSample = async () => {
    try {
      setStatus("READY");
      setErrorMessage(null);
      const res = await fetch("/sample_road.png");
      if (!res.ok) {
        throw new Error("Sample test image not found in public assets.");
      }
      const blob = await res.blob();
      const file = new File([blob], "970644.png", { type: "image/png" });

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        handleImageSelected(file, {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
          sizeBytes: file.size,
          previewUrl: objectUrl,
        });
      };
      img.src = objectUrl;
    } catch (err) {
      setErrorMessage(`Could not load sample image: ${err.message}`);
      setStatus("ERROR");
    }
  };

  // Run Perception button action
  const handleRunPerception = async () => {
    if (!selectedFile) {
      setStatus("ERROR");
      setErrorMessage("No image selected. Please drop or browse an image first.");
      return;
    }

    setStatus("PROCESSING");
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const result = await runPerceptionPredict(selectedFile);
      const endTime = performance.now();
      const elapsedMs = Math.round(endTime - startTime);

      setInferenceTimeMs(elapsedMs);
      setDetectionResult(result);
      setStatus("COMPLETE");

      // Save to shared runtime context for dynamic Overview telemetry
      updatePerceptionResult({
        filename: result.filename || selectedFile.name,
        image_width: result.image_width,
        image_height: result.image_height,
        detection_count: result.detection_count,
        detections: result.detections,
        previewUrl: previewUrl || imageMeta?.previewUrl || null,
        inferenceTimeMs: elapsedMs,
      });
    } catch (error) {
      console.error("Perception inference failed:", error);
      setStatus("ERROR");
      setErrorMessage(error.message || "Perception inference failed. Check backend connection.");
    }
  };

  const detections = detectionResult?.detections || [];
  const imageWidth = detectionResult?.image_width || imageMeta?.width || 1920;
  const imageHeight = detectionResult?.image_height || imageMeta?.height || 1080;
  const currentFilename = detectionResult?.filename || selectedFile?.name || "frame.png";

  return (
    <div className="live-perception-page">
      {/* Perception Page Top Banner */}
      <div className="perception-page-header">
        <div className="header-breadcrumbs">
          <button
            type="button"
            className="breadcrumb-back-btn"
            onClick={onReturnOverview}
          >
            <ArrowLeft size={14} />
            <span>Overview</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Live Perception</span>
        </div>

        <div className="header-headline-row">
          <div className="headline-text-group">
            <div className="perception-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>RT-DETRv2 • MONOCULAR VISION TRANSFORMER</span>
              <span className="eyebrow-pill">UVH-26 TAXONOMY</span>
            </div>
            <h1 className="perception-title">
              Real-Time Road Perception & Object Detection
            </h1>
            <p className="perception-subtitle">
              Interactive live inference pipeline executing RT-DETRv2 fine-tuned on unstructured Indian road environments. Ingest raw camera frames to detect heterogeneous traffic entities with pixel-calibrated bounding boxes.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="action-ghost-btn"
              onClick={handleClearImage}
              title="Reset perception interface"
            >
              <RefreshCw size={14} />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="perception-workstation-grid">
        {/* Left Column: Telemetry & Ingestion Controls */}
        <div className="workstation-left-col">
          {/* Perception Telemetry Card (Model, Checkpoint, Classes, Device, GPU, Threshold, Status) */}
          <PerceptionTelemetry
            status={status}
            inferenceTimeMs={inferenceTimeMs}
            detectionCount={detections.length}
            healthData={healthData}
            errorMessage={errorMessage}
          />

          {/* Premium Image Upload Area (Drag & Drop, Browse, Metadata, Clear, Run Button) */}
          <ImageUploadZone
            selectedFile={selectedFile}
            imageDimensions={imageMeta}
            isLoading={status === "PROCESSING"}
            onImageSelected={handleImageSelected}
            onClearImage={handleClearImage}
            onRunPerception={handleRunPerception}
            onLoadSample={handleLoadSample}
            errorMessage={errorMessage}
          />
        </div>

        {/* Right Column: Viewport (Image + Bounding Box Overlay) & Detection Results Matrix */}
        <div className="workstation-right-col">
          {previewUrl ? (
            <BoundingBoxOverlay
              imageUrl={previewUrl}
              originalWidth={imageWidth}
              originalHeight={imageHeight}
              detections={detections}
              hoveredIndex={hoveredIndex}
              onHoverDetection={setHoveredIndex}
              filename={currentFilename}
            />
          ) : (
            <div className="perception-standby-viewport">
              <div className="standby-reticle-box">
                <Camera size={44} className="standby-cam-icon" />
                <div className="standby-title">Awaiting Monocular Feed Frame</div>
                <div className="standby-desc">
                  Drag & drop an image or click <strong>Load Test Image</strong> to activate the RT-DETRv2 optical pipeline.
                </div>
                <button
                  type="button"
                  className="standby-sample-btn"
                  onClick={handleLoadSample}
                >
                  <Sparkles size={14} />
                  <span>Load Sample Test Frame (970644.png)</span>
                </button>
              </div>
            </div>
          )}

          {/* Detection Results Matrix Panel */}
          <DetectionResultsPanel
            detections={detections}
            hoveredIndex={hoveredIndex}
            onHoverDetection={setHoveredIndex}
            hasInferred={status === "COMPLETE"}
            isLoading={status === "PROCESSING"}
          />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
