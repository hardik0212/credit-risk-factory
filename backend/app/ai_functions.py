from __future__ import annotations

import json
import os
from typing import Any

from .constants import DEFAULT_GEMINI_FALLBACK_MODELS, DEFAULT_GEMINI_MODEL, DEFAULT_OPENAI_MODEL


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
        "columns": [compact_column_profile(column) for column in columns],
        "sample_rows": [compact_sample_row(row) for row in sample_rows[:100]],
        "heuristic_recommendation": heuristic_recommendation,
        "instruction": "Use only this compact profile and sample. The full CSV is not available to the AI.",
    }


def compact_column_profile(column: dict[str, Any]) -> dict[str, Any]:
    top_values = column.get("top_values") or {}
    return {
        "name": column.get("name"),
        "dtype": column.get("dtype"),
        "semantic_type": column.get("semantic_type"),
        "missing_pct": column.get("missing_pct"),
        "unique_count_estimate": column.get("unique_count_estimate"),
        "top_values": list(top_values.keys())[:5],
        "numeric_stats": column.get("numeric_stats"),
    }


def compact_sample_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: compact_value(value) for key, value in row.items()}


def compact_value(value: Any) -> Any:
    if isinstance(value, str) and len(value) > 80:
        return f"{value[:77]}..."
    return value


def get_ai_recommendation(agent_context: dict[str, Any]) -> dict[str, Any]:
    provider = resolve_ai_provider()
    if provider["name"] == "none":
        return {
            "status": "skipped",
            "provider": "none",
            "model": None,
            "reason": "No AI API key is set. Add GOOGLE_API_KEY or OPENAI_API_KEY.",
            "recommendation": None,
        }

    if provider["name"] == "google":
        return get_gemini_recommendation(agent_context, provider["api_key"])

    return get_openai_recommendation(agent_context, provider["api_key"])


def resolve_ai_provider() -> dict[str, str | None]:
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if google_api_key:
        return {"name": "google", "api_key": google_api_key}
    if openai_api_key and openai_api_key.startswith("sk-"):
        return {"name": "openai", "api_key": openai_api_key}
    if openai_api_key:
        return {"name": "google", "api_key": openai_api_key}

    return {"name": "none", "api_key": None}


def get_openai_recommendation(agent_context: dict[str, Any], api_key: str) -> dict[str, Any]:
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


def get_gemini_recommendation(agent_context: dict[str, Any], api_key: str) -> dict[str, Any]:
    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    prompt = (
        "You are Agent 1 in a credit risk model factory. "
        "You receive only compact dataset metadata and up to 100 sample rows. "
        "Do not assume access to the full file. Identify target candidates, IDs, dates, "
        "leakage risks, initial variable selection, and human review questions. "
        "Be conservative for banking model governance. Return only valid JSON with this shape: "
        "{recommended_target, target_candidates, id_columns, date_columns, possible_leakage_columns, "
        "variable_selection: {agent_scope, selected_candidates, review_candidates, excluded_candidates}, "
        "business_summary, human_review_questions}. Each candidate item must include name and reason; "
        "target candidates also include confidence.\n\n"
        f"{json.dumps(agent_context, default=str)}"
    )

    try:
        response_model, text = generate_gemini_json(prompt, api_key, model)
        return {
            "status": "success",
            "provider": "google",
            "model": response_model,
            "reason": "Gemini recommendation generated from compact profile and 100-row sample.",
            "recommendation": json.loads(text),
        }
    except Exception as exc:
        return {
            "status": "error",
            "provider": "google",
            "model": model,
            "reason": str(exc),
            "recommendation": None,
        }


def generate_gemini_json(prompt: str, api_key: str, primary_model: str) -> tuple[str, str]:
    import requests

    candidate_models = list(dict.fromkeys([primary_model, *DEFAULT_GEMINI_FALLBACK_MODELS]))
    errors: list[str] = []

    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        try:
            response = requests.post(
                url,
                params={"key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.2,
                    },
                },
                timeout=25,
            )
        except requests.RequestException as exc:
            errors.append(f"{model}: {exc}")
            continue

        if response.status_code < 400:
            payload = response.json()
            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            return model, text

        errors.append(f"{model}: {response.status_code} {response.text[:300]}")
        if response.status_code not in {429, 500, 502, 503, 504}:
            break

    raise RuntimeError("Gemini request failed. " + " | ".join(errors))


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
    recommendation["recommendation_source"] = ai_result.get("provider", "ai")
    return recommendation
