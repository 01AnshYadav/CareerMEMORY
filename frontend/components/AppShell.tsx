import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface Props {
  children: React.ReactNode
}

const primaryNav = [
  { href: '/', label: 'Overview' },
  { href: '/memories', label: 'Memories' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/skills', label: 'Skills' },
  { href: '/projects', label: 'Projects' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/insights', label: 'Insights' },
]

const careerNav = [{ href: '/context', label: 'Context' }]

function NavLink({
  href,
  label,
  active,
  onNavigate,
  large,
}: {
  href: string
  label: string
  active: boolean
  onNavigate?: () => void
  large?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`${large ? 'text-base' : 'text-sm'} block rounded px-2.5 py-1.5 transition-colors ${
        active
          ? 'bg-accent-soft font-medium text-accent'
          : 'text-ink-secondary hover:bg-background hover:text-ink-primary'
      }`}
    >
      {label}
    </Link>
  )
}

export default function AppShell({ children }: Props) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-border bg-surface lg:flex">
        <div className="px-4 pb-2 pt-6">
          <Link href="/" className="text-[17px] font-medium tracking-tight text-ink-primary">
            CareerMemory
          </Link>
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 px-2.5">
          {primaryNav.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={isActive(link.href)}
            />
          ))}
        </nav>
        <div className="mb-6 mt-6 border-t border-border px-2.5 pt-4">
          <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            Career
          </p>
          <div className="space-y-0.5">
            {careerNav.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(link.href)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/" className="text-[17px] font-medium tracking-tight text-ink-primary">
          CareerMemory
        </Link>
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded p-2 text-ink-secondary transition-colors hover:bg-background hover:text-ink-primary"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-primary/20"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-surface"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[17px] font-medium tracking-tight text-ink-primary">
                CareerMemory
              </span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={closeMobile}
                className="rounded p-2 text-ink-secondary transition-colors hover:bg-background hover:text-ink-primary"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2.5">
              {primaryNav.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={isActive(link.href)}
                  onNavigate={closeMobile}
                  large
                />
              ))}
            </nav>
            <div className="border-t border-border px-2.5 pb-6 pt-4">
              <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                Career
              </p>
              <div className="space-y-0.5">
                {careerNav.map((link) => (
                  <NavLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    active={isActive(link.href)}
                    onNavigate={closeMobile}
                    large
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="min-h-screen lg:pl-[220px]">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  )
}