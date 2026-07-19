/**
 * ChatInput — dark navy text field with electric-green send button.
 * Supports Enter-to-send and screen-reader labels.
 */
import { useState, useRef } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder: string
  sendLabel: string
}

export default function ChatInput({ onSend, disabled, placeholder, sendLabel }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed && !disabled) {
      onSend(trimmed)
      setValue('')
      // Reset textarea height
      if (inputRef.current) inputRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  // Auto-grow textarea up to 5 lines
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-3 py-3 input-glow"
      style={{
        background: 'var(--navy-900)',
        borderTop: '1px solid var(--navy-700)',
      }}
    >
      <div
        className="flex-1 flex items-end rounded-2xl px-4 py-2 transition-all duration-200"
        style={{
          background: 'var(--input-bg)',
          border: `1px solid ${canSend ? 'var(--input-focus)' : 'var(--input-border)'}`,
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
          className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none disabled:opacity-50"
          style={{ color: 'var(--text-primary)', caretColor: 'var(--green-400)' }}
        />
      </div>

      <button
        type="submit"
        disabled={!canSend}
        aria-label={sendLabel}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90"
        style={{
          background: canSend
            ? 'linear-gradient(135deg, var(--green-500), var(--green-400))'
            : 'var(--navy-700)',
          color: canSend ? '#021a0e' : 'var(--text-muted)',
          boxShadow: canSend ? 'var(--green-glow)' : 'none',
        }}
      >
        <Send size={16} aria-hidden="true" />
      </button>
    </form>
  )
}
