import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/press-start-2p/400.css'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/700.css'
import './index.css'
// uiScale grows the whole game (menu included) with the window, so the menu-only
// uiZoom.js is not imported: both together would grow the menu twice.
import './lib/uiScale.js'
import './lib/firebase.js'
import { I18nextProvider } from 'react-i18next'
import App from './App.jsx'
import i18n, { applyLanguage } from './i18n/index.js'
import { loadSettings } from './settings/settingsStore.js'

applyLanguage(loadSettings().language)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
)
