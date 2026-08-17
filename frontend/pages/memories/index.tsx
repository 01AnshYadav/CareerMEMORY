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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-muted/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-charcoal">
            CareerMEMORY
          </h1>
          <nav className="flex gap-4 text-sm text-muted">
            <a href="/" className="hover:text-charcoal transition-colors">Analyzer</a>
            <a href="/memories" className="hover:text-charcoal transition-colors border-b-2 border-charcoal active">Memories</a>
            <a href="/context" className="hover:text-charcoal transition-colors">Context</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Analyzer Panel */}
        <div className="mb-8">
          <h2 className="text-xl font-normal tracking-wide text-charcoal mb-2">
            Capture Knowledge
          </h2>
          <p className="text-xs text-muted/70 mb-4">
            Paste raw notes, achievements, or feedback. AI will structure and link them.
          </p>

          <div>
            <textarea
              placeholder="Enter text to analyze for career memory..."
              className="w-full bg-alabaster border border-muted rounded-md p-3 text-sm text-charcoal focus:outline-none focus:border-charcoal h-32 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted/60">0/1000</span>
              <button className="btn-primary text-sm font-medium px-4 py-2 rounded-md hover:bg-charcoal/10 transition-colors">
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Context Preview Panel */}
        <div className="rounded-md bg-white/50 backdrop-blur-sm p-4 mb-8">
          <p className="text-xs uppercase tracking-widest text-muted/60 mb-3">RECENT CONTEXT</p>
          <div className="space-y-2 text-sm text-charcoal">
            <div className="py-1 border-y border-muted/50">
              <span className="font-medium">Python</span> — Core skill
            </div>
            <div className="py-1 border-y border-muted/50">
              <span className="font-medium">FastAPI</span> — Backend framework
            </div>
            <div className="py-1 border-y border-muted/50">
              <span className="font-medium">Docker</span> — Containerization
            </div>
          </div>
        </div>

        {/* Memories Section */}
        <section className="py-8">
          {relevantMemories.length === 0 && !relevantLoading && !relevantError && (
            <p className="text-muted/60">No memories found. Analyze some text to get started.</p>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relevantMemories.map((mem) => {
              const state = actionsState[mem.id] || { actions: [], loading: false, error: null, expanded: false }
              return (
                <MemoryCard
                  key={mem.id}
                  memory={mem}
                />
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}