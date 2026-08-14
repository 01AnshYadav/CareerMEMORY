import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Memory } from '../../components/AnalyzeForm'

const API_BASE = 'http://localhost:8000'

export default function MemoryDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [memory, setMemory] = useState<Memory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchMemory = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/memories/${id}`)
        if (!res.ok) throw new Error('Unable to load memory')
        const data = await res.json()
        setMemory(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMemory()
  }, [id])

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this memory?')) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/api/memories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.push('/memories')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="container">Loading memory...</div>
  if (error) return <div className="container"><div className="error">{error}</div><Link href="/memories"><button>Back to Memories</button></Link></div>
  if (!memory) return <div className="container">Memory not found</div>

  const date = new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const updated = new Date(memory.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">Analyzer</Link>
        <span className="nav-sep">|</span>
        <Link href="/memories">Memories</Link>
        <span className="nav-sep">|</span>
        <Link href="/context">Context</Link>
        <span className="nav-sep">|</span>
        <strong>{memory.title}</strong>
      </nav>

      <h1>{memory.title}</h1>
      <p className="description">Category: {memory.category} • Created {date} • Updated {updated}</p>

      <div className="detail-section">
        <h3>Original text</h3>
        <p>{memory.original_text}</p>
      </div>

      <div className="detail-section">
        <h3>Summary</h3>
        <p>{memory.summary}</p>
      </div>

      <div className="detail-section">
        <h3>Topics</h3>
        <p>{memory.topics.join(', ')}</p>
      </div>

      <div className="detail-section metrics">
        <div><strong>Importance</strong> {memory.importance}</div>
        <div><strong>Current relevance</strong> {memory.current_relevance}</div>
        <div><strong>Future relevance</strong> {memory.future_relevance}</div>
      </div>

      <div className="detail-section">
        <h3>Prerequisites</h3>
        <p>{memory.prerequisites.join(', ') || '—'}</p>
      </div>

      <div className="detail-section">
        <h3>Suggested actions</h3>
        <p>{memory.suggested_actions.join(', ') || '—'}</p>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link href="/memories"><button>Back to Memories</button></Link>
        <button onClick={handleDelete} disabled={deleting} style={{ background: '#d00' }}>
          {deleting ? 'Deleting…' : 'Delete Memory'}
        </button>
      </div>
    </div>
  )
}