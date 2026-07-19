/**
 * AskAIPanel — free-text AI query panel for organizers/volunteers.
 *
 * The organizer types a question (e.g. "Where should I deploy 3 extra
 * volunteers right now?") and receives a Gemini-powered recommendation.
 *
 * The response is rendered word-by-word with a typing animation to
 * simulate streaming, even though the backend returns all at once.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, Sparkles, Loader2 } from 'lucide-react'
import { opsApi } from '../../services/api'

const STADIUM_ID = 'wc2026-stadium-1'
const WORD_DELAY_MS = 28  // ms between words in the simulated stream

const QUICK_PROMPTS = [
  'Where should I deploy extra volunteers right now?',
  'Which zone needs crowd control urgently?',
  'What eco actions should we take this half?',
  'Suggest the safest fan exit strategy post-match.',
]

interface Message {
  role: 'user' | 'ai'
  text: string
  streaming?: boolean
}

export default function AskAIPanel() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /** Simulate word-by-word streaming of a complete response string */
  const streamText = useCallback((fullText: string) => {
    const words = fullText.split(' ')
    let built = ''
    let idx = 0

    const step = () => {
      if (idx >= words.length) {
        // Finalise — remove streaming flag
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.role === 'ai') copy[copy.length - 1] = { ...last, streaming: false }
          return copy
        })
        return
      }
      built += (idx === 0 ? '' : ' ') + words[idx]
      idx++
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === 'ai') copy[copy.length - 1] = { ...last, text: built, streaming: true }
        return copy
      })
      setTimeout(step, WORD_DELAY_MS)
    }

    // Seed the AI message with an empty streaming bubble
    setMessages((prev) => [...prev, { role: 'ai', text: '', streaming: true }])
    setTimeout(step, 100)
  }, [])

  const handleSubmit = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      setQuery('')
      setError(null)
      setIsLoading(true)
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }])

      try {
        const result = await opsApi.askAI(STADIUM_ID, trimmed)
        const fullResponse = result.ai_recommendation || result.message || 'No recommendation available.'
        streamText(fullResponse)
      } catch (err) {
        setError('AI request failed. Please try again.')
        console.error('AskAI error:', err)
      } finally {
        setIsLoading(false)
        inputRef.current?.focus()
      }
    },
    [isLoading, streamText],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit(query)
    }
  }

  const canSend = query.trim().length > 0 && !isLoading

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'var(--navy-800)',
        border: '1px solid var(--navy-600)',
        minHeight: 280,
        maxHeight: 480,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--navy-700)' }}
      >
        <span style={{ color: 'var(--green-400)' }} aria-hidden="true">
          <Sparkles size={15} />
        </span>
        <span
          className="text-sm font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Ask AI
        </span>
        <span
          className="text-[11px] ml-1"
          style={{ color: 'var(--text-muted)' }}
        >
          operational reasoning
        </span>
      </div>

      {/* Message area */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none px-4 py-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="AI conversation"
      >
        {messages.length === 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Quick prompts:
            </p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="block w-full text-left text-xs px-3 py-2 rounded-xl transition-colors duration-150"
                style={{
                  background: 'var(--navy-900)',
                  border: '1px solid var(--navy-700)',
                  color: 'var(--text-secondary)',
                }}
                onClick={() => void handleSubmit(p)}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = 'var(--navy-600)')}
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = 'var(--navy-700)')}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 msg-enter ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'ai' && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--navy-700)', color: 'var(--green-400)' }}
                aria-hidden="true"
              >
                <Bot size={12} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                msg.streaming ? 'streaming-cursor' : ''
              }`}
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, var(--green-500), var(--green-400))',
                      color: '#021a0e',
                      fontWeight: 500,
                    }
                  : {
                      background: 'var(--navy-900)',
                      border: '1px solid var(--navy-700)',
                      color: 'var(--text-primary)',
                    }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--navy-700)', color: 'var(--green-400)' }}
              aria-hidden="true"
            >
              <Bot size={12} />
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
              style={{ background: 'var(--navy-900)', border: '1px solid var(--navy-700)' }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--green-400)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Reasoning…
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs px-2" style={{ color: '#f87171' }}>
            ⚠️ {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); void handleSubmit(query) }}
        className="flex items-end gap-2 px-3 py-2.5 shrink-0 input-glow"
        style={{ borderTop: '1px solid var(--navy-700)' }}
      >
        <div
          className="flex-1 flex items-end rounded-xl px-3 py-1.5"
          style={{
            background: 'var(--navy-900)',
            border: `1px solid ${canSend ? 'var(--input-focus)' : 'var(--input-border)'}`,
            transition: 'border-color 0.2s',
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about stadium operations…"
            disabled={isLoading}
            aria-label="Operational question for AI"
            className="w-full bg-transparent resize-none text-xs focus:outline-none disabled:opacity-50"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--green-400)' }}
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send question to AI"
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90"
          style={{
            background: canSend
              ? 'linear-gradient(135deg, var(--green-500), var(--green-400))'
              : 'var(--navy-700)',
            color: canSend ? '#021a0e' : 'var(--text-muted)',
            boxShadow: canSend ? 'var(--green-glow)' : 'none',
          }}
        >
          <Send size={14} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
