"""
INDRA-Drive Trajectory Prediction Service
PyTorch LSTM model for multi-frame vehicle trajectory forecasting on unstructured Indian roads.

COORDINATE SEMANTICS & DATA CONTRACT:
-------------------------------------
The trained LSTM operates strictly in NORMALIZED IMAGE-SPACE coordinates:
    x_normalized = x_pixel / image_width
    y_normalized = y_pixel / image_height

IMPORTANT:
- Coordinates are dimensionless ratios in [0, 1] relative to camera FOV.
- Do NOT interpret these coordinates as metric distances (meters).
- Do NOT compute metric velocity or acceleration directly without camera extrinsic/intrinsic calibration.
- Ground-contact anchor points (e.g. bottom-center of bounding box: [(x1 + x2)/2, y2]) are typically normalized.

Architecture:
- Input: [batch, 8, 2] (8 past frames of normalized [x, y])
- LSTM: input_size=2, hidden_size=64, num_layers=2, batch_first=True
- Output Linear: Linear(64, 10)
- Output Shape: [batch, 5, 2] (5 future frames of predicted [x, y])
- Parameters: 51,338
"""

import math
from pathlib import Path
from typing import List, Tuple

import torch
import torch.nn as nn


# Default configuration
INPUT_FRAMES = 8
PREDICTION_FRAMES = 5
INPUT_FEATURES = 2
HIDDEN_SIZE = 64
NUM_LAYERS = 2


class TrajectoryLSTM(nn.Module):
    """
    Trajectory prediction network: 2-layer LSTM with linear projection to 5 future steps.
    """

    def __init__(
        self,
        input_features: int = INPUT_FEATURES,
        hidden_size: int = HIDDEN_SIZE,
        num_layers: int = NUM_LAYERS,
        prediction_frames: int = PREDICTION_FRAMES,
    ):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
        )

        self.output_layer = nn.Linear(
            hidden_size,
            prediction_frames * 2,
        )

        self.prediction_frames = prediction_frames

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: Tensor of shape [batch, 8, 2]
        Returns:
            Tensor of shape [batch, 5, 2]
        """
        lstm_output, _ = self.lstm(x)

        # Extract representation from the final observed step (t=8)
        last_output = lstm_output[:, -1, :]

        output = self.output_layer(last_output)

        # Reshape [batch, 10] -> [batch, 5, 2]
        return output.view(-1, self.prediction_frames, 2)


class TrajectoryPredictor:
    """
    Service wrapper for loading the LSTM v2 checkpoint and performing inference.
    """

    def __init__(self, model_path: Path = None, device: torch.device = None):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = device

        if model_path is None:
            base_dir = Path(__file__).resolve().parent
            model_path = base_dir / "trajectory_lstm_v2.pt"

        self.model_path = Path(model_path)
        self.model = None
        self._load_model()

    def _load_model(self):
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Trajectory LSTM checkpoint not found at: {self.model_path.resolve()}"
            )

        print(f"Loading Trajectory LSTM from: {self.model_path}")
        state_dict = torch.load(
            self.model_path,
            map_location=self.device,
            weights_only=True,
        )

        self.model = TrajectoryLSTM(
            input_features=INPUT_FEATURES,
            hidden_size=HIDDEN_SIZE,
            num_layers=NUM_LAYERS,
            prediction_frames=PREDICTION_FRAMES,
        )
        self.model.load_state_dict(state_dict)
        self.model = self.model.to(self.device)
        self.model.eval()

        total_params = sum(p.numel() for p in self.model.parameters())
        print(
            f"[OK] Trajectory LSTM v2 loaded on {self.device} ({total_params:,} parameters)."
        )

    def predict(self, positions: List[List[float]]) -> List[List[float]]:
        """
        Predict future trajectory given 8 observed normalized positions.

        Args:
            positions: List of 8 pairs [[x1, y1], [x2, y2], ..., [x8, y8]]
                       in normalized image coordinates.

        Returns:
            List of 5 predicted future pairs [[x1, y1], ..., [x5, y5]], rounded to 4 decimals.
        """
        if len(positions) != INPUT_FRAMES:
            raise ValueError(
                f"Expected exactly {INPUT_FRAMES} historical frames, received {len(positions)}."
            )

        for idx, pt in enumerate(positions):
            if len(pt) != 2:
                raise ValueError(
                    f"Frame {idx + 1} must contain exactly 2 coordinates [x, y], got {len(pt)}."
                )
            x, y = pt
            if not (math.isfinite(x) and math.isfinite(y)):
                raise ValueError(f"Frame {idx + 1} contains non-finite coordinates: {pt}")

        input_tensor = torch.tensor(
            positions,
            dtype=torch.float32,
            device=self.device,
        ).unsqueeze(0)  # Shape: [1, 8, 2]

        with torch.inference_mode():
            pred = self.model(input_tensor)

        pred = pred.squeeze(0).cpu()  # Shape: [5, 2]

        # Round outputs to 4 decimal places for clean, stable API representation
        predicted_positions = [
            [round(float(pt[0]), 4), round(float(pt[1]), 4)]
            for pt in pred
        ]

        return predicted_positions


# Module-level singleton instance
_predictor_instance = None


def get_trajectory_predictor() -> TrajectoryPredictor:
    """Returns the singleton TrajectoryPredictor instance."""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = TrajectoryPredictor()
    return _predictor_instance
