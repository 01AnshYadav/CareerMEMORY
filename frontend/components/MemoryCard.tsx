import Link from 'next/link'
import type { Memory } from '../types'

export default function MemoryCard({ memory }: { memory: Memory }) {
  const date = new Date(memory.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const skills = (memory.topics || []).slice(0, 4)

  return (
    <Link
      href={`/memories/${memory.id}`}
      className="group flex flex-col gap-2 rounded border border-border bg-surface p-4 transition-colors hover:border-ink-muted"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tag">{memory.category}</span>
        <time className="text-xs text-ink-muted">{date}</time>
      </div>

      <h3 className="text-[15px] font-medium leading-snug text-ink-primary transition-colors group-hover:text-accent">
        {memory.title}
      </h3>

      <p className="line-clamp-2 text-sm leading-relaxed text-ink-secondary">{memory.summary}</p>

      {skills.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {skills.map((skill) => (
            <span key={skill} className="tag">
              {skill}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}