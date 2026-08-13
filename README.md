# CareerMemory — V1

**CareerMemory** is a personal AI‑powered knowledge capture tool.  
You paste any career‑related note (programming tip, internship advice, GSoC strategy, etc.) and the app returns a clean, structured JSON that you can later store, search, or feed into a recommendation engine.

> **V1 scope** – only the pipeline **Input → Backend → OpenAI → Structured Result → Frontend**.  
> No database, auth, extensions, embeddings, vector search, GitHub/calendar integrations, or recommendation logic yet.

---

## Project layout

```
CareerMemory/
├─ frontend/          # Next.js + TypeScript UI
│  ├─ pages/
│  │  ├─ _app.tsx
│  │  └─ index.tsx               # Home page – uses AnalyzeForm
│  ├─ components/
│  │  └─ AnalyzeForm.tsx         # Textarea, button, loading, error, result
│  ├─ styles/
│  │  └─ globals.css             # Simple, clean styling
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ next.config.js
├─ backend/            # FastAPI + OpenAI
│  ├─ main.py                     # FastAPI app, /api/analyze endpoint
│  ├─ requirements.txt            # Python deps
│  ├─ .env.example                # Shows required env vars (no real key)
│  └─ .gitignore (inherited from root)
└─ README.md
```

---

## Important files – what they do

| File | Purpose |
|------|---------|
| `frontend/pages/index.tsx` | Entry page; renders `AnalyzeForm`. |
| `frontend/components/AnalyzeForm.tsx` | UI: textarea, **Save to Memory** button, loading spinner, error box, pretty‑printed JSON result. Calls `POST http://localhost:8000/api/analyze`. |
| `frontend/styles/globals.css` | Minimal global styles (centered container, readable fonts). |
| `backend/main.py` | FastAPI server. Defines Pydantic models, builds a system prompt, calls OpenAI (`gpt-4o-mini`), validates the JSON, returns it. |
| `backend/requirements.txt` | `fastapi`, `uvicorn`, `pydantic`, `openai`, `python-dotenv`. |
| `backend/.env.example` | Template – copy to `.env` and put your real `OPENAI_API_KEY` there. |
| `.gitignore` | Prevents committing `node_modules`, `.next`, Python cache, and **backend/.env** (keeps secrets out of git). |

---

## How the frontend talks to the backend

1. User types/pastes text and clicks **Save to Memory**.  
2. `AnalyzeForm` does a `fetch` to `http://localhost:8000/api/analyze` with JSON body `{ "content": "…" }`.  
3. While waiting it shows *Analyzing…* (button disabled).  
4. On success it receives the structured JSON and pretty‑prints it.  
5. On failure it shows the error message returned by FastAPI.

*No API key ever reaches the browser – the key lives only in `backend/.env`.*

---

## How the backend talks to OpenAI

1. FastAPI loads `OPENAI_API_KEY` from `.env` via `python-dotenv`.  
2. `call_openai(user_text)` creates an `openai.OpenAI` client and sends a **chat completion** request:  
   * **system** – a fixed prompt telling the model the student context and the exact JSON schema.  
   * **user** – the raw text from the frontend.  
3. `response_format={"type": "json_object"}` forces the model to output valid JSON.  
4. The JSON string is parsed (`eval` is safe here because the model is constrained to JSON) and returned.  
5. FastAPI validates the dict against `AnalyzeResponse` (Pydantic) and sends it back to the frontend.

All errors (network, bad key, malformed JSON) are caught and turned into HTTP 502/500 with a friendly message.

---

## Getting started

### 1. Clone & install backend

```bash
cd CareerMemory/backend
python -m venv .venv            # optional but recommended
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure your OpenAI key

```bash
cp .env.example .env
# edit .env and replace the placeholder with your real key
# OPENAI_API_KEY=sk-...
```

### 3. Run the backend

```bash
uvicorn main:app --reload --port 8000
# Server lives at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### 4. Install & run frontend

```bash
cd ../frontend
npm install          # installs next, react, typescript, etc.
npm run dev          # starts Next.js on http://localhost:3000
```

Open **http://localhost:3000** – you should see the CareerMemory UI.

---

## Common errors & fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ModuleNotFoundError: No module named 'fastapi'` | Dependencies not installed | Run `pip install -r requirements.txt` inside the virtual env |
| `openai.OpenAIError: Invalid API key` | `.env` missing or wrong key | Ensure `backend/.env` exists and contains a valid `OPENAI_API_KEY` |
| Frontend shows “Error: Failed to fetch” | Backend not running or wrong port | Start backend (`uvicorn … --port 8000`) and verify `http://localhost:8000/docs` works |
| CORS error in browser console | FastAPI default blocks cross‑origin | For dev, add `app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])` in `main.py` (optional) |
| `npm run dev` fails with “port 3000 already in use” | Another process on 3000 | Kill it or set `PORT=3001 npm run dev` (Next.js respects `PORT`) |

---

## Next steps (after V1)

* Persist the structured entries (SQLite / PostgreSQL).  
* Add authentication & multi‑user support.  
* Build a semantic search layer (embeddings + vector DB).  
* Implement the recommendation engine that suggests next learning actions.  

---

**Happy learning!** 🚀  
Feel free to tweak the system prompt in `backend/main.py` to better match your evolving career goals.