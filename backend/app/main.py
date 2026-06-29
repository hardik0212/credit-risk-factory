from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .handoff import create_agent_two_handoff
from .profiling import profile_csv

BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "agent_outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Credit Risk Factory API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/datasets/profile")
async def upload_and_profile_dataset(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A CSV file is required.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported in this prototype.")

    dataset_id = str(uuid4())
    safe_name = Path(file.filename).name
    stored_path = UPLOAD_DIR / f"{dataset_id}_{safe_name}"

    try:
        with stored_path.open("wb") as target:
            while chunk := await file.read(1024 * 1024):
                target.write(chunk)

        profile = profile_csv(stored_path, original_name=safe_name, dataset_id=dataset_id)
        return profile
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Could not decode the CSV. Please use UTF-8 CSV input.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to profile dataset: {exc}") from exc


@app.post("/api/agent-one/handoff")
def create_agent_one_handoff(package: dict):
    try:
        return create_agent_two_handoff(package, upload_dir=UPLOAD_DIR, output_dir=OUTPUT_DIR)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create Agent 2 handoff: {exc}") from exc
