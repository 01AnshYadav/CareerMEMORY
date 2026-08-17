import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Memory } from '../../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TimelineGroup {
  label: string
  items: Memory[]
}

export default function TimelinePage() {
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

  const groups = useMemo<TimelineGroup[]>(() => {
    const sorted = [...memories].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const byMonth = new Map<string, Memory[]>()
    Array.from(sorted).forEach((memory) => {
      const key = memory.created_at.slice(0, 7)
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(memory)
    })
    return Array.from(byMonth.entries()).map(([monthKey, items]) => ({
      label: new Date(items[0].created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
      items,
    }))
  }, [memories])

  const formatDate = (createdAt: string) =>
    new Date(createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-secondary">Loading timeline…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-secondary">Unable to load timeline.</p>
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

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Timeline</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Your career story, newest first.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-secondary">
            No memories yet. Your timeline starts with your first experience.
          </p>
          <Link
            href="/analyze"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-ring hover:opacity-90"
          >
            Write your first memory
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-4 text-sm font-medium text-ink-secondary">{group.label}</h2>
              <ol className="ml-1 border-l border-border">
                {group.items.map((memory) => (
                  <li key={memory.id} className="relative pb-8 pl-6 last:pb-0">
                    <span
                      className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-xs text-ink-muted">{formatDate(memory.created_at)}</time>
                      <span className="tag">{memory.category}</span>
                    </div>
                    <Link
                      href={`/memories/${memory.id}`}
                      className="mt-1 block font-medium text-ink-primary transition-colors hover:text-accent"
                    >
                      {memory.title}
                    </Link>
                    {memory.summary && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-secondary">
                        {memory.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}