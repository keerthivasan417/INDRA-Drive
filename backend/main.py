from io import BytesIO
import math
from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from PIL import Image
from transformers import RTDetrImageProcessor, RTDetrV2ForObjectDetection

from backend.trajectory_model import get_trajectory_predictor


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    BASE_DIR
    / "models"
    / "rtdetr_v2_r18_uvh26_epoch12\epoch12"
)


# ============================================================
# UVH-26 class names
# ============================================================

CLASS_NAMES = [
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
]


# ============================================================
# Device
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="INDRA-Drive API",
    description=(
        "RT-DETRv2 inference API for "
        "INDRA-Drive"
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Load model
# ============================================================

print(f"Using device: {DEVICE}")

if torch.cuda.is_available():
    print(
        f"GPU: {torch.cuda.get_device_name(0)}"
    )

print(
    f"Loading model from: {MODEL_DIR}"
)

if not MODEL_DIR.exists():
    raise FileNotFoundError(
        f"Model directory not found: "
        f"{MODEL_DIR}"
    )

processor = RTDetrImageProcessor.from_pretrained(
    MODEL_DIR
)

model = RTDetrV2ForObjectDetection.from_pretrained(
    MODEL_DIR
)

model = model.to(DEVICE)
model.eval()

print(
    "[OK] INDRA-Drive RT-DETRv2 "
    "model loaded."
)


# ============================================================
# Health endpoint
# ============================================================

@app.get("/health")
def health():
    predictor = get_trajectory_predictor()
    return {
        "status": "healthy",
        "model": "RT-DETRv2 R18",
        "checkpoint": "epoch12",
        "trajectory_model": "TrajectoryLSTM v2",
        "trajectory_device": str(predictor.device),
        "num_classes": len(CLASS_NAMES),
        "device": str(DEVICE),
        "gpu": (
            torch.cuda.get_device_name(0)
            if torch.cuda.is_available()
            else "CPU"
        ),
    }


# ============================================================
# Prediction endpoint
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):
    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    image_bytes = await file.read()

    image = Image.open(
        BytesIO(image_bytes)
    ).convert("RGB")

    # --------------------------------------------------------
    # Preprocess image
    # --------------------------------------------------------

    inputs = processor(
        images=image,
        return_tensors="pt",
    )

    inputs = {
        key: (
            value.to(DEVICE)
            if torch.is_tensor(value)
            else value
        )
        for key, value in inputs.items()
    }

    # --------------------------------------------------------
    # Run inference
    # --------------------------------------------------------

    with torch.inference_mode():
        outputs = model(**inputs)

    # --------------------------------------------------------
    # Convert predictions to original image coordinates
    # --------------------------------------------------------

    target_sizes = torch.tensor(
        [[image.height, image.width]],
        device=DEVICE,
    )

    results = processor.post_process_object_detection(
        outputs,
        target_sizes=target_sizes,
        threshold=0.05,
    )[0]

    # --------------------------------------------------------
    # Build detection response
    # --------------------------------------------------------

    detections = []

    for score, label, box in zip(
        results["scores"],
        results["labels"],
        results["boxes"],
    ):
        class_id = int(label.item())

        confidence = float(
            score.item()
        )

        x1, y1, x2, y2 = [
            round(float(value), 2)
            for value in box.tolist()
        ]

        if 0 <= class_id < len(
            CLASS_NAMES
        ):
            class_name = CLASS_NAMES[
                class_id
            ]
        else:
            class_name = (
                f"Unknown-{class_id}"
            )

        detections.append(
            {
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(
                    confidence,
                    4,
                ),
                "box": [
                    x1,
                    y1,
                    x2,
                    y2,
                ],
            }
        )

    # --------------------------------------------------------
    # Return API response
    # --------------------------------------------------------

    return {
        "filename": file.filename,
        "image_width": image.width,
        "image_height": image.height,
        "detection_count": len(
            detections
        ),
        "detections": detections,
    }


# ============================================================
# Trajectory Prediction Schemas & Endpoint
# ============================================================

class TrajectoryRequest(BaseModel):
    """
    Trajectory prediction request payload.

    COORDINATE CONTRACT:
    Positions MUST be in normalized image-space coordinates:
        x_norm = x_pixel / image_width
        y_norm = y_pixel / image_height
    Values are dimensionless coordinates relative to monocular optical FOV.
    Do NOT pass metric meter values or unnormalized pixel values.
    """
    track_id: int = Field(default=1, description="Persistent tracking ID from tracking pipeline")
    positions: list[list[float]] = Field(
        ...,
        description="Exactly 8 sequential historical frames of normalized [x, y] coordinates",
    )

    @field_validator("positions")
    @classmethod
    def validate_positions(cls, v):
        if len(v) != 8:
            raise ValueError(
                f"Trajectory prediction requires exactly 8 historical observation frames, received {len(v)}."
            )
        for idx, pt in enumerate(v):
            if not isinstance(pt, (list, tuple)) or len(pt) != 2:
                raise ValueError(
                    f"Observation frame {idx + 1} must be a 2-element coordinate pair [x, y], received {pt}."
                )
            x, y = pt
            if not (isinstance(x, (int, float)) and isinstance(y, (int, float))):
                raise ValueError(
                    f"Coordinates at frame {idx + 1} must be numeric float values."
                )
            if not (math.isfinite(x) and math.isfinite(y)):
                raise ValueError(
                    f"Coordinates at frame {idx + 1} must be finite numbers (no NaN or Inf allowed)."
                )
            # Normalized image coordinates check (allowing reasonable margin for edge detections)
            if not (-0.5 <= x <= 1.5 and -0.5 <= y <= 1.5):
                raise ValueError(
                    f"Coordinates at frame {idx + 1} (x={x}, y={y}) must be in normalized image space (approx 0.0 to 1.0)."
                )
        return v


class TrajectoryResponse(BaseModel):
    track_id: int
    input_frames: int = 8
    prediction_frames: int = 5
    device: str
    predicted_positions: list[list[float]]


@app.post("/predict-trajectory", response_model=TrajectoryResponse)
def predict_trajectory(request: TrajectoryRequest):
    """
    Predicts 5 future trajectory steps for a tracked vehicle given 8 historical normalized positions.

    Model: 2-layer TrajectoryLSTM (51,338 parameters)
    Output: 5 future normalized [x, y] coordinates
    """
    predictor = get_trajectory_predictor()

    try:
        predictions = predictor.predict(request.positions)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Trajectory inference failed: {str(exc)}",
        )

    return TrajectoryResponse(
        track_id=request.track_id,
        input_frames=8,
        prediction_frames=5,
        device=str(predictor.device),
        predicted_positions=predictions,
    )
