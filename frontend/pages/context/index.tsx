import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserContext, ContextFormData } from '../../types'

const API_BASE = 'http://localhost:8000'

export default function ContextPage() {
  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // form state as comma-separated strings
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
        setCtx(data)
        // populate form
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
        // no context yet
        setCtx(null)
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
    setForm(prev => ({ ...prev, [name]: value }))
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
        target_roles: form.target_roles.split(',').map(s => s.trim()).filter(Boolean),
        interests: form.interests.split(',').map(s => s.trim()).filter(Boolean),
        current_skills: form.current_skills.split(',').map(s => s.trim()).filter(Boolean),
        current_projects: form.current_projects.split(',').map(s => s.trim()).filter(Boolean),
        goals: form.goals.split(',').map(s => s.trim()).filter(Boolean),
      }
      const res = await fetch(`${API_BASE}/api/context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save context')
      const data = await res.json()
      setCtx(data)
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

  if (loading) return <div className="container">Loading context...</div>

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">Analyzer</Link>
        <span className="nav-sep">|</span>
        <Link href="/memories">Memories</Link>
        <span className="nav-sep">|</span>
        <Link href="/context"><strong>Context</strong></Link>
      </nav>

      <h1>CareerMemory Context</h1>
      <p className="description">Define your profile so future features can tailor recommendations.</p>

      {error && <div className="error">{error}</div>}
      {saved && <div className="success">Context saved successfully ✓</div>}

      <form onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Identity</legend>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="current_role">Current role</label>
            <input id="current_role" name="current_role" value={form.current_role} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="education">Education</label>
            <input id="education" name="education" value={form.education} onChange={handleChange} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Career</legend>
          <div className="form-group">
            <label htmlFor="career_goal">Career goal</label>
            <textarea id="career_goal" name="career_goal" value={form.career_goal} onChange={handleChange} rows={2} />
          </div>
          <div className="form-group">
            <label htmlFor="target_roles">Target roles (comma separated)</label>
            <input id="target_roles" name="target_roles" value={form.target_roles} onChange={handleChange} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Skills & Interests</legend>
          <div className="form-group">
            <label htmlFor="interests">Interests (comma separated)</label>
            <input id="interests" name="interests" value={form.interests} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="current_skills">Current skills (comma separated)</label>
            <input id="current_skills" name="current_skills" value={form.current_skills} onChange={handleChange} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Projects</legend>
          <div className="form-group">
            <label htmlFor="current_projects">Current projects (comma separated)</label>
            <input id="current_projects" name="current_projects" value={form.current_projects} onChange={handleChange} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Goals</legend>
          <div className="form-group">
            <label htmlFor="goals">Goals (comma separated)</label>
            <input id="goals" name="goals" value={form.goals} onChange={handleChange} />
          </div>
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Context'}
        </button>
      </form>
    </div>
  )
}