import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="flex items-center justify-between px-4 py-3 z-40"
      style={{
        background: 'var(--navy-900)',
        borderBottom: '1px solid var(--navy-700)',
      }}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <Link
        to="/"
        className="flex items-center gap-2 font-extrabold text-base tracking-tight select-none"
        style={{ color: 'var(--text-primary)' }}
        aria-label="StadiumSense AI home"
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--green-500), var(--green-400))',
            color: '#021a0e',
            fontWeight: 900,
          }}
          aria-hidden="true"
        >
          S
        </span>
        <span>
          Stadium<span style={{ color: 'var(--green-400)' }}>Sense</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex gap-1" role="list">
        {[
          { to: '/', label: 'Fan Companion' },
          { to: '/ops', label: 'Ops Center' },
        ].map(({ to, label }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              role="listitem"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                color: active ? 'var(--green-400)' : 'var(--text-secondary)',
                background: active ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
                fontWeight: active ? 600 : 400,
              }}
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
