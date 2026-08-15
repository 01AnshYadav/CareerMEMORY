import { useEffect, useState } from 'react'
import Link from 'next/link'
import MemoryCard from '../../components/MemoryCard'
import { Memory } from '../../components/AnalyzeForm'
import ActionList from '../../components/ActionList'
import { Action, ActionsResponse } from '../../types'

const API_BASE = 'http://localhost:8000'

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [relevantMemories, setRelevantMemories] = useState<Array<Memory & {relevance: {score:number; reasons:string[]}}>>([])
  const [relevantLoading, setRelevantLoading] = useState(false)
  const [relevantError, setRelevantError] = useState<string | null>(null)

  // actions state per memory id
  const [actionsState, setActionsState] = useState<Record<number, {actions: Action[]; loading: boolean; error: string | null; expanded: boolean}>>({})

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

  const fetchRelevant = async () => {
    setRelevantLoading(true)
    setRelevantError(null)
    try {
      const res = await fetch(`${API_BASE}/api/memories/relevant?limit=5`)
      if (!res.ok) {
        if (res.status === 400) {
          // context missing – silently ignore
          setRelevantMemories([])
          return
        }
        throw new Error('Unable to load relevance')
      }
      const data = await res.json()
      setRelevantMemories(data.memories || [])
    } catch (err: any) {
      setRelevantError(err.message)
    } finally {
      setRelevantLoading(false)
    }
  }

  const fetchActions = async (memoryId: number) => {
    setActionsState(prev => ({
      ...prev,
      [memoryId]: { ...prev[memoryId], loading: true, error: null }
    }))
    try {
      const res = await fetch(`${API_BASE}/api/memories/${memoryId}/actions`)
      if (!res.ok) throw new Error('Unable to load actions')
      const data: ActionsResponse = await res.json()
      setActionsState(prev => ({
        ...prev,
        [memoryId]: { ...prev[memoryId], actions: data.actions || [], loading: false }
      }))
    } catch (err: any) {
      setActionsState(prev => ({
        ...prev,
        [memoryId]: { ...prev[memoryId], error: err.message, loading: false }
      }))
    }
  }

  const toggleActions = (memoryId: number) => {
    setActionsState(prev => {
      const current = prev[memoryId] || { actions: [], loading: false, error: null, expanded: false }
      const nextExpanded = !current.expanded
      if (nextExpanded && current.actions.length === 0 && !current.loading) {
        // fetch actions
        setTimeout(() => fetchActions(memoryId), 0)
      }
      return {
        ...prev,
        [memoryId]: { ...current, expanded: nextExpanded }
      }
    })
  }

  useEffect(() => {
    fetchMemories()
    fetchRelevant()
  }, [])

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">Analyzer</Link>
        <span className="nav-sep">|</span>
        <Link href="/memories"><strong>Memories</strong></Link>
        <span className="nav-sep">|</span>
        <Link href="/context">Context</Link>
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

      {/* Most Relevant to You */}
      {relevantMemories.length > 0 && (
        <section className="relevant-section">
          <h2>Most Relevant to You</h2>
          {relevantLoading && <p>Calculating relevance…</p>}
          {relevantError && <div className="error">{relevantError}</div>}
          <div className="memory-grid">
            {relevantMemories.map((mem) => {
              const state = actionsState[mem.id] || { actions: [], loading: false, error: null, expanded: false }
              return (
                <div key={mem.id} className="relevant-card">
                  <div className="card-header">
                    <h3>{mem.title}</h3>
                    <span className="relevance-score">Relevance: {mem.relevance.score}/100</span>
                  </div>
                  <p className="summary">{mem.summary}</p>
                  <div className="topics">Topics: {mem.topics.join(', ')}</div>

                  <button onClick={() => toggleActions(mem.id)} className="action-toggle">
                    {state.expanded ? 'Hide next actions' : 'View next actions'}
                  </button>

                  {state.expanded && (
                    <div className="actions-container">
                      {state.loading && <p>Loading actions…</p>}
                      {state.error && <div className="error">Could not load actions.</div>}
                      <ActionList actions={state.actions} />
                      {state.actions.length === 0 && !state.loading && !state.error && (
                        <p className="empty-actions">No suggested actions for this memory.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
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