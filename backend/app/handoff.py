from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

import pandas as pd


def create_agent_two_handoff(
    package: dict[str, Any],
    upload_dir: Path,
    output_dir: Path,
) -> dict[str, Any]:
    dataset_id = package["dataset_id"]
    source_csv = find_uploaded_dataset(upload_dir, dataset_id)
    result_dir = next_result_dir(output_dir)
    result_dir.mkdir(parents=True, exist_ok=False)

    raw_data_path = result_dir / f"raw_{package['file_name']}"
    modeling_data_path = result_dir / "modeling_data_without_excluded_columns.csv"
    package_path = result_dir / "agent_1_handoff_package.json"
    readme_path = result_dir / "README.md"

    shutil.copy2(source_csv, raw_data_path)
    write_modeling_csv(source_csv, modeling_data_path, package.get("excluded_variables", []))
    package_path.write_text(json.dumps(package, indent=2), encoding="utf-8")
    readme_path.write_text(build_handoff_readme(package), encoding="utf-8")

    return {
        "status": "created",
        "folder_name": result_dir.name,
        "folder_path": str(result_dir),
        "files": {
            "raw_data": str(raw_data_path),
            "modeling_data": str(modeling_data_path),
            "agent_1_package": str(package_path),
            "readme": str(readme_path),
        },
    }


def find_uploaded_dataset(upload_dir: Path, dataset_id: str) -> Path:
    matches = sorted(upload_dir.glob(f"{dataset_id}_*.csv"))
    if not matches:
        raise FileNotFoundError(f"No uploaded CSV found for dataset_id={dataset_id}")
    return matches[0]


def next_result_dir(output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    index = 1
    while True:
        candidate = output_dir / f"result{index}"
        if not candidate.exists():
            return candidate
        index += 1


def write_modeling_csv(source_csv: Path, target_csv: Path, excluded_variables: list[str]) -> None:
    excluded = set(excluded_variables)
    first_chunk = True

    for chunk in pd.read_csv(source_csv, chunksize=50_000):
        columns_to_keep = [column for column in chunk.columns if column not in excluded]
        chunk.loc[:, columns_to_keep].to_csv(
            target_csv,
            mode="w" if first_chunk else "a",
            header=first_chunk,
            index=False,
        )
        first_chunk = False


def build_handoff_readme(package: dict[str, Any]) -> str:
    return "\n".join(
        [
            "# Agent 2 Handoff",
            "",
            f"Dataset: {package['file_name']}",
            f"Target variable: {package.get('target_variable') or 'Not selected'}",
            "",
            "## Files",
            "",
            "- `raw_*.csv`: full uploaded raw dataset.",
            "- `modeling_data_without_excluded_columns.csv`: dataset with reviewed excluded columns removed.",
            "- `agent_1_handoff_package.json`: approved Agent 1 decisions and schema metadata.",
            "",
            "## Counts",
            "",
            f"- Selected variables: {len(package.get('selected_variables', []))}",
            f"- Review variables: {len(package.get('review_variables', []))}",
            f"- Excluded variables: {len(package.get('excluded_variables', []))}",
            "",
            "Agent 2 should use this folder as its input contract.",
            "",
        ]
    )
