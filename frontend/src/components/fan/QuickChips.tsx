/**
 * QuickChips — horizontal scrollable row of action shortcuts.
 *
 * Shows fixed quick-action chips plus dynamic suggestions from the last
 * AI response.  Pressing a chip fires it as a new chat message.
 */
import { useState } from 'react'
import type { Strings } from '../../i18n/strings'

interface Props {
  strings: Strings
  onChip: (text: string) => void
  disabled?: boolean
  dynamicSuggestions?: string[]
}

const QUICK_CHIP_KEYS: (keyof Strings)[] = [
  'chip_exit',
  'chip_food',
  'chip_accessible',
  'chip_transit',
]

// Icon mapping for chip labels (matched by keyword)
function getChipIcon(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('exit') || lower.includes('salida') || lower.includes('خروج') || lower.includes('निकास') || lower.includes('saída')) return '🚪'
  if (lower.includes('food') || lower.includes('comida') || lower.includes('طعام') || lower.includes('खाना') || lower.includes('alimentação')) return '🍔'
  if (lower.includes('access') || lower.includes('silla') || lower.includes('ويلشير') || lower.includes('सुगम') || lower.includes('acess')) return '♿'
  if (lower.includes('transit') || lower.includes('metro') || lower.includes('bus') || lower.includes('transporte') || lower.includes('परिवहन')) return '🚌'
  return '⚡'
}

export default function QuickChips({ strings, onChip, disabled, dynamicSuggestions = [] }: Props) {
  const [tappedIndex, setTappedIndex] = useState<number | null>(null)

  const staticChips = QUICK_CHIP_KEYS.map((key) => strings[key] as string)
  // Deduplicate: don't show dynamic chips that duplicate static ones
  const uniqueDynamic = dynamicSuggestions.filter(
    (s) => !staticChips.some((c) => c.toLowerCase() === s.toLowerCase()),
  )
  const allChips = [...staticChips, ...uniqueDynamic.slice(0, 3)]

  const handleClick = (text: string, idx: number) => {
    if (disabled) return
    setTappedIndex(idx)
    onChip(text)
    setTimeout(() => setTappedIndex(null), 300)
  }

  return (
    <div
      className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-none"
      role="toolbar"
      aria-label="Quick actions"
      style={{ borderBottom: '1px solid var(--navy-700)' }}
    >
      {allChips.map((chip, idx) => (
        <button
          key={chip}
          type="button"
          onClick={() => handleClick(chip, idx)}
          disabled={disabled}
          aria-label={chip}
          className={`
            flex items-center gap-1.5 whitespace-nowrap text-xs font-medium
            px-3 py-1.5 rounded-full transition-all duration-150 shrink-0
            disabled:opacity-40 disabled:cursor-not-allowed
            ${tappedIndex === idx ? 'chip-tap' : ''}
          `}
          style={{
            background: 'var(--chip-bg)',
            border: '1px solid var(--chip-border)',
            color: 'var(--green-400)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--chip-hover)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--chip-bg)'
          }}
        >
          <span aria-hidden="true">{getChipIcon(chip)}</span>
          {chip}
        </button>
      ))}
    </div>
  )
}
