/**
 * useFanChat — manages conversation state and calls the real backend.
 *
 * Each call sends the last N turns as history so Gemini has conversation
 * context.  The hook accepts accessibilityNeeds, zone, and crowd density
 * so the AI can personalise its response.
 */
import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, FanChatResponse, ZoneStatus } from '../types'
import { fanApi } from '../services/api'

const MAX_HISTORY_TURNS = 6 // last 6 messages sent as context

function densityFromStatus(status: ZoneStatus): 'low' | 'moderate' | 'high' | 'critical' {
  switch (status) {
    case 'critical': return 'critical'
    case 'crowded': return 'high'
    default: return 'low'
  }
}

interface SendOptions {
  language: string
  zone: string
  accessibilityNeeds: string
  crowdStatus: ZoneStatus
}

interface UseFanChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  sessionId: string | undefined
  lastSuggestions: string[]
  sendMessage: (text: string, opts: SendOptions) => Promise<void>
  clearHistory: () => void
}

export function useFanChat(): UseFanChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])
  // Stable ref so sendMessage closure always sees latest session ID
  const sessionIdRef = useRef<string | undefined>(undefined)

  const sendMessage = useCallback(async (text: string, opts: SendOptions) => {
    setIsLoading(true)
    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])

    try {
      const history = messages
        .slice(-MAX_HISTORY_TURNS)
        .map(({ role, content }) => ({ role, content }))

      const response: FanChatResponse = await fanApi.chat({
        message: text,
        language: opts.language,
        session_id: sessionIdRef.current,
        history,
        location_zone: opts.zone,
        accessibility_needs: opts.accessibilityNeeds,
        crowd_density: densityFromStatus(opts.crowdStatus),
      })

      if (!sessionIdRef.current) {
        sessionIdRef.current = response.session_id
        setSessionId(response.session_id)
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        intent: response.intent,
        suggested_action: response.suggested_action,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setLastSuggestions(response.suggestions ?? [])
    } catch (err) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: '⚠️ Unable to reach the AI assistant right now. Please try again.',
      }
      setMessages((prev) => [...prev, errMsg])
      console.error('Fan chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [messages])

  const clearHistory = useCallback(() => {
    setMessages([])
    setLastSuggestions([])
    sessionIdRef.current = undefined
    setSessionId(undefined)
  }, [])

  return { messages, isLoading, sessionId, lastSuggestions, sendMessage, clearHistory }
}
