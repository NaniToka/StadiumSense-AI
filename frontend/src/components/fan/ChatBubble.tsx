/**
 * ChatBubble — renders a single conversation turn.
 *
 * User messages: right-aligned with green gradient.
 * AI messages:   left-aligned with dark navy background, AI avatar,
 *                and an optional suggested-action pill.
 */
import type { ChatMessage } from '../../types'

const INTENT_ICONS: Record<string, string> = {
  navigation: '🗺️',
  crowd_status: '👥',
  transport: '🚌',
  accessibility: '♿',
  sustainability_tip: '♻️',
  operational_alert: '⚠️',
  general: '💬',
}

interface Props {
  message: ChatMessage
  youLabel: string
  assistantLabel: string
}

export default function ChatBubble({ message, youLabel, assistantLabel }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 msg-enter" role="listitem">
        <div className="flex flex-col items-end max-w-[80%] sm:max-w-md">
          <span
            className="text-[11px] font-semibold mb-1 tracking-wide uppercase"
            style={{ color: 'var(--text-muted)' }}
            aria-hidden="true"
          >
            {youLabel}
          </span>
          <div
            className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed font-medium shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--bubble-user-from), var(--bubble-user-to))',
              color: '#021a0e',
            }}
          >
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  // AI message
  const intentIcon = message.intent ? (INTENT_ICONS[message.intent] ?? '💬') : '💬'

  return (
    <div className="flex items-end gap-2.5 mb-4 msg-enter" role="listitem">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-md"
        style={{
          background: 'var(--navy-700)',
          color: 'var(--green-400)',
          border: '1px solid var(--green-600)',
        }}
        aria-hidden="true"
      >
        AI
      </div>

      <div className="flex flex-col items-start max-w-[80%] sm:max-w-md">
        <span
          className="text-[11px] font-semibold mb-1 tracking-wide uppercase flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
          aria-hidden="true"
        >
          {intentIcon} {assistantLabel}
        </span>

        {/* Bubble */}
        <div
          className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-md"
          style={{
            background: 'var(--bubble-ai-bg)',
            border: '1px solid var(--bubble-ai-border)',
            color: 'var(--text-primary)',
          }}
        >
          {message.content}
        </div>

        {/* Suggested action pill */}
        {message.suggested_action && (
          <div
            className="mt-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: 'var(--chip-bg)',
              border: '1px solid var(--chip-border)',
              color: 'var(--green-400)',
            }}
          >
            → {message.suggested_action}
          </div>
        )}
      </div>
    </div>
  )
}
