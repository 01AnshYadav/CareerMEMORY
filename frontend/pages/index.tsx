import AnalyzeForm from '../components/AnalyzeForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-muted/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal">
            CareerMEMORY
          </h1>
          <nav className="flex gap-6 text-sm text-muted">
            <a href="/memories" className="hover:text-charcoal transition-colors">
              Memories
            </a>
            <a href="/context" className="hover:text-charcoal transition-colors">
              Context
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-charcoal mb-4">
            Turn Your Experience Into Career Memory
          </h2>
          <p className="text-lg text-muted/70 mb-8 max-w-2xl mx-auto">
            CareerMEMORY is a personal career knowledge system that turns your experiences,
            projects, skills and learning into structured career memory. Analyze any text,
            preserve useful knowledge, and build a structured career profile over time.
          </p>
        </div>
      </section>

      {/* Main Action */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnalyzeForm />
      </main>

      {/* Secondary Information */}
      <section className="max-w-6xl mx-auto px-4 py-8 border-t border-muted/50">
        <div className="grid max-w-6xl mx-auto grid-cols-1 gap-6 md:grid-cols-3">
          <div className="border rounded-md p-4 bg-white/50 backdrop-blur-sm">
            <div className="text-3xl font-medium text-charcoal mb-1">Skills</div>
            <p className="text-sm text-muted/70">Extract and track key skills from your experiences</p>
          </div>
          <div className="border rounded-md p-4 bg-white/50 backdrop-blur-sm">
            <div className="text-3xl font-medium text-charcoal mb-1">Projects</div>
            <p className="text-sm text-muted/70">Log your projects and technical work</p>
          </div>
          <div className="border rounded-md p-4 bg-white/50 backdrop-blur-sm">
            <div className="text-3xl font-medium text-charcoal mb-1">Experience</div>
            <p className="text-sm text-muted/70">Document career experiences and achievements</p>
          </div>
        </div>
      </section>
    </div>
  )
}