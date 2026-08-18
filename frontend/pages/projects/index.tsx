import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Memory } from '../../types'
import { API_BASE } from '../../lib/api'

export default function ProjectsPage() {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-secondary">Loading projects…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-secondary">Unable to load projects.</p>
        <button
          type="button"
          onClick={fetchMemories}
          className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink-primary focus-ring hover:bg-background"
        >
          Retry
        </button>
      </div>
    )
  }

  const hasMemories = memories.length > 0

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Projects</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The longer arcs your experiences belong to.
        </p>
      </header>

      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-ink-secondary">
          {hasMemories
            ? 'No projects can be grouped from your memories yet. Projects appear here once memories carry a project connection.'
            : 'No projects yet. Projects surface here as you record your experiences.'}
        </p>
        <Link
          href="/analyze"
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-ring hover:opacity-90"
        >
          {hasMemories ? 'Add another memory' : 'Write your first memory'}
        </Link>
      </div>
    </div>
  )
}