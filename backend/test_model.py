from pathlib import Path

import torch
from PIL import Image
from transformers import RTDetrImageProcessor, RTDetrV2ForObjectDetection


BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = (
    BASE_DIR
    / "models"
    / "rtdetr_v2_r18_uvh26_epoch12"
    / "epoch12"
)
IMAGE_PATH = BASE_DIR / "public" / "sample_road.png"

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


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print(f"Device: {device}")

    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    # Check model folder
    if not MODEL_DIR.exists():
        raise FileNotFoundError(
            f"Model folder not found: {MODEL_DIR.resolve()}"
        )

    # Check image
    if not IMAGE_PATH.exists():
        raise FileNotFoundError(
            f"Test image not found: {IMAGE_PATH.resolve()}\n"
            "Make sure sample_road.png is inside public."
        )

    print("\nLoading processor...")
    processor = RTDetrImageProcessor.from_pretrained(MODEL_DIR)

    print("Loading trained Epoch-12 model...")
    model = RTDetrV2ForObjectDetection.from_pretrained(MODEL_DIR)

    model = model.to(device)
    model.eval()

    print("Model loaded successfully.")
    print(f"Number of labels: {model.config.num_labels}")
    print(f"Model labels: {model.config.id2label}")

    # Load REAL UVH-26 image
    image = Image.open(IMAGE_PATH).convert("RGB")

    print(f"\nTest image: {IMAGE_PATH}")
    print(f"Image size: {image.size}")

    # Preprocess
    inputs = processor(
        images=image,
        return_tensors="pt",
    )

    inputs = {
        key: value.to(device) if torch.is_tensor(value) else value
        for key, value in inputs.items()
    }

    print("\nRunning inference...")

    with torch.inference_mode():
        outputs = model(**inputs)

    print("Forward pass successful.")
    print(f"Logits shape: {tuple(outputs.logits.shape)}")
    print(f"Boxes shape: {tuple(outputs.pred_boxes.shape)}")

    # Convert model outputs to image coordinates
    target_sizes = torch.tensor(
        [[image.height, image.width]],
        device=device,
    )

    results = processor.post_process_object_detection(
        outputs,
        target_sizes=target_sizes,
        threshold=0.05,
    )[0]

    print(f"\nDetections at threshold 0.05: {len(results['scores'])}")

    for score, label, box in zip(
        results["scores"],
        results["labels"],
        results["boxes"],
    ):
        label_id = int(label.item())
        confidence = float(score.item())
        box_values = [round(float(v), 1) for v in box.tolist()]

        class_name = (
            CLASS_NAMES[label_id]
            if 0 <= label_id < len(CLASS_NAMES)
            else f"Unknown-{label_id}"
        )

        print(
            f"  {class_name:<18} "
            f"confidence={confidence:.4f} "
            f"box={box_values}"
        )

    print("\n✅ Real UVH-26 image inference completed.")


if __name__ == "__main__":
    main()