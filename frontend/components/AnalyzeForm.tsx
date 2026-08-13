import { useState, FormEvent } from 'react'

// Shape of the AI response
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

interface Props {}

export default function AnalyzeForm({}: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)

  // Called when user clicks "Save to Memory"
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Call our backend endpoint (FastAPI runs on port 8000)
      const res = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to analyze')
      }

      const data: AnalyzeResult = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>CareerMemory</h1>
      <p className="description">
        Paste any career‑related note, tip, or article excerpt. The AI will
        structure it for you.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. GSoC contributors should start contributing to open source before applications."
          disabled={loading}
        />
        <br />
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Save to Memory'}
        </button>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="result">
          <h3>AI Structured Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}