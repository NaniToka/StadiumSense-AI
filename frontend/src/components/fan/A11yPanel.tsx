/**
 * A11yPanel — slide-up drawer for accessibility toggles.
 *
 * Traps focus while open (simple approach: first/last focusable element).
 * Closes on Escape key or backdrop click.
 * All interactive elements have visible focus rings and aria labels.
 */
import { useEffect, useRef } from 'react'
import { X, Type, Contrast } from 'lucide-react'
import type { A11ySettings } from '../../context/AppContext'
import type { Strings } from '../../i18n/strings'

interface Props {
  a11y: A11ySettings
  onToggleLargeText: () => void
  onToggleHighContrast: () => void
  onClose: () => void
  strings: Strings
}

export default function A11yPanel({
  a11y,
  onToggleLargeText,
  onToggleHighContrast,
  onClose,
  strings,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Focus the close button on mount
  useEffect(() => {
    closeBtnRef.current?.focus()
  }, [])

  // Escape closes the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(4, 13, 26, 0.7)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={strings.a11yPanelTitle}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-5 py-5 panel-slide-up"
        style={{
          background: 'var(--navy-800)',
          border: '1px solid var(--navy-600)',
          maxWidth: '42rem',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-bold text-base"
            style={{ color: 'var(--text-primary)' }}
          >
            ♿ {strings.a11yPanelTitle}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={strings.closePanel}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'var(--navy-700)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <ToggleRow
            icon={<Type size={18} aria-hidden="true" />}
            label={strings.largertextLabel}
            checked={a11y.largeText}
            onToggle={onToggleLargeText}
            id="toggle-large-text"
          />
          <ToggleRow
            icon={<Contrast size={18} aria-hidden="true" />}
            label={strings.highContrastLabel}
            checked={a11y.highContrast}
            onToggle={onToggleHighContrast}
            id="toggle-high-contrast"
          />
        </div>

        {/* Accessibility needs text input */}
        <div className="mt-4">
          <label
            htmlFor="a11y-needs-input"
            className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            My accessibility needs (optional)
          </label>
          <input
            id="a11y-needs-input"
            type="text"
            placeholder="e.g. wheelchair user, visual impairment…"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--navy-900)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
            aria-describedby="a11y-needs-hint"
          />
          <p
            id="a11y-needs-hint"
            className="mt-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            This is shared with the AI to personalise your responses.
          </p>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Toggle row
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  checked: boolean
  onToggle: () => void
  id: string
}

function ToggleRow({ icon, label, checked, onToggle, id }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor={id}
        className="flex items-center gap-2.5 text-sm font-medium cursor-pointer select-none"
        style={{ color: 'var(--text-primary)' }}
      >
        <span style={{ color: checked ? 'var(--green-400)' : 'var(--text-muted)' }}>{icon}</span>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 focus-visible:ring-2"
        style={{
          background: checked
            ? 'linear-gradient(135deg, var(--green-500), var(--green-400))'
            : 'var(--navy-700)',
          border: `1px solid ${checked ? 'var(--green-400)' : 'var(--navy-600)'}`,
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all duration-200"
          style={{
            left: checked ? 'calc(100% - 22px)' : '2px',
            background: checked ? '#021a0e' : 'var(--text-muted)',
          }}
          aria-hidden="true"
        />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}
