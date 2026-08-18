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
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

from db import init_db, create_memory, get_memory, list_memories, delete_memory, get_context, upsert_context, get_all_memories, create_action, get_actions, get_action, update_action_status
from relevance import calculate_relevance
from ranking import rank_memories
from recommendations import generate_recommendations
from actions import generate_actions
from connections import find_connections

# Load environment variables from .env (NVIDIA_API_KEY)
load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise RuntimeError("NVIDIA_API_KEY not set in environment")

# NVIDIA NIM (OpenAI‑compatible) endpoint
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
# A currently available NVIDIA‑hosted model good for structured text tasks
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-super-120b-a12b")

app = FastAPI(title="CareerMemory Backend", version="0.2.0")


@app.on_event("startup")
async def startup_event():
    init_db()


# ----- CORS -----
def _parse_origins(raw: str) -> list[str]:
    """Split a comma-separated origin list, dropping empty entries."""
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# Localhost stays available for development; production adds the frontend
# origin(s) through the FRONTEND_URL environment variable (comma-separated).
FRONTEND_ORIGINS = list(dict.fromkeys(
    ["http://localhost:3000"] + _parse_origins(os.getenv("FRONTEND_URL", ""))
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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


class RelevanceResponse(BaseModel):
    score: int
    reasons: list[str]
    signals: dict[str, float]


class RankedMemoryResponse(MemoryResponse):
    """Memory with relevance information for ranking endpoint."""
    relevance: RelevanceResponse


class MemoryListResponse(BaseModel):
    memories: list[MemoryResponse]
    count: int


class RankedMemoryListResponse(BaseModel):
    memories: list[RankedMemoryResponse]
    count: int


class RecommendationResponse(BaseModel):
    memory_id: int
    title: str
    summary: str
    relevance: int
    reason: str
    suggested_actions: list[str]


class RecommendationsListResponse(BaseModel):
    recommendations: list[RecommendationResponse]
    count: int


class ActionStatusUpdate(BaseModel):
    status: str = Field(..., description="Status of the action: pending, in_progress, completed, or dismissed")


class ActionResponse(BaseModel):
    title: str
    description: str
    source_memory_id: int
    priority: int
    reason: str


class ActionsListResponse(BaseModel):
    memory_id: int
    actions: list[ActionResponse]


class ConnectionResponse(BaseModel):
    type: str
    label: str
    matched_value: str
    reason: str


class ConnectionsListResponse(BaseModel):
    memory_id: int
    connections: list[ConnectionResponse]


def _clean_list(values: list[str]) -> list[str]:
    """Trim whitespace and drop empty strings."""
    return [v.strip() for v in values if v.strip()]


class ContextRequest(BaseModel):
    name: str = ""
    current_role: str = ""
    education: str = ""
    career_goal: str = ""
    target_roles: list[str] = []
    interests: list[str] = []
    current_skills: list[str] = []
    current_projects: list[str] = []
    goals: list[str] = []

    @field_validator("name", "current_role", "education", "career_goal", mode="before")
    @classmethod
    def _trim_str(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator(
        "target_roles", "interests", "current_skills", "current_projects", "goals",
        mode="before"
    )
    @classmethod
    def _clean_lists(cls, v):
        if isinstance(v, list):
            return _clean_list(v)
        if isinstance(v, str):
            # support comma-separated string just in case
            return _clean_list(v.split(","))
        return v


class ContextResponse(ContextRequest):
    created_at: str
    updated_at: str


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


# ----- Health endpoint -----
@app.get("/health")
async def health():
    """Simple liveness check."""
    return {"status": "ok"}


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


# ----- Relevance Ranking endpoint -----
@app.get("/api/memories/relevant", response_model=RankedMemoryListResponse)
async def get_relevant_memories(limit: int = 20, offset: int = 0):
    """Return memories ranked by relevance to current user context."""
    if limit > 100:
        limit = 100
    if limit < 1:
        limit = 1
    if offset < 0:
        offset = 0

    context = get_context()
    if not context:
        raise HTTPException(status_code=400, detail="User context not found. Please create context first.")

    all_memories = get_all_memories()
    ranked = rank_memories(all_memories, context)

    # paginate after ranking
    paginated = ranked[offset:offset + limit]
    return {"memories": paginated, "count": len(paginated)}


# ----- Recommendations endpoint -----
@app.get("/api/recommendations", response_model=RecommendationsListResponse)
async def get_recommendations(limit: int = 3):
    """Return conservative recommendations based on relevance ranking."""
    if limit > 5:
        limit = 5
    if limit < 1:
        limit = 1

    context = get_context()
    if not context:
        raise HTTPException(status_code=400, detail="User context not found. Please create context first.")

    all_memories = get_all_memories()
    recs = generate_recommendations(all_memories, context, limit=limit)
    return {"recommendations": recs, "count": len(recs)}


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


# ----- User Context API endpoints -----
@app.get("/api/context", response_model=ContextResponse)
async def get_context_endpoint():
    """Get the current user context."""
    ctx = get_context()
    if not ctx:
        raise HTTPException(status_code=404, detail="User context not found")
    return ctx


@app.put("/api/context", response_model=ContextResponse)
async def upsert_context_endpoint(payload: ContextRequest):
    """Create or update the user context."""
    ctx = upsert_context(
        name=payload.name,
        current_role=payload.current_role,
        education=payload.education,
        career_goal=payload.career_goal,
        target_roles=payload.target_roles,
        interests=payload.interests,
        current_skills=payload.current_skills,
        current_projects=payload.current_projects,
        goals=payload.goals,
    )
    return ctx


# ----- Relevance API endpoint -----
@app.get("/api/memories/{memory_id}/relevance", response_model=RelevanceResponse)
async def get_memory_relevance(memory_id: int):
    """Calculate relevance of a memory to the current user context."""
    memory = get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    context = get_context()
    if not context:
        raise HTTPException(status_code=400, detail="User context not found. Please create context first.")
    relevance = calculate_relevance(memory, context)
    return relevance


# ----- Actions API endpoint -----
@app.get("/api/memories/{memory_id}/actions", response_model=ActionsListResponse)
async def get_memory_actions(memory_id: int):
    """Generate actions for a memory based on its suggested_actions and relevance."""
    memory = get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    context = get_context()
    if not context:
        raise HTTPException(status_code=400, detail="User context not found. Please create context first.")
    relevance = calculate_relevance(memory, context)
    actions = generate_actions(memory, context, relevance)
    return {"memory_id": memory_id, "actions": actions}


@app.patch("/api/actions/{action_id}/status", response_model=dict)
async def update_action_status_endpoint(action_id: int, payload: ActionStatusUpdate):
    """Update an action's status and implement automated context feedback loop."""
    valid_statuses = {"pending", "in_progress", "completed", "dismissed"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    updated = update_action_status(action_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Action not found")

    context_updated = False
    if payload.status == "completed":
        # Fetch the action's title/key skill
        action_title = updated.get("title", "")
        # Get current user context
        ctx = get_context()
        if ctx and ctx.get("current_skills"):
            # Parse current_skills (handle comma-separated string or JSON array)
            current_skills = ctx["current_skills"]
            if isinstance(current_skills, str):
                current_skills = [s.strip() for s in current_skills.split(",") if s.strip()]
            # Determine the key skill from the action title (simple heuristic: first word)
            key_skill = action_title.split()[0] if action_title else ""
            # Check if the key skill is already in current_skills
            if key_skill not in current_skills:
                current_skills.append(key_skill)
                # Update user_context in SQLite
                upsert_context(
                    name=ctx.get("name", ""),
                    current_role=ctx.get("current_role", ""),
                    education=ctx.get("education", ""),
                    career_goal=ctx.get("career_goal", ""),
                    target_roles=ctx.get("target_roles", []),
                    interests=ctx.get("interests", []),
                    current_skills=current_skills,
                    current_projects=ctx.get("current_projects", []),
                    goals=ctx.get("goals", []),
                )
                context_updated = True

    response = {
        "action": updated,
        "context_updated": context_updated,
    }
    return response


# ----- Connections API endpoint -----
@app.get("/api/memories/{memory_id}/connections", response_model=ConnectionsListResponse)
async def get_memory_connections(memory_id: int):
    """Explain how a memory connects to the current user context."""
    memory = get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    context = get_context()
    if not context:
        raise HTTPException(status_code=400, detail="User context not found. Please create context first.")
    relevance = calculate_relevance(memory, context)
    connections = find_connections(memory, context, relevance)
    return {"memory_id": memory_id, "connections": connections}


# ----- Run with: uvicorn main:app --reload --port 8000 -----
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)