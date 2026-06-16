# d:\officw work -1\ai-1\ai model\optimizer_model.py
from typing import List, Dict, Any

def run_constraint_pruning(
    patterns: List[Dict[str, Any]],
    constraints: Dict[str, float],
    wafer_count: int = 5,
    dies_per_wafer: int = 489,
    original_yield: float = 92.14
) -> Dict[str, Any]:
    """
    AI Defect-Pruning Optimization Model in Python.
    Translates the TypeScript constraint pruning logic to Python.
    """
    # Extract constraint thresholds
    max_cost_per_wafer = constraints.get("maxCostPerWafer", 999999.0)
    yield_target = constraints.get("yieldTarget", 0.0)
    max_test_time_ms = constraints.get("maxTestTimeMs", 999999.0)

    # Calculate base costs and test times
    original_cost_per_wafer = sum(p.get("costUsd", 0.0) for p in patterns) * dies_per_wafer
    original_time_ms = sum(p.get("testTimeMs", 0.0) for p in patterns)

    # 1. Filter patterns by low ROI (< 40)
    # Sort removable patterns lowest ROI score first
    removable = [p for p in patterns if p.get("roiScore", 0) < 40]
    removable.sort(key=lambda x: x.get("roiScore", 0))

    kept = list(patterns)
    removed = []

    for p in removable:
        # Check what happens if we remove this pattern from the kept list
        kept_without_p = [k for k in kept if k.get("id") != p.get("id")]
        projected_cost_per_wafer = sum(k.get("costUsd", 0.0) for k in kept_without_p) * dies_per_wafer
        projected_test_time = sum(k.get("testTimeMs", 0.0) for k in kept_without_p)

        # Defect leakage model: removing a low-ROI pattern slightly lowers yield
        kill_ratio = p.get("killRatio", 1.0)
        yield_impact = kill_ratio * (1.0 - kill_ratio) * 0.05
        projected_yield = original_yield - yield_impact

        # Check if the constraints are still satisfied
        if (
            projected_yield >= yield_target and
            projected_cost_per_wafer <= max_cost_per_wafer and
            projected_test_time <= max_test_time_ms
        ):
            # Safe to remove
            kept = kept_without_p
            removed.append(p)

    # Recalculate final performance metrics
    final_cost_per_wafer = sum(k.get("costUsd", 0.0) for k in kept) * dies_per_wafer
    final_time_ms = sum(k.get("testTimeMs", 0.0) for k in kept)
    final_yield = original_yield - sum(r.get("killRatio", 1.0) * (1.0 - r.get("killRatio", 1.0)) * 0.05 for r in removed)

    # Compute savings ratios
    estimated_cost_reduction = 0.0
    if original_cost_per_wafer > 0:
        estimated_cost_reduction = ((original_cost_per_wafer - final_cost_per_wafer) / original_cost_per_wafer) * 100.0

    estimated_time_savings = 0.0
    if original_time_ms > 0:
        estimated_time_savings = ((original_time_ms - final_time_ms) / original_time_ms) * 100.0

    total_savings_usd = (original_cost_per_wafer - final_cost_per_wafer) * wafer_count

    # Build optimized pattern set detailing actions
    optimized_pattern_set = []
    removed_ids = {r.get("id") for r in removed}
    
    for p in patterns:
        is_removed = p.get("id") in removed_ids
        optimized_pattern_set.append({
            "patternId": p.get("patternId"),
            "patternType": p.get("patternType"),
            "action": "remove" if is_removed else "keep",
            "reason": f"Low ROI: score {p.get('roiScore')}" if is_removed else "ROI score above threshold",
            "impactMs": round(p.get("testTimeMs", 0.0), 1),
            "impactUsd": round(p.get("costUsd", 0.0) * dies_per_wafer, 4)
        })

    return {
        "estimatedCostReduction": round(estimated_cost_reduction, 1),
        "estimatedTimeSavings": round(estimated_time_savings, 1),
        "projectedYield": round(final_yield, 2),
        "patternsReduced": len(removed),
        "patternsReducedPct": round((len(removed) / len(patterns) * 100.0) if patterns else 0.0, 1),
        "totalSavingsUsd": round(total_savings_usd, 2),
        "optimizedPatternSet": optimized_pattern_set
    }
