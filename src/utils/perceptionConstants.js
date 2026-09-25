// INDRA-Drive Perception Constants and Color Palettes

export const UVH26_CLASSES = [
  "Hatchback",
  "Sedan",
  "SUV",
  "MUV",
  "Bus",
  "Truck",
  "Three-wheeler",
  "Two-wheeler",
  "LCV",
  "Mini-bus",
  "Tempo-traveller",
  "Bicycle",
  "Van",
  "Others",
];

export const CLASS_COLORS = {
  Hatchback: { border: "#00f0ff", bg: "rgba(0, 240, 255, 0.15)", text: "#70f5ff" },
  Sedan: { border: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", text: "#bae6fd" },
  SUV: { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", text: "#a5f3fc" },
  MUV: { border: "#22d3ee", bg: "rgba(34, 211, 238, 0.15)", text: "#cffafe" },
  Bus: { border: "#c084fc", bg: "rgba(192, 132, 252, 0.15)", text: "#e9d5ff" },
  Truck: { border: "#fb923c", bg: "rgba(251, 146, 60, 0.15)", text: "#fed7aa" },
  "Three-wheeler": { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", text: "#fde68a" },
  "Two-wheeler": { border: "#00ff88", bg: "rgba(0, 255, 136, 0.15)", text: "#86efac" },
  LCV: { border: "#f97316", bg: "rgba(249, 115, 22, 0.15)", text: "#ffedd5" },
  "Mini-bus": { border: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", text: "#f3e8ff" },
  "Tempo-traveller": { border: "#d946ef", bg: "rgba(217, 70, 239, 0.15)", text: "#fae8ff" },
  Bicycle: { border: "#10b981", bg: "rgba(16, 185, 129, 0.15)", text: "#a7f3d0" },
  Van: { border: "#67e8f9", bg: "rgba(103, 232, 249, 0.15)", text: "#ecfeff" },
  Others: { border: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", text: "#cbd5e1" },
};

export function getClassColor(className) {
  return (
    CLASS_COLORS[className] || {
      border: "#00ff88",
      bg: "rgba(0, 255, 136, 0.15)",
      text: "#86efac",
    }
  );
}
