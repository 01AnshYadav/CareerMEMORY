import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import type { Memory } from '../../components/AnalyzeForm'
import type { Action } from '../../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

  if (loading) return (
    <div className="min-h-screen bg-off-white flex items-center justify-center">
      Loading memory…
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-off-white flex items-center justify-center p-4 text-error text-charcoal">
      Error: {error}
    </div>
  )
  if (!memory) return (
    <div className="min-h-screen bg-off-white">Memory not found</div>
  )

  const date = new Date(memory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const updated = new Date(memory.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-off-white">
      {/* Header kept from AppShell */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Memory header */}
        <div className="rounded-md border-border-indigo p-6 mb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-500 mb-1">
                Category
              </p>
              <p className="font-medium text-charcoal">{memory.category}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-500 mb-1">
                Date
              </p>
              <p className="font-medium text-charcoal">{date}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-500 mb-1">
                Project
              </p>
              <p className="font-medium text-charcoal">{memory.suggested_actions?.[0] || '—'}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        {memory.title && (
          <h1 className="text-2xl md:text-3xl font-medium text-charcoal mb-6">
            {memory.title}
          </h1>
        )}

        {/* WHAT HAPPENED section */}
        {memory.original_text && (
          <div className="rounded-md border-border-indigo p-6 mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-3">What happened</h3>
            <p className="text-muted/80 break-all">{memory.original_text}</p>
          </div>
        )}

        {/* KEY EVIDENCE section */}
        {memory.prerequisites && memory.prerequisites.length > 0 && (
          <div className="rounded-md border-border-indigo p-6 mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-3">Key evidence</h3>
            <ul className="space-y-2 text-sm text-charcoal">
              {memory.prerequisites.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-0.5"></span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* WHAT I LEARNED section */}
        {memory.suggested_actions && memory.suggested_actions.length > 0 && (
          <div className="rounded-md border-border-indigo p-6 mb-8">
            <h3 className="text-lg font-medium text-charcoal mb-3">What I learned</h3>
            <ul className="space-y-2 text-sm text-charcoal">
              {memory.suggested_actions.map((action, i) => (
                <li key={i}>
                  <span className="font-medium">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* RELATED MEMORIES section */}
        {relevance && (
          <div className="rounded-md border-border-indigo p-6">
            <h3 className="text-lg font-medium text-charcoal mb-3">Related memories</h3>
            <p className="text-sm text-muted/70">
              {relevance.reasons?.[0] || '—'}
            </p>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-muted/70">Importance</p>
            <p className="text-2xl font-medium text-charcoal">{memory.importance}</p>
          </div>
          <div>
            <p className="text-xs text-muted/70">Current relevance</p>
            <p className="text-2xl font-medium text-charcoal">{memory.current_relevance}</p>
          </div>
          <div>
            <p className="text-xs text-muted/70">Future relevance</p>
            <p className="text-2xl font-medium text-charcoal">{memory.future_relevance}</p>
          </div>
        </div>

        {/* Prerequisites */}
        {memory.prerequisites && memory.prerequisites.length > 0 && (
          <div className="rounded-md border-border-indigo p-4 mb-6">
            <p className="text-xs uppercase tracking-wider text-indigo-500 mb-1">Prerequisites</p>
            <p className="text-charcoal">{memory.prerequisites.join(', ') || '—'}</p>
          </div>
        )}

        {/* Suggested actions */}
        {memory.suggested_actions && memory.suggested_actions.length > 0 && (
          <div className="rounded-md border-border-indigo p-4">
            <p className="text-xs uppercase tracking-wider text-indigo-500 mb-1">Suggested actions</p>
            <p className="text-charcoal">{memory.suggested_actions.join(', ') || '—'}</p>
          </div>
        )}

        {/* Delete button */}
        <div className="mt-6">
          <Link href="/memories" className="btn-link text-sm text-charcoal hover:text-indigo-600 transition-colors">
            ← Back to Memories
          </Link>
          <button
            onClick={handleDelete}
            className="btn-danger text-sm font-medium mt-2 px-4 py-2 rounded-md hover:bg-indigo-10 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete Memory'}
          </button>
        </div>
      </main>
    </div>
  )
}