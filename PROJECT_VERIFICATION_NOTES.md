# INDRA-Drive verification snapshot

## RT-DETRv2 R18
- Checkpoint: Epoch 12
- Train: 3,000 images / 38,881 annotations
- Validation: 800 images / 11,064 annotations
- mAP@50:95: 0.3530
- mAP@50: 0.4347
- mAP@75: 0.3925
- mAR@100: 0.7385

Epoch 12 is the best checkpoint on this same 800-image validation evaluation among the compared Epoch 7, 9, 10, 11, 12, 13 and 14 checkpoints.

## TrajectoryLSTM v2
- Architecture: 8 observed frames -> 5 predicted frames
- Parameters: 51,338
- Fresh inference over 232 saved sequences: ADE 0.034195, FDE 0.037377
- Training/validation benchmark record: ADE 0.0246378, FDE 0.0324856

The two LSTM metric pairs are intentionally distinguished: the first is the fresh inference check over the saved 232-sequence file; the second is the recorded validation benchmark from the training checkpoint metadata.

## Planning simulations
- Integrated MPC + DWA fallback: goal reached, collision free, minimum clearance 0.7335 m, final goal distance 0.4138 m, path length 13.2117 m.
- Standalone MPC: minimum clearance 0.7755 m.
- Risk-Aware DWA: minimum clearance 0.2501 m.
- Pure DWA: minimum clearance 1.2010 m.

## Risk limitation
Do not present the earlier per-object TTC calculation from the saved trajectory-only file as a validated collision TTC benchmark. The saved trajectory file does not retain the track IDs/frame IDs/ego trajectory required for reliable object-to-object physical TTC reconstruction.

## Coordinate limitation
Planner coordinates are synthetic local Cartesian simulation coordinates. Perception/LSTM coordinates are normalized image-space coordinates. The camera-to-planner projection is a prototype and is not calibrated metric ground truth.
