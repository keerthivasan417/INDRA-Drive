/**
 * INDRA-Drive ByteTrack Tracker Engine
 * 
 * Implements the ByteTrack multi-object tracking algorithm:
 * - Kalman Filter for motion prediction (state: [cx, cy, a, h, vcx, vcy, va, vh])
 * - Two-stage data association (high-confidence matching + low-confidence recovery)
 * - Persistent Track IDs (never recycled)
 * - Spatiotemporal trajectory history recording for LSTM trajectory forecasting
 */

import { computeIoU, preprocessDetectionsForTracking } from "./iouPreprocessor.js";

export const TrackState = {
  New: "NEW",
  Tracked: "TRACKED",
  Lost: "LOST",
  Removed: "REMOVED",
};

/**
 * 2D Kalman Filter for constant-velocity bounding box tracking
 */
class KalmanBoxTracker {
  constructor(bbox) {
    // bbox: [x1, y1, x2, y2]
    const [x1, y1, x2, y2] = bbox;
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    const cx = x1 + w / 2;
    const cy = y1 + h / 2;
    const a = w / h;

    // State vector: [cx, cy, a, h, vcx, vcy, va, vh]
    this.x = [cx, cy, a, h, 0, 0, 0, 0];

    // State covariance
    this.P = [
      10, 10, 10, 10,
      1000, 1000, 1000, 1000
    ];
  }

  predict() {
    // Constant velocity model: pos += vel
    this.x[0] += this.x[4];
    this.x[1] += this.x[5];
    this.x[2] += this.x[6];
    this.x[3] += this.x[7];

    // Prevent non-positive aspect ratio or height
    this.x[2] = Math.max(0.1, this.x[2]);
    this.x[3] = Math.max(1, this.x[3]);

    // Increase covariance with process noise
    for (let i = 0; i < 4; i++) {
      this.P[i] += 1.0;
      this.P[i + 4] += 5.0;
    }

    return this.getBBox();
  }

  update(bbox) {
    const [x1, y1, x2, y2] = bbox;
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    const cx = x1 + w / 2;
    const cy = y1 + h / 2;
    const a = w / h;

    const z = [cx, cy, a, h];

    // Measurement update with simple steady-state Kalman gain
    const K_pos = 0.75;
    const K_vel = 0.40;

    for (let i = 0; i < 4; i++) {
      const innovation = z[i] - this.x[i];
      this.x[i] += K_pos * innovation;
      this.x[i + 4] += K_vel * innovation;
    }

    this.x[2] = Math.max(0.1, this.x[2]);
    this.x[3] = Math.max(1, this.x[3]);

    return this.getBBox();
  }

  getBBox() {
    const cx = this.x[0];
    const cy = this.x[1];
    const a = Math.max(0.1, this.x[2]);
    const h = Math.max(1, this.x[3]);
    const w = a * h;

    return [
      Math.round(cx - w / 2),
      Math.round(cy - h / 2),
      Math.round(cx + w / 2),
      Math.round(cy + h / 2),
    ];
  }
}

/**
 * Single Object Track
 */
export class STrack {
  static nextTrackId = 1;

  constructor(detection, frameId) {
    this.trackId = STrack.nextTrackId++;
    this.className = detection.class_name;
    this.classId = detection.class_id;
    this.confidence = detection.confidence;
    this.box = [...detection.box];

    this.state = TrackState.New;
    this.isActivated = false;
    this.startFrame = frameId;
    this.frameId = frameId;
    this.timeSinceUpdate = 0;
    this.observedFrames = new Set([frameId]);
    this.observationCount = 1;

    // Kalman Filter instance
    this.kalman = new KalmanBoxTracker(this.box);

    // Trajectory history for path trailing visualization
    const [x1, _y1, x2, y2] = this.box;
    this.history = [
      {
        frameId,
        x: Math.round((x1 + x2) / 2),
        y: Math.round(y2), // Ground contact point for vehicles
        box: [...this.box],
      },
    ];
  }

  predict() {
    this.box = this.kalman.predict();
  }

  update(detection, frameId) {
    this.frameId = frameId;
    this.timeSinceUpdate = 0;
    if (!this.observedFrames) {
      this.observedFrames = new Set([this.startFrame]);
    }
    this.observedFrames.add(frameId);
    this.observationCount = this.observedFrames.size;
    this.confidence = detection.confidence;
    this.className = detection.class_name; // Maintain or refine semantic class
    this.box = this.kalman.update(detection.box);
    this.state = TrackState.Tracked;
    this.isActivated = true;

    // Append to trajectory history (keep up to 30 past steps)
    const [x1, _y1, x2, y2] = this.box;
    this.history.push({
      frameId,
      x: Math.round((x1 + x2) / 2),
      y: Math.round(y2),
      box: [...this.box],
    });

    if (this.history.length > 30) {
      this.history.shift();
    }
  }

  markLost() {
    this.state = TrackState.Lost;
  }

  markRemoved() {
    this.state = TrackState.Removed;
  }

  // Calculate pixel velocity between recent positions
  getVelocity() {
    if (this.history.length < 2) return { vx: 0, vy: 0, speed: 0 };
    const p1 = this.history[this.history.length - 2];
    const p2 = this.history[this.history.length - 1];
    const dt = Math.max(1, p2.frameId - p1.frameId);
    const vx = (p2.x - p1.x) / dt;
    const vy = (p2.y - p1.y) / dt;
    const speed = Math.round(Math.sqrt(vx * vx + vy * vy) * 10) / 10;
    return { vx, vy, speed };
  }
}

/**
 * ByteTrack Tracker Manager
 */
export class BYTETracker {
  constructor({
    highThreshold = 0.06,
    lowThreshold = 0.03,
    matchThreshold = 0.40,
    maxLostFrames = 15,
  } = {}) {
    this.highThreshold = highThreshold;
    this.lowThreshold = lowThreshold;
    this.matchThreshold = matchThreshold;
    this.maxLostFrames = maxLostFrames;

    this.trackedTracks = []; // Active tracks
    this.lostTracks = [];    // Temporarily lost tracks
    this.removedTracks = []; // Removed tracks
    this.frameId = 0;
  }

  reset() {
    this.trackedTracks = [];
    this.lostTracks = [];
    this.removedTracks = [];
    this.frameId = 0;
    STrack.nextTrackId = 1;
  }

  /**
   * Updates tracker with detections for the current frame
   * @param {Array} detections - Preprocessed detections
   * @param {number|null} frameId - Explicit frame sequence index (single source of truth)
   * @returns {Array<STrack>} Currently active tracks for display
   */
  update(detections = [], frameId = null) {
    if (frameId !== null && frameId !== undefined) {
      this.frameId = frameId;
    } else {
      this.frameId++;
    }

    // 1. Predict all current tracks forward
    const activePool = [...this.trackedTracks, ...this.lostTracks];
    activePool.forEach((t) => t.predict());

    // 2. Partition detections into high and low confidence tiers
    const highDetections = [];
    const lowDetections = [];

    detections.forEach((det) => {
      if (det.confidence >= this.highThreshold) {
        highDetections.push(det);
      } else if (det.confidence >= this.lowThreshold) {
        lowDetections.push(det);
      }
    });

    // 3. First Association: Match High Confidence Detections with Tracked Tracks
    const {
      matches: matches1,
      unmatchedTracks: unmatchedTracks1,
      unmatchedDetections: unmatchedDetections1,
    } = this.associate(this.trackedTracks, highDetections, this.matchThreshold);

    // Update matched tracks
    matches1.forEach(([track, det]) => {
      track.update(det, this.frameId);
    });

    // 4. Second Association: Match Low Confidence Detections with Remaining Tracked Tracks
    const remainingTracked = unmatchedTracks1;
    const {
      matches: matches2,
      unmatchedTracks: unmatchedTracks2,
    } = this.associate(remainingTracked, lowDetections, 0.35);

    // Update tracks matched with low confidence detections (occlusion recovery)
    matches2.forEach(([track, det]) => {
      track.update(det, this.frameId);
    });

    // 5. Manage lost and new tracks
    // Unmatched tracks after second association become Lost
    unmatchedTracks2.forEach((track) => {
      track.timeSinceUpdate++;
      if (track.timeSinceUpdate > this.maxLostFrames) {
        track.markRemoved();
        this.removedTracks.push(track);
      } else {
        track.markLost();
      }
    });

    // Try associating lost tracks with remaining high-confidence detections
    const {
      matches: matchesLost,
      unmatchedDetections: remainingNewDets,
    } = this.associate(this.lostTracks, unmatchedDetections1, 0.45);

    matchesLost.forEach(([track, det]) => {
      track.update(det, this.frameId);
    });

    // Initialize new tracks from unmatched high-confidence detections
    const newTracks = [];
    remainingNewDets.forEach((det) => {
      const track = new STrack(det, this.frameId);
      track.state = TrackState.Tracked;
      track.isActivated = true;
      newTracks.push(track);
    });

    // 6. Update internal track pools
    this.trackedTracks = [
      ...matches1.map(([t]) => t),
      ...matches2.map(([t]) => t),
      ...matchesLost.map(([t]) => t),
      ...newTracks,
    ];

    this.lostTracks = [
      ...unmatchedTracks2.filter((t) => t.state === TrackState.Lost),
      ...this.lostTracks.filter(
        (t) =>
          !matchesLost.some(([matched]) => matched === t) &&
          t.timeSinceUpdate <= this.maxLostFrames
      ),
    ];

    // Filter out removed tracks
    this.trackedTracks = this.trackedTracks.filter((t) => t.state === TrackState.Tracked);

    return this.trackedTracks;
  }

  /**
   * Associates tracks with detections using IoU distance and greedy bipartite matching
   */
  associate(tracks, detections, threshold) {
    if (tracks.length === 0 || detections.length === 0) {
      return {
        matches: [],
        unmatchedTracks: tracks,
        unmatchedDetections: detections,
      };
    }

    // Build IoU matrix: iouMatrix[t][d]
    const iouMatrix = [];
    for (let t = 0; t < tracks.length; t++) {
      iouMatrix[t] = [];
      for (let d = 0; d < detections.length; d++) {
        iouMatrix[t][d] = computeIoU(tracks[t].box, detections[d].box);
      }
    }

    // Greedy matching for bipartite assignment
    const matches = [];
    const matchedTracks = new Set();
    const matchedDetections = new Set();

    // Create sorted list of all pairs by descending IoU
    const pairs = [];
    for (let t = 0; t < tracks.length; t++) {
      for (let d = 0; d < detections.length; d++) {
        if (iouMatrix[t][d] >= threshold) {
          pairs.push({ t, d, iou: iouMatrix[t][d] });
        }
      }
    }

    pairs.sort((a, b) => b.iou - a.iou);

    pairs.forEach(({ t, d }) => {
      if (!matchedTracks.has(t) && !matchedDetections.has(d)) {
        matchedTracks.add(t);
        matchedDetections.add(d);
        matches.push([tracks[t], detections[d]]);
      }
    });

    const unmatchedTracks = tracks.filter((_, idx) => !matchedTracks.has(idx));
    const unmatchedDetections = detections.filter((_, idx) => !matchedDetections.has(idx));

    return { matches, unmatchedTracks, unmatchedDetections };
  }
}

/**
 * Evaluates the tracking sequence deterministically up to targetFrame.
 * Runs sequential Kalman state estimation and 2-tier ByteTrack association
 * from frame 1 up to targetFrame.
 *
 * Guarantees:
 * - Deterministic, reproducible track states
 * - Persistent Track IDs (never ballooning or recycling within evaluated range)
 * - currentFrame / lastSeenFrame <= targetFrame
 * - observationCount <= targetFrame and <= frames since track creation
 *
 * @param {number} targetFrame - Target frame to evaluate up to (1-indexed)
 * @param {Array} frames - Sequence frames array
 * @param {Object} options - Tracker parameters
 * @returns {{ tracker: BYTETracker, activeTracks: Array<STrack>, allRegisteredTracks: Array<STrack>, stats: Object }}
 */
export function evaluateSequenceUpToFrame(
  targetFrame,
  frames = [],
  { highThreshold = 0.06, lowThreshold = 0.03, matchThreshold = 0.40, iouSuppression = 0.90 } = {}
) {
  STrack.nextTrackId = 1;
  const tracker = new BYTETracker({ highThreshold, lowThreshold, matchThreshold });
  const allTracksMap = new Map();
  let currentActive = [];
  let currentStats = { rawCount: 0, preprocessedCount: 0, suppressedCount: 0 };

  const total = frames.length;
  const clampedFrame = Math.max(1, Math.min(targetFrame, total));

  for (let f = 1; f <= clampedFrame; f++) {
    const frameData = frames.find((item) => item.frameIndex === f) || frames[f - 1] || frames[0];
    const rawDets = frameData?.rawDetections || [];
    const { trackerInputs, rawPredictions, suppressedCount } = preprocessDetectionsForTracking(
      rawDets,
      iouSuppression
    );

    if (f === clampedFrame) {
      currentStats = {
        rawCount: rawPredictions.length,
        preprocessedCount: trackerInputs.length,
        suppressedCount,
      };
    }

    currentActive = tracker.update(trackerInputs, f);
    currentActive.forEach((t) => allTracksMap.set(t.trackId, t));
  }

  return {
    tracker,
    activeTracks: [...currentActive],
    allRegisteredTracks: Array.from(allTracksMap.values()).sort((a, b) => a.trackId - b.trackId),
    stats: currentStats,
  };
}
