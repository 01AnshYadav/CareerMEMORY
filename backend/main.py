"""
FastAPI backend for CareerMemory V1.

Endpoints:
- POST /api/analyze  – receives raw text, sends to NVIDIA NIM, returns structured JSON.
"""

import os
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from db import init_db, create_memory, get_memory, list_memories, delete_memory

# Load environment variables from .env (NVIDIA_API_KEY)
load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise RuntimeError("NVIDIA_API_KEY not set in environment")

# NVIDIA NIM (OpenAI‑compatible) endpoint
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
# A currently available NVIDIA‑hosted model good for structured text tasks
NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b"

app = FastAPI(title="CareerMemory Backend", version="0.2.0")


@app.on_event("startup")
async def startup_event():
    init_db()


# ----- CORS -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ----- Request / Response models -----
class AnalyzeRequest(BaseModel):
    """Incoming payload from the frontend."""
    content: str = Field(..., min_length=1, description="Raw user text to be analysed")


class AnalyzeResponse(BaseModel):
    """Structured data returned by the AI."""
    title: str
    summary: str
    category: str
    topics: list[str]
    importance: int = Field(..., ge=0, le=100)
    current_relevance: int = Field(..., ge=0, le=100)
    future_relevance: int = Field(..., ge=0, le=100)
    prerequisites: list[str]
    suggested_actions: list[str]


class MemoryCreate(BaseModel):
    """Request payload for creating a memory."""
    original_text: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    topics: list[str]
    importance: int = Field(..., ge=0, le=100)
    current_relevance: int = Field(..., ge=0, le=100)
    future_relevance: int = Field(..., ge=0, le=100)
    prerequisites: list[str]
    suggested_actions: list[str]


class MemoryResponse(MemoryCreate):
    """Memory as stored in the database."""
    id: int
    created_at: str
    updated_at: str


class MemoryListResponse(BaseModel):
    memories: list[MemoryResponse]
    count: int


# ----- System prompt (same contract as before) -----
SYSTEM_PROMPT = (
    "You are an expert career‑knowledge organiser for a B.Tech student who is "
    "building software‑engineering fundamentals, aiming for internships, "
    "open‑source (GSoC), cybersecurity and strong engineering skills. "
    "Given a piece of raw text, output a JSON object with exactly these keys:\n"
    "title (string), summary (string), category (string), topics (array of strings),\n"
    "importance (0‑100), current_relevance (0‑100), future_relevance (0‑100),\n"
    "prerequisites (array of strings), suggested_actions (array of strings).\n"
    "Return ONLY the JSON object. No extra commentary, no markdown fences."
)


def call_nvidia(user_text: str) -> dict:
    """
    Send the user text to NVIDIA NIM and parse the JSON response.
    Raises HTTPException on any problem.
    """
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text},
        ],
        "temperature": 0.2,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
    except requests.HTTPError as e:
        # Include NVIDIA response body for debugging
        detail = f"NVIDIA API request failed: {e}"
        if resp is not None and resp.text:
            detail += f" | NVIDIA response: {resp.text}"
        raise HTTPException(status_code=502, detail=detail)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"NVIDIA API request failed: {e}")

    try:
        data = resp.json()
        # NVIDIA follows OpenAI chat‑completion format
        content = data["choices"][0]["message"]["content"]
        # Robustly extract JSON: strip markdown fences and surrounding text
        cleaned = content.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            # Remove leading ```json or ```
            lines = cleaned.splitlines()
            # Drop first line if it starts with ```
            if lines[0].startswith("```"):
                lines = lines[1:]
            # Drop last line if it ends with ```
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        # Find first { and last }
        first = cleaned.find("{")
        last = cleaned.rfind("}")
        if first != -1 and last != -1 and last > first:
            cleaned = cleaned[first:last+1]
        parsed = json.loads(cleaned)
        return parsed
    except (KeyError, json.JSONDecodeError, TypeError) as e:
        # Include raw model output for debugging
        raw = content if 'content' in locals() else "N/A"
        raise HTTPException(status_code=500, detail=f"Failed to parse NVIDIA response: {e} | Raw response: {raw}")


# ----- API endpoint -----
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Receives raw text, forwards to NVIDIA NIM, returns structured career‑memory entry.
    """
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content must not be empty")

    structured = call_nvidia(request.content)
    # Pydantic will validate the dict matches AnalyzeResponse
    return structured


# ----- Memory API endpoints -----
@app.post("/api/memories", response_model=MemoryResponse, status_code=201)
async def create_memory_endpoint(memory: MemoryCreate):
    """Create a new memory entry."""
    memory_id = create_memory(
        original_text=memory.original_text,
        title=memory.title,
        summary=memory.summary,
        category=memory.category,
        topics=memory.topics,
        importance=memory.importance,
        current_relevance=memory.current_relevance,
        future_relevance=memory.future_relevance,
        prerequisites=memory.prerequisites,
        suggested_actions=memory.suggested_actions,
    )
    created = get_memory(memory_id)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to retrieve created memory")
    return created


@app.get("/api/memories", response_model=MemoryListResponse)
async def list_memories_endpoint(limit: int = 50, offset: int = 0):
    """List memories, newest first. Max limit 100."""
    if limit > 100:
        limit = 100
    if limit < 1:
        limit = 1
    if offset < 0:
        offset = 0
    memories = list_memories(limit=limit, offset=offset)
    return {"memories": memories, "count": len(memories)}


@app.get("/api/memories/{memory_id}", response_model=MemoryResponse)
async def get_memory_endpoint(memory_id: int):
    """Get a single memory by ID."""
    memory = get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@app.delete("/api/memories/{memory_id}")
async def delete_memory_endpoint(memory_id: int):
    """Delete a memory by ID."""
    deleted = delete_memory(memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"ok": True, "deleted_id": memory_id}


# ----- Run with: uvicorn main:app --reload --port 8000 -----
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)