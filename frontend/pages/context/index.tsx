import { useEffect, useState } from 'react'
import { ContextFormData } from '../../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const inputClasses =
  'w-full rounded border border-border bg-background px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus-ring'

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function Field({
  id,
  label,
  value,
  onChange,
  textarea,
  last,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  textarea?: boolean
  last?: boolean
}) {
  return (
    <div className={last ? '' : 'mb-4'}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-ink-secondary">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={id}
          rows={2}
          value={value}
          onChange={onChange}
          className={`${inputClasses} resize-y`}
        />
      ) : (
        <input id={id} name={id} value={value} onChange={onChange} className={inputClasses} />
      )}
    </div>
  )
}

export default function ContextPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<ContextFormData>({
    name: '',
    current_role: '',
    education: '',
    career_goal: '',
    target_roles: '',
    interests: '',
    current_skills: '',
    current_projects: '',
    goals: '',
  })

  const fetchContext = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/context`)
      if (res.ok) {
        const data = await res.json()
        setForm({
          name: data.name || '',
          current_role: data.current_role || '',
          education: data.education || '',
          career_goal: data.career_goal || '',
          target_roles: (data.target_roles || []).join(', '),
          interests: (data.interests || []).join(', '),
          current_skills: (data.current_skills || []).join(', '),
          current_projects: (data.current_projects || []).join(', '),
          goals: (data.goals || []).join(', '),
        })
      } else if (res.status === 404) {
        // no context yet — leave the form empty
      } else {
        throw new Error('Unable to load context')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContext()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const payload = {
        name: form.name,
        current_role: form.current_role,
        education: form.education,
        career_goal: form.career_goal,
        target_roles: splitList(form.target_roles),
        interests: splitList(form.interests),
        current_skills: splitList(form.current_skills),
        current_projects: splitList(form.current_projects),
        goals: splitList(form.goals),
      }
      const res = await fetch(`${API_BASE}/api/context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save context')
      const data = await res.json()
      setForm({
        name: data.name || '',
        current_role: data.current_role || '',
        education: data.education || '',
        career_goal: data.career_goal || '',
        target_roles: (data.target_roles || []).join(', '),
        interests: (data.interests || []).join(', '),
        current_skills: (data.current_skills || []).join(', '),
        current_projects: (data.current_projects || []).join(', '),
        goals: (data.goals || []).join(', '),
      })
      setSaved(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="h-6 w-6 animate-spin rounded border-2 border-border border-t-accent" />
        <p className="text-sm text-ink-secondary">Loading context…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-ink-secondary">Unable to load context.</p>
        <button
          type="button"
          onClick={fetchContext}
          className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink-primary focus-ring hover:bg-background"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-ink-primary">Context</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The facts about your career that shape how everything else reads.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-ink-primary">About you</h2>
          <Field id="name" label="Name" value={form.name} onChange={handleChange} />
          <Field id="current_role" label="Current role" value={form.current_role} onChange={handleChange} />
          <Field id="education" label="Education" value={form.education} onChange={handleChange} last />
        </section>

        <section className="rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-ink-primary">Career goals</h2>
          <Field id="career_goal" label="Career goal" value={form.career_goal} onChange={handleChange} textarea />
          <Field
            id="target_roles"
            label="Target roles (comma separated)"
            value={form.target_roles}
            onChange={handleChange}
            last
          />
        </section>

        <section className="rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-ink-primary">Skills &amp; projects</h2>
          <Field id="interests" label="Interests (comma separated)" value={form.interests} onChange={handleChange} />
          <Field id="current_skills" label="Current skills (comma separated)" value={form.current_skills} onChange={handleChange} />
          <Field
            id="current_projects"
            label="Current projects (comma separated)"
            value={form.current_projects}
            onChange={handleChange}
            last
          />
        </section>

        <section className="rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-medium text-ink-primary">Goals</h2>
          <Field id="goals" label="Goals (comma separated)" value={form.goals} onChange={handleChange} last />
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm">
            {error ? (
              <span className="text-ink-secondary">{error}</span>
            ) : saved ? (
              <span className="text-accent">Context saved.</span>
            ) : null}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white focus-ring transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Context'}
          </button>
        </div>
      </form>
    </div>
  )
}