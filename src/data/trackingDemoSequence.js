/**
 * INDRA-Drive Calibrated Prototype Tracking Sequence
 * 
 * DATA HONESTY NOTE:
 * Prototype / demonstration video sequence demonstrating ByteTrack persistent association
 * and IoU-based detection preprocessing on heterogeneous Indian traffic.
 * These are prototype demonstrator results, NOT UVH-26 benchmark validation metrics.
 */

// 15 sequential frames with calibrated vehicle kinematics and overlapping RT-DETRv2 predictions
export const TRACKING_DEMO_FRAMES = [
  // Frame 1: Exactly matches test_images/970644.png
  {
    frameIndex: 1,
    timeSec: 0.033,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0827, box: [440.66, 488.7, 865.91, 1018.3] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0776, box: [739.65, 138.12, 819.89, 202.67] },
      { class_id: 5, class_name: "Truck", confidence: 0.0644, box: [541.79, 132.53, 633.49, 274.29] },
      { class_id: 9, class_name: "Mini-bus", confidence: 0.0567, box: [541.79, 132.53, 633.49, 274.29] },
      { class_id: 10, class_name: "Tempo-traveller", confidence: 0.0537, box: [541.79, 132.53, 633.49, 274.29] },
      { class_id: 1, class_name: "Sedan", confidence: 0.0537, box: [739.65, 138.12, 819.89, 202.67] },
    ],
  },
  // Frame 2
  {
    frameIndex: 2,
    timeSec: 0.066,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0851, box: [438.2, 492.4, 869.5, 1022.6] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0792, box: [741.0, 142.3, 822.4, 207.1] },
      { class_id: 5, class_name: "Truck", confidence: 0.0682, box: [543.1, 136.2, 636.0, 278.5] },
      { class_id: 9, class_name: "Mini-bus", confidence: 0.0541, box: [543.1, 136.2, 636.0, 278.5] },
      { class_id: 1, class_name: "Sedan", confidence: 0.0519, box: [741.0, 142.3, 822.4, 207.1] },
    ],
  },
  // Frame 3
  {
    frameIndex: 3,
    timeSec: 0.100,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0874, box: [435.5, 496.8, 873.1, 1027.0] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0811, box: [742.6, 146.5, 825.2, 211.8] },
      { class_id: 5, class_name: "Truck", confidence: 0.0715, box: [544.5, 140.0, 638.6, 282.9] },
      { class_id: 10, class_name: "Tempo-traveller", confidence: 0.0528, box: [544.5, 140.0, 638.6, 282.9] },
    ],
  },
  // Frame 4: Two-wheeler enters scene
  {
    frameIndex: 4,
    timeSec: 0.133,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0889, box: [432.8, 501.2, 876.8, 1031.5] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0825, box: [744.1, 150.8, 828.0, 216.5] },
      { class_id: 5, class_name: "Truck", confidence: 0.0734, box: [546.0, 144.1, 641.2, 287.4] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0762, box: [910.2, 310.5, 965.4, 430.2] },
    ],
  },
  // Frame 5
  {
    frameIndex: 5,
    timeSec: 0.166,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0895, box: [430.0, 505.8, 880.5, 1036.2] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0841, box: [745.8, 155.3, 831.0, 221.4] },
      { class_id: 5, class_name: "Truck", confidence: 0.0751, box: [547.4, 148.2, 643.9, 292.0] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0784, box: [904.5, 318.0, 960.1, 439.5] },
    ],
  },
  // Frame 6: Bus appears in distant lane
  {
    frameIndex: 6,
    timeSec: 0.200,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0910, box: [427.1, 510.5, 884.3, 1041.0] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0856, box: [747.5, 159.9, 834.1, 226.3] },
      { class_id: 5, class_name: "Truck", confidence: 0.0768, box: [549.0, 152.5, 646.5, 296.8] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0805, box: [898.6, 326.2, 954.8, 449.0] },
      { class_id: 4, class_name: "Bus", confidence: 0.0621, box: [612.0, 105.4, 708.5, 225.0] },
    ],
  },
  // Frame 7
  {
    frameIndex: 7,
    timeSec: 0.233,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0924, box: [424.2, 515.2, 888.2, 1045.9] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0868, box: [749.2, 164.7, 837.2, 231.4] },
      { class_id: 5, class_name: "Truck", confidence: 0.0782, box: [550.5, 156.9, 649.2, 301.7] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0821, box: [892.4, 334.6, 949.2, 458.8] },
      { class_id: 4, class_name: "Bus", confidence: 0.0654, box: [614.2, 109.1, 711.0, 229.4] },
    ],
  },
  // Frame 8
  {
    frameIndex: 8,
    timeSec: 0.266,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0935, box: [421.2, 520.1, 892.1, 1050.8] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0881, box: [751.0, 169.6, 840.4, 236.5] },
      { class_id: 5, class_name: "Truck", confidence: 0.0798, box: [552.1, 161.4, 652.0, 306.7] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0837, box: [886.0, 343.2, 943.5, 468.9] },
      { class_id: 4, class_name: "Bus", confidence: 0.0682, box: [616.5, 113.0, 713.8, 234.0] },
    ],
  },
  // Frame 9: Partial occlusion test for Truck (low confidence tier recovery: conf drops to 0.042)
  {
    frameIndex: 9,
    timeSec: 0.300,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0946, box: [418.1, 525.0, 896.2, 1055.9] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0894, box: [752.8, 174.6, 843.7, 241.8] },
      { class_id: 5, class_name: "Truck", confidence: 0.0425, box: [553.8, 166.0, 654.8, 311.8] }, // Low-tier confidence test!
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0852, box: [879.5, 352.0, 937.6, 479.2] },
      { class_id: 4, class_name: "Bus", confidence: 0.0709, box: [618.9, 117.0, 716.7, 238.8] },
    ],
  },
  // Frame 10: Truck recovers full confidence after occlusion
  {
    frameIndex: 10,
    timeSec: 0.333,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0955, box: [415.0, 530.1, 900.3, 1061.1] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0906, box: [754.7, 179.8, 847.1, 247.2] },
      { class_id: 5, class_name: "Truck", confidence: 0.0812, box: [555.5, 170.8, 657.8, 317.0] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0865, box: [872.8, 361.1, 931.5, 489.8] },
      { class_id: 4, class_name: "Bus", confidence: 0.0734, box: [621.4, 121.2, 719.8, 243.7] },
    ],
  },
  // Frame 11
  {
    frameIndex: 11,
    timeSec: 0.366,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0963, box: [411.8, 535.3, 904.5, 1066.4] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0918, box: [756.6, 185.1, 850.5, 252.7] },
      { class_id: 5, class_name: "Truck", confidence: 0.0827, box: [557.3, 175.7, 660.8, 322.3] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0878, box: [866.0, 370.4, 925.3, 500.6] },
      { class_id: 4, class_name: "Bus", confidence: 0.0759, box: [624.0, 125.5, 723.0, 248.8] },
    ],
  },
  // Frame 12
  {
    frameIndex: 12,
    timeSec: 0.400,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0970, box: [408.5, 540.6, 908.8, 1071.8] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0929, box: [758.6, 190.5, 854.0, 258.4] },
      { class_id: 5, class_name: "Truck", confidence: 0.0841, box: [559.2, 180.7, 663.9, 327.8] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0890, box: [859.0, 379.9, 919.0, 511.6] },
      { class_id: 4, class_name: "Bus", confidence: 0.0782, box: [626.7, 130.0, 726.3, 254.0] },
    ],
  },
  // Frame 13
  {
    frameIndex: 13,
    timeSec: 0.433,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0976, box: [405.2, 546.0, 913.2, 1077.3] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0939, box: [760.7, 196.1, 857.6, 264.2] },
      { class_id: 5, class_name: "Truck", confidence: 0.0854, box: [561.1, 185.8, 667.1, 333.4] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0901, box: [851.8, 389.6, 912.5, 522.8] },
      { class_id: 4, class_name: "Bus", confidence: 0.0805, box: [629.5, 134.6, 729.7, 259.4] },
    ],
  },
  // Frame 14
  {
    frameIndex: 14,
    timeSec: 0.466,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0982, box: [401.8, 551.5, 917.6, 1082.9] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0948, box: [762.8, 201.8, 861.3, 270.1] },
      { class_id: 5, class_name: "Truck", confidence: 0.0867, box: [563.1, 191.0, 670.4, 339.1] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0911, box: [844.5, 399.5, 905.9, 534.2] },
      { class_id: 4, class_name: "Bus", confidence: 0.0827, box: [632.4, 139.3, 733.2, 264.9] },
    ],
  },
  // Frame 15
  {
    frameIndex: 15,
    timeSec: 0.500,
    rawDetections: [
      { class_id: 6, class_name: "Three-wheeler", confidence: 0.0987, box: [398.3, 557.1, 922.1, 1088.6] },
      { class_id: 0, class_name: "Hatchback", confidence: 0.0957, box: [765.0, 207.6, 865.1, 276.1] },
      { class_id: 5, class_name: "Truck", confidence: 0.0879, box: [565.2, 196.3, 673.8, 344.9] },
      { class_id: 7, class_name: "Two-wheeler", confidence: 0.0920, box: [837.0, 409.6, 899.2, 545.8] },
      { class_id: 4, class_name: "Bus", confidence: 0.0848, box: [635.4, 144.1, 736.8, 270.5] },
    ],
  },
];

// Single source of truth for prototype sequence length
export const TOTAL_DEMO_FRAMES = TRACKING_DEMO_FRAMES.length;

export const PROTOTYPE_TRACKING_METADATA = {
  title: "Heterogeneous Urban Transit Corridor — Prototype Video Sequence",
  filename: "indra_demo_track_seq_01.mp4",
  fps: 30.0,
  totalFrames: TRACKING_DEMO_FRAMES.length,
  resolution: { width: 1920, height: 1080 },
  cameraFOV: "68° Monocular Forward",
  status: "PROTOTYPE / DEMO EXPERIMENT",
  disclaimer: "These are prototype demonstrator results, not UVH-26 validation benchmark metrics.",
};
