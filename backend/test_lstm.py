from pathlib import Path

import torch
import torch.nn as nn


# ============================================================
# Configuration
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "backend"
    / "trajectory_lstm_v2.pt"
)

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

INPUT_FRAMES = 8
PREDICTION_FRAMES = 5
INPUT_FEATURES = 2
HIDDEN_SIZE = 64
NUM_LAYERS = 2


# ============================================================
# Model definition
# ============================================================

class TrajectoryLSTM(nn.Module):
    def __init__(
        self,
        input_features=INPUT_FEATURES,
        hidden_size=HIDDEN_SIZE,
        num_layers=NUM_LAYERS,
        prediction_frames=PREDICTION_FRAMES,
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

    def forward(self, x):
        lstm_output, _ = self.lstm(x)

        # Use the final observed frame representation
        last_output = lstm_output[:, -1, :]

        output = self.output_layer(last_output)

        # [batch, 10] -> [batch, 5, 2]
        output = output.view(
            -1,
            self.prediction_frames,
            2,
        )

        return output


# ============================================================
# Main test
# ============================================================

def main():
    print("============================================")
    print("INDRA-Drive LSTM v2 Local Test")
    print("============================================")

    print(f"Device: {DEVICE}")

    if torch.cuda.is_available():
        print(
            f"GPU: {torch.cuda.get_device_name(0)}"
        )

    # --------------------------------------------------------
    # Check checkpoint
    # --------------------------------------------------------

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Checkpoint not found:\n"
            f"{MODEL_PATH.resolve()}"
        )

    print(
        f"\nLoading checkpoint:\n"
        f"{MODEL_PATH}"
    )

    state_dict = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=True,
    )

    # --------------------------------------------------------
    # Create exact trained architecture
    # --------------------------------------------------------

    model = TrajectoryLSTM(
        input_features=INPUT_FEATURES,
        hidden_size=HIDDEN_SIZE,
        num_layers=NUM_LAYERS,
        prediction_frames=PREDICTION_FRAMES,
    )

    model.load_state_dict(state_dict)

    model = model.to(DEVICE)
    model.eval()

    print("\n✅ LSTM v2 model loaded successfully.")

    total_parameters = sum(
        parameter.numel()
        for parameter in model.parameters()
    )

    print(
        f"Parameters: {total_parameters:,}"
    )

    # --------------------------------------------------------
    # Create 8 observed trajectory positions
    #
    # These are normalized image-space coordinates:
    # x and y values are between 0 and 1.
    # --------------------------------------------------------

    observed_positions = torch.tensor(
        [
            [0.6150, 0.6670],
            [0.6140, 0.6640],
            [0.6120, 0.6610],
            [0.6080, 0.6550],
            [0.6070, 0.6510],
            [0.6050, 0.6480],
            [0.6030, 0.6450],
            [0.6020, 0.6420],
        ],
        dtype=torch.float32,
    )

    # Shape:
    # [8, 2] -> [1, 8, 2]

    input_tensor = observed_positions.unsqueeze(0)

    input_tensor = input_tensor.to(DEVICE)

    print(
        f"\nInput shape: "
        f"{tuple(input_tensor.shape)}"
    )

    print("\nObserved trajectory:")

    for index, position in enumerate(
        observed_positions,
        start=1,
    ):
        x = float(position[0])
        y = float(position[1])

        print(
            f"  Frame {index}: "
            f"x={x:.4f}, y={y:.4f}"
        )

    # --------------------------------------------------------
    # Run prediction
    # --------------------------------------------------------

    print("\nRunning LSTM prediction...")

    with torch.inference_mode():
        prediction = model(input_tensor)

    prediction = prediction.squeeze(0).cpu()

    # --------------------------------------------------------
    # Validate output
    # --------------------------------------------------------

    print(
        f"Output shape: "
        f"{tuple(prediction.shape)}"
    )

    if prediction.shape != (
        PREDICTION_FRAMES,
        2,
    ):
        raise RuntimeError(
            "Unexpected prediction shape: "
            f"{tuple(prediction.shape)}"
        )

    # --------------------------------------------------------
    # Display predictions
    # --------------------------------------------------------

    print("\nPredicted future trajectory:")

    for index, position in enumerate(
        prediction,
        start=1,
    ):
        x = float(position[0])
        y = float(position[1])

        print(
            f"  Future +{index}: "
            f"x={x:.4f}, y={y:.4f}"
        )

    # --------------------------------------------------------
    # Basic sanity checks
    # --------------------------------------------------------

    if not torch.isfinite(prediction).all():
        raise RuntimeError(
            "Prediction contains NaN or Inf values."
        )

    print(
        "\n✅ Prediction contains only finite values."
    )

    print(
        "\n✅ LSTM v2 local inference test "
        "completed successfully."
    )


if __name__ == "__main__":
    main()