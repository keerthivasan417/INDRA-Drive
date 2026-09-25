/**
 * INDRA-Drive Coordinate Projection Bridge
 * 
 * Maps 2D image-space coordinates (normalized [0, 1] or pixel coordinates)
 * to synthetic local Cartesian coordinates in physical meters (X_m, Y_m)
 * for path planning and optimal control.
 * 
 * MATHEMATICAL METHOD:
 * Implements monocular planar perspective ground projection assuming a flat road surface:
 *   1. Image Normalization -> Ground-contact pixel coordinates (W x H)
 *   2. Ray pitch angle: phi = arctan((y_pixel - cy) / fy)
 *   3. Total downward elevation: theta_ray = camera_pitch + phi
 *   4. Longitudinal distance: Y_m = camera_height / tan(theta_ray)
 *   5. Lateral distance: X_m = ((x_pixel - cx) / fx) * Y_m
 * 
 * Configurable architecture allows drop-in replacement with a calibrated 3x3
 * homography matrix (Inverse Perspective Mapping) when vehicle extrinsic/intrinsic
 * calibration parameters become available.
 * 
 * DISCLAIMER:
 * "Prototype projection — not camera calibrated."
 * This transformation is a geometric prototype model and must not be presented
 * as a certified metric sensor calibration.
 */

export const DEFAULT_PROTOTYPE_CALIBRATION = {
  name: "INDRA Prototype Monocular Forward Projection",
  isCalibrated: false,
  disclaimer: "Prototype projection — not camera calibrated.",
  
  // Reference camera sensor resolution
  imageWidth: 1920,
  imageHeight: 1080,

  // Camera optical center in normalized image space (typically near image center)
  opticalCenterNorm: { x: 0.50, y: 0.46 },

  // Extrinsic mounting parameters (prototype estimation)
  cameraHeightMeters: 1.35,    // 1.35m height above road ground plane
  cameraPitchDegrees: 5.5,     // 5.5 deg downward tilt relative to horizon

  // Intrinsic parameters (derived from ~68 deg horizontal FOV at 1920x1080)
  horizontalFovDegrees: 68.0,

  // Metric range clamping bounds
  minLongitudinalM: 2.0,       // Minimum visible distance at bottom edge of image
  maxLongitudinalM: 40.0,      // Maximum distance for ground contact near horizon
  maxLateralM: 10.0,           // Maximum lateral road boundary extent in meters

  // Optional 3x3 Homography Matrix (Row-major 3x3 array)
  // When provided, homography projection overrides the pinhole ground-plane model
  homographyMatrix: null,
};

/**
 * Calculates focal length in pixels from resolution and FOV
 */
export function getCameraIntrinsics(config = DEFAULT_PROTOTYPE_CALIBRATION) {
  const W = config.imageWidth;
  const H = config.imageHeight;
  const hFovRad = (config.horizontalFovDegrees * Math.PI) / 180;
  
  // fx from horizontal FOV: fx = (W / 2) / tan(hFov / 2)
  const fx = (W / 2) / Math.tan(hFovRad / 2);
  // Assume square pixels (aspect ratio 1.0)
  const fy = fx;

  const cx = config.opticalCenterNorm.x * W;
  const cy = config.opticalCenterNorm.y * H;

  return { fx, fy, cx, cy, W, H };
}

/**
 * Projects a single 2D normalized image coordinate to local Cartesian planner space (X_m, Y_m)
 * 
 * @param {number} xNorm - Normalized horizontal coordinate [0.0, 1.0] (0 = left, 1 = right)
 * @param {number} yNorm - Normalized vertical coordinate [0.0, 1.0] (0 = top, 1 = bottom ground contact)
 * @param {Object} [customConfig] - Optional calibration parameters override
 * @returns {Object} Projection result containing ground pixel and Cartesian metric coordinates
 */
export function projectImageToPlanner(xNorm, yNorm, customConfig = {}) {
  const config = { ...DEFAULT_PROTOTYPE_CALIBRATION, ...customConfig };
  const { fx, fy, cx, cy, W, H } = getCameraIntrinsics(config);

  const xPixel = xNorm * W;
  const yPixel = yNorm * H;

  // Boundary validation
  const isOutOfBounds = xNorm < 0 || xNorm > 1 || yNorm < 0 || yNorm > 1;

  // Check if point is above vanishing horizon line
  const horizonNorm = config.opticalCenterNorm.y;
  const isAboveHorizon = yNorm <= horizonNorm;

  if (isAboveHorizon) {
    return {
      input: { xNorm, yNorm },
      groundPixel: { xPixel, yPixel },
      plannerMetric: { xMeters: 0, yMeters: config.maxLongitudinalM },
      status: "ABOVE_HORIZON",
      isOutOfBounds,
      isAboveHorizon: true,
      isCalibrated: config.isCalibrated,
      disclaimer: config.disclaimer,
      description: "Point is at or above horizon line; ground contact not defined.",
    };
  }

  // 1. Homography branch if a calibrated 3x3 matrix is present
  if (Array.isArray(config.homographyMatrix) && config.homographyMatrix.length === 9) {
    const Hmat = config.homographyMatrix;
    const px = xPixel;
    const py = yPixel;

    const wEst = Hmat[6] * px + Hmat[7] * py + Hmat[8];
    if (Math.abs(wEst) > 1e-6) {
      const xMeters = (Hmat[0] * px + Hmat[1] * py + Hmat[2]) / wEst;
      const yMeters = (Hmat[3] * px + Hmat[4] * py + Hmat[5]) / wEst;
      return {
        input: { xNorm, yNorm },
        groundPixel: { xPixel, yPixel },
        plannerMetric: {
          xMeters: Number(xMeters.toFixed(4)),
          yMeters: Number(yMeters.toFixed(4)),
        },
        status: isOutOfBounds ? "OUT_OF_BOUNDS" : "VALID",
        isOutOfBounds,
        isAboveHorizon: false,
        isCalibrated: config.isCalibrated,
        disclaimer: config.disclaimer,
        method: "3x3 Planar Homography",
      };
    }
  }

  // 2. Prototype Pinhole Ground-Plane Perspective Model
  const pitchRad = (config.cameraPitchDegrees * Math.PI) / 180;
  const hCam = config.cameraHeightMeters;

  // Ray elevation angle relative to camera optical axis
  const dyPixel = yPixel - cy;
  const rayAnglePhi = Math.atan2(dyPixel, fy);
  const totalElevation = pitchRad + rayAnglePhi;

  let yMeters;
  if (totalElevation <= 0.001) {
    yMeters = config.maxLongitudinalM;
  } else {
    yMeters = hCam / Math.tan(totalElevation);
  }

  // Clamp to valid sensor range
  yMeters = Math.max(config.minLongitudinalM, Math.min(config.maxLongitudinalM, yMeters));

  // Lateral metric position
  const dxPixel = xPixel - cx;
  let xMeters = (dxPixel / fx) * yMeters;

  // Clamp lateral boundary
  xMeters = Math.max(-config.maxLateralM, Math.min(config.maxLateralM, xMeters));

  return {
    input: { xNorm, yNorm },
    groundPixel: {
      xPixel: Math.round(xPixel),
      yPixel: Math.round(yPixel),
    },
    plannerMetric: {
      xMeters: Number(xMeters.toFixed(3)),
      yMeters: Number(yMeters.toFixed(3)),
    },
    status: isOutOfBounds ? "OUT_OF_BOUNDS" : "VALID",
    isOutOfBounds,
    isAboveHorizon: false,
    isCalibrated: config.isCalibrated,
    disclaimer: config.disclaimer,
    method: "Prototype Pinhole Ground-Plane Model",
  };
}

/**
 * Inverse Projection: Maps local Cartesian planner space (X_m, Y_m) back to normalized image coordinates
 * Useful for projecting planner evasion splines onto camera overlay views.
 */
export function projectPlannerToImage(xMeters, yMeters, customConfig = {}) {
  const config = { ...DEFAULT_PROTOTYPE_CALIBRATION, ...customConfig };
  const { fx, fy, cx, cy, W, H } = getCameraIntrinsics(config);

  const hCam = config.cameraHeightMeters;
  const pitchRad = (config.cameraPitchDegrees * Math.PI) / 180;

  if (yMeters <= 0.1) {
    return { xNorm: 0.5, yNorm: 1.0, xPixel: cx, yPixel: H, isValid: false };
  }

  // Ground elevation angle: tan(theta_total) = hCam / yMeters
  const totalElevation = Math.atan2(hCam, yMeters);
  const rayAnglePhi = totalElevation - pitchRad;

  const yPixel = cy + fy * Math.tan(rayAnglePhi);
  const xPixel = cx + (xMeters / yMeters) * fx;

  const xNorm = xPixel / W;
  const yNorm = yPixel / H;

  return {
    xNorm: Number(xNorm.toFixed(4)),
    yNorm: Number(yNorm.toFixed(4)),
    xPixel: Math.round(xPixel),
    yPixel: Math.round(yPixel),
    isValid: xNorm >= 0 && xNorm <= 1 && yNorm >= 0 && yNorm <= 1,
  };
}

/**
 * Standard test cases demonstrating coordinate bridge functionality
 */
export const COORDINATE_BRIDGE_TEST_CASES = [
  {
    id: "road_center_close",
    name: "Road-Center Point (Immediate Forward Path)",
    category: "nominal",
    input: { xNorm: 0.50, yNorm: 0.85 },
    description: "Vehicle lane centerline 85% down image (close ahead in ego corridor)",
  },
  {
    id: "road_center_mid",
    name: "Road-Center Point (Mid-Distance)",
    category: "nominal",
    input: { xNorm: 0.50, yNorm: 0.65 },
    description: "Vehicle lane centerline 65% down image (approaching obstacle region)",
  },
  {
    id: "left_road_verge",
    name: "Left Road Edge / Shoulder Point",
    category: "lateral",
    input: { xNorm: 0.30, yNorm: 0.80 },
    description: "Leftward road boundary / verge contact in forward ground plane",
  },
  {
    id: "right_road_verge",
    name: "Right Road Edge / Shoulder Point",
    category: "lateral",
    input: { xNorm: 0.70, yNorm: 0.80 },
    description: "Rightward road boundary / verge contact in forward ground plane",
  },
  {
    id: "image_optical_center",
    name: "Image Optical Center",
    category: "boundary",
    input: { xNorm: 0.50, yNorm: 0.46 },
    description: "Optical center / horizon boundary line",
  },
  {
    id: "above_horizon_sky",
    name: "Out-of-Range Sky Point (Above Horizon)",
    category: "boundary",
    input: { xNorm: 0.50, yNorm: 0.20 },
    description: "Vertical position 20% from top (sky/background, no ground contact)",
  },
  {
    id: "outside_image_bounds",
    name: "Out-of-Bounds Sensor Coordinate",
    category: "boundary",
    input: { xNorm: -0.10, yNorm: 0.90 },
    description: "Negative horizontal coordinate exceeding camera sensor aperture",
  },
];
