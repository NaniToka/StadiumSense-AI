/**
 * FanCompanion — premium FIFA World Cup 2026 fan chat experience.
 *
 * Layout (mobile-first, single column):
 * ┌─────────────────────────────────────────┐
 * │  Header bar  (title · lang · a11y)      │
 * │  CrowdWidget (live density sparklines)  │
 * │  QuickChips  (action shortcuts)         │
 * │  Message list (scrollable)              │
 * │  ChatInput   (sticky bottom)            │
 * └─────────────────────────────────────────┘
 *
 * All strings go through the i18n layer; Arabic flips to RTL.
 * Accessibility settings (large text, high contrast) are applied
 * at the App root; this page just reads them for aria labels.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { Accessibility, Trash2 } from 'lucide-react'

import { useAppContext } from '../context/AppContext'
import { useFanChat } from '../hooks/useFanChat'
import { useLivePulse } from '../hooks/useLivePulse'
import translations, { RTL_LOCALES, LOCALE_TO_BCP47 } from '../i18n/strings'

import ChatBubble from '../components/fan/ChatBubble'
import ChatInput from '../components/fan/ChatInput'
import CrowdWidget from '../components/fan/CrowdWidget'
import QuickChips from '../components/fan/QuickChips'
import TypingIndicator from '../components/fan/TypingIndicator'
import LanguageSelector from '../components/fan/LanguageSelector'
import A11yPanel from '../components/fan/A11yPanel'
// import AboutCard from '../components/shared/AboutCard'  // temporarily disabled

// ---------------------------------------------------------------------------
// Welcome screen — shown when the conversation is empty
// ---------------------------------------------------------------------------

function WelcomeScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 text-center select-none">
      {/* World Cup ball graphic */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, var(--navy-700), var(--navy-800))',
          border: '2px solid var(--chip-border)',
          boxShadow: 'var(--green-glow)',
        }}
        aria-hidden="true"
      >
        ⚽
      </div>

      {/* Headline */}
      <h1
        className="font-extrabold text-xl mb-2 tracking-tight leading-snug"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h1>
      <p
        className="text-sm leading-relaxed max-w-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {body}
      </p>

      {/* Decorative FIFA 2026 badge */}
      <div
        className="mt-6 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
        style={{
          background: 'var(--chip-bg)',
          border: '1px solid var(--chip-border)',
          color: 'var(--green-400)',
        }}
        aria-label="FIFA World Cup 2026"
      >
        FIFA World Cup 2026
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function FanCompanion() {
  const { locale, setLocale, a11y, toggleLargeText, toggleHighContrast, accessibilityNeeds } =
    useAppContext()

  const strings = translations[locale]
  const isRtl = RTL_LOCALES.has(locale)

  const [a11yOpen, setA11yOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)

  // Live crowd data
  const { pulse, isLoading: pulseLoading, error: pulseError, overallStatus } = useLivePulse()

  // Chat state
  const { messages, isLoading, lastSuggestions, sendMessage, clearHistory } = useFanChat()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text, {
        language: LOCALE_TO_BCP47[locale],
        zone: 'unknown',
        accessibilityNeeds,
        crowdStatus: overallStatus,
      })
    },
    [sendMessage, locale, accessibilityNeeds, overallStatus],
  )

  const handleChip = useCallback(
    (text: string) => {
      void sendMessage(text, {
        language: LOCALE_TO_BCP47[locale],
        zone: 'unknown',
        accessibilityNeeds,
        crowdStatus: overallStatus,
      })
    },
    [sendMessage, locale, accessibilityNeeds, overallStatus],
  )

  return (
    <>
      {/* Full-height chat shell */}
      <main
        className="flex flex-col max-w-2xl mx-auto w-full"
        style={{
          height: 'calc(100dvh - 49px)', // subtract Navbar height
          background: 'var(--navy-950)',
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* ── Header bar ───────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            background: 'var(--navy-900)',
            borderBottom: '1px solid var(--navy-700)',
          }}
        >
          <div>
            <h1
              className="font-extrabold text-base leading-tight tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {strings.appName}
            </h1>
            <p
              className="text-[11px] leading-none mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {strings.tagline}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Language selector */}
            <LanguageSelector locale={locale} onSelect={setLocale} strings={strings} />

            {/* Accessibility toggle */}
            <button
              type="button"
              onClick={() => setA11yOpen(true)}
              aria-label={strings.accessibility}
              aria-haspopup="dialog"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: 'var(--chip-bg)',
                border: '1px solid var(--chip-border)',
                color: 'var(--green-400)',
              }}
            >
              <Accessibility size={13} aria-hidden="true" />
            </button>

            {/* Clear chat */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                aria-label={strings.clearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  background: 'rgba(248, 113, 113, 0.08)',
                  border: '1px solid rgba(248, 113, 113, 0.25)',
                  color: '#f87171',
                }}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {/* ── Live crowd widget ─────────────────────────────── */}
        <CrowdWidget
          pulse={pulse}
          isLoading={pulseLoading}
          error={pulseError}
          strings={strings}
        />

        {/* ── Quick action chips ────────────────────────────── */}
        <QuickChips
          strings={strings}
          onChip={handleChip}
          disabled={isLoading}
          dynamicSuggestions={lastSuggestions}
        />

        {/* ── Message list ──────────────────────────────────── */}
        <div
          ref={messageListRef}
          className="flex-1 overflow-y-auto scrollbar-none"
          style={{ background: 'var(--navy-950)' }}
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.length === 0 ? (
            <WelcomeScreen title={strings.welcomeTitle} body={strings.welcomeBody} />
          ) : (
            <div className="px-4 py-4">
              {messages.map((msg, i) => (
                <ChatBubble
                  key={i}
                  message={msg}
                  youLabel={strings.youLabel}
                  assistantLabel={strings.assistantLabel}
                />
              ))}
              {isLoading && <TypingIndicator label={strings.thinking} />}
              <div ref={bottomRef} aria-hidden="true" />
            </div>
          )}
        </div>

        {/* ── Chat input ────────────────────────────────────── */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder={strings.placeholder}
          sendLabel={strings.send}
        />

        {/* ── About credit ──────────────────────────────────── */}
        {/* <AboutCard /> temporarily disabled */}
      </main>

      {/* ── Accessibility panel (portal-like overlay) ─────── */}
      {a11yOpen && (
        <A11yPanel
          a11y={a11y}
          onToggleLargeText={toggleLargeText}
          onToggleHighContrast={toggleHighContrast}
          onClose={() => setA11yOpen(false)}
          strings={strings}
        />
      )}
    </>
  )
}
