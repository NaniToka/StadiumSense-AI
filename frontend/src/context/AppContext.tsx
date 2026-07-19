/**
 * Global app context — language preference and accessibility settings.
 *
 * Wraps the entire app so any component can read/write these values
 * without prop-drilling.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Locale } from '../i18n/strings'

export interface A11ySettings {
  /** Increase base font size by ~25% */
  largeText: boolean
  /** Apply WCAG AA-enhanced contrast overrides */
  highContrast: boolean
}

interface AppContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  a11y: A11ySettings
  toggleLargeText: () => void
  toggleHighContrast: () => void
  /** User's current zone, set by the app */
  currentZone: string
  setCurrentZone: (z: string) => void
  /** Accessibility needs free-text, fed to the AI */
  accessibilityNeeds: string
  setAccessibilityNeeds: (n: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [a11y, setA11y] = useState<A11ySettings>({ largeText: false, highContrast: false })
  const [currentZone, setCurrentZone] = useState('unknown')
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('')

  const toggleLargeText = useCallback(() =>
    setA11y((prev) => ({ ...prev, largeText: !prev.largeText })), [])

  const toggleHighContrast = useCallback(() =>
    setA11y((prev) => ({ ...prev, highContrast: !prev.highContrast })), [])

  return (
    <AppContext.Provider
      value={{
        locale,
        setLocale,
        a11y,
        toggleLargeText,
        toggleHighContrast,
        currentZone,
        setCurrentZone,
        accessibilityNeeds,
        setAccessibilityNeeds,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within <AppProvider>')
  return ctx
}
