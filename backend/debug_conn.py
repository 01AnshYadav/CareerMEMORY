import sqlite3, json, tempfile, os
from datetime import datetime
from relevance import calculate_relevance
from connections import find_connections

fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
conn = sqlite3.connect(path)
conn.execute('''CREATE TABLE memories (id INTEGER PRIMARY KEY AUTOINCREMENT, original_text TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, category TEXT NOT NULL, topics TEXT NOT NULL, importance INTEGER NOT NULL, current_relevance INTEGER NOT NULL, future_relevance INTEGER NOT NULL, prerequisites TEXT NOT NULL, suggested_actions TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)''')
conn.execute('''CREATE TABLE user_context (id INTEGER PRIMARY KEY CHECK (id=1), name TEXT, current_role TEXT, education TEXT, career_goal TEXT, target_roles TEXT, interests TEXT, current_skills TEXT, current_projects TEXT, goals TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)''')
conn.commit()
now = datetime.utcnow().isoformat() + 'Z'
conn.execute('INSERT INTO user_context (id, name, current_role, education, career_goal, target_roles, interests, current_skills, current_projects, goals, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ('Test','Student','CS','Frontend Design','[]','[]','[]','[]','[]',now,now))
conn.execute('INSERT INTO memories (original_text, title, summary, category, topics, importance, current_relevance, future_relevance, prerequisites, suggested_actions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ('test','Learn Docker for Backend','Docker for backend engineering','Software Engineering','["Docker", "Backend"]',80,50,50,'[]','["Learn Docker"]',now,now))
conn.commit()
conn.close()

conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
row = conn.execute('SELECT * FROM memories WHERE id=1').fetchone()
mem = dict(row); mem['topics']=json.loads(mem['topics']); mem['prerequisites']=json.loads(mem['prerequisites']); mem['suggested_actions']=json.loads(mem['suggested_actions'])
row = conn.execute('SELECT * FROM user_context WHERE id=1').fetchone()
ctx = dict(row)
for f in ['target_roles','interests','current_skills','current_projects','goals']:
    ctx[f]=json.loads(ctx[f]) if ctx[f] else []
conn.close()

rel = calculate_relevance(mem, ctx)
print('signals:', rel['signals'])
conns = find_connections(mem, ctx, rel)
print('connections:', conns)