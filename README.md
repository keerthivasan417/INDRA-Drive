# INDRA-Drive — Adaptive Path Planning and Collision Avoidance for Autonomous Vehicles on Unstructured Indian Roads

INDRA-Drive is a research prototype system engineered for autonomous driving scenarios in unstructured Indian road environments. It explores an integrated pipeline that links perception, multi-object tracking, temporal motion forecasting, pairwise interaction risk estimation, and adaptive local path planning.

---

## Core Pipeline Architecture

The system operates across a 5-stage sequential pipeline:

$$\text{See} \longrightarrow \text{Remember} \longrightarrow \text{Predict} \longrightarrow \text{Assess} \longrightarrow \text{Plan}$$

1. **See (Perception)**: Monocular object detection via RT-DETRv2 fine-tuned on the UVH-26 dataset.
2. **Remember (State Tracking)**: Multi-object association and state estimation via ByteTrack with 2D Kalman filtering.
3. **Predict (Trajectory Forecasting)**: Recurrent temporal motion forecasting via Trajectory LSTM v2 across a multi-step horizon.
4. **Assess (Risk Estimation)**: Pairwise convergence and image-space Time-to-Collision (TTC) heuristic estimation.
5. **Plan (Adaptive Path Planning)**: Optimal local trajectory tracking and collision avoidance combining Model Predictive Control (MPC) with Dynamic Window Approach (DWA) fallback.

---

## Main Modules

- **Live Perception**: Interactive visual inference interface for uploading road frames, executing RT-DETRv2, and rendering bounding box telemetry.
- **Object Tracking**: Deterministic sequence evaluation illustrating persistent ByteTrack ID association, Kalman velocity tracking, and IoU-based detection preprocessing.
- **Trajectory Prediction**: Interactive forecasting interface allowing observed coordinate review and execution of the trained Trajectory LSTM model.
- **Risk Analysis**: Multi-agent interaction assessment computing pairwise minimum predicted separation, relative closure rates, and prototype image-space TTC.
- **Path Planning**: Bird's-Eye-View (BEV) visualization comparing Standalone MPC, Pure DWA, Risk-Aware DWA, and the Integrated Hybrid planner over verified simulation benchmarks.

---

## Component Details

### 1. Perception (RT-DETRv2)
- **Architecture**: RT-DETRv2 R18 (Real-Time DEtection TRansformer with ResNet-18 backbone)
- **Dataset**: UVH-26 (Unstructured Vehicle Heterogeneity benchmark from IISc-AIM)
- **Classes (14)**: Hatchback, Sedan, SUV, MUV, Bus, Truck, Three-wheeler, Two-wheeler, LCV, Mini-bus, Tempo-traveller, Bicycle, Van, Others
- **Active Checkpoint**: Epoch 12 (`models/rtdetr_v2_r18_uvh26_epoch12/epoch12`)
- **Dataset Split**:
  - Training subset: 3,000 images / 38,881 annotations
  - Validation subset: 800 images / 11,064 annotations
- **Validation Metrics (Epoch 12)**:
  - mAP@50:95: 35.30%
  - mAP@50: 43.47%
  - mAP@75: 39.25%
  - mAR@100: 73.85%

### 2. Object Tracking (ByteTrack)
- **Method**: ByteTrack multi-object tracking algorithm
- **Motion Model**: Constant-velocity 2D Kalman filter tracking bounding box state `[cx, cy, a, h, vcx, vcy, va, vh]`
- **Camera Configuration**: 68° forward monocular field of view
- **Demonstration Status**: The tracking interface currently evaluates a calibrated prototype demonstration sequence (15 frames) with deterministic Kalman updates and bipartite matching.

### 3. Trajectory Prediction (Trajectory LSTM v2)
- **Architecture**: 2-layer Recurrent LSTM with linear output projection
- **Parameters**: 51,338
- **Temporal Horizon**: 8 observed frames (T-7 → T0) → 5 predicted future steps (T+1 → T+5)
- **Coordinate Space**: Normalized image coordinates `[x, y]` relative to camera resolution ($x = x_{pixel}/W$, $y = y_{pixel}/H$). Predictions do not represent metric distances or calibrated physical velocities.

### 4. Risk Estimation
- **Heuristic**: Evaluates pairwise spatial convergence and minimum predicted separation across the 5 predicted future steps.
- **TTC Metric**: Calculated in normalized image space as initial separation divided by image-space closure rate.
- **Specification**: Prototype image-space interaction estimate only; it is not a calibrated physical Time-to-Collision.

### 5. Path Planning (MPC + DWA)
- **Controllers**:
  - Standalone Model Predictive Control (MPC) with receding horizon optimization
  - Dynamic Window Approach (DWA) velocity-space reactive search
  - Risk-Aware DWA incorporating dynamic obstacle penalty weights
  - Integrated Hybrid MPC with DWA reactive fallback
- **Coordinate Frame**: Synthetic local Cartesian simulation coordinates (in meters, longitudinal Y: 0–25 m, lateral X: -3.5 to +3.5 m). Real-world metric camera projection is uncalibrated.

---

## Technology Stack

- **Frontend**: React 19, Vite, Vanilla CSS, Lucide React
- **Backend**: FastAPI, Uvicorn
- **Machine Learning**: PyTorch, Hugging Face Transformers, Pillow, Pydantic
- **Model Storage**: Git LFS (Large File Storage) for detector weights (`model.safetensors`)

---

## Repository Structure

```text
INDRA-Drive/
├── backend/
│   ├── main.py                  # FastAPI application exposing inference endpoints
│   ├── trajectory_model.py      # PyTorch TrajectoryLSTM v2 predictor class
│   ├── trajectory_lstm_v2.pt    # LSTM model weights checkpoint (208 KB)
│   ├── requirements.txt         # Verified Python dependencies
│   ├── test_model.py            # Standalone test script for RT-DETRv2
│   ├── test_lstm.py             # Standalone test script for Trajectory LSTM
│   └── *.json                   # Verified simulation and benchmark records
├── models/
│   └── rtdetr_v2_r18_uvh26_epoch12/
│       └── epoch12/
│           ├── model.safetensors # RT-DETRv2 weights (76.8 MB, tracked via Git LFS)
│           └── config.json       # Hugging Face model & architecture configuration
├── public/
│   ├── sample_road.png          # Reference road scene frame (1920x1080)
│   └── *.svg                    # UI icons and static visual assets
├── src/
│   ├── components/              # Reusable React UI components and module cards
│   ├── context/                 # IndraRuntimeContext for pipeline state synchronization
│   ├── data/                    # Benchmark metrics, prototype tracks, and sequence data
│   ├── pages/                   # Main module views (Perception, Tracking, Planning, etc.)
│   ├── services/api.js          # HTTP service client connecting to FastAPI backend
│   └── utils/                   # ByteTrack, coordinate projection, and risk calculators
├── package.json                 # Frontend dependencies and build scripts
└── vite.config.js               # Vite bundler configuration
```

---

## Local Setup & Execution (Windows)

### Prerequisites
- Node.js (v18+ recommended)
- Python (v3.10+ recommended)
- Git and Git LFS

### 1. Clone the Repository
```powershell
git clone https://github.com/keerthivasan417/INDRA-Drive.git
cd INDRA-Drive
git lfs install
git lfs pull
```

### 2. Backend Setup
```powershell
# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Start the FastAPI backend server from the project root
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
The backend starts at `http://127.0.0.1:8000`.

### 3. Frontend Setup
In a separate terminal:
```powershell
# Install npm packages
npm install

# Build production bundle
npm run build

# Start local development server
npm run dev
```
The frontend starts at `http://localhost:5173`.

---

## Backend API Endpoints

The FastAPI backend exposes three core endpoints:
- `GET /health` — Returns runtime hardware device telemetry, detector configuration, and model status.
- `POST /predict` — Accepts a multipart image file and executes live RT-DETRv2 object detection.
- `POST /predict-trajectory` — Accepts 8 sequential normalized `[x, y]` positions for a track ID and returns 5 predicted future waypoints from Trajectory LSTM v2.

---

## Model Artifacts & Git LFS

The fine-tuned RT-DETRv2 detector weights (`models/rtdetr_v2_r18_uvh26_epoch12/epoch12/model.safetensors`, 76.83 MB) are stored and tracked using **Git LFS**. When cloning the repository, ensure `git lfs pull` is executed so that the binary weights are retrieved rather than pointer files.

---

## Prototype Limitations & Research Scope

- **Prototype System**: This codebase is an academic and engineering demonstrator. It is not certified for deployment on real autonomous vehicles.
- **Image-Space Coordinates**: Perception and trajectory forecasting operate strictly in dimensionless normalized image coordinates ($[0.0, 1.0]$) relative to camera optical resolution.
- **Uncalibrated Ground Projection**: Camera intrinsic calibration, extrinsic vehicle pose, and ground-plane homography (IPM) are not currently calibrated to a specific vehicle chassis.
- **Simulated Planning**: Path planning and optimal control benchmarks run within a synthetic local Cartesian simulation frame.
- **Simulation TTC**: Interaction risk metrics and Time-to-Collision (TTC) values represent prototype image-space heuristics rather than validated physical collision safety bounds.
- **MATLAB / Simulink**: Integration with MATLAB/Simulink vehicle dynamic cosimulation is planned for future research phases and is not currently implemented in this repository.
- **Vehicle Safety**: Not intended for deployment in a real vehicle.

---

## License

No license is currently specified for this research prototype. All rights reserved.

---

## Credits

Developed with Antigravity
