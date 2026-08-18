import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Memory } from '../../types'
import { API_BASE } from '../../lib/api'
const MIN_MEMORIES = 4

export default function InsightsPage() {
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

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    memories.forEach((memory) => {
      if (memory.category) counts.set(memory.category, (counts.get(memory.category) || 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }))
  }, [memories])

  const topSkills = useMemo(() => {
    const counts = new Map<string, number>()
    memories.forEach((memory) =>
      (memory.topics || []).forEach((topic) => {
        counts.set(topic, (counts.get(topic) || 0) + 1)
      })
    )
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }))
  }, [memories])

  const activity = useMemo(() => {
    const byMonth = new Map<string, number>()
    memories.forEach((memory) => {
      const key = memory.created_at.slice(0, 7)
      byMonth.set(key, (byMonth.get(key) || 0) + 1)
    })
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, count]) => ({
        label: new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        }),
        count,
      }))
  }, [memories])

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-secondary">Loading insights…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-secondary">Unable to load insights.</p>
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

  if (memories.length < MIN_MEMORIES) {
    return (
      <div>
        <header className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Insights</h1>
          <p className="mt-1 text-sm text-ink-secondary">Patterns from your memories.</p>
        </header>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-secondary">
            Not enough data yet. Insights build up as you add more memories.
          </p>
          <Link
            href="/analyze"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-ring hover:opacity-90"
          >
            Write your first memory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Insights</h1>
        <p className="mt-1 text-sm text-ink-secondary">Patterns from your memories.</p>
      </header>

      <p className="mb-8 text-xs text-ink-muted">
        {memories.length} memories · {categories.length} categories · {topSkills.length} top skills
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Memories by category
          </h2>
          <ul className="divide-y divide-border rounded border border-border bg-surface">
            {categories.map(({ category, count }) => (
              <li key={category} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink-primary">{category}</span>
                <span className="text-ink-muted">{count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Most common skills
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map(({ skill, count }) => (
              <span key={skill} className="tag">
                {skill} · {count}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Activity by month
          </h2>
          <ul className="divide-y divide-border rounded border border-border bg-surface">
            {activity.map(({ label, count }) => (
              <li key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-ink-primary">{label}</span>
                <span className="text-ink-muted">
                  {count} {count === 1 ? 'memory' : 'memories'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}