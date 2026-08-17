"""
Connection engine for CareerMemory V0.5 Step 3.
Explains how a memory relates to the user's current context using existing relevance signals.
"""
from typing import List, Dict, Any
import re

# Same stopwords as relevance.py
STOPWORDS = {
    "a", "an", "the", "to", "of", "and", "in", "for", "with", "on", "is", "my",
    "learn", "work", "project", "projects"
}

def _normalize(text: str) -> str:
    return text.lower().strip()

def _tokenize(text: str) -> List[str]:
    tokens = re.findall(r"[a-z0-9]+", _normalize(text))
    return [tok for tok in tokens if tok not in STOPWORDS]

def _has_overlap(tokens_a: List[str], tokens_b: List[str]) -> bool:
    set_b = set(tokens_b)
    return any(tok in set_b for tok in tokens_a)

def _memory_tokens(memory: Dict[str, Any]) -> set:
    """Return combined token set from memory text fields."""
    mem_text_fields = [
        memory.get("title", ""),
        memory.get("summary", ""),
        memory.get("category", ""),
        " ".join(memory.get("topics", [])),
    ]
    mem_combined = " ".join(mem_text_fields)
    return set(_tokenize(mem_combined))

def _memory_topic_tokens(memory: Dict[str, Any]) -> set:
    """Return token set from memory topics only."""
    mem_topic_tokens = set()
    for t in memory.get("topics", []):
        mem_topic_tokens.update(_tokenize(t))
    return mem_topic_tokens

def find_connections(memory: Dict[str, Any], context: Dict[str, Any], relevance: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate connections based on non-zero relevance signals.
    Returns list of connection dicts with keys: type, label, matched_value, reason.
    """
    signals = relevance.get("signals", {})
    mem_tokens = _memory_tokens(memory)
    mem_topic_tokens = _memory_topic_tokens(memory)
    connections = []

    # Helper to add connection
    def add_conn(conn_type: str, label: str, matched_value: str, reason_template: str):
        connections.append({
            "type": conn_type,
            "label": label,
            "matched_value": matched_value,
            "reason": reason_template.format(matched_value)
        })

    # 1. career_goal
    if signals.get("career_goal", 0) > 0:
        cg = context.get("career_goal", "")
        if cg:
            add_conn("career_goal", "Career Goal", cg,
                     "This memory supports your {0} career goal.")

    # 2. target_role
    if signals.get("target_roles", 0) > 0:
        for role in context.get("target_roles", []):
            role_tokens = _tokenize(role)
            if _has_overlap(role_tokens, list(mem_tokens)):
                add_conn("target_role", "Target Role", role,
                         "This memory aligns with your target role: {0}.")

    # 3. project
    if signals.get("projects", 0) > 0:
        for proj in context.get("current_projects", []):
            proj_tokens = _tokenize(proj)
            if _has_overlap(proj_tokens, list(mem_tokens)):
                add_conn("project", "Current Project", proj,
                         "This memory connects to your current project: {0}.")

    # 4. goal
    if signals.get("goals", 0) > 0:
        for goal in context.get("goals", []):
            goal_tokens = _tokenize(goal)
            if _has_overlap(goal_tokens, list(mem_tokens)):
                add_conn("goal", "Goal", goal,
                         "This memory supports your goal: {0}.")

    # 5. interest
    if signals.get("interests", 0) > 0:
        for interest in context.get("interests", []):
            int_tokens = _tokenize(interest)
            if _has_overlap(int_tokens, list(mem_tokens)):
                add_conn("interest", "Interest", interest,
                         "This memory matches your interest: {0}.")

    # 6. skill
    if signals.get("skills_topics", 0) > 0:
        for skill in context.get("current_skills", []):
            skill_tokens = _tokenize(skill)
            if _has_overlap(skill_tokens, list(mem_topic_tokens)):
                add_conn("skill", "Skill", skill,
                         "This memory builds on your skill: {0}.")

    return connections