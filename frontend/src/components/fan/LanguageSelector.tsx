/**
 * LanguageSelector — compact dropdown for switching locale.
 * Keyboard accessible; closes on Escape or outside click.
 */
import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import type { Locale } from '../../i18n/strings'
import { LOCALE_LABELS } from '../../i18n/strings'
import type { Strings } from '../../i18n/strings'

interface Props {
  locale: Locale
  onSelect: (l: Locale) => void
  strings: Strings
}

const LOCALES = Object.keys(LOCALE_LABELS) as Locale[]

export default function LanguageSelector({ locale, onSelect, strings }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={strings.language}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
        style={{
          background: open ? 'var(--chip-hover)' : 'var(--chip-bg)',
          border: '1px solid var(--chip-border)',
          color: 'var(--green-400)',
        }}
      >
        <Globe size={13} aria-hidden="true" />
        <span>{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={strings.language}
          className="absolute right-0 bottom-full mb-1 z-50 w-40 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--navy-800)',
            border: '1px solid var(--navy-600)',
          }}
        >
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                onClick={() => { onSelect(l); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-100"
                style={{
                  color: l === locale ? 'var(--green-400)' : 'var(--text-primary)',
                  background: l === locale ? 'var(--chip-bg)' : 'transparent',
                  fontWeight: l === locale ? 600 : 400,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = 'var(--navy-700)')}
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    l === locale ? 'var(--chip-bg)' : 'transparent')}
              >
                {LOCALE_LABELS[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
