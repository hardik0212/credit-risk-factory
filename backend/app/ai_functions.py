from __future__ import annotations

import json
import os
from typing import Any

from .constants import DEFAULT_OPENAI_MODEL


AGENT_RECOMMENDATION_SCHEMA = {
    "name": "agent_one_recommendation",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "recommended_target": {"type": ["string", "null"]},
            "target_candidates": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "confidence": {"type": "number"},
                        "reason": {"type": "string"},
                    },
                    "required": ["name", "confidence", "reason"],
                },
            },
            "id_columns": {"type": "array", "items": {"type": "string"}},
            "date_columns": {"type": "array", "items": {"type": "string"}},
            "possible_leakage_columns": {"type": "array", "items": {"type": "string"}},
            "variable_selection": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "agent_scope": {"type": "string"},
                    "selected_candidates": {"type": "array", "items": {"$ref": "#/$defs/variable_decision"}},
                    "review_candidates": {"type": "array", "items": {"$ref": "#/$defs/variable_decision"}},
                    "excluded_candidates": {"type": "array", "items": {"$ref": "#/$defs/variable_decision"}},
                },
                "required": ["agent_scope", "selected_candidates", "review_candidates", "excluded_candidates"],
            },
            "business_summary": {"type": "string"},
            "human_review_questions": {"type": "array", "items": {"type": "string"}},
        },
        "$defs": {
            "variable_decision": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["name", "reason"],
            },
        },
        "required": [
            "recommended_target",
            "target_candidates",
            "id_columns",
            "date_columns",
            "possible_leakage_columns",
            "variable_selection",
            "business_summary",
            "human_review_questions",
        ],
    },
    "strict": True,
}


def build_compact_ai_context(
    file_name: str,
    row_count: int,
    column_count: int,
    columns: list[dict[str, Any]],
    sample_rows: list[dict[str, Any]],
    heuristic_recommendation: dict[str, Any],
) -> dict[str, Any]:
    return {
        "file_name": file_name,
        "row_count": row_count,
        "column_count": column_count,
        "columns": columns,
        "sample_rows": sample_rows[:100],
        "heuristic_recommendation": heuristic_recommendation,
        "instruction": "Use only this compact profile and sample. The full CSV is not available to the AI.",
    }


def get_ai_recommendation(agent_context: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "status": "skipped",
            "provider": "openai",
            "model": os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL),
            "reason": "OPENAI_API_KEY is not set.",
            "recommendation": None,
        }

    try:
        from openai import OpenAI

        model = os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)
        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are Agent 1 in a credit risk model factory. "
                        "You receive only compact dataset metadata and up to 100 sample rows. "
                        "Do not assume access to the full file. Identify target candidates, IDs, dates, "
                        "leakage risks, initial variable selection, and human review questions. "
                        "Be conservative for banking model governance."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(agent_context, default=str),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    **AGENT_RECOMMENDATION_SCHEMA,
                }
            },
        )
        return {
            "status": "success",
            "provider": "openai",
            "model": model,
            "reason": "AI recommendation generated from compact profile and 100-row sample.",
            "recommendation": json.loads(response.output_text),
        }
    except Exception as exc:
        return {
            "status": "error",
            "provider": "openai",
            "model": os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL),
            "reason": str(exc),
            "recommendation": None,
        }


def merge_ai_with_heuristic_recommendation(
    heuristic_recommendation: dict[str, Any],
    ai_result: dict[str, Any],
) -> dict[str, Any]:
    if ai_result["status"] != "success" or not ai_result.get("recommendation"):
        recommendation = dict(heuristic_recommendation)
        recommendation["ai_status"] = ai_result
        recommendation["ai_help_used"] = False
        recommendation["recommendation_source"] = "heuristic"
        return recommendation

    recommendation = dict(ai_result["recommendation"])
    recommendation["human_review_required"] = True
    recommendation["next_api_call"] = {
        "status": "not_called",
        "description": "Send the reviewed Agent 1 package to Agent 2 after human approval.",
    }
    recommendation["ai_status"] = {key: value for key, value in ai_result.items() if key != "recommendation"}
    recommendation["ai_help_used"] = True
    recommendation["recommendation_source"] = "openai"
    return recommendation
