import Link from 'next/link'
import { Memory } from './AnalyzeForm'

interface Props {
  memory: Memory
}

export default function MemoryCard({ memory }: Props) {
  const date = new Date(memory.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link href={`/memories/${memory.id}`} className="card-link">
      <div className="memory-card">
        <div className="card-header">
          <h3>{memory.title}</h3>
          <span className="category">{memory.category}</span>
        </div>
        <p className="summary">{memory.summary}</p>
        <div className="topics">
          Topics: {memory.topics.map((t, i) => <span key={i}>{t}{i < memory.topics.length - 1 ? ' • ' : ''}</span>)}
        </div>
        <div className="metrics">
          <div><strong>Importance</strong> {memory.importance}</div>
          <div><strong>Current relevance</strong> {memory.current_relevance}</div>
          <div><strong>Future relevance</strong> {memory.future_relevance}</div>
        </div>
        <div className="date">{date}</div>
      </div>
    </Link>
  )
}