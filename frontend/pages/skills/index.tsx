import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Memory } from '../../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SkillGroup {
  count: number
  skills: string[]
}

export default function SkillsPage() {
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

  const groups = useMemo<SkillGroup[]>(() => {
    const counts = new Map<string, number>()
    memories.forEach((memory) =>
      (memory.topics || []).forEach((topic) => {
        counts.set(topic, (counts.get(topic) || 0) + 1)
      })
    )
    const byFrequency = new Map<number, string[]>()
    Array.from(counts.entries()).forEach(([skill, count]) => {
      if (!byFrequency.has(count)) byFrequency.set(count, [])
      byFrequency.get(count)!.push(skill)
    })
    return Array.from(byFrequency.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([count, skills]) => ({ count, skills: skills.sort() }))
  }, [memories])

  const totalSkills = groups.reduce((sum, group) => sum + group.skills.length, 0)

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-secondary">Loading skills…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-secondary">Unable to load skills.</p>
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
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Skills</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The things your memories keep coming back to.
        </p>
      </header>

      {totalSkills === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-secondary">
            No skills yet. Add a memory and its skills will surface here.
          </p>
          <Link
            href="/analyze"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-ring hover:opacity-90"
          >
            Write your first memory
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-xs text-ink-muted">
            {totalSkills} skills across {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </p>

          {groups.map((group) => (
            <section key={group.count}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
                Seen in {group.count} {group.count === 1 ? 'memory' : 'memories'}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {group.skills.map((skill) => (
                  <span key={skill} className="tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}