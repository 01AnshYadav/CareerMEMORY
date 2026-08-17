import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import MemoryCard from '../../components/MemoryCard'
import type { Memory } from '../../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type SortKey = 'newest' | 'oldest' | 'title' | 'importance'

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')

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
    const set = new Set<string>()
    memories.forEach((m) => {
      if (m.category) set.add(m.category)
    })
    return Array.from(set).sort()
  }, [memories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = memories

    if (category !== 'all') list = list.filter((m) => m.category === category)

    if (q) {
      list = list.filter((m) => {
        const haystack = [m.title, m.summary, m.category, ...(m.topics || [])]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    const sorted = [...list]
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'importance':
        sorted.sort((a, b) => b.importance - a.importance)
        break
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return sorted
  }, [memories, query, category, sort])

  const fieldClasses =
    'rounded border border-border bg-surface px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus-ring'

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-secondary">Loading memories…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-secondary">Unable to load memories.</p>
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

  const hasActiveFilters = query.trim() !== '' || category !== 'all'

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Memories</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          A quiet library of what you&apos;ve built, learned, and done.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories…"
          aria-label="Search memories"
          className={`${fieldClasses} flex-1`}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className={`${fieldClasses} sm:w-44`}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort memories"
          className={`${fieldClasses} sm:w-40`}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
          <option value="importance">Importance</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        memories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-ink-secondary">
              No memories yet. Your career story starts with one experience.
            </p>
            <Link
              href="/analyze"
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-ring hover:opacity-90"
            >
              Write your first memory
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-ink-secondary">No memories match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink-primary focus-ring hover:bg-background"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
          <p className="mt-6 text-xs text-ink-muted">
            {filtered.length} {filtered.length === 1 ? 'memory' : 'memories'}
            {hasActiveFilters ? ' shown' : ''}
          </p>
        </>
      )}
    </div>
  )
}