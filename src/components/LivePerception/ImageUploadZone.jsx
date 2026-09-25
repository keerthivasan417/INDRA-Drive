import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileImage,
  Trash2,
  Play,
  Loader2,
  AlertCircle,
  Sparkles,
  Maximize2,
  CheckCircle,
} from "lucide-react";

export default function ImageUploadZone({
  selectedFile,
  imageDimensions,
  isLoading,
  onImageSelected,
  onClearImage,
  onRunPerception,
  onLoadSample,
  errorMessage,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleFile = (file) => {
    setValidationError(null);
    if (!file) return;

    // Check file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp)$/i)) {
      setValidationError("Unsupported file type. Please upload a valid JPEG, PNG, WEBP, or BMP image.");
      return;
    }

    // Read image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      onImageSelected(file, {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2),
        sizeBytes: file.size,
        previewUrl: objectUrl,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setValidationError("Failed to decode image file. Please choose another valid image.");
    };

    img.src = objectUrl;
  };

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
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="indra-upload-card">
      <div className="upload-card-header">
        <div className="upload-header-left">
          <FileImage size={16} className="upload-card-icon" />
          <span className="upload-card-title">INPUT FRAME INGESTION</span>
        </div>
        <span className="upload-engine-badge">RT-DETRv2 • Epoch 12</span>
      </div>

      {/* Drop Zone Area */}
      <div
        className={`upload-dropzone ${isDragOver ? "drag-active" : ""} ${
          selectedFile ? "has-file" : ""
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/webp,image/bmp"
          className="hidden-file-input"
          style={{ display: "none" }}
        />

        {!selectedFile ? (
          <div className="dropzone-empty-content">
            <div className="dropzone-icon-circle">
              <UploadCloud size={32} className="cloud-icon" />
            </div>
            <div className="dropzone-text-group">
              <div className="dropzone-main-text">
                Drop road scene frame here or{" "}
                <button
                  type="button"
                  className="browse-link-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse
                </button>
              </div>
              <div className="dropzone-sub-text">
                Supports high-res PNG, JPG, WEBP • Auto-normalized for UVH-26
              </div>
            </div>

            {/* Quick Sample Button */}
            <div className="dropzone-quick-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="load-sample-btn"
                onClick={onLoadSample}
                disabled={isLoading}
              >
                <Sparkles size={14} className="sample-btn-icon" />
                <span>Load Test Image (970644.png)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="dropzone-file-selected" onClick={(e) => e.stopPropagation()}>
            <div className="file-info-preview-row">
              <div className="file-icon-badge">
                <FileImage size={22} className="file-badge-icon" />
              </div>
              <div className="file-details">
                <div className="file-name" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="file-meta-pills">
                  {imageDimensions && (
                    <span className="file-pill pill-cyan">
                      <Maximize2 size={11} />
                      {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  )}
                  {imageDimensions?.sizeBytes && (
                    <span className="file-pill pill-subtle">
                      {formatFileSize(imageDimensions.sizeBytes)}
                    </span>
                  )}
                  <span className="file-pill pill-green">
                    <CheckCircle size={11} /> Buffered Ready
                  </span>
                </div>
              </div>

              {/* Reset/Clear Button */}
              <button
                type="button"
                className="clear-file-btn"
                onClick={onClearImage}
                disabled={isLoading}
                title="Clear selected image and reset view"
              >
                <Trash2 size={16} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation or Error Message */}
      {(validationError || errorMessage) && (
        <div className="upload-error-pill">
          <AlertCircle size={14} className="err-pill-icon" />
          <span>{validationError || errorMessage}</span>
        </div>
      )}

      {/* Run Perception Control Bar */}
      <div className="upload-action-row">
        <button
          type="button"
          className={`run-perception-btn ${isLoading ? "loading" : ""}`}
          onClick={onRunPerception}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={17} className="btn-spinner" />
              <span>INFERENCING RT-DETRv2 MODEL...</span>
            </>
          ) : (
            <>
              <Play size={16} className="btn-play-icon" />
              <span>RUN PERCEPTION</span>
            </>
          )}
        </button>

        {selectedFile && !isLoading && (
          <button
            type="button"
            className="change-image-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Change Image
          </button>
        )}
      </div>
    </div>
  );
}
