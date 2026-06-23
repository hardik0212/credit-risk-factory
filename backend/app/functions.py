from __future__ import annotations

from collections import Counter
from typing import Any

import numpy as np
import pandas as pd

from .constants import DATE_HINTS, ID_HINTS, LEAKAGE_HINTS, MAX_TOP_VALUES, TARGET_HINTS


def infer_semantic_type(column: str, series: pd.Series) -> str:
    name = column.lower()
    if any(hint in name for hint in ID_HINTS):
        return "identifier"
    if any(hint in name for hint in DATE_HINTS):
        return "date"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if series.nunique(dropna=True) <= 25:
        return "categorical"
    return "text"


def update_column_accumulators(
    chunk: pd.DataFrame,
    preview: pd.DataFrame,
    unique_values: dict[str, set[Any]],
    top_values: dict[str, Counter],
    numeric_stats: dict[str, dict[str, float]],
) -> None:
    for column in preview.columns:
        series = chunk[column]
        non_null = series.dropna()

        if len(unique_values[column]) <= 101:
            unique_values[column].update(non_null.astype(str).unique()[:120])

        if preview[column].dtype == "object" or non_null.nunique(dropna=True) <= 50:
            top_values[column].update(non_null.astype(str).value_counts().head(25).to_dict())

        if pd.api.types.is_numeric_dtype(series):
            update_numeric_stats(column, series, numeric_stats)


def update_numeric_stats(column: str, series: pd.Series, numeric_stats: dict[str, dict[str, float]]) -> None:
    values = pd.to_numeric(series, errors="coerce").dropna().astype(float)
    if values.empty:
        return

    stats = numeric_stats.setdefault(
        column,
        {"min": np.inf, "max": -np.inf, "sum": 0.0, "sum_sq": 0.0, "count": 0.0},
    )
    stats["min"] = min(stats["min"], float(values.min()))
    stats["max"] = max(stats["max"], float(values.max()))
    stats["sum"] += float(values.sum())
    stats["sum_sq"] += float((values * values).sum())
    stats["count"] += float(values.count())


def summarize_numeric_stats(numeric: dict[str, float] | None) -> dict[str, float] | None:
    if not numeric or not numeric["count"]:
        return None

    mean = numeric["sum"] / numeric["count"]
    variance = max((numeric["sum_sq"] / numeric["count"]) - (mean * mean), 0.0)
    return {
        "min": round(numeric["min"], 4),
        "max": round(numeric["max"], 4),
        "mean": round(mean, 4),
        "std": round(float(np.sqrt(variance)), 4),
    }


def build_column_profile(
    column: str,
    preview: pd.DataFrame,
    row_count: int,
    missing_counts: Counter,
    unique_values: dict[str, set[Any]],
    top_values: dict[str, Counter],
    numeric_stats: dict[str, dict[str, float]],
) -> dict[str, Any]:
    missing = int(missing_counts[column])
    unique_count = len(unique_values[column])
    return {
        "name": column,
        "dtype": str(preview[column].dtype),
        "semantic_type": infer_semantic_type(column, preview[column]),
        "missing_count": missing,
        "missing_pct": round((missing / row_count) * 100, 2) if row_count else 0,
        "unique_count_estimate": unique_count if unique_count <= 101 else "100+",
        "top_values": dict(top_values[column].most_common(MAX_TOP_VALUES)),
        "numeric_stats": summarize_numeric_stats(numeric_stats.get(column)),
    }


def build_agent_recommendation(columns: list[dict[str, Any]]) -> dict[str, Any]:
    scored_targets = []
    id_columns = []
    date_columns = []
    leakage_columns = []

    for column in columns:
        name = column["name"].lower()
        score = score_target_candidate(column)

        if score >= 4:
            scored_targets.append(
                {
                    "name": column["name"],
                    "confidence": min(score / 10, 0.95),
                    "reason": "Column name and value pattern look like an outcome/label field.",
                    "top_values": column["top_values"],
                }
            )

        if column["semantic_type"] == "identifier":
            id_columns.append(column["name"])
        if column["semantic_type"] == "date":
            date_columns.append(column["name"])
        if any(hint in name for hint in LEAKAGE_HINTS):
            leakage_columns.append(column["name"])

    scored_targets.sort(key=lambda item: item["confidence"], reverse=True)
    recommended_target = scored_targets[0]["name"] if scored_targets else None

    return {
        "recommended_target": recommended_target,
        "target_candidates": scored_targets[:5],
        "id_columns": id_columns,
        "date_columns": date_columns,
        "possible_leakage_columns": leakage_columns,
        "variable_selection": build_variable_selection(columns, scored_targets),
        "human_review_required": True,
        "next_api_call": {
            "status": "not_called",
            "description": "Send the reviewed Agent 1 package to Agent 2 after human approval.",
        },
    }


def score_target_candidate(column: dict[str, Any]) -> int:
    name = column["name"].lower()
    score = 0

    if any(hint == name for hint in TARGET_HINTS):
        score += 5
    if any(hint in name for hint in TARGET_HINTS):
        score += 3
    if column["semantic_type"] == "categorical":
        score += 2
    if isinstance(column["unique_count_estimate"], int) and 2 <= column["unique_count_estimate"] <= 20:
        score += 2
    if column["missing_pct"] > 40:
        score -= 2

    return score


def build_variable_selection(columns: list[dict[str, Any]], target_candidates: list[dict[str, Any]]) -> dict[str, Any]:
    selected_candidates = []
    review_candidates = []
    excluded_candidates = []
    target_names = {item["name"] for item in target_candidates[:5]}

    for column in columns:
        decision = classify_variable(column, target_names)
        if decision["status"] == "selected":
            selected_candidates.append(decision["payload"])
        elif decision["status"] == "review":
            review_candidates.append(decision["payload"])
        else:
            excluded_candidates.append(decision["payload"])

    return {
        "agent_scope": "Agent 1 handles ingestion, profiling, target detection, DQR signals, and initial variable selection.",
        "selected_candidates": selected_candidates,
        "review_candidates": review_candidates,
        "excluded_candidates": excluded_candidates,
    }


def classify_variable(column: dict[str, Any], target_names: set[str]) -> dict[str, Any]:
    name = column["name"]
    lowered = name.lower()
    is_identifier = column["semantic_type"] == "identifier"
    is_leakage = any(hint in lowered for hint in LEAKAGE_HINTS)
    is_target = name in target_names
    is_constant = column["unique_count_estimate"] in (0, 1)

    if is_target:
        return variable_decision("excluded", name, "Target candidate, not an input variable.")
    if is_identifier:
        return variable_decision("excluded", name, "Identifier field with limited modeling value.")
    if is_leakage:
        return variable_decision("excluded", name, "Potential post-outcome leakage field.")
    if is_constant:
        return variable_decision("excluded", name, "Constant or empty field.")
    if column["missing_pct"] >= 60:
        return variable_decision("review", name, "High missingness; needs business review.")
    if column["semantic_type"] == "text":
        return variable_decision("review", name, "Free-text field; may need encoding or exclusion.")

    return variable_decision("selected", name, "Usable candidate after initial quality and leakage checks.")


def variable_decision(status: str, name: str, reason: str) -> dict[str, Any]:
    return {
        "status": status,
        "payload": {"name": name, "reason": reason},
    }
