import { useEffect, useState } from 'react'
import Link from 'next/link'
import MemoryCard from '../../components/MemoryCard'
import { Memory } from '../../components/AnalyzeForm'

const API_BASE = 'http://localhost:8000'

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMemories = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/memories`)
      if (!res.ok) throw new Error('Unable to load memories')
      const data = await res.json()
      setMemories(data.memories || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [])

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">Analyzer</Link>
        <span className="nav-sep">|</span>
        <Link href="/memories"><strong>Memories</strong></Link>
      </nav>

      <h1>CareerMemory</h1>
      <p className="description">Your saved knowledge</p>

      <div className="search-placeholder">
        <input type="text" placeholder="Search memories..." disabled />
        <span className="search-note">(search coming soon)</span>
      </div>

      {error && (
        <div className="error">
          {error}
          <button onClick={fetchMemories} style={{ marginLeft: '1rem' }}>Retry</button>
        </div>
      )}

      {loading && <p>Loading memories...</p>}

      {!loading && !error && memories.length === 0 && (
        <div className="empty-state">
          <p>No memories saved yet.</p>
          <p>Save your first piece of knowledge from the analyzer.</p>
          <Link href="/"><button>Go to Analyzer</button></Link>
        </div>
      )}

      {!loading && !error && memories.length > 0 && (
        <div className="memory-grid">
          {memories.map((mem) => (
            <MemoryCard key={mem.id} memory={mem} />
          ))}
        </div>
      )}
    </div>
  )
}