import { Connection } from '../types'

interface Props {
  connections: Connection[]
}

export default function ConnectionList({ connections }: Props) {
  if (!connections.length) return null

  const icons: Record<string, string> = {
    career_goal: '🎯',
    target_role: '💼',
    project: '📁',
    goal: '🏁',
    interest: '💡',
    skill: '🛠️',
  }

  return (
    <div className="connection-list">
      {connections.map((conn, idx) => (
        <div key={idx} className="connection-card">
          <div className="connection-header">
            <span className="connection-icon">{icons[conn.type] || '🔗'}</span>
            <strong className="connection-label">{conn.label}</strong>
            <span className="connection-value">{conn.matched_value}</span>
          </div>
          <p className="connection-reason">{conn.reason}</p>
        </div>
      ))}
    </div>
  )
}