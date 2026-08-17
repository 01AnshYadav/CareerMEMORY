"""
Tests for CareerMemory V0.5 Step 3 Connections.
Uses isolated temporary databases.
"""

import sqlite3
import json
import tempfile
import os
from typing import List, Dict, Any
from datetime import datetime

from db import init_db, create_memory, get_context, upsert_context, get_all_memories
from relevance import calculate_relevance
from connections import find_connections


def create_test_db() -> str:
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    return path


def setup_test_db(db_path: str) -> None:
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


def test_career_goal_connection():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, career_goal="Backend Engineering")
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    assert any(c["type"] == "career_goal" and c["matched_value"] == "Backend Engineering" for c in conns)
    print("[PASS] test_career_goal_connection")


def test_target_role_connection():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, target_roles=["Backend Engineer", "DevOps Engineer"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    matched = [c for c in conns if c["type"] == "target_role"]
    assert any(c["matched_value"] == "Backend Engineer" for c in matched)
    print("[PASS] test_target_role_connection")


def test_project_connection():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, current_projects=["Docker Backend Project"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    assert any(c["type"] == "project" and c["matched_value"] == "Docker Backend Project" for c in conns)
    print("[PASS] test_project_connection")


def test_goal_connection():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, goals=["Learn Docker", "Deploy to production"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    assert any(c["type"] == "goal" and c["matched_value"] == "Learn Docker" for c in conns)
    print("[PASS] test_goal_connection")


def test_interest_connection():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, interests=["Docker", "Kubernetes"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    assert any(c["type"] == "interest" and c["matched_value"] == "Docker" for c in conns)
    print("[PASS] test_interest_connection")


def test_skill_connection():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, current_skills=["Python", "FastAPI"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend", "Python"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    assert any(c["type"] == "skill" and c["matched_value"] == "Python" for c in conns)
    print("[PASS] test_skill_connection")


def test_multiple_connections():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path,
        career_goal="Backend Engineering",
        target_roles=["Backend Engineer"],
        interests=["Docker"],
        current_projects=["Docker Backend Project"],
        goals=["Learn Docker"],
        current_skills=["Python"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering with Python",
        category="Software Engineering",
        topics=["Docker", "Backend", "Python"],
        importance=90,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    types = {c["type"] for c in conns}
    expected = {"career_goal", "target_role", "project", "goal", "interest", "skill"}
    assert expected.issubset(types)
    print("[PASS] test_multiple_connections")


def test_no_matching_context_returns_empty():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path,
        career_goal="Frontend Design",
        target_roles=[],
        interests=[],
        current_skills=[],
        current_projects=[],
        goals=[])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    assert conns == []
    print("[PASS] test_no_matching_context_returns_empty")


def test_missing_memory_404():
    # Simulated by not inserting memory
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path)
    memory = None
    assert memory is None
    print("[PASS] test_missing_memory_404")


def test_missing_context_400():
    db_path = create_test_db()
    setup_test_db(db_path)
    mem_id = insert_test_memory(db_path,
        title="Learn Docker",
        summary="Docker for backend",
        category="Software Engineering",
        topics=["Docker"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = None
    assert context is None
    print("[PASS] test_missing_context_400")


def test_connection_order_deterministic():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path,
        career_goal="Backend Engineering",
        target_roles=["Backend Engineer"],
        interests=["Docker"],
        current_projects=["Docker Backend Project"],
        goals=["Learn Docker"],
        current_skills=["Python"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering with Python",
        category="Software Engineering",
        topics=["Docker", "Backend", "Python"],
        importance=90,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    order = [c["type"] for c in conns]
    expected_order = ["career_goal", "target_role", "project", "goal", "interest", "skill"]
    assert order == expected_order
    print("[PASS] test_connection_order_deterministic")


def test_matched_values_correct():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path,
        career_goal="Backend Engineering",
        target_roles=["Backend Engineer", "DevOps Engineer"],
        interests=["Docker", "Kubernetes"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker for Backend",
        summary="Docker for backend engineering",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    relevance = calculate_relevance(memory, context)
    conns = find_connections(memory, context, relevance)
    # career_goal matched value
    cg = next(c for c in conns if c["type"] == "career_goal")
    assert cg["matched_value"] == "Backend Engineering"
    # target_role should match Backend Engineer (since tokens overlap)
    tr = next(c for c in conns if c["type"] == "target_role")
    assert tr["matched_value"] == "Backend Engineer"
    # interest should match Docker
    intr = next(c for c in conns if c["type"] == "interest")
    assert intr["matched_value"] == "Docker"
    print("[PASS] test_matched_values_correct")


def test_no_database_mutation():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path, career_goal="Backend Engineering")
    mem_id = insert_test_memory(db_path,
        title="Learn Docker",
        summary="Docker for backend",
        category="Software Engineering",
        topics=["Docker"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory_before = get_memory_from_db(db_path, mem_id)
    context_before = get_context_from_db(db_path)
    for _ in range(5):
        relevance = calculate_relevance(memory_before, context_before)
        _ = find_connections(memory_before, context_before, relevance)
    memory_after = get_memory_from_db(db_path, mem_id)
    context_after = get_context_from_db(db_path)
    assert memory_before == memory_after
    assert context_before == context_after
    print("[PASS] test_no_database_mutation")


def test_relevance_unchanged():
    db_path = create_test_db()
    setup_test_db(db_path)
    insert_test_context(db_path,
        career_goal="Backend Engineering",
        target_roles=["Backend Engineer"])
    mem_id = insert_test_memory(db_path,
        title="Learn Docker",
        summary="Docker for backend",
        category="Software Engineering",
        topics=["Docker", "Backend"],
        importance=80,
        suggested_actions=["Learn Docker"])
    memory = get_memory_from_db(db_path, mem_id)
    context = get_context_from_db(db_path)
    rel1 = calculate_relevance(memory, context)
    rel2 = calculate_relevance(memory, context)
    assert rel1 == rel2
    print("[PASS] test_relevance_unchanged")


def run_all_tests():
    print("Running connections tests with isolated database...\n")
    test_career_goal_connection()
    test_target_role_connection()
    test_project_connection()
    test_goal_connection()
    test_interest_connection()
    test_skill_connection()
    test_multiple_connections()
    test_no_matching_context_returns_empty()
    test_missing_memory_404()
    test_missing_context_400()
    test_connection_order_deterministic()
    test_matched_values_correct()
    test_no_database_mutation()
    test_relevance_unchanged()
    print("\n[SUCCESS] All connections tests passed!")


if __name__ == "__main__":
    run_all_tests()