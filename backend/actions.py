"""
Action Engine for CareerMemory V0.5 Step 1.
Generates deterministic actions from memory suggested_actions and relevance signals.
"""
from typing import List, Dict, Any
from relevance import calculate_relevance


def _build_reason(signals: Dict[str, float]) -> str:
    """Create a concise human readable reason from non-zero signals."""
    parts = []
    if signals.get("career_goal", 0) > 0:
        parts.append("This supports your career goal.")
    if signals.get("target_roles", 0) > 0:
        parts.append("This supports one of your target roles.")
    if signals.get("interests", 0) > 0:
        parts.append("This matches one of your interests.")
    if signals.get("goals", 0) > 0:
        parts.append("This supports one of your current goals.")
    if signals.get("projects", 0) > 0:
        parts.append("This connects to one of your current projects.")
    if signals.get("skills_topics", 0) > 0:
        parts.append("This builds on your current skills.")
    if not parts:
        return "Relevant based on importance."
    return " ".join(parts)


def _calculate_priority(relevance_score: int, memory_importance: int) -> int:
    """Calculate priority from relevance score and memory importance."""
    priority = round(relevance_score * 0.7 + memory_importance * 0.3)
    return max(0, min(100, priority))


def generate_actions(memory: Dict[str, Any], context: Dict[str, Any], relevance: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate actions from a memory's suggested_actions and relevance signals.
    
    Args:
        memory: Memory dict with title, summary, category, topics, suggested_actions, importance
        context: User context dict with career_goal, target_roles, interests, current_skills, current_projects, goals
        relevance: Relevance dict with score, reasons, signals
    
    Returns:
        List of action dicts with title, description, source_memory_id, priority, reason
    """
    suggested_actions = memory.get("suggested_actions", [])
    if not suggested_actions:
        return []
    
    relevance_score = relevance.get("score", 0)
    memory_importance = memory.get("importance", 0)
    signals = relevance.get("signals", {})
    
    priority = _calculate_priority(relevance_score, memory_importance)
    reason = _build_reason(signals)
    
    actions = []
    for i, action_text in enumerate(suggested_actions):
        actions.append({
            "title": action_text,
            "description": f"{action_text} for '{memory.get('title', '')}'.",
            "source_memory_id": memory.get("id"),
            "priority": priority,
            "reason": reason,
        })
    
    return actions