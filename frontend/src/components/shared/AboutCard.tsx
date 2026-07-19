/**
 * AboutCard -- tasteful "built by" attribution credit.
 *
 * Rendered as a small collapsible footer section. Collapsed by default,
 * showing only a one-line prompt. Expanding reveals the project summary
 * and Toka's links with subtle hover states.
 *
 * Designed to feel like a professional attribution, not a resume dump.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, Link2, Globe, Mail } from 'lucide-react'

interface LinkItem {
  icon: React.ReactNode
  label: string
  href: string
  display: string
}

const LINKS: LinkItem[] = [
  {
    icon: <Link2 size={13} aria-hidden="true" />,
    label: 'GitHub profile',
    href: 'https://github.com/NaniToka',
    display: 'github.com/NaniToka',
  },
  {
    icon: <Link2 size={13} aria-hidden="true" />,
    label: 'LinkedIn profile',
    href: 'https://www.linkedin.com/in/toka-nani-33a124359/',
    display: 'linkedin.com/in/toka-nani',
  },
  {
    icon: <Globe size={13} aria-hidden="true" />,
    label: 'Portfolio',
    href: 'https://toka-portfolio-2.onrender.com/',
    display: 'toka-portfolio-2.onrender.com',
  },
  {
    icon: <Mail size={13} aria-hidden="true" />,
    label: 'Email',
    href: 'mailto:tokananiy@gmail.com',
    display: 'tokananiy@gmail.com',
  },
]

export default function AboutCard() {
  const [expanded, setExpanded] = useState(false)

  return (
    <footer
      className="mt-auto"
      style={{ borderTop: '1px solid var(--navy-800)' }}
      aria-label="About this project"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] transition-colors duration-150"
        style={{ color: 'var(--text-muted)' }}
        aria-expanded={expanded}
        aria-controls="about-panel"
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
      >
        {expanded ? <ChevronDown size={11} aria-hidden="true" /> : <ChevronUp size={11} aria-hidden="true" />}
        Built by Toka Nani - StadiumSense AI - FIFA World Cup 2026
        {expanded ? <ChevronDown size={11} aria-hidden="true" /> : <ChevronUp size={11} aria-hidden="true" />}
      </button>

      {expanded && (
        <div
          id="about-panel"
          className="mx-auto px-4 py-4 max-w-2xl panel-slide-up"
          style={{
            background: 'var(--navy-900)',
            borderTop: '1px solid var(--navy-800)',
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black"
              style={{
                background: 'linear-gradient(135deg, var(--green-500), var(--green-400))',
                color: '#021a0e',
              }}
              aria-hidden="true"
            >
              S
            </div>
            <div>
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                StadiumSense AI
              </p>
              <p
                className="text-xs mt-0.5 leading-snug"
                style={{ color: 'var(--text-secondary)' }}
              >
                AI-powered stadium operations platform for FIFA World Cup 2026 -
                real-time crowd management, multilingual fan assistance, and sustainability tracking.
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-3"
            style={{
              background: 'var(--navy-800)',
              border: '1px solid var(--navy-700)',
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Built by
            </p>
            <p
              className="text-sm font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Toka Nani
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {LINKS.map(({ icon, label, href, display }) => (
                
                  key={href}
                  href={href}
                  target={href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all duration-150 group"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.color = 'var(--green-400)'
                    el.style.background = 'var(--chip-bg)'
                    el.style.borderColor = 'var(--chip-border)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.color = 'var(--text-secondary)'
                    el.style.background = 'transparent'
                    el.style.borderColor = 'transparent'
                  }}
                >
                  <span style={{ color: 'inherit', opacity: 0.7 }}>{icon}</span>
                  <span className="truncate">{display}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
