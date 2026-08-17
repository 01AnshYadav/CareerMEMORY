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

  const [analyzerText, setAnalyzerText] = useState('')

  useEffect(() => {
    fetchMemories()
    fetchRelevant()
  }, [])

  return (
    <div className="min-h-screen bg-cream font-sans">
      <nav className="navbar border-b border-[#E3E0D6]">
        <div className="flex items-center gap-4">
          <Link href="/" className="brand-title font-light text-sm uppercase tracking-[0.25em]">
            CareerMemory
          </Link>
          <div className="nav-tabs flex gap-2">
            <div className="nav-tab border-b-2 border-[#E3E0D6] py-1 px-2 text-sm text-[#1A1A18]">analyzer</div>
            <div className="nav-tab border-b-2 border-[#E3E0D6] py-1 px-2 text-sm text-[#1A1A18]">memories</div>
            <div className="nav-tab border-b-2 border-[#E3E0D6] py-1 px-2 text-sm text-[#1A1A18]">context</div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto py-6">
        <div className="grid-dashboard gap-6">

          {/* Left Column: Analyzer */}
          <div className="space-y-6">
            <h2 className="text-xl font-normal tracking-wide text-[#1A1A18] mb-1">
              Capture Knowledge
            </h2>
            <p className="text-xs text-[#787774] mb-4">
              Paste raw notes, achievements, or feedback. AI will structure and link them.
            </p>

            <div>
              <textarea
                placeholder="Enter text to analyze for career memory..."
                className="textarea w-full bg-[#F4F2EC] border border-[#E3E0D6] rounded-md p-4 text-sm text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] h-44 resize-none"
                value={analyzerText}
                onChange={(e) => setAnalyzerText(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="char-count font-mono text-[11px] text-[#787774]">
                  {analyzerText.length}/1000
                </span>
                <button className="action-btn bg-[#1A1A18] hover:bg-[#333330] text-white px-5 py-2 rounded-md text-xs font-mono uppercase tracking-widest">
                  Analyze
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Context Preview Panel */}
          <div>
            <div className="side-panel border border-[#E3E0D6] rounded-md p-5 shadow-sm">
              <div className="font-mono text-[10px] tracking-widest text-[#787774] mb-3">
                RECENT CONTEXT
              </div>
              <div className="space-y-2 text-sm text-[#1A1A18]">
                <div className="mb-1 py-1 border-y border-[#E3E0D6]">
                  <span className="font-medium">Python</span> — Core skill
                </div>
                <div className="mb-1 py-1 border-y border-[#E3E0D6]">
                  <span className="font-medium">FastAPI</span> — Backend framework
                </div>
                <div className="mb-1 py-1 border-y border-[#E3E0D6]">
                  <span className="font-medium">Docker</span> — Containerization
                </div>
              </div>
            </div>
          </div>

          {/* Memories grid */}
          <div>
            <section className="relevant-section">
              <h2 className="text-lg font-medium text-[#1A1A18] mb-4">Most Relevant to You</h2>
              {relevantLoading && <p>Calculating relevance…</p>}
              {relevantError && <div className="error">{relevantError}</div>}
              <div className="memory-grid">
                {relevantMemories.map((mem) => {
                  const state = actionsState[mem.id] || { actions: [], loading: false, error: null, expanded: false }
                  return (
                    <div key={mem.id} className="relevant-card border border-[#E3E0D6] rounded-md p-4">
                      <div className="card-header justify-between items-baseline mb-3">
                        <h3 className="text-base font-semibold">{mem.title}</h3>
                        <span className="relevance-score text-sm">Relevance: {mem.relevance.score}/100</span>
                      </div>
                      <p className="summary text-sm text-[#444] line-height-1.4">{mem.summary}</p>
                      <div className="topics text-xs text-[#666] mb-3">Topics: {mem.topics.join(', ')}</div>

                      <button onClick={() => toggleActions(mem.id)} className="action-toggle text-sm hover:text-[#1A1A18]">
                        {state.expanded ? 'Hide next actions' : 'View next actions'}
                      </button>

                      {state.expanded && (
                        <div className="actions-container mt-3">
                          {state.loading && <p>Loading actions…</p>}
                          {state.error && <div className="error">Could not load actions.</div>}
                          <ActionList actions={state.actions} />
                          {state.actions.length === 0 && !state.loading && !state.error && (
                            <p className="empty-actions text-xs text-[#999] margin-0">No suggested actions for this memory.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  )
}