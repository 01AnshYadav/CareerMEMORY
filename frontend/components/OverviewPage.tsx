import { useEffect, useState } from 'react'
import Link from 'next/link'
import { API_BASE } from '../lib/api'

interface MemorySummary {
  id: number
  title: string
  category: string
  created_at: string
  topics: string[]
  summary: string
}

interface Statistics {
  memories: number
  projects: number
  skills: number
}

interface Insight {
  text: string
  href: string
}

export default function OverviewPage() {
  const [memories, setMemories] = useState<MemorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<Statistics>({
    memories: 0,
    projects: 0,
    skills: 0,
  })

  // Fetch memories
  const fetchMemories = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/memories`)
      if (!res.ok) throw new Error('Unable to load memories')
      const data = await res.json()
      const memoriesData = data.memories || []
      // Transform to MemorySummary shape
      const transformed = memoriesData.map((mem: any) => ({
        id: mem.id,
        title: mem.title,
        category: mem.category || '—',
        created_at: mem.created_at || '',
        topics: mem.topics || [],
        summary: mem.summary || '',
      }))
      setMemories(transformed)
      // Derive statistics from the number of memories loaded
      setStatistics({ memories: transformed.length, projects: 0, skills: 0 })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch context for stats
  const fetchContext = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/context`)
      if (res.ok) {
        const data = await res.json()
        // Derive statistics from context
        const skillsInContext = data.current_skills ? data.current_skills.length : 0
        const projectsInContext = data.current_projects ? data.current_projects.length : 0
        // Update statistics - merge with memory-derived stats
        setStatistics(prev => ({
          memories: prev.memories,
          projects: projectsInContext,
          skills: skillsInContext,
        }))
      }
    } catch (err) {
      // If context fetch fails, keep memory-derived stats
    }
  }

  useEffect(() => {
    fetchMemories()
    fetchContext()
  }, [])

  // Format date from created_at
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Get short description (first 2 sentences or first 100 chars)
  const getShortDescription = (summary: string) => {
    if (!summary) return '—'
    const sentences = summary.split('.').filter(s => s.trim()).slice(0, 2)
    return sentences.join('.') + (summary.split('.').length > 2 ? '…' : '')
  }

  // Get topic tags for memory
  const getTopicTags = (topics: string[] | undefined) => {
    if (!topics || topics.length === 0) return []
    return topics.slice(0, 3)
  }

  if (loading) return (
    <div className="min-h-screen bg-off-white p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4 border-b-2 border-border-indigo"></div>
        <p className="text-sm text-muted">Loading overview…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-off-white p-8">
      <div className="text-center text-error">
        <p className="text-lg text-charcoal">Unable to load overview.</p>
        <button className="mt-4 btn-primary text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-10 transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-off-white">
      {/* Keep AppShell sidebar - it's already provided by _app.tsx */}
      <main className="ml-64 min-h-screen px-6 py-8">

        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-medium text-charcoal leading-tight">
            Good morning, Ansh
          </h1>
          <p className="text-sm text-muted/60 mt-1">Your career memory at a glance.</p>
        </header>

        {/* Career Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Memories stat */}
          <div className="border-b border-border-indigo pb-6">
            <p className="text-5xl md:text-6xl font-medium text-charcoal">{statistics.memories}</p>
            <p className="text-sm text-muted/60 mt-1">Memories</p>
          </div>

          {/* Projects stat */}
          <div className="border-b border-border-indigo pb-6">
            <p className="text-5xl md:text-6xl font-medium text-charcoal">{statistics.projects}</p>
            <p className="text-sm text-muted/60 mt-1">Projects</p>
          </div>

          {/* Skills stat */}
          <div className="border-b border-border-indigo pb-6">
            <p className="text-5xl md:text-6xl font-medium text-charcoal">{statistics.skills}</p>
            <p className="text-sm text-muted/60 mt-1">Skills</p>
          </div>
        </div>

        {/* Recent Memories Section */}
        <section className="mb-8">
          <h2 className="text-xl font-medium text-charcoal mb-4">Recent memories</h2>
          <div className="flex items-center justify-between">
            <span></span>
            <Link href="/memories" className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memories.map((mem) => {
              const topicTags = getTopicTags(mem.topics)
              const shortDesc = getShortDescription(mem.summary)
              const date = formatDate(mem.created_at)

              return (
                <div
                  key={mem.id}
                  className="group border border-border-indigo rounded-md p-4 hover:border-indigo-50 transition-colors"
                >
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Category pill */}
                    <p className="text-xs uppercase tracking-wider text-indigo-500 group-hover:text-indigo-600 transition-colors mb-1">
                      {mem.category}
                    </p>

                    {/* Title */}
                    <h3 className="font-medium text-charcoal group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {mem.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted/70 line-clamp-2">
                      {shortDesc}
                    </p>
                  </div>

                  {/* Tags/Meta info */}
                  <div className="flex flex-col gap-1 mt-3">
                    <div className="text-xs text-muted/60">
                      {date}
                    </div>
                    {topicTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-indigo-500 text-xs font-medium mr-1 hover:text-indigo-600 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
            {memories.length === 0 && (
              <p className="text-center text-muted/60 py-8">
                No memories yet. <Link href="/analyze" className="text-indigo-600 hover:text-indigo-500 transition-colors">Add your first memory</Link>.
              </p>
            )}
          </div>
        </section>

        {/* Career Activity Timeline */}
        <section className="mb-8">
          <h2 className="text-xl font-medium text-charcoal mb-4">Career activity</h2>

          {memories.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {memories.slice(0, 6).map((mem) => {
                const date = formatDate(mem.created_at)
                return (
                  <div key={mem.id} className="flex items-center gap-2 px-2 py-1 border-b border-border-indigo/20 last:border-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="text-muted/60 text-nowrap">{date}</span>
                  </div>
                )
              })}
            </div>
          )}

          {memories.length === 0 && (
            <p className="text-center text-muted/60 py-8">
              Start by <Link href="/analyze" className="text-indigo-600 hover:text-indigo-500 transition-colors">analyzing your first experience</Link>.
            </p>
          )}
        </section>

        {/* Insights Preview */}
        <section>
          <h2 className="text-xl font-medium text-charcoal mb-3">Career insight</h2>

          {memories.length > 0 && (
            <div className="rounded-md border-border-indigo p-4">
              <p className="text-sm text-charcoal">
                Your recent memories show increasing focus on{' '}
                <span className="font-medium text-indigo-600">
                  backend architecture and AI systems
                </span>.
              </p>
              <Link
                href="/memories"
                className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors mt-2 block">
                View insights →
              </Link>
            </div>
          )}

          {memories.length === 0 && (
            <p className="text-center text-muted/60 py-8">
              Start by <Link href="/analyze" className="text-indigo-600 hover:text-indigo-500 transition-colors">analyzing your first experience</Link> to unlock insights.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

// Helper: Get topic tags for memory
function getTopicTags(topics: string[] | undefined): string[] {
  if (!topics || topics.length === 0) return []
  return topics.slice(0, 3)
}