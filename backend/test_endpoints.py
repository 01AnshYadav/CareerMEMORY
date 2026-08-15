"""
Test all endpoints to verify they still work.
"""
import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def test_analyze():
    """Test /api/analyze endpoint."""
    resp = requests.post(f"{BASE_URL}/api/analyze", json={"content": "I want to learn Docker for backend development"}, timeout=60)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "title" in data
    assert "summary" in data
    print(f"[PASS] /api/analyze - Title: {data['title']}")

def test_memories_list():
    """Test /api/memories endpoint."""
    resp = requests.get(f"{BASE_URL}/api/memories", timeout=10)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "memories" in data
    assert "count" in data
    print(f"[PASS] /api/memories - Count: {data['count']}")

def test_context_get():
    """Test /api/context GET endpoint."""
    resp = requests.get(f"{BASE_URL}/api/context", timeout=10)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "name" in data
    print(f"[PASS] /api/context GET - Name: {data['name']}")

def test_context_put():
    """Test /api/context PUT endpoint."""
    resp = requests.put(f"{BASE_URL}/api/context", json={
        "name": "Test User",
        "current_role": "Student",
        "education": "CS",
        "career_goal": "Backend Engineer",
        "target_roles": ["Backend Engineer"],
        "interests": ["Docker"],
        "current_skills": ["Python"],
        "current_projects": ["TestProject"],
        "goals": ["Learn Docker"]
    }, timeout=10)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["name"] == "Test User"
    print(f"[PASS] /api/context PUT - Updated: {data['name']}")

def test_memory_relevance():
    """Test /api/memories/{id}/relevance endpoint."""
    # First get a memory ID
    resp = requests.get(f"{BASE_URL}/api/memories", timeout=10)
    memories = resp.json()["memories"]
    if memories:
        mem_id = memories[0]["id"]
        resp = requests.get(f"{BASE_URL}/api/memories/{mem_id}/relevance", timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "score" in data
        assert "reasons" in data
        assert "signals" in data
        print(f"[PASS] /api/memories/{mem_id}/relevance - Score: {data['score']}")

def test_relevant_memories():
    """Test /api/memories/relevant endpoint."""
    resp = requests.get(f"{BASE_URL}/api/memories/relevant", timeout=10)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "memories" in data
    assert "count" in data
    print(f"[PASS] /api/memories/relevant - Count: {data['count']}")

def test_recommendations():
    """Test /api/recommendations endpoint."""
    resp = requests.get(f"{BASE_URL}/api/recommendations", timeout=10)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "recommendations" in data
    assert "count" in data
    print(f"[PASS] /api/recommendations - Count: {data['count']}")
    for rec in data["recommendations"]:
        print(f"  - {rec['title']}: relevance={rec['relevance']}, reason={rec['reason']}")

def run_all_tests():
    """Run all endpoint tests."""
    print("Testing all endpoints...\n")
    
    test_analyze()
    test_memories_list()
    test_context_get()
    test_context_put()
    test_memory_relevance()
    test_relevant_memories()
    test_recommendations()
    
    print("\n[SUCCESS] All endpoint tests passed!")

if __name__ == "__main__":
    try:
        run_all_tests()
    except Exception as e:
        print(f"\n[FAIL] {e}")
        sys.exit(1)