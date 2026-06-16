from fastapi import FastAPI, UploadFile, File
import shutil
import os
import cv2
import numpy as np
import base64
from PIL import Image

from predict import predict_api
from dice_analysis import analyze_wafer
from model_validator import router as validator_router
from optimizer_model import run_constraint_pruning
from pydantic import BaseModel
from typing import List, Dict, Any

# =====================================================
# FASTAPI APP
# =====================================================
app = FastAPI(
    title="WaferVision AI API",
    version="1.0"
)

app.include_router(validator_router, prefix="/validate", tags=["Validation"])

# =====================================================
# PYDANTIC MODEL SCHEMAS FOR OPTIMIZER
# =====================================================
class PatternDataInput(BaseModel):
    id: str
    patternId: str
    patternType: str
    killRatio: float
    testTimeMs: float
    costUsd: float
    roiScore: float

class OptimizationConstraintsInput(BaseModel):
    maxCostPerWafer: float
    yieldTarget: float
    maxTestTimeMs: float

class OptimizerRequest(BaseModel):
    patterns: List[PatternDataInput]
    constraints: OptimizationConstraintsInput
    waferCount: int = 5
    diesPerWafer: int = 489
    originalYield: float = 92.14

# =====================================================
# YIELD OPTIMIZATION ROUTE
# =====================================================
@app.post("/predict/yield-optimization", tags=["Prediction"])
def optimize_patterns(payload: OptimizerRequest):
    patterns_dict = [p.dict() for p in payload.patterns]
    constraints_dict = payload.constraints.dict()
    
    results = run_constraint_pruning(
        patterns=patterns_dict,
        constraints=constraints_dict,
        wafer_count=payload.waferCount,
        dies_per_wafer=payload.diesPerWafer,
        original_yield=payload.originalYield
    )
    return results


# =====================================================
# TEMP FOLDER
# =====================================================
UPLOAD_DIR = "temp"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# =====================================================
# CONFIG & MASK FOR IMAGES (same as dashboard.py)
# =====================================================
IMG_SIZE = 224
WAFER_CX = IMG_SIZE // 2
WAFER_CY = IMG_SIZE // 2
WAFER_R = 102

Y, X = np.ogrid[:IMG_SIZE, :IMG_SIZE]
_dist = np.sqrt((X - WAFER_CX)**2 + (Y - WAFER_CY)**2)
WAFER_MASK = (_dist <= WAFER_R).astype(np.uint8)

def apply_mask_rgb(rgb):
    out = rgb.copy()
    out[WAFER_MASK == 0] = 0
    return out

def build_overlay(masked_rgb, fail_map, pitch, offset, blur_ksize=3):
    heat = np.nan_to_num(fail_map, nan=0.0).astype(np.float32)
    heat = cv2.resize(heat, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_NEAREST)
    if blur_ksize > 0:
        k = blur_ksize
        if k % 2 == 0:
            k += 1
        heat = cv2.GaussianBlur(heat, (k, k), 0)
    heat = np.clip(heat, 0, 1)
    heat_u8 = (heat * 255).astype(np.uint8)
    heat_color = cv2.applyColorMap(heat_u8, cv2.COLORMAP_INFERNO)
    heat_color = cv2.cvtColor(heat_color, cv2.COLOR_BGR2RGB)
    
    overlay = masked_rgb.copy()
    fail_mask = heat > 0.25
    overlay[fail_mask] = (0.82 * overlay[fail_mask] + 0.18 * heat_color[fail_mask]).astype(np.uint8)
    
    edges = cv2.Canny(heat_u8, 80, 150)
    overlay[edges > 0] = [180, 220, 255]
    cv2.circle(overlay, (WAFER_CX, WAFER_CY), WAFER_R, (255, 255, 255), 2)
    
    ox, oy = offset
    pitch = max(1, int(pitch))
    for x in range(int(ox), IMG_SIZE, pitch):
        overlay[:, x] = (overlay[:, x] * 0.97).astype(np.uint8)
    for y in range(int(oy), IMG_SIZE, pitch):
        overlay[y, :] = (overlay[y, :] * 0.97).astype(np.uint8)
    return overlay

def build_density_map(fail_map):
    density = np.nan_to_num(fail_map, nan=0.0).astype(np.float32)
    density = cv2.resize(density, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_CUBIC)
    density = cv2.GaussianBlur(density, (25, 25), 0)
    density = np.clip(density, 0, 1)
    density_u8 = (density * 255).astype(np.uint8)
    density_color = cv2.applyColorMap(density_u8, cv2.COLORMAP_JET)
    density_color = cv2.cvtColor(density_color, cv2.COLOR_BGR2RGB)
    density_color[WAFER_MASK == 0] = 0
    cv2.circle(density_color, (WAFER_CX, WAFER_CY), WAFER_R, (255, 255, 255), 2)
    return density_color

def build_attention_map(masked_rgb):
    gray = cv2.cvtColor(masked_rgb, cv2.COLOR_RGB2GRAY)
    attention = cv2.GaussianBlur(gray, (31, 31), 0)
    attention = cv2.normalize(attention, None, 0, 255, cv2.NORM_MINMAX)
    attention_color = cv2.applyColorMap(attention.astype(np.uint8), cv2.COLORMAP_MAGMA)
    attention_color = cv2.cvtColor(attention_color, cv2.COLOR_BGR2RGB)
    result = cv2.addWeighted(masked_rgb, 0.65, attention_color, 0.35, 0)
    cv2.circle(result, (WAFER_CX, WAFER_CY), WAFER_R, (255, 255, 255), 2)
    return result

def to_base64_url(img_rgb):
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.png', img_bgr)
    b64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{b64}"

# =====================================================
# HOME ROUTE
# =====================================================
@app.get("/")
def home():
    return {"message": "WaferVision AI API Running"}

# =====================================================
# PREDICTION ROUTE
# =====================================================
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Save image
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run predictions
    result = predict_api(file_path)

    try:
        # Load and process image for overlays
        pil_img = Image.open(file_path).convert("RGB")
        rgb = np.array(pil_img)
        rgb = cv2.resize(rgb, (IMG_SIZE, IMG_SIZE))
        masked_rgb = apply_mask_rgb(rgb)

        # Run dice analytics
        dice_res = analyze_wafer(masked_rgb)
        
        # Build heatmaps
        overlay = build_overlay(masked_rgb, dice_res["map"], dice_res["pitch"], dice_res["offset"], blur_ksize=3)
        density_map = build_density_map(dice_res["map"])
        attention_map = build_attention_map(masked_rgb)

        # Convert to base64 URLs
        result["overlayDataUrl"] = to_base64_url(overlay)
        result["densityDataUrl"] = to_base64_url(density_map)
        result["attentionDataUrl"] = to_base64_url(attention_map)
        result["good"] = int(dice_res["good"])
        result["fail"] = int(dice_res["fail"])
        result["total"] = int(dice_res["total"])
        result["yield"] = float(dice_res["yield"])
        result["dies"] = dice_res["dies"]
    except Exception as e:
        print(f"Error generating heatmaps: {e}")
        # Graceful fallback values
        result["good"] = 0
        result["fail"] = 0
        result["total"] = 0
        result["yield"] = 0.0

    return result