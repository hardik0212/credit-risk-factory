# Credit Risk Factory

An agentic credit-risk factory starter platform for the Dhurin Hackathon 2026 challenge.

The first implemented workflow is the Data Understanding Agent:

1. Upload a full CSV to the platform.
2. Store the file on the backend.
3. Read only metadata, column profiles, top values, and a small sample.
4. Detect likely target variables, IDs, dates, and possible leakage fields.
5. Return a compact agent context that can be sent to an LLM API.

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

## API Boundary

The backend currently generates a compact profile and heuristic target recommendation. The intended next step is replacing or augmenting `build_agent_recommendation` in `backend/app/profiling.py` with a real LLM API call using the returned `agent_context`.
