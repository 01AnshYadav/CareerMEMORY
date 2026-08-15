import { Action } from '../types'

interface Props {
  actions: Action[]
}

export default function ActionList({ actions }: Props) {
  if (!actions.length) return null

  return (
    <div className="action-list">
      {actions.map((action, idx) => (
        <div key={idx} className="action-card">
          <div className="action-header">
            <h4>{action.title}</h4>
            <span className="priority">Priority: {action.priority}/100</span>
          </div>
          <p className="action-description">{action.description}</p>
          <p className="action-reason">{action.reason}</p>
        </div>
      ))}
    </div>
  )
}