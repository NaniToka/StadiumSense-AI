/**
 * Animated typing indicator shown while the AI is generating a response.
 */
export default function TypingIndicator({ label }: { label: string }) {
  return (
    <div
      className="flex items-end gap-2 mb-4 msg-enter"
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      {/* AI avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ background: 'var(--navy-700)', color: 'var(--green-400)' }}
        aria-hidden="true"
      >
        AI
      </div>

      {/* Bubble */}
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{
          background: 'var(--bubble-ai-bg)',
          border: '1px solid var(--bubble-ai-border)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full dot-1"
          style={{ background: 'var(--green-400)' }}
          aria-hidden="true"
        />
        <span
          className="w-2 h-2 rounded-full dot-2"
          style={{ background: 'var(--green-400)' }}
          aria-hidden="true"
        />
        <span
          className="w-2 h-2 rounded-full dot-3"
          style={{ background: 'var(--green-400)' }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
