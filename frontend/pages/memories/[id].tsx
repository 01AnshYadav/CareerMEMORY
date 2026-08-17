import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Memory } from '../../components/AnalyzeForm'
import type { Action } from '../../types'

const API_BASE = 'http://localhost:8000'

export default function MemoryDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [memory, setMemory] = useState<Memory | null>(null)
  const [relevance, setRelevance] = useState<{score:number; reasons:string[]} | null>(null)
  const [actions, setActions] = useState<Action[]>([])
  const [actionsLoading, setActionsLoading] = useState(false)
  const [actionsError, setActionsError] = useState<string | null>(null)
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
        // fetch relevance
        const relRes = await fetch(`${API_BASE}/api/memories/${id}/relevance`)
        if (relRes.ok) {
          const rel = await relRes.json()
          setRelevance({ score: rel.score, reasons: rel.reasons })
        }
        // fetch actions
        setActionsLoading(true)
        const actRes = await fetch(`${API_BASE}/api/memories/${id}/actions`)
        if (actRes.ok) {
          const actData = await actRes.json()
          setActions(actData.actions || [])
        } else {
          setActionsError('Could not load actions.')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
        setActionsLoading(false)
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
      const router = useRouter()
      router.push('/memories')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center">Loading memory...</div>
  if (error) return <div className="min-h-screen bg-cream flex items-center justify-center p-4 text-error text-charcoal">Error: {error}</div>
  if (!memory) return <div className="min-h-screen bg-cream">Memory not found</div>

  const date = new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const updated = new Date(memory.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

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

        <div className="rounded-md bg-white p-6 shadow-sm mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-charcoal mb-2">Overview</h3>
              <p className="text-charcoal">{memory.title}</p>
              <p className="text-sm text-muted/70">{memory.category}</p>
              <p className="text-sm text-muted/70">Created {date} • Updated {updated}</p>
            </div>
            <div>
              {relevance && (
                <div>
                  <p className="text-sm text-muted/70">Relevance</p>
                  <p className="text-3xl font-medium text-charcoal">{relevance.score}/100</p>
                  {relevance.reasons && relevance.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-muted/80">
                      {relevance.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Actions */}
        {actions.length > 0 && (
          <div className="rounded-md bg-white p-6 shadow-sm mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-4">Next Actions</h3>
            <ul className="space-y-3 text-sm text-charcoal">
              {actions.map((action, i) => (
                <li key={i}>
                  <div className="flex items-start gap-3">
                    <span className="bg-charcoal/10 text-charcoal rounded-md p-1.5 text-xs font-medium">#{i + 1}</span>
                    <div>
                      <h4 className="font-medium">{action.title}</h4>
                      <p className="text-muted/70">{action.reason}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Original text */}
        {memory.original_text && (
          <div className="rounded-md bg-white p-6 shadow-sm mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-3">Original Text</h3>
            <p className="text-muted/80 break-all">{memory.original_text}</p>
          </div>
        )}

        {/* Summary */}
        {memory.summary && (
          <div className="rounded-md bg-white p-6 shadow-sm mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-3">Summary</h3>
            <p className="text-charcoal">{memory.summary}</p>
          </div>
        )}

        {/* Topics */}
        {memory.topics && memory.topics.length > 0 && (
          <div className="rounded-md bg-white p-6 shadow-sm mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-3">Topics</h3>
            <div className="flex flex-wrap gap-2">
              {memory.topics.map((t, i) => (
                <span key={i} className="text-sm text-charcoal/80 rounded-full px-2 py-0.5 bg-charcoal/5">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <p className="text-xs text-muted/70">Importance</p>
            <p className="text-2xl font-medium text-charcoal">{memory.importance}</p>
          </div>
          <div>
            <p className="text-xs text-muted/70">Current Relevance</p>
            <p className="text-2xl font-medium text-charcoal">{memory.current_relevance}</p>
          </div>
          <div>
            <p className="text-xs text-muted/70">Future Relevance</p>
            <p className="text-2xl font-medium text-charcoal">{memory.future_relevance}</p>
          </div>
        </div>

        {/* Prerequisites */}
        {memory.prerequisites && memory.prerequisites.length > 0 && (
          <div className="rounded-md bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-charcoal mb-3">Prerequisites</h3>
            <p className="text-charcoal">{memory.prerequisites.join(', ') || '—'}</p>
          </div>
        )}

        {/* Suggested Actions */}
        {memory.suggested_actions && memory.suggested_actions.length > 0 && (
          <div className="rounded-md bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-charcoal mb-3">Suggested Actions</h3>
            <p className="text-charcoal">{memory.suggested_actions.join(', ') || '—'}</p>
          </div>
        )}

        {/* Delete button */}
        <div className="mt-8 pt-8 border-t border-muted/50">
          <Link href="/memories" className="btn-link text-sm text-charcoal hover:text-charcoal/90 transition-colors">
            ← Back to Memories
          </Link>
          <button
            onClick={handleDelete}
            className="btn-danger text-sm font-medium mt-3 px-4 py-2 rounded-md hover:bg-charcoal/10 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete Memory'}
          </button>
        </div>
      </main>
    </div>
  )
}