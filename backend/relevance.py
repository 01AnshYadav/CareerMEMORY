"""
Relevance engine for CareerMemory V0.4.
Calculates how relevant a memory is to the current user context.
"""
from typing import Dict, List, Any
import re

# Small stopword set to avoid false positives from generic words
STOPWORDS = {
    "a", "an", "the", "to", "of", "and", "in", "for", "with", "on", "is", "my",
    "learn", "work", "project", "projects"
}

def _normalize(text: str) -> str:
    """Lowercase and strip."""
    return text.lower().strip()

def _tokenize(text: str) -> List[str]:
    """Split into alphanumeric tokens and remove stopwords."""
    tokens = re.findall(r"[a-z0-9]+", _normalize(text))
    return [tok for tok in tokens if tok not in STOPWORDS]

def _has_overlap(tokens_a: List[str], tokens_b: List[str]) -> bool:
    set_b = set(tokens_b)
    return any(tok in set_b for tok in tokens_a)

def calculate_relevance(memory: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns dict with keys: score (int), reasons (list[str]), signals (dict[str, float])
    """
    # Prepare normalized token sets from memory
    mem_text_fields = [
        memory.get("title", ""),
        memory.get("summary", ""),
        memory.get("category", ""),
        " ".join(memory.get("topics", [])),
    ]
    mem_combined = " ".join(mem_text_fields)
    mem_tokens = set(_tokenize(mem_combined))
    mem_topic_tokens = set()
    for t in memory.get("topics", []):
        mem_topic_tokens.update(_tokenize(t))

    signals: Dict[str, float] = {}
    reasons: List[str] = []

    # 1. Career goal match (max 25)
    career_goal = context.get("career_goal", "")
    if career_goal:
        goal_tokens = _tokenize(career_goal)
        if _has_overlap(goal_tokens, list(mem_tokens)):
            signals["career_goal"] = 25.0
            reasons.append("Matches your career goal")
        else:
            signals["career_goal"] = 0.0
    else:
        signals["career_goal"] = 0.0

    # 2. Target role match (max 20)
    target_roles = context.get("target_roles", [])
    role_match = False
    for role in target_roles:
        role_tokens = _tokenize(role)
        if _has_overlap(role_tokens, list(mem_tokens)):
            role_match = True
            break
    if role_match:
        signals["target_roles"] = 20.0
        reasons.append("Relevant to one of your target roles")
    else:
        signals["target_roles"] = 0.0

    # 3. Interest match (max 15)
    interests = context.get("interests", [])
    interest_match = False
    for interest in interests:
        int_tokens = _tokenize(interest)
        if _has_overlap(int_tokens, list(mem_tokens)):
            interest_match = True
            break
    if interest_match:
        signals["interests"] = 15.0
        reasons.append("Matches one of your interests")
    else:
        signals["interests"] = 0.0

    # 4. Goal match (max 15)
    goals = context.get("goals", [])
    goal_match = False
    for g in goals:
        g_tokens = _tokenize(g)
        if _has_overlap(g_tokens, list(mem_tokens)):
            goal_match = True
            break
    if goal_match:
        signals["goals"] = 15.0
        reasons.append("Supports one of your goals")
    else:
        signals["goals"] = 0.0

    # 5. Project match (max 10)
    projects = context.get("current_projects", [])
    project_match = False
    for proj in projects:
        p_tokens = _tokenize(proj)
        if _has_overlap(p_tokens, list(mem_tokens)):
            project_match = True
            break
    if project_match:
        signals["projects"] = 10.0
        reasons.append("Connected to your current project")
    else:
        signals["projects"] = 0.0

    # 6. Skills / topics relationship (max 10)
    skills = context.get("current_skills", [])
    skill_match = False
    for skill in skills:
        s_tokens = _tokenize(skill)
        if _has_overlap(s_tokens, list(mem_topic_tokens)):
            skill_match = True
            break
    if skill_match:
        signals["skills_topics"] = 10.0
        reasons.append("Related to your current skills")
    else:
        signals["skills_topics"] = 0.0

    # 7. Importance (max 5)
    importance = memory.get("importance", 0)
    # scale 0-100 to 0-5
    importance_score = round(importance * 5 / 100, 1)
    signals["importance"] = importance_score
    if importance_score > 0:
        reasons.append("High importance memory")

    # Total score
    total = sum(signals.values())
    total = max(0, min(100, round(total)))

    return {
        "score": total,
        "reasons": reasons,
        "signals": signals,
    }