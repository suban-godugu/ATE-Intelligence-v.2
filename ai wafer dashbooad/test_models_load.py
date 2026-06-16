# d:\officw work -1\ai-1\ai wafer dashbooad\test_models_load.py
import sys
import os
import torch
import numpy as np

print("============================================================")
print("             AI MODELS HEALTH CHECK")
print("============================================================")

print(f"Python version: {sys.version}")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA Available: {torch.cuda.is_available()}")

# 1. Test ResNet50 model load
try:
    print("\n[Check 1] Loading ResNet50 classifier model...")
    from predict import model as resnet_model, MODEL_PATH
    print(f"SUCCESS: ResNet50 Loaded successfully from: {MODEL_PATH}")
    print(f"ResNet50 parameters: {sum(p.numel() for p in resnet_model.parameters()):,} parameters")
except Exception as e:
    print(f"FAILED: ResNet50 Load Failed: {e}")

# 2. Test U-Net model load
try:
    print("\n[Check 2] Loading U-Net segmentation model...")
    import segmentation_models_pytorch as smp
    from predict_unet import model as unet_model, UNET_MODEL_PATH
    print(f"SUCCESS: U-Net Loaded successfully from: {UNET_MODEL_PATH}")
    print(f"U-Net parameters: {sum(p.numel() for p in unet_model.parameters()):,} parameters")
except Exception as e:
    print(f"FAILED: U-Net Load Failed: {e}")

# 3. Test Optimizer model execution
try:
    print("\n[Check 3] Running Python Optimizer model simulation...")
    from optimizer_model import run_constraint_pruning
    test_patterns = [
        {"id": "p1", "patternId": "PAT-1", "patternType": "SCAN", "killRatio": 0.8, "testTimeMs": 100.0, "costUsd": 0.05, "roiScore": 20.0},
        {"id": "p2", "patternId": "PAT-2", "patternType": "SCAN", "killRatio": 0.9, "testTimeMs": 200.0, "costUsd": 0.10, "roiScore": 75.0}
    ]
    test_constraints = {"maxCostPerWafer": 50.0, "yieldTarget": 90.0, "maxTestTimeMs": 500.0}
    results = run_constraint_pruning(test_patterns, test_constraints)
    print("SUCCESS: Python Optimizer Simulation Completed successfully!")
    print(f"Optimizer savings result: {results['estimatedCostReduction']}% cost reduction, {results['patternsReduced']} pattern(s) pruned.")
except Exception as e:
    print(f"FAILED: Python Optimizer Simulation Failed: {e}")

print("\n============================================================")
print("             HEALTH CHECK COMPLETED")
print("============================================================")
