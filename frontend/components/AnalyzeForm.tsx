import { useState, FormEvent } from 'react'

const API_BASE = 'http://localhost:8000'

// Shape of the AI analysis response
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

// Full memory as stored in the database
export interface Memory extends AnalyzeResult {
  id: number
  original_text: string
  created_at: string
  updated_at: string
}

interface Props {}

export default function AnalyzeForm({}: Props) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'saving'>('idle')
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [savedMemory, setSavedMemory] = useState<Memory | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setPhase('analyzing')
    setAnalyzeError(null)
    setSaveError(null)
    setAnalyzeResult(null)
    setSavedMemory(null)

    try {
      // 1️⃣ Analyze
      const analyzeRes = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json()
        throw new Error(err.detail || 'Failed to analyze')
      }

      const analysis: AnalyzeResult = await analyzeRes.json()
      setAnalyzeResult(analysis)

      // 2️⃣ Save
      setPhase('saving')
      const saveRes = await fetch(`${API_BASE}/api/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: text,
          ...analysis,
        }),
      })

      if (!saveRes.ok) {
        const err = await saveRes.json()
        throw new Error(err.detail || 'Failed to save memory')
      }

      const saved: Memory = await saveRes.json()
      setSavedMemory(saved)
      setPhase('idle')
    } catch (err: any) {
      if (phase === 'analyzing') {
        setAnalyzeError(err.message)
      } else {
        setSaveError(err.message)
      }
      setPhase('idle')
    }
  }

  const isBusy = phase !== 'idle'

  return (
    <div className="container">
      <nav className="nav">
        <a href="/"><strong>Analyzer</strong></a>
        <span className="nav-sep">|</span>
        <a href="/memories">Memories</a>
      </nav>

      <h1>CareerMemory</h1>
      <p className="description">
        Paste any career‑related note, tip, or article excerpt. The AI will
        structure it and save it for you.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. GSoC contributors should start contributing to open source before applications."
          disabled={isBusy}
        />
        <br />
        <button type="submit" disabled={isBusy}>
          {phase === 'analyzing' ? 'Analyzing…' : phase === 'saving' ? 'Saving…' : 'Save to Memory'}
        </button>
      </form>

      {analyzeError && <div className="error">Failed to analyze your memory: {analyzeError}</div>}
      {saveError && <div className="error">Analysis completed, but the memory could not be saved: {saveError}</div>}

      {savedMemory && (
        <div className="result">
          <h3>✓ Memory saved successfully (ID: {savedMemory.id})</h3>
          <dl>
            <dt>Title</dt>
            <dd>{savedMemory.title}</dd>

            <dt>Summary</dt>
            <dd>{savedMemory.summary}</dd>

            <dt>Category</dt>
            <dd>{savedMemory.category}</dd>

            <dt>Topics</dt>
            <dd>{savedMemory.topics.join(', ')}</dd>

            <dt>Importance</dt>
            <dd>{savedMemory.importance}</dd>

            <dt>Current relevance</dt>
            <dd>{savedMemory.current_relevance}</dd>

            <dt>Future relevance</dt>
            <dd>{savedMemory.future_relevance}</dd>

            <dt>Prerequisites</dt>
            <dd>{savedMemory.prerequisites.join(', ')}</dd>

            <dt>Suggested actions</dt>
            <dd>{savedMemory.suggested_actions.join(', ')}</dd>

            <dt>Created at</dt>
            <dd>{savedMemory.created_at}</dd>
          </dl>
        </div>
      )}

      {!savedMemory && analyzeResult && (
        <div className="result">
          <h3>AI Structured Result (not saved)</h3>
          <pre>{JSON.stringify(analyzeResult, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}