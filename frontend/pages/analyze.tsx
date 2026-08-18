import { useRef, useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import { API_BASE } from '../lib/api'

const MAX_LENGTH = 5000
const ANALYZE_TIMEOUT_MS = 60000

export interface AnalyzeResult {
  title: string
  summary: string
  category: string
  topics: string[]
  importance: number
  current_relevance: number
  future_relevance: number
  prerequisites: string[]
  suggested_actions: string[]
}

export default function AnalyzePage() {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isAnalyzing) return

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to analyze')
      }
      const analysis: AnalyzeResult = await res.json()
      setResult(analysis)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Analysis timed out. Please try again.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      clearTimeout(timeoutId)
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!result || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_text: text, ...result }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to save memory')
      }
      const saved = await res.json()
      router.push(`/memories/${saved.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setIsSaving(false)
    }
  }

  const handleEdit = () => {
    setResult(null)
    setError(null)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Analyze</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Turn a raw experience into a structured memory — then decide whether to keep it.
        </p>
      </header>

      {!result ? (
        <form onSubmit={handleAnalyze}>
          <div className="card flex flex-col gap-3 p-4 sm:p-6">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Tell CareerMEMORY about something you built, learned, achieved, struggled with, or want to remember."
              className="min-h-[280px] w-full resize-y rounded border border-border bg-surface p-4 text-base leading-relaxed text-ink-primary placeholder:text-ink-muted focus-ring"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-muted">
                {text.length}/{MAX_LENGTH} · We extract the skills, evidence, and next steps so you
                can review before saving.
              </p>
              <button
                type="submit"
                disabled={isAnalyzing || !text.trim()}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-surface transition-opacity focus-ring hover:opacity-90 disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing…' : 'Analyze →'}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-sm bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="tag">{result.category}</span>
                <h2 className="mt-3 text-xl font-medium tracking-tight text-ink-primary">
                  {result.title}
                </h2>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={isSaving}
                  className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink-primary transition-colors focus-ring hover:bg-background disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface transition-opacity focus-ring hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save Memory'}
                </button>
              </div>
            </div>
            {result.summary && (
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{result.summary}</p>
            )}
          </div>

          <section className="card p-5 sm:p-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              What happened
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
              {text}
            </p>
          </section>

          {result.topics.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h3 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Skills
              </h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.topics.map((topic) => (
                  <span key={topic} className="tag">
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {result.prerequisites.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h3 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Key evidence
              </h3>
              <ul className="mt-3 space-y-2">
                {result.prerequisites.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.suggested_actions.length > 0 && (
            <section className="card p-5 sm:p-6">
              <h3 className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Next steps
              </h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-secondary">
                {result.suggested_actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap gap-x-10 gap-y-3">
            {(
              [
                { label: 'Importance', value: result.importance },
                { label: 'Current relevance', value: result.current_relevance },
                { label: 'Future relevance', value: result.future_relevance },
              ] as Array<{ label: string; value: number }>
            ).map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="text-lg font-medium text-ink-primary">{value}</p>
              </div>
            ))}
          </section>

          {error && (
            <p className="rounded-sm bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}