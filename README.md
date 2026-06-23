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

Frontend routing starts in `frontend/src/routes.js`. Pages live under `frontend/src/pages`, with Agent 1 implemented at `frontend/src/pages/AgentOnePage`. Shared UI lives under `frontend/src/components`.

Backend reusable helpers live in `backend/app/functions.py`; `backend/app/profiling.py` is kept as the CSV profiling orchestrator.

## Run Locally

### One-command startup

From the repo root:

```bash
npm run dev
```

This creates the backend virtual environment if needed, installs backend/frontend dependencies, and starts both services.

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/api/health`

To enable the AI recommendation call, set an OpenAI key before starting:

```bash
export OPENAI_API_KEY="your-key"
npm run dev
```

Optional:

```bash
export OPENAI_MODEL="gpt-4.1-mini"
```

The backend sends only the compact column profile and 100 sample rows to the AI API, not the full CSV.

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

Reusable frontend components live under `frontend/src/components`, page-specific components live beside their page, and `frontend/src/main.jsx` only mounts the app.
