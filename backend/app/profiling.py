from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .constants import PROFILE_CHUNK_SIZE, SAMPLE_ROWS
from .ai_functions import build_compact_ai_context, get_ai_recommendation, merge_ai_with_heuristic_recommendation
from .functions import build_agent_recommendation, build_column_profile, update_column_accumulators


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
        update_column_accumulators(chunk, preview, unique_values, top_values, numeric_stats)

    column_profiles = [
        build_column_profile(
            column,
            preview,
            row_count,
            missing_counts,
            unique_values,
            top_values,
            numeric_stats,
        )
        for column in columns
    ]

    sample_rows = preview.replace({np.nan: None}).to_dict(orient="records")
    heuristic_recommendation = build_agent_recommendation(column_profiles)
    agent_context = build_compact_ai_context(
        file_name=original_name,
        row_count=row_count,
        column_count=len(columns),
        columns=column_profiles,
        sample_rows=sample_rows,
        heuristic_recommendation=heuristic_recommendation,
    )
    ai_result = get_ai_recommendation(agent_context)
    recommendation = merge_ai_with_heuristic_recommendation(heuristic_recommendation, ai_result)

    return {
        "dataset_id": dataset_id,
        "file_name": original_name,
        "row_count": row_count,
        "column_count": len(columns),
        "columns": column_profiles,
        "sample_rows": sample_rows,
        "agent_context": agent_context,
        "heuristic_recommendation": heuristic_recommendation,
        "agent_recommendation": recommendation,
    }
