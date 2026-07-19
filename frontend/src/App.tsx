import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAppContext } from './context/AppContext'
import { RTL_LOCALES } from './i18n/strings'
import Navbar from './components/shared/Navbar'
import FanCompanion from './pages/FanCompanion'
import OpsCommandCenter from './pages/OpsCommandCenter'

export default function App() {
  const { locale, a11y } = useAppContext()
  const isRtl = RTL_LOCALES.has(locale)

  // Apply accessibility class names to the root element
  const rootClasses = [
    'min-h-screen',
    a11y.largeText ? 'a11y-large-text' : '',
    a11y.highContrast ? 'a11y-high-contrast' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <BrowserRouter>
      <div
        className={rootClasses}
        style={{ background: 'var(--navy-950)' }}
        dir={isRtl ? 'rtl' : 'ltr'}
        lang={locale}
      >
        <Navbar />
        <Routes>
          <Route path="/" element={<FanCompanion />} />
          <Route path="/ops" element={<OpsCommandCenter />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
