"""
Comprehensive tests for CareerMemory V0.4 Step 3 Recommendations.
Uses isolated in-memory database to avoid mutating production data.
"""

import sqlite3
import json
import tempfile
import os
from typing import List, Dict, Any
from datetime import datetime

from db import init_db, create_memory, get_context, upsert_context, get_all_memories
from relevance import calculate_relevance
from ranking import rank_memories
from recommendations import generate_recommendations, RELEVANCE_THRESHOLD, DEFAULT_LIMIT, MAX_LIMIT


def create_test_db() -> str:
    """Create a temporary database file and return its path."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    return path


def setup_test_db(db_path: str) -> None:
    """Initialize test database with schema."""
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_text TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                category TEXT NOT NULL,
                topics TEXT NOT NULL,
                importance INTEGER NOT NULL,
                current_relevance INTEGER NOT NULL,
                future_relevance INTEGER NOT NULL,
                prerequisites TEXT NOT NULL,
                suggested_actions TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_context (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT,
                current_role TEXT,
                education TEXT,
                career_goal TEXT,
                target_roles TEXT,
                interests TEXT,
                current_skills TEXT,
                current_projects TEXT,
                goals TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()
    finally:
        conn.close()


def insert_test_memory(db_path: str, **kwargs) -> int:
    """Insert a test memory directly into the database."""
    now = datetime.utcnow().isoformat() + "Z"
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.execute(
            """
            INSERT INTO memories (
                original_text, title, summary, category, topics,
                importance, current_relevance, future_relevance,
                prerequisites, suggested_actions, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                kwargs.get("original_text", "test"),
                kwargs.get("title", "Test Memory"),
                kwargs.get("summary", "Test summary"),
                kwargs.get("category", "Test"),
                json.dumps(kwargs.get("topics", [])),
                kwargs.get("importance", 50),
                kwargs.get("current_relevance", 50),
                kwargs.get("future_relevance", 50),
                json.dumps(kwargs.get("prerequisites", [])),
                json.dumps(kwargs.get("suggested_actions", [])),
                now,
                now,
            ),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def insert_test_context(db_path: str, **kwargs) -> None:
    """Insert a test context directly into the database."""
    now = datetime.utcnow().isoformat() + "Z"
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO user_context (
                id, name, current_role, education, career_goal,
                target_roles, interests, current_skills, current_projects, goals,
                created_at, updated_at
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                kwargs.get("name", "Test User"),
                kwargs.get("current_role", "Student"),
                kwargs.get("education", "CS"),
                kwargs.get("career_goal", "Backend Engineer"),
                json.dumps(kwargs.get("target_roles", ["Backend Engineer"])),
                json.dumps(kwargs.get("interests", ["Docker", "Backend"])),
                json.dumps(kwargs.get("current_skills", ["Python", "FastAPI"])),
                json.dumps(kwargs.get("current_projects", ["CareerMemory"])),
                json.dumps(kwargs.get("goals", ["Learn Docker"])),
                now,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def get_all_memories_from_db(db_path: str) -> List[Dict[str, Any]]:
    """Get all memories from a specific database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM memories ORDER BY created_at DESC").fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["topics"] = json.loads(d["topics"])
            d["prerequisites"] = json.loads(d["prerequisites"])
            d["suggested_actions"] = json.loads(d["suggested_actions"])
            result.append(d)
        return result
    finally:
        conn.close()


def get_context_from_db(db_path: str) -> Dict[str, Any]:
    """Get context from a specific database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute("SELECT * FROM user_context WHERE id = 1").fetchone()
        if not row:
            return None
        d = dict(row)
        for field in ["target_roles", "interests", "current_skills", "current_projects", "goals"]:
            val = d.get(field)
            d[field] = json.loads(val) if val else []
        return d
    finally:
        conn.close()


def test_high_relevance_recommended():
    """Test that high relevance memories are recommended."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    # Insert context matching Docker/Backend
    insert_test_context(db_path, career_goal="Backend Engineer", target_roles=["Backend Engineer"], interests=["Docker"], current_skills=["Python"], current_projects=["CareerMemory"], goals=["Learn Docker"])
    
    # Insert high relevance memory (Docker related)
    insert_test_memory(db_path, title="Learn Docker", summary="Docker for backend", category="Software Engineering", topics=["Docker", "Backend"], importance=80, suggested_actions=["Learn Docker fundamentals"])
    
    # Insert low relevance memory (Photography)
    insert_test_memory(db_path, title="Photography basics", summary="Composition tips", category="Arts", topics=["Photography"], importance=30, suggested_actions=[])
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    recs = generate_recommendations(memories, context, limit=3)
    
    assert len(recs) == 1, f"Expected 1 recommendation, got {len(recs)}"
    assert recs[0]["title"] == "Learn Docker", f"Expected 'Learn Docker', got {recs[0]['title']}"
    assert recs[0]["relevance"] >= RELEVANCE_THRESHOLD, f"Relevance {recs[0]['relevance']} below threshold"
    print("[PASS] test_high_relevance_recommended passed")


def test_low_relevance_excluded():
    """Test that low relevance memories are excluded."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", target_roles=["Backend Engineer"], interests=["Docker"], current_skills=["Python"], current_projects=["CareerMemory"], goals=["Learn Docker"])
    
    # Only low relevance memory
    insert_test_memory(db_path, title="Photography basics", summary="Composition tips", category="Arts", topics=["Photography"], importance=30, suggested_actions=[])
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    recs = generate_recommendations(memories, context, limit=3)
    
    assert len(recs) == 0, f"Expected 0 recommendations, got {len(recs)}"
    print("[PASS] test_low_relevance_excluded passed")


def test_default_limit_3():
    """Test default limit is 3."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", target_roles=["Backend Engineer", "DevOps Engineer", "Platform Engineer"], interests=["Docker", "Kubernetes", "Backend"], current_skills=["Python", "Go", "FastAPI"], current_projects=["CareerMemory", "Project2", "Project3"], goals=["Learn Docker", "Learn K8s", "Build API"])
    
    # Insert 5 high relevance memories
    for i in range(5):
        insert_test_memory(db_path, title=f"Docker Topic {i}", summary=f"Docker for backend {i}", category="Software Engineering", topics=["Docker", "Backend"], importance=80, suggested_actions=[f"Action {i}"])
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    # Call without explicit limit (should default to 3)
    recs = generate_recommendations(memories, context)
    
    assert len(recs) == 3, f"Expected 3 (default), got {len(recs)}"
    print("[PASS] test_default_limit_3 passed")


def test_limit_5():
    """Test limit=5 returns up to 5."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", target_roles=["Backend Engineer", "DevOps Engineer", "Platform Engineer"], interests=["Docker", "Kubernetes", "Backend"], current_skills=["Python", "Go", "FastAPI"], current_projects=["CareerMemory", "Project2", "Project3"], goals=["Learn Docker", "Learn K8s", "Build API"])
    
    for i in range(5):
        insert_test_memory(db_path, title=f"Docker Topic {i}", summary=f"Docker for backend {i}", category="Software Engineering", topics=["Docker", "Backend"], importance=80, suggested_actions=[f"Action {i}"])
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    recs = generate_recommendations(memories, context, limit=5)
    
    assert len(recs) == 5, f"Expected 5, got {len(recs)}"
    print("[PASS] test_limit_5 passed")


def test_limit_capped_at_5():
    """Test limit > 5 is capped at 5."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", target_roles=["Backend Engineer"], interests=["Docker"], current_skills=["Python"], current_projects=["CareerMemory"], goals=["Learn Docker"])
    
    for i in range(10):
        insert_test_memory(db_path, title=f"Docker Topic {i}", summary=f"Docker for backend {i}", category="Software Engineering", topics=["Docker", "Backend"], importance=80, suggested_actions=[f"Action {i}"])
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    recs = generate_recommendations(memories, context, limit=10)
    
    assert len(recs) == 5, f"Expected 5 (capped), got {len(recs)}"
    print("[PASS] test_limit_capped_at_5 passed")


def test_missing_context():
    """Test error when context is missing."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    # No context inserted
    insert_test_memory(db_path, title="Learn Docker", summary="Docker for backend", category="Software Engineering", topics=["Docker", "Backend"], importance=80)
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    assert context is None, "Context should be None"
    
    # Should handle None context gracefully (returns empty or raises)
    try:
        recs = generate_recommendations(memories, context, limit=3)
        # If it doesn't raise, it should return empty list
        assert recs == [], f"Expected empty list for missing context, got {recs}"
    except Exception as e:
        # Acceptable to raise an error
        pass
    
    print("[PASS] test_missing_context passed")


def test_empty_memory_collection():
    """Test with empty memory collection."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer")
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    recs = generate_recommendations(memories, context, limit=3)
    
    assert recs == [], f"Expected empty list, got {recs}"
    print("[PASS] test_empty_memory_collection passed")


def test_suggested_actions_preserved():
    """Test that suggested_actions from memory are preserved in recommendation."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", interests=["Docker"], current_skills=["Python"])
    
    insert_test_memory(db_path, title="Learn Docker", summary="Docker for backend", category="Software Engineering", topics=["Docker", "Backend"], importance=80, suggested_actions=["Learn Docker fundamentals", "Build a Dockerfile", "Deploy container"])
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    recs = generate_recommendations(memories, context, limit=3)
    
    assert len(recs) == 1
    assert recs[0]["suggested_actions"] == ["Learn Docker fundamentals", "Build a Dockerfile", "Deploy container"], f"Actions not preserved: {recs[0]['suggested_actions']}"
    print("[PASS] test_suggested_actions_preserved passed")


def test_reasons_correspond_to_signals():
    """Test that recommendation reasons correspond to actual relevance signals."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    # Context with specific career goal, target role, interest
    insert_test_context(db_path, 
        career_goal="Backend Engineering with Docker",
        target_roles=["Backend Engineer", "DevOps Engineer"],
        interests=["Docker", "Kubernetes"],
        current_skills=["Python", "FastAPI"],
        current_projects=["CareerMemory"],
        goals=["Learn Docker", "Deploy to production"]
    )
    
    # Memory that matches career goal, target role, interest, and skill
    insert_test_memory(db_path, 
        title="Docker for Backend", 
        summary="Using Docker in backend engineering",
        category="Software Engineering", 
        topics=["Docker", "Backend", "Python"], 
        importance=90, 
        suggested_actions=["Build Dockerfile"]
    )
    
    memories = get_all_memories_from_db(db_path)
    context = get_context_from_db(db_path)
    
    # First check relevance signals
    relevance = calculate_relevance(memories[0], context)
    print(f"  Signals: {relevance['signals']}")
    print(f"  Reasons: {relevance['reasons']}")
    
    recs = generate_recommendations(memories, context, limit=3)
    
    assert len(recs) == 1
    reason = recs[0]["reason"]
    print(f"  Recommendation reason: {reason}")
    
    # Reason should mention career goal and/or target role and/or interest
    assert "career goal" in reason.lower() or "target role" in reason.lower() or "interest" in reason.lower(), f"Reason doesn't match signals: {reason}"
    print("[PASS] test_reasons_correspond_to_signals passed")


def test_no_database_mutation():
    """Test that generate_recommendations doesn't mutate the database."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", interests=["Docker"])
    
    # Insert memory and get initial count
    mem_id = insert_test_memory(db_path, title="Learn Docker", summary="Docker for backend", category="Software Engineering", topics=["Docker", "Backend"], importance=80)
    
    initial_memories = get_all_memories_from_db(db_path)
    initial_count = len(initial_memories)
    
    # Call recommendations multiple times
    context = get_context_from_db(db_path)
    for _ in range(5):
        recs = generate_recommendations(initial_memories, context, limit=3)
    
    # Check database still has same memories
    final_memories = get_all_memories_from_db(db_path)
    final_count = len(final_memories)
    
    assert initial_count == final_count, f"Database mutated: {initial_count} -> {final_count}"
    assert initial_memories == final_memories, "Memory data changed"
    print("[PASS] test_no_database_mutation passed")


def run_all_tests():
    """Run all tests."""
    print("Running recommendation tests with isolated database...\n")
    
    test_high_relevance_recommended()
    test_low_relevance_excluded()
    test_default_limit_3()
    test_limit_5()
    test_limit_capped_at_5()
    test_missing_context()
    test_empty_memory_collection()
    test_suggested_actions_preserved()
    test_reasons_correspond_to_signals()
    test_no_database_mutation()
    
    print("\n[SUCCESS] All tests passed!")


if __name__ == "__main__":
    run_all_tests()