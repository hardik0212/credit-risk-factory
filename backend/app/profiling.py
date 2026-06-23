from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

SAMPLE_ROWS = 75
MAX_TOP_VALUES = 8
PROFILE_CHUNK_SIZE = 50_000

TARGET_HINTS = (
    "target",
    "label",
    "default",
    "bad",
    "charged",
    "chargeoff",
    "charge_off",
    "loan_status",
    "status",
    "outcome",
    "response",
)

LEAKAGE_HINTS = (
    "recover",
    "recovery",
    "collection",
    "last_pymnt",
    "next_pymnt",
    "total_pymnt",
    "total_rec",
    "out_prncp",
    "settlement",
    "hardship",
    "last_credit_pull",
)

ID_HINTS = ("id", "record", "member", "account", "customer", "user")
DATE_HINTS = ("date", "_d", "dt", "month", "year", "issue", "earliest")


def profile_csv(path: Path, original_name: str, dataset_id: str) -> dict[str, Any]:
    preview = pd.read_csv(path, nrows=SAMPLE_ROWS)
    columns = list(preview.columns)

    row_count = 0
    missing_counts = Counter()
    unique_values: dict[str, set[Any]] = {column: set() for column in columns}
    top_values: dict[str, Counter] = {column: Counter() for column in columns}
    numeric_stats: dict[str, dict[str, float]] = {}

    for chunk in pd.read_csv(path, chunksize=PROFILE_CHUNK_SIZE):
        row_count += len(chunk)
        missing_counts.update(chunk.isna().sum().to_dict())

        for column in columns:
            series = chunk[column]
            non_null = series.dropna()

            if len(unique_values[column]) <= 101:
                unique_values[column].update(non_null.astype(str).unique()[:120])

            if preview[column].dtype == "object" or non_null.nunique(dropna=True) <= 50:
                top_values[column].update(non_null.astype(str).value_counts().head(25).to_dict())

            if pd.api.types.is_numeric_dtype(series):
                values = pd.to_numeric(series, errors="coerce").dropna().astype(float)
                if values.empty:
                    continue
                stats = numeric_stats.setdefault(
                    column,
                    {"min": np.inf, "max": -np.inf, "sum": 0.0, "sum_sq": 0.0, "count": 0.0},
                )
                stats["min"] = min(stats["min"], float(values.min()))
                stats["max"] = max(stats["max"], float(values.max()))
                stats["sum"] += float(values.sum())
                stats["sum_sq"] += float((values * values).sum())
                stats["count"] += float(values.count())

    column_profiles = []
    for column in columns:
        missing = int(missing_counts[column])
        unique_count = len(unique_values[column])
        numeric = numeric_stats.get(column)
        stats = None
        if numeric and numeric["count"]:
            mean = numeric["sum"] / numeric["count"]
            variance = max((numeric["sum_sq"] / numeric["count"]) - (mean * mean), 0.0)
            stats = {
                "min": round(numeric["min"], 4),
                "max": round(numeric["max"], 4),
                "mean": round(mean, 4),
                "std": round(float(np.sqrt(variance)), 4),
            }

        column_profiles.append(
            {
                "name": column,
                "dtype": str(preview[column].dtype),
                "semantic_type": infer_semantic_type(column, preview[column]),
                "missing_count": missing,
                "missing_pct": round((missing / row_count) * 100, 2) if row_count else 0,
                "unique_count_estimate": unique_count if unique_count <= 101 else "100+",
                "top_values": dict(top_values[column].most_common(MAX_TOP_VALUES)),
                "numeric_stats": stats,
            }
        )

    sample_rows = preview.replace({np.nan: None}).to_dict(orient="records")
    recommendation = build_agent_recommendation(column_profiles)

    return {
        "dataset_id": dataset_id,
        "file_name": original_name,
        "row_count": row_count,
        "column_count": len(columns),
        "columns": column_profiles,
        "sample_rows": sample_rows,
        "agent_context": {
            "file_name": original_name,
            "row_count": row_count,
            "column_count": len(columns),
            "columns": column_profiles,
            "sample_rows": sample_rows[:10],
        },
        "agent_recommendation": recommendation,
    }


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


def build_agent_recommendation(columns: list[dict[str, Any]]) -> dict[str, Any]:
    scored_targets = []
    id_columns = []
    date_columns = []
    leakage_columns = []

    for column in columns:
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
        "human_review_required": True,
        "next_api_call": {
            "status": "not_called",
            "description": "Send agent_context to the LLM after the user confirms or edits the recommendation.",
        },
    }
