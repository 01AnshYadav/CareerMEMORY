"""
Ranking service for CareerMemory V0.4.
Ranks memories by relevance to the current user context.
"""
from typing import List, Dict, Any
from relevance import calculate_relevance

def rank_memories(memories: List[Dict[str, Any]], context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Calculate relevance for each memory, attach relevance info, and sort descending by score.
    Secondary sort: updated_at descending, then created_at descending for stability.
    """
    ranked = []
    for mem in memories:
        relevance = calculate_relevance(mem, context)
        # Create a copy with relevance attached
        mem_with_rel = dict(mem)
        mem_with_rel["relevance"] = relevance
        ranked.append(mem_with_rel)

    # Sort: primary score desc, secondary updated_at desc, then created_at desc
    ranked.sort(
        key=lambda m: (
            -m["relevance"]["score"],
            -_timestamp_to_float(m.get("updated_at", "")),
            -_timestamp_to_float(m.get("created_at", "")),
        )
    )
    return ranked


def _timestamp_to_float(ts: str) -> float:
    """Convert ISO timestamp to float for sorting; missing -> 0."""
    try:
        from datetime import datetime
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0