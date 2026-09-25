/**
 * INDRA-Drive Tracking Detection Preprocessor
 * 
 * Purpose:
 * The RT-DETRv2 detector can output multiple class hypotheses for a single physical object
 * at lower confidence thresholds (e.g. Truck, Mini-bus, and Tempo-traveller on the exact same box).
 * 
 * This preprocessor clusters detections with IoU >= 0.90, selects the highest-confidence
 * semantic hypothesis as the primary candidate for ByteTrack, while strictly preserving the
 * complete raw prediction set separately for auditability and transparency.
 */

/**
 * Computes Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]
 */
export function computeIoU(boxA, boxB) {
  const [ax1, ay1, ax2, ay2] = boxA;
  const [bx1, by1, bx2, by2] = boxB;

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interWidth = Math.max(0, interX2 - interX1);
  const interHeight = Math.max(0, interY2 - interY1);
  const interArea = interWidth * interHeight;

  const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
  const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);

  const unionArea = areaA + areaB - interArea;
  if (unionArea <= 0) return 0;

  return interArea / unionArea;
}

/**
 * Preprocesses raw detections before passing to ByteTrack
 * @param {Array} rawDetections - Array of detections: { class_id, class_name, confidence, box: [x1, y1, x2, y2] }
 * @param {number} iouThreshold - IoU grouping threshold (default 0.90)
 * @returns {Object} {
 *   trackerInputs: Array,       // Highest-confidence detection per cluster (fed to ByteTrack)
 *   rawPredictions: Array,      // Complete original set preserved untouched
 *   clusters: Array,            // Grouped clusters showing competing hypotheses
 *   suppressedCount: number     // Number of secondary hypotheses filtered out
 * }
 */
export function preprocessDetectionsForTracking(rawDetections = [], iouThreshold = 0.90) {
  if (!rawDetections || rawDetections.length === 0) {
    return {
      trackerInputs: [],
      rawPredictions: [],
      clusters: [],
      suppressedCount: 0,
    };
  }

  // Preserve complete raw set
  const rawPredictions = [...rawDetections];

  // Cluster detections based on IoU >= iouThreshold
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < rawDetections.length; i++) {
    if (assigned.has(i)) continue;

    const currentCluster = [rawDetections[i]];
    assigned.add(i);

    for (let j = i + 1; j < rawDetections.length; j++) {
      if (assigned.has(j)) continue;

      const iou = computeIoU(rawDetections[i].box, rawDetections[j].box);
      if (iou >= iouThreshold) {
        currentCluster.push(rawDetections[j]);
        assigned.add(j);
      }
    }

    clusters.push(currentCluster);
  }

  // For each cluster, pick the hypothesis with highest confidence for tracking input
  const trackerInputs = [];
  let suppressedCount = 0;

  clusters.forEach((cluster, clusterIndex) => {
    // Sort descending by confidence
    cluster.sort((a, b) => b.confidence - a.confidence);

    const winner = {
      ...cluster[0],
      clusterId: `roi-cluster-${clusterIndex + 1}`,
      competingHypotheses: cluster.slice(1),
    };

    trackerInputs.push(winner);

    if (cluster.length > 1) {
      suppressedCount += cluster.length - 1;
    }
  });

  return {
    trackerInputs,
    rawPredictions,
    clusters,
    suppressedCount,
  };
}
