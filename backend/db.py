"""
Database layer for CareerMemory V0.2.
SQLite persistence for memory entries.
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_PATH = Path(__file__).parent / "careermemory.db"


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the database and create memories table if it doesn't exist."""
    conn = get_connection()
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
        conn.commit()
    finally:
        conn.close()


def create_memory(
    original_text: str,
    title: str,
    summary: str,
    category: str,
    topics: List[str],
    importance: int,
    current_relevance: int,
    future_relevance: int,
    prerequisites: List[str],
    suggested_actions: List[str],
) -> int:
    """Create a new memory entry and return its ID."""
    now = datetime.utcnow().isoformat() + "Z"
    conn = get_connection()
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
                original_text,
                title,
                summary,
                category,
                json.dumps(topics),
                importance,
                current_relevance,
                future_relevance,
                json.dumps(prerequisites),
                json.dumps(suggested_actions),
                now,
                now,
            ),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_memory(memory_id: int) -> Optional[Dict[str, Any]]:
    """Get a single memory by ID."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
        if row:
            return _row_to_dict(row)
        return None
    finally:
        conn.close()


def list_memories(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """List memories, newest first."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM memories ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [_row_to_dict(row) for row in rows]
    finally:
        conn.close()


def delete_memory(memory_id: int) -> bool:
    """Delete a memory by ID. Returns True if deleted."""
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a database row to a dictionary with parsed JSON fields."""
    d = dict(row)
    d["topics"] = json.loads(d["topics"])
    d["prerequisites"] = json.loads(d["prerequisites"])
    d["suggested_actions"] = json.loads(d["suggested_actions"])
    return d