# d:\officw work -1\ai-1\ai wafer dashbooad\model_validator.py
"""
ATE Yield Optimization Platform — AI Model Validator
=====================================================
Drop this file into:  ai wafer dashboard/model_validator.py
 
Handles:
  1. File upload → read → detect structured vs unstructured
  2. Per-type validation rules (CSV/Excel, JSON/JSONL, Images/BIN, mixed)
  3. Returns a structured ValidationReport that NestJS stores in PostgreSQL
     and optionally triggers the prediction pipeline.
 
Mount the router in your main FastAPI app:
    from model_validator import router as validator_router
    app.include_router(validator_router, prefix="/validate", tags=["Validation"])
"""
 
from __future__ import annotations
 
import io
import json
import logging
import os
import struct
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
 
import numpy as np
import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel, Field
 
logger = logging.getLogger("model_validator")
 
# ---------------------------------------------------------------------------
# Enums & constants
# ---------------------------------------------------------------------------
 
class DataType(str, Enum):
    STRUCTURED = "structured"
    UNSTRUCTURED = "unstructured"
    MIXED = "mixed"
    UNKNOWN = "unknown"
 
 
class FileCategory(str, Enum):
    TABULAR_CSV = "tabular_csv"
    TABULAR_EXCEL = "tabular_excel"
    JSON_DATASET = "json_dataset"
    JSONL_DATASET = "jsonl_dataset"
    IMAGE_PNG = "image_png"
    IMAGE_JPG = "image_jpg"
    WAFER_BIN = "wafer_bin"
    STIL = "stil"
    ATE_LOG = "ate_log"
    ATPG_REPORT = "atpg_report"
    MBIST_REPORT = "mbist_report"
    LBIST_REPORT = "lbist_report"
    UNKNOWN = "unknown"
 
 
class ValidationStatus(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    WARNING = "WARNING"
 
 
# Supported MIME / extension map
STRUCTURED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".tsv", ".json", ".jsonl"}
UNSTRUCTURED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bin", ".bmp", ".tif", ".tiff", ".stil", ".log", ".rpt", ".xml"}
 
# Wafer-specific column names expected in tabular data
WAFER_TABULAR_COLUMNS = {"die_x", "die_y", "pass_fail", "lot_id", "wafer_id", "bin"}
YIELD_TABULAR_COLUMNS = {"test_time", "cost", "yield_rate", "fab", "lot_id", "tester"}
DFT_TABULAR_COLUMNS = {"mbist", "lbist", "scan", "atpg", "chain"}
 
# ---------------------------------------------------------------------------
# Pydantic models (response schemas)
# ---------------------------------------------------------------------------
 
class ColumnStat(BaseModel):
    name: str
    dtype: str
    null_pct: float
    unique_count: int
    sample_values: List[Any]
 
 
class ValidationIssue(BaseModel):
    severity: str  # "error" | "warning" | "info"
    code: str
    message: str
 
 
class ValidationReport(BaseModel):
    validation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    filename: str
    file_size_bytes: int
    file_category: FileCategory
    data_type: DataType
    status: ValidationStatus
    confidence_score: float  # 0.0 – 1.0  overall validation confidence
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    column_stats: Optional[List[ColumnStat]] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    image_channels: Optional[int] = None
    issues: List[ValidationIssue] = []
    recommended_pipeline: str  # which FastAPI endpoint to hit next
    metadata: Dict[str, Any] = {}
    trigger_prediction: bool = False
 
 
# ---------------------------------------------------------------------------
# Helper: detect file category from extension + magic bytes
# ---------------------------------------------------------------------------
 
def _detect_category(filename: str, raw: bytes) -> FileCategory:
    ext = Path(filename).suffix.lower()
 
    if ext in (".png",):
        return FileCategory.IMAGE_PNG
    if ext in (".jpg", ".jpeg"):
        return FileCategory.IMAGE_JPG
    if ext == ".bin":
        return FileCategory.WAFER_BIN
    if ext == ".csv":
        return FileCategory.TABULAR_CSV
    if ext in (".xlsx", ".xls"):
        return FileCategory.TABULAR_EXCEL
    if ext == ".jsonl":
        return FileCategory.JSONL_DATASET
    if ext == ".json":
        return FileCategory.JSON_DATASET
    if ext == ".stil":
        return FileCategory.STIL
    if ext == ".log":
        return FileCategory.ATE_LOG
    if ext == ".rpt":
        fn_lower = filename.lower()
        if "mbist" in fn_lower:
            return FileCategory.MBIST_REPORT
        if "lbist" in fn_lower:
            return FileCategory.LBIST_REPORT
        return FileCategory.ATPG_REPORT
    if ext == ".xml":
        fn_lower = filename.lower()
        if "mbist" in fn_lower:
            return FileCategory.MBIST_REPORT
        if "lbist" in fn_lower:
            return FileCategory.LBIST_REPORT
        return FileCategory.MBIST_REPORT
 
    # Magic-byte fallback
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return FileCategory.IMAGE_PNG
    if raw[:2] in (b"\xff\xd8",):
        return FileCategory.IMAGE_JPG
    if raw[:4] == b"PK\x03\x04":  # ZIP = xlsx
        return FileCategory.TABULAR_EXCEL
 
    return FileCategory.UNKNOWN
 
 
def _category_to_data_type(cat: FileCategory) -> DataType:
    if cat in (FileCategory.TABULAR_CSV, FileCategory.TABULAR_EXCEL,
               FileCategory.JSON_DATASET, FileCategory.JSONL_DATASET):
        return DataType.STRUCTURED
    if cat in (FileCategory.IMAGE_PNG, FileCategory.IMAGE_JPG, FileCategory.WAFER_BIN):
        return DataType.UNSTRUCTURED
    if cat in (FileCategory.STIL, FileCategory.ATE_LOG, FileCategory.ATPG_REPORT,
               FileCategory.MBIST_REPORT, FileCategory.LBIST_REPORT):
        return DataType.UNSTRUCTURED
    return DataType.UNKNOWN
 
 
# ---------------------------------------------------------------------------
# Validators per category
# ---------------------------------------------------------------------------
 
def _validate_tabular(
    df: pd.DataFrame,
    filename: str,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any]]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
 
    if df.empty:
        issues.append(ValidationIssue(severity="error", code="EMPTY_DATAFRAME",
                                      message="File parsed to an empty DataFrame."))
        return ValidationStatus.INVALID, 0.0, issues, meta
 
    cols_lower = {c.lower() for c in df.columns}
 
    # Identify domain
    wafer_overlap = cols_lower & WAFER_TABULAR_COLUMNS
    yield_overlap = cols_lower & YIELD_TABULAR_COLUMNS
    dft_overlap = cols_lower & DFT_TABULAR_COLUMNS
 
    if wafer_overlap:
        meta["detected_domain"] = "wafer_map"
        meta["matched_columns"] = list(wafer_overlap)
    elif yield_overlap:
        meta["detected_domain"] = "yield_parametric"
        meta["matched_columns"] = list(yield_overlap)
    elif dft_overlap:
        meta["detected_domain"] = "dft_logs"
        meta["matched_columns"] = list(dft_overlap)
    else:
        meta["detected_domain"] = "generic"
        issues.append(ValidationIssue(severity="warning", code="UNKNOWN_DOMAIN",
                                      message="Could not match columns to a known ATE domain "
                                              "(wafer_map / yield / dft)."))
 
    # Null check
    null_pct = df.isnull().mean().mean()
    meta["overall_null_pct"] = round(float(null_pct), 4)
    if null_pct > 0.3:
        issues.append(ValidationIssue(severity="error", code="HIGH_NULL_RATE",
                                      message=f"Overall null rate {null_pct:.1%} exceeds 30%."))
    elif null_pct > 0.1:
        issues.append(ValidationIssue(severity="warning", code="MODERATE_NULL_RATE",
                                      message=f"Overall null rate {null_pct:.1%} between 10-30%."))
 
    # Duplicate rows
    dup_count = int(df.duplicated().sum())
    meta["duplicate_rows"] = dup_count
    if dup_count > 0:
        issues.append(ValidationIssue(severity="warning", code="DUPLICATE_ROWS",
                                      message=f"{dup_count} duplicate rows detected."))
 
    # Row-count sanity
    if len(df) < 10:
        issues.append(ValidationIssue(severity="warning", code="VERY_FEW_ROWS",
                                      message=f"Only {len(df)} rows — may be a sample/stub file."))
 
    # Confidence
    error_count = sum(1 for i in issues if i.severity == "error")
    warn_count = sum(1 for i in issues if i.severity == "warning")
    confidence = max(0.0, 1.0 - error_count * 0.35 - warn_count * 0.1)
 
    status = (ValidationStatus.INVALID if error_count > 0
              else ValidationStatus.WARNING if warn_count > 0
              else ValidationStatus.VALID)
 
    return status, round(confidence, 3), issues, meta
 
 
def _validate_image(
    raw: bytes,
    category: FileCategory,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any], int, int, int]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
 
    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
        img = Image.open(io.BytesIO(raw))  # reopen after verify
        w, h = img.size
        channels = len(img.getbands())
    except Exception as exc:
        issues.append(ValidationIssue(severity="error", code="IMAGE_CORRUPT",
                                      message=f"Cannot decode image: {exc}"))
        return ValidationStatus.INVALID, 0.0, issues, meta, 0, 0, 0
 
    meta["mode"] = img.mode
    meta["format"] = img.format
 
    # Resolution check (wafer maps are typically at least 128×128)
    if w < 32 or h < 32:
        issues.append(ValidationIssue(severity="error", code="RESOLUTION_TOO_LOW",
                                      message=f"Image {w}×{h} is below minimum 32×32 for model input."))
    elif w < 128 or h < 128:
        issues.append(ValidationIssue(severity="warning", code="LOW_RESOLUTION",
                                      message=f"Image {w}×{h} is below recommended 128×128."))
 
    # Aspect ratio check
    ratio = max(w, h) / max(min(w, h), 1)
    if ratio > 4.0:
        issues.append(ValidationIssue(severity="warning", code="EXTREME_ASPECT_RATIO",
                                      message=f"Aspect ratio {ratio:.1f}:1 may degrade model accuracy."))
 
    # Blank / near-blank
    arr = np.array(img.convert("L"), dtype=np.float32)
    std_val = float(np.std(arr))
    meta["pixel_std"] = round(std_val, 2)
    if std_val < 2.0:
        issues.append(ValidationIssue(severity="error", code="BLANK_IMAGE",
                                      message="Image appears blank or near-uniform — likely corrupt input."))
 
    error_count = sum(1 for i in issues if i.severity == "error")
    warn_count = sum(1 for i in issues if i.severity == "warning")
    confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.1)
    status = (ValidationStatus.INVALID if error_count > 0
              else ValidationStatus.WARNING if warn_count > 0
              else ValidationStatus.VALID)
 
    return status, round(confidence, 3), issues, meta, w, h, channels
 
 
def _validate_wafer_bin(
    raw: bytes,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any]]:
    """
    Validates a raw binary wafer map.
    Expected layout: 4-byte header (width uint16, height uint16) + width*height bytes (die status).
    """
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
 
    if len(raw) < 4:
        issues.append(ValidationIssue(severity="error", code="BIN_TOO_SHORT",
                                      message="Binary file is less than 4 bytes — cannot parse header."))
        return ValidationStatus.INVALID, 0.0, issues, meta
 
    w, h = struct.unpack("<HH", raw[:4])
    meta["declared_width"] = w
    meta["declared_height"] = h
    expected_len = 4 + w * h
 
    if len(raw) < expected_len:
        issues.append(ValidationIssue(severity="error", code="BIN_SIZE_MISMATCH",
                                      message=f"Header declares {w}×{h}={w*h} dies but file has "
                                              f"{len(raw)-4} bytes of data."))
    if w == 0 or h == 0:
        issues.append(ValidationIssue(severity="error", code="ZERO_DIMENSION",
                                      message="Wafer map has zero-dimension width or height."))
    if w > 1000 or h > 1000:
        issues.append(ValidationIssue(severity="warning", code="UNUSUALLY_LARGE_MAP",
                                      message=f"{w}×{h} exceeds typical wafer die-map dimensions."))
 
    if len(raw) >= expected_len:
        die_array = np.frombuffer(raw[4:expected_len], dtype=np.uint8)
        unique_vals = np.unique(die_array)
        meta["unique_bin_values"] = unique_vals.tolist()
        pass_rate = float(np.mean(die_array == 1))
        meta["pass_rate"] = round(pass_rate, 4)
        if pass_rate < 0.01:
            issues.append(ValidationIssue(severity="warning", code="VERY_LOW_YIELD",
                                          message=f"Pass rate {pass_rate:.1%} — possible all-fail map."))
 
    error_count = sum(1 for i in issues if i.severity == "error")
    warn_count = sum(1 for i in issues if i.severity == "warning")
    confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.1)
    status = (ValidationStatus.INVALID if error_count > 0
              else ValidationStatus.WARNING if warn_count > 0
              else ValidationStatus.VALID)
    return status, round(confidence, 3), issues, meta
 
 
def _validate_json(
    raw: bytes,
    is_jsonl: bool,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any], Optional[pd.DataFrame]]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
    df: Optional[pd.DataFrame] = None
 
    text = raw.decode("utf-8", errors="replace")
 
    if is_jsonl:
        records = []
        for i, line in enumerate(text.splitlines()):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                issues.append(ValidationIssue(severity="error", code="JSONL_PARSE_ERROR",
                                              message=f"Line {i+1} parse error: {exc}"))
                if len(issues) > 5:
                    break
        if records:
            df = pd.json_normalize(records)
            meta["record_count"] = len(records)
    else:
        try:
            obj = json.loads(text)
            if isinstance(obj, list):
                df = pd.json_normalize(obj)
                meta["record_count"] = len(obj)
            elif isinstance(obj, dict):
                df = pd.json_normalize([obj])
                meta["record_count"] = 1
                issues.append(ValidationIssue(severity="info", code="SINGLE_OBJECT",
                                              message="JSON is a single object, not an array. "
                                                      "Wrap in [] if it is a dataset."))
        except json.JSONDecodeError as exc:
            issues.append(ValidationIssue(severity="error", code="JSON_PARSE_ERROR",
                                          message=f"JSON parse error: {exc}"))
 
    error_count = sum(1 for i in issues if i.severity == "error")
    warn_count = sum(1 for i in issues if i.severity == "warning")
    confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.1)
    status = (ValidationStatus.INVALID if error_count > 0
              else ValidationStatus.WARNING if warn_count > 0
              else ValidationStatus.VALID)
    return status, round(confidence, 3), issues, meta, df
 
 
def _validate_stil(
    raw: bytes,
    filename: str,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any]]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
    try:
        content = raw.decode("utf-8", errors="replace")
        has_stil = "STIL" in content
        has_pattern = "Pattern" in content
 
        meta["keywords_found"] = {
            "STIL_header": has_stil,
            "Pattern_block": has_pattern,
        }
 
        if not has_stil:
            issues.append(ValidationIssue(severity="warning", code="MISSING_STIL_HEADER",
                                          message="STIL file does not contain an explicit 'STIL' declaration header."))
 
        lines = content.splitlines()
        meta["line_count"] = len(lines)
        if len(lines) < 5:
            issues.append(ValidationIssue(severity="error", code="FILE_TOO_SHORT",
                                          message="STIL file has fewer than 5 lines. It might be corrupt or incomplete."))
 
        error_count = sum(1 for i in issues if i.severity == "error")
        warn_count = sum(1 for i in issues if i.severity == "warning")
        confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.15)
        status = (ValidationStatus.INVALID if error_count > 0
                  else ValidationStatus.WARNING if warn_count > 0
                  else ValidationStatus.VALID)
        return status, round(confidence, 3), issues, meta
    except Exception as e:
        issues.append(ValidationIssue(severity="error", code="STIL_READ_ERROR",
                                      message=f"Failed to read STIL file: {str(e)}"))
        return ValidationStatus.INVALID, 0.0, issues, meta
 
 
def _validate_ate_log(
    raw: bytes,
    filename: str,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any]]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
    try:
        content = raw.decode("utf-8", errors="replace")
        is_tester_log = any(keyword in content for keyword in ["SmarTest", "G-XL", "Test", "Tester", "Pin", "Fail", "Channel", "Pattern"])
        meta["is_tester_log_format"] = is_tester_log
        lines = content.splitlines()
        meta["line_count"] = len(lines)
 
        if not is_tester_log:
            issues.append(ValidationIssue(severity="warning", code="UNRECOGNIZED_LOG_FORMAT",
                                          message="The file content does not match common ATE tester log signatures."))
 
        if len(lines) < 2:
            issues.append(ValidationIssue(severity="error", code="EMPTY_LOG",
                                          message="ATE Log file is empty or has only one line."))
 
        error_count = sum(1 for i in issues if i.severity == "error")
        warn_count = sum(1 for i in issues if i.severity == "warning")
        confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.15)
        status = (ValidationStatus.INVALID if error_count > 0
                  else ValidationStatus.WARNING if warn_count > 0
                  else ValidationStatus.VALID)
        return status, round(confidence, 3), issues, meta
    except Exception as e:
        issues.append(ValidationIssue(severity="error", code="LOG_READ_ERROR",
                                      message=f"Failed to read ATE Log: {str(e)}"))
        return ValidationStatus.INVALID, 0.0, issues, meta
 
 
def _validate_atpg_report(
    raw: bytes,
    filename: str,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any]]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
    try:
        content = raw.decode("utf-8", errors="replace")
        has_atpg = any(kw in content for kw in ["ATPG", "TetraMAX", "Modus", "Fault", "fault", "coverage", "pattern", "Pattern"])
        meta["has_atpg_signatures"] = has_atpg
        lines = content.splitlines()
        meta["line_count"] = len(lines)
 
        if not has_atpg:
            issues.append(ValidationIssue(severity="warning", code="MISSING_ATPG_SIGNATURES",
                                          message="The report does not contain standard ATPG or coverage keywords."))
 
        error_count = sum(1 for i in issues if i.severity == "error")
        warn_count = sum(1 for i in issues if i.severity == "warning")
        confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.15)
        status = (ValidationStatus.INVALID if error_count > 0
                  else ValidationStatus.WARNING if warn_count > 0
                  else ValidationStatus.VALID)
        return status, round(confidence, 3), issues, meta
    except Exception as e:
        issues.append(ValidationIssue(severity="error", code="ATPG_READ_ERROR",
                                      message=f"Failed to read ATPG report: {str(e)}"))
        return ValidationStatus.INVALID, 0.0, issues, meta
 
 
def _validate_bist_report(
    raw: bytes,
    filename: str,
    is_lbist: bool,
) -> Tuple[ValidationStatus, float, List[ValidationIssue], Dict[str, Any]]:
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
    try:
        content = raw.decode("utf-8", errors="replace")
        type_str = "LBIST" if is_lbist else "MBIST"
        has_bist = any(kw in content for kw in [type_str, "BIST", "diagnostics", "cell", "algorithm", "signature", "fail"])
        meta[f"has_{type_str.lower()}_signatures"] = has_bist
        lines = content.splitlines()
        meta["line_count"] = len(lines)
 
        if not has_bist:
            issues.append(ValidationIssue(severity="warning", code=f"MISSING_{type_str}_SIGNATURES",
                                          message=f"The BIST report does not contain expected {type_str} or BIST diagnostics signatures."))
 
        error_count = sum(1 for i in issues if i.severity == "error")
        warn_count = sum(1 for i in issues if i.severity == "warning")
        confidence = max(0.0, 1.0 - error_count * 0.4 - warn_count * 0.15)
        status = (ValidationStatus.INVALID if error_count > 0
                  else ValidationStatus.WARNING if warn_count > 0
                  else ValidationStatus.VALID)
        return status, round(confidence, 3), issues, meta
    except Exception as e:
        issues.append(ValidationIssue(severity="error", code="BIST_READ_ERROR",
                                      message=f"Failed to read BIST report: {str(e)}"))
        return ValidationStatus.INVALID, 0.0, issues, meta
 
 
# ---------------------------------------------------------------------------
# Pipeline router — maps validated category to the correct endpoint
# ---------------------------------------------------------------------------
 
PIPELINE_MAP: Dict[str, str] = {
    "wafer_map":        "/predict/wafer-classification",
    "yield_parametric": "/predict/yield-optimization",
    "dft_logs":         "/predict/dft-risk",
    "generic_tabular":  "/predict/generic-tabular",
    "image":            "/predict/wafer-segmentation",
    "wafer_bin":        "/predict/wafer-segmentation",
    "unknown":          "/predict/inspect",
}
 
def _choose_pipeline(category: FileCategory, domain: Optional[str]) -> str:
    if category in (FileCategory.IMAGE_PNG, FileCategory.IMAGE_JPG):
        return PIPELINE_MAP["image"]
    if category == FileCategory.WAFER_BIN:
        return PIPELINE_MAP["wafer_bin"]
    if category in (FileCategory.STIL, FileCategory.ATE_LOG, FileCategory.ATPG_REPORT,
                    FileCategory.MBIST_REPORT, FileCategory.LBIST_REPORT):
        return "/predict/dft-risk"
    if domain:
        return PIPELINE_MAP.get(domain, PIPELINE_MAP["generic_tabular"])
    return PIPELINE_MAP["unknown"]
 
 
# ---------------------------------------------------------------------------
# Column stats helper
# ---------------------------------------------------------------------------
 
def _column_stats(df: pd.DataFrame) -> List[ColumnStat]:
    stats = []
    for col in df.columns[:50]:  # cap at 50 columns
        series = df[col]
        sample = series.dropna().head(3).tolist()
        stats.append(ColumnStat(
            name=col,
            dtype=str(series.dtype),
            null_pct=round(float(series.isnull().mean()), 4),
            unique_count=int(series.nunique()),
            sample_values=sample,
        ))
    return stats
 
 
# ---------------------------------------------------------------------------
# Master validate function
# ---------------------------------------------------------------------------
 
async def validate_file(upload: UploadFile) -> ValidationReport:
    raw = await upload.read()
    filename = upload.filename or "unnamed"
    size = len(raw)
 
    category = _detect_category(filename, raw)
    data_type = _category_to_data_type(category)
 
    # ---------- dispatch --------------------------------------------------
    status = ValidationStatus.INVALID
    confidence = 0.0
    issues: List[ValidationIssue] = []
    meta: Dict[str, Any] = {}
    df: Optional[pd.DataFrame] = None
    img_w = img_h = img_ch = None
 
    if category == FileCategory.TABULAR_CSV:
        try:
            df = pd.read_csv(io.BytesIO(raw), low_memory=False)
        except Exception as exc:
            issues.append(ValidationIssue(severity="error", code="CSV_PARSE_ERROR",
                                          message=str(exc)))
        else:
            status, confidence, issues, meta = _validate_tabular(df, filename)
 
    elif category == FileCategory.TABULAR_EXCEL:
        try:
            df = pd.read_excel(io.BytesIO(raw))
        except Exception as exc:
            issues.append(ValidationIssue(severity="error", code="EXCEL_PARSE_ERROR",
                                          message=str(exc)))
        else:
            status, confidence, issues, meta = _validate_tabular(df, filename)
 
    elif category == FileCategory.JSON_DATASET:
        status, confidence, issues, meta, df = _validate_json(raw, is_jsonl=False)
        if df is not None:
            s2, c2, i2, m2 = _validate_tabular(df, filename)
            issues += i2
            meta.update(m2)
            confidence = min(confidence, c2)
            status = s2 if s2 == ValidationStatus.INVALID else status
 
    elif category == FileCategory.JSONL_DATASET:
        status, confidence, issues, meta, df = _validate_json(raw, is_jsonl=True)
        if df is not None:
            s2, c2, i2, m2 = _validate_tabular(df, filename)
            issues += i2
            meta.update(m2)
            confidence = min(confidence, c2)
            status = s2 if s2 == ValidationStatus.INVALID else status
 
    elif category in (FileCategory.IMAGE_PNG, FileCategory.IMAGE_JPG):
        status, confidence, issues, meta, img_w, img_h, img_ch = _validate_image(raw, category)
 
    elif category == FileCategory.WAFER_BIN:
        status, confidence, issues, meta = _validate_wafer_bin(raw)
        img_w = meta.get("declared_width")
        img_h = meta.get("declared_height")
 
    elif category == FileCategory.STIL:
        status, confidence, issues, meta = _validate_stil(raw, filename)
 
    elif category == FileCategory.ATE_LOG:
        status, confidence, issues, meta = _validate_ate_log(raw, filename)
 
    elif category == FileCategory.ATPG_REPORT:
        status, confidence, issues, meta = _validate_atpg_report(raw, filename)
 
    elif category == FileCategory.MBIST_REPORT:
        status, confidence, issues, meta = _validate_bist_report(raw, filename, is_lbist=False)
 
    elif category == FileCategory.LBIST_REPORT:
        status, confidence, issues, meta = _validate_bist_report(raw, filename, is_lbist=True)
 
    else:
        issues.append(ValidationIssue(severity="error", code="UNSUPPORTED_FORMAT",
                                      message=f"File '{filename}' has an unsupported format."))
 
    # ---------- pipeline selection ----------------------------------------
    domain = meta.get("detected_domain")
    pipeline = _choose_pipeline(category, domain)
    trigger = status in (ValidationStatus.VALID, ValidationStatus.WARNING)
 
    # ---------- column stats (tabular only) -------------------------------
    col_stats = _column_stats(df) if df is not None and not df.empty else None
 
    return ValidationReport(
        filename=filename,
        file_size_bytes=size,
        file_category=category,
        data_type=data_type,
        status=status,
        confidence_score=confidence,
        row_count=len(df) if df is not None else None,
        column_count=len(df.columns) if df is not None else None,
        column_stats=col_stats,
        image_width=img_w,
        image_height=img_h,
        image_channels=img_ch,
        issues=issues,
        recommended_pipeline=pipeline,
        metadata=meta,
        trigger_prediction=trigger,
    )
 
 
# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------
 
router = APIRouter()
 
 
@router.post("/upload", response_model=ValidationReport, summary="Validate an AI model input file")
async def validate_upload(file: UploadFile = File(...)):
    """
    Accepts any file type (CSV, Excel, JSON, JSONL, PNG, JPG, BIN).
    Returns a ValidationReport indicating:
      - Structured vs unstructured classification
      - Domain detection (wafer_map / yield / dft / generic)
      - Field-level quality issues (nulls, duplicates, resolution, etc.)
      - Which prediction pipeline to invoke next
      - Whether to trigger the AI model pipeline automatically
    """
    try:
        report = await validate_file(file)
        return report
    except Exception as exc:
        logger.exception("Unexpected error during validation")
        raise HTTPException(status_code=500, detail=str(exc))
 
 
@router.post("/upload-batch", summary="Validate multiple files in one request")
async def validate_batch(files: List[UploadFile] = File(...)):
    """
    Accepts up to 20 files at once. Returns a list of ValidationReports.
    """
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files per batch.")
    reports = []
    for f in files:
        try:
            report = await validate_file(f)
            reports.append(report.dict())
        except Exception as exc:
            reports.append({"filename": f.filename, "status": "ERROR", "detail": str(exc)})
    return JSONResponse(content={"count": len(reports), "results": reports})
