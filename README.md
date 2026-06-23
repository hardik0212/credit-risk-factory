# Credit Risk Factory

An agentic credit-risk factory starter platform for the Dhurin Hackathon 2026 challenge.

The first implemented workflow is **Agent 1: Data Readiness & Variable Selection**:

1. Upload a full CSV to the platform.
2. Store the file on the backend.
3. Read only metadata, column profiles, top values, and a small sample.
4. Detect likely target variables, IDs, dates, and possible leakage fields.
5. Produce initial DQR and variable-selection recommendations.
6. Let a human reviewer confirm the target, override column types, and exclude variables.
7. Create a reviewed Agent 1 package for **Agent 2: Model Development**.

## Project Structure

```text
backend/   FastAPI upload and profiling API
frontend/  Vite React interface
```

## Run Locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL shown by Vite. The app expects the backend at `http://localhost:8000`.

## Agent Boundary

The backend currently generates a compact profile, heuristic target recommendation, DQR signals, and initial variable-selection package. The frontend pauses before the next API/agent call so a human can approve the package. The intended next step is sending the approved Agent 1 package to Agent 2 for model development and validation.

Reusable frontend components live under `frontend/src/components`, with app-level state orchestration kept in `frontend/src/main.jsx`.
