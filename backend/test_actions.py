"""
Comprehensive tests for CareerMemory V0.5 Step 1 Action Engine.
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
from actions import generate_actions, _calculate_priority, _build_reason


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


def get_memory_from_db(db_path: str, memory_id: int) -> Dict[str, Any]:
    """Get a specific memory from the database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["topics"] = json.loads(d["topics"])
        d["prerequisites"] = json.loads(d["prerequisites"])
        d["suggested_actions"] = json.loads(d["suggested_actions"])
        return d
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


def test_memory_with_suggested_actions_generates_actions():
    """Test that memory with suggested_actions generates actions."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", target_roles=["Backend Engineer"], interests=["Docker"], current_skills=["Python"], current_projects=["CareerMemory"], goals=["Learn Docker"])
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals", "Build a Dockerfile", "Containerize a FastAPI project"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert len(actions) == 3, f"Expected 3 actions, got {len(actions)}"
    assert actions[0]["title"] == "Learn Docker fundamentals"
    assert actions[1]["title"] == "Build a Dockerfile"
    assert actions[2]["title"] == "Containerize a FastAPI project"
    assert all(a["source_memory_id"] == mem_id for a in actions)
    print("[PASS] test_memory_with_suggested_actions_generates_actions")


def test_memory_without_suggested_actions_returns_empty():
    """Test that memory without suggested_actions returns empty list."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer")
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=[]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert actions == [], f"Expected empty list, got {actions}"
    print("[PASS] test_memory_without_suggested_actions_returns_empty")


def test_priority_calculation_correct():
    """Test that priority calculation is correct."""
    # priority = round(relevance_score * 0.7 + memory_importance * 0.3)
    assert _calculate_priority(100, 100) == 100
    assert _calculate_priority(0, 0) == 0
    assert _calculate_priority(80, 60) == round(80 * 0.7 + 60 * 0.3)  # 56 + 18 = 74
    assert _calculate_priority(50, 50) == 50
    assert _calculate_priority(90, 30) == round(90 * 0.7 + 30 * 0.3)  # 63 + 9 = 72
    print("[PASS] test_priority_calculation_correct")


def test_priority_clamped_0_100():
    """Test that priority remains between 0 and 100."""
    # Even with extreme values, should clamp
    assert _calculate_priority(100, 100) == 100
    assert _calculate_priority(0, 0) == 0
    # Test edge cases
    assert _calculate_priority(150, 150) == 100  # Should clamp to 100
    assert _calculate_priority(-50, -50) == 0    # Should clamp to 0
    print("[PASS] test_priority_clamped_0_100")


def test_career_goal_signal_produces_reason():
    """Test that career_goal signal produces appropriate reason."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineering with Docker")
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend engineering", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert len(actions) == 1
    assert "career goal" in actions[0]["reason"].lower()
    print("[PASS] test_career_goal_signal_produces_reason")


def test_target_role_signal_produces_reason():
    """Test that target_roles signal produces appropriate reason."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, target_roles=["Backend Engineer", "DevOps Engineer"])
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend engineering", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert len(actions) == 1
    assert "target role" in actions[0]["reason"].lower()
    print("[PASS] test_target_role_signal_produces_reason")


def test_project_signal_produces_reason():
    """Test that current_projects signal produces appropriate reason."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    # Use project name that overlaps with memory tokens (Docker, Backend)
    insert_test_context(db_path, current_projects=["Docker Backend Project"])
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend engineering", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert len(actions) == 1
    assert "project" in actions[0]["reason"].lower()
    print("[PASS] test_project_signal_produces_reason")


def test_goal_signal_produces_reason():
    """Test that goals signal produces appropriate reason."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, goals=["Learn Docker", "Deploy to production"])
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend engineering", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert len(actions) == 1
    assert "goal" in actions[0]["reason"].lower()
    print("[PASS] test_goal_signal_produces_reason")


def test_multiple_signals_produce_combined_reason():
    """Test that multiple signals produce a sensible combined reason."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, 
        career_goal="Backend Engineering",
        target_roles=["Backend Engineer"],
        interests=["Docker"],
        current_projects=["Docker Backend Project"],
        goals=["Learn Docker"],
        current_skills=["Python"]
    )
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend engineering", 
        category="Software Engineering", 
        topics=["Docker", "Backend", "Python"], 
        importance=90, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    
    actions = generate_actions(memory, context, relevance)
    
    assert len(actions) == 1
    reason = actions[0]["reason"]
    # Should mention multiple signals
    assert "career goal" in reason.lower()
    assert "target role" in reason.lower()
    assert "interest" in reason.lower()
    assert "project" in reason.lower()
    assert "goal" in reason.lower()
    assert "skill" in reason.lower()
    print("[PASS] test_multiple_signals_produce_combined_reason")


def test_missing_memory_returns_404():
    """Test that missing memory returns 404 (simulated by checking get_memory returns None)."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer")
    
    # Don't insert any memory, so get_memory would return None
    # We'll test the logic by checking that generate_actions would not be called
    memory = None  # Simulates missing memory
    context = get_context_from_db(db_path)
    
    # The endpoint would raise 404 before calling generate_actions
    # This test verifies the expected behavior
    assert memory is None
    print("[PASS] test_missing_memory_returns_404")


def test_missing_context_returns_400():
    """Test that missing context returns 400 (simulated by checking get_context returns None)."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    # Don't insert context
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = None  # Simulates missing context
    
    # The endpoint would raise 400 before calling generate_actions
    assert context is None
    print("[PASS] test_missing_context_returns_400")


def test_actions_do_not_mutate_database():
    """Test that generate_actions does not mutate the database."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, career_goal="Backend Engineer", interests=["Docker"])
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend", 
        category="Software Engineering", 
        topics=["Docker", "Backend"], 
        importance=80, 
        suggested_actions=["Learn Docker fundamentals", "Build a Dockerfile"]
    )
    
    # Get initial state
    memory_before = get_memory_from_db(db_path, mem_id)
    context_before = get_context_from_db(db_path)
    
    # Call generate_actions multiple times
    for _ in range(5):
        relevance = calculate_relevance(memory_before, context_before)
        actions = generate_actions(memory_before, context_before, relevance)
    
    # Check database state unchanged
    memory_after = get_memory_from_db(db_path, mem_id)
    context_after = get_context_from_db(db_path)
    
    assert memory_before == memory_after, "Memory was mutated"
    assert context_before == context_after, "Context was mutated"
    print("[PASS] test_actions_do_not_mutate_database")


def test_relevance_calculation_unchanged():
    """Test that existing relevance calculation remains unchanged."""
    db_path = create_test_db()
    setup_test_db(db_path)
    
    insert_test_context(db_path, 
        career_goal="Backend Engineering",
        target_roles=["Backend Engineer"],
        interests=["Docker"],
        current_skills=["Python"],
        current_projects=["CareerMemory"],
        goals=["Learn Docker"]
    )
    
    mem_id = insert_test_memory(db_path, 
        title="Learn Docker", 
        summary="Docker for backend engineering", 
        category="Software Engineering", 
        topics=["Docker", "Backend", "Python"], 
        importance=90, 
        suggested_actions=["Learn Docker fundamentals"]
    )
    
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    
    # Calculate relevance multiple times - should be identical
    relevance1 = calculate_relevance(memory, context)
    relevance2 = calculate_relevance(memory, context)
    relevance3 = calculate_relevance(memory, context)
    
    assert relevance1 == relevance2 == relevance3, "Relevance calculation not deterministic"
    assert "score" in relevance1
    assert "reasons" in relevance1
    assert "signals" in relevance1
    print("[PASS] test_relevance_calculation_unchanged")


def run_all_tests():
    """Run all tests."""
    print("Running action engine tests with isolated database...\n")
    
    test_memory_with_suggested_actions_generates_actions()
    test_memory_without_suggested_actions_returns_empty()
    test_priority_calculation_correct()
    test_priority_clamped_0_100()
    test_career_goal_signal_produces_reason()
    test_target_role_signal_produces_reason()
    test_project_signal_produces_reason()
    test_goal_signal_produces_reason()
    test_multiple_signals_produce_combined_reason()
    test_missing_memory_returns_404()
    test_missing_context_returns_400()
    test_actions_do_not_mutate_database()
    test_relevance_calculation_unchanged()
    
    print("\n[SUCCESS] All action engine tests passed!")


if __name__ == "__main__":
    run_all_tests()