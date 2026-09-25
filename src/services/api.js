/**
 * INDRA-Drive API Service
 * Handles communication with the FastAPI backend.
 * Endpoints:
 *   GET  /health  - Model & hardware telemetry
 *   POST /predict - RT-DETRv2 inference on uploaded image
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Fetch backend and model health telemetry
 * @returns {Promise<Object>}
 */
export async function getBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Health check error:", error);
    throw new Error(
      error.message.includes("Failed to fetch")
        ? "Cannot connect to INDRA-Drive backend at http://127.0.0.1:8000. Please verify the FastAPI server is active."
        : error.message
    );
  }
}

/**
 * Submit an image to RT-DETRv2 /predict endpoint
 * @param {File|Blob} imageFile - The image file to run perception on
 * @returns {Promise<{
 *   filename: string,
 *   image_width: number,
 *   image_height: number,
 *   detection_count: number,
 *   detections: Array<{
 *     class_id: number,
 *     class_name: string,
 *     confidence: number,
 *     box: [number, number, number, number]
 *   }>
 * }>}
 */
export async function runPerceptionPredict(imageFile) {
  if (!imageFile) {
    throw new Error("No image file provided for inference.");
  }

  const formData = new FormData();
  // The FastAPI endpoint expects field name "file"
  formData.append("file", imageFile, imageFile.name || "input_frame.png");

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(`Inference request failed (${response.status}): ${errorDetail || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Prediction API error:", error);
    if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
      throw new Error(
        "Network connection refused. Please ensure the backend is running at http://127.0.0.1:8000."
      );
    }
    throw error;
  }
}

/**
 * Submit historical trajectory coordinates to TrajectoryLSTM /predict-trajectory endpoint
 * @param {number} trackId - Persistent track ID
 * @param {Array<[number, number]>} positions - Exactly 8 [x, y] normalized coordinate pairs
 * @returns {Promise<{
 *   track_id: number,
 *   input_frames: number,
 *   prediction_frames: number,
 *   device: string,
 *   predicted_positions: Array<[number, number]>
 * }>}
 */
export async function runTrajectoryPrediction(trackId, positions) {
  if (!positions || !Array.isArray(positions)) {
    throw new Error("Trajectory prediction requires an array of 8 historical coordinate frames.");
  }
  if (positions.length !== 8) {
    throw new Error(`Trajectory prediction requires exactly 8 historical frames, received ${positions.length}.`);
  }
  for (let i = 0; i < positions.length; i++) {
    const pt = positions[i];
    if (!Array.isArray(pt) || pt.length !== 2) {
      throw new Error(`Frame ${i + 1} must contain exactly 2 coordinates [x, y].`);
    }
    const [x, y] = pt;
    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
      throw new Error(`Frame ${i + 1} coordinates must be valid numbers.`);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/predict-trajectory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        track_id: Number(trackId) || 1,
        positions: positions.map(([x, y]) => [Number(x), Number(y)]),
      }),
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorJson = await response.json();
        errorDetail = Array.isArray(errorJson.detail)
          ? errorJson.detail.map((e) => e.msg || e).join("; ")
          : (errorJson.detail || JSON.stringify(errorJson));
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(`Trajectory API error (${response.status}): ${errorDetail || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Trajectory prediction error:", error);
    if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
      throw new Error(
        "Network connection refused. Please ensure the backend is running at http://127.0.0.1:8000."
      );
    }
    throw error;
  }
}
