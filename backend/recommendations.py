"""
Recommendation service for CareerMemory V0.4 Step 3.
Generates conservative recommendations from ranked memories.
"""
from typing import List, Dict, Any
from ranking import rank_memories
from relevance import calculate_relevance

RELEVANCE_THRESHOLD = 60
DEFAULT_LIMIT = 3
MAX_LIMIT = 5

def _build_reason(signals: Dict[str, float]) -> str:
    """Create a concise human readable reason from non-zero signals."""
    parts = []
    if signals.get("career_goal", 0) > 0:
        parts.append("relevant to your career goal")
    if signals.get("target_roles", 0) > 0:
        parts.append("connects to one of your target roles")
    if signals.get("interests", 0) > 0:
        parts.append("matches one of your interests")
    if signals.get("goals", 0) > 0:
        parts.append("supports one of your goals")
    if signals.get("projects", 0) > 0:
        parts.append("connected to your current project")
    if signals.get("skills_topics", 0) > 0:
        parts.append("related to your current skills")
    if not parts:
        return "Relevant based on importance."
    if len(parts) == 1:
        return f"This is {parts[0]}."
    # combine first two for brevity
    return f"This is {parts[0]} and {parts[1]}."

def generate_recommendations(memories: List[Dict[str, Any]], context: Dict[str, Any], limit: int = DEFAULT_LIMIT) -> List[Dict[str, Any]]:
    """
    Returns a list of recommendation dicts.
    Each dict contains: memory_id, title, summary, relevance, reason, suggested_actions
    """
    if limit > MAX_LIMIT:
        limit = MAX_LIMIT
    if limit < 1:
        limit = 1

    # Rank all memories with relevance attached
    ranked = rank_memories(memories, context)

    # Filter by threshold
    candidates = [m for m in ranked if m["relevance"]["score"] >= RELEVANCE_THRESHOLD]

    # Take top `limit`
    top = candidates[:limit]

    recommendations = []
    for mem in top:
        rel = mem["relevance"]
        reason = _build_reason(rel["signals"])
        recommendations.append({
            "memory_id": mem["id"],
            "title": mem["title"],
            "summary": mem["summary"],
            "relevance": rel["score"],
            "reason": reason,
            "suggested_actions": mem.get("suggested_actions", []),
        })
    return recommendations