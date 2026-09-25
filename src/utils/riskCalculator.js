/**
 * INDRA-Drive Interaction Risk & TTC Calculator
 * 
 * Computes pairwise interaction risk, minimum predicted separation,
 * and prototype image-space Time-To-Collision (TTC) heuristics from
 * multi-agent LSTM predicted trajectories.
 * 
 * DATA HONESTY SPECIFICATION:
 * All trajectories are in normalized image space (x_norm = x/W, y_norm = y/H).
 * These calculations are prototype image-space heuristics, NOT calibrated
 * physical collision probabilities or real-world metric distances.
 */

export const RiskLevel = {
  CRITICAL: "CRITICAL", // TTC < 0.5 s
  HIGH: "HIGH",         // TTC < 1.0 s
  MEDIUM: "MEDIUM",     // TTC < 2.0 s
  LOW: "LOW",           // Otherwise / Diverging
};

export const PROTOTYPE_RISK_THRESHOLDS = {
  CRITICAL: 0.5,
  HIGH: 1.0,
  MEDIUM: 2.0,
  DISCLAIMER: "Engineering prototype thresholds — not validated safety limits.",
};

/**
 * Euclidean distance in 2D normalized image space
 */
export function euclideanDist(p1, p2) {
  if (!p1 || !p2) return 1.0;
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate pairwise interaction between two tracked objects
 * @param {Object} trackA - { trackId, className, positions }
 * @param {Array<[number, number]>} predA - 5 predicted [x, y] coordinates
 * @param {Object} trackB - { trackId, className, positions }
 * @param {Array<[number, number]>} predB - 5 predicted [x, y] coordinates
 * @param {number} dt - Frame duration in seconds (default ~0.0333 s for 30 FPS)
 */
export function calculatePairwiseInteraction(trackA, predA, trackB, predB, dt = 0.0333) {
  const posA = trackA.positions;
  const posB = trackB.positions;
  const t0A = posA[posA.length - 1];
  const t0B = posB[posB.length - 1];

  // 1. d0 is current-frame separation
  const d0 = euclideanDist(t0A, t0B);

  const horizon = Math.min(predA.length, predB.length);
  if (horizon === 0) {
    return {
      pairId: `${trackA.trackId}-${trackB.trackId}`,
      trackA,
      trackB,
      d0,
      minSeparation: d0,
      minStep: 0,
      stepDistances: [],
      converging: false,
      closureRate: 0,
      ttc: null,
      riskLevel: RiskLevel.LOW,
      status: "NO_PREDICTION",
      closestPointA: t0A,
      closestPointB: t0B,
    };
  }

  // 2. d_min is minimum separation across the 5 predicted steps
  const stepDistances = [];
  let minSeparation = Infinity;
  let minStep = 1;

  for (let k = 0; k < horizon; k++) {
    const d = euclideanDist(predA[k], predB[k]);
    stepDistances.push(d);
    if (d < minSeparation) {
      minSeparation = d;
      minStep = k + 1; // 1-indexed (T+1 to T+5)
    }
  }

  // 3. Convergence is correctly identified (predicted minimum separation closer than current d0)
  const converging = minSeparation < d0;
  const deltaD = d0 - minSeparation;
  const timeToMin = minStep * dt;
  const closureRate = converging ? deltaD / timeToMin : 0;

  // 4. Prototype Image-Space TTC heuristic
  let ttc = null;
  let riskLevel = RiskLevel.LOW;
  let status = "DIVERGING";

  if (converging) {
    if (closureRate > 0.001) {
      ttc = d0 / closureRate;
    } else {
      ttc = 9.99;
    }

    if (minSeparation < 0.08) {
      status = "INTERSECTING";
    } else {
      status = "CONVERGING";
    }

    // Engineering prototype risk thresholds:
    // <0.5 s = CRITICAL
    // <1.0 s = HIGH
    // <2.0 s = MEDIUM
    // otherwise = LOW
    if (ttc < PROTOTYPE_RISK_THRESHOLDS.CRITICAL) {
      riskLevel = RiskLevel.CRITICAL;
    } else if (ttc < PROTOTYPE_RISK_THRESHOLDS.HIGH) {
      riskLevel = RiskLevel.HIGH;
    } else if (ttc < PROTOTYPE_RISK_THRESHOLDS.MEDIUM) {
      riskLevel = RiskLevel.MEDIUM;
    } else {
      riskLevel = RiskLevel.LOW;
    }
  } else {
    // Check if parallel or diverging
    const lastD = stepDistances[stepDistances.length - 1];
    if (Math.abs(lastD - d0) < 0.01) {
      status = "PARALLEL";
    } else {
      status = "DIVERGING";
    }
    riskLevel = RiskLevel.LOW;
  }

  const closestPointA = minStep > 0 ? predA[minStep - 1] : t0A;
  const closestPointB = minStep > 0 ? predB[minStep - 1] : t0B;

  return {
    pairId: `${trackA.trackId}-${trackB.trackId}`,
    trackA,
    trackB,
    d0,
    minSeparation,
    minStep,
    stepDistances,
    converging,
    closureRate,
    ttc,
    riskLevel,
    status,
    closestPointA,
    closestPointB,
  };
}

/**
 * Compute interaction matrix across all active tracks
 */
export function computeAllInteractions(tracksList, predictionsMap, dt = 0.0333) {
  const interactions = [];

  for (let i = 0; i < tracksList.length; i++) {
    for (let j = i + 1; j < tracksList.length; j++) {
      const tA = tracksList[i];
      const tB = tracksList[j];
      const predA = predictionsMap[tA.trackId] || [];
      const predB = predictionsMap[tB.trackId] || [];

      const result = calculatePairwiseInteraction(tA, predA, tB, predB, dt);
      interactions.push(result);
    }
  }

  // Sort interactions by highest risk first (CRITICAL > HIGH > MEDIUM > LOW, then lowest TTC)
  const riskWeight = {
    [RiskLevel.CRITICAL]: 4,
    [RiskLevel.HIGH]: 3,
    [RiskLevel.MEDIUM]: 2,
    [RiskLevel.LOW]: 1,
  };

  interactions.sort((a, b) => {
    const diff = riskWeight[b.riskLevel] - riskWeight[a.riskLevel];
    if (diff !== 0) return diff;
    const ttcA = a.ttc !== null ? a.ttc : 999;
    const ttcB = b.ttc !== null ? b.ttc : 999;
    return ttcA - ttcB;
  });

  const highestRiskPair = interactions[0] || null;
  const overallRisk = highestRiskPair ? highestRiskPair.riskLevel : RiskLevel.LOW;

  return {
    interactions,
    highestRiskPair,
    overallRisk,
    totalObjects: tracksList.length,
    totalPairs: interactions.length,
  };
}
