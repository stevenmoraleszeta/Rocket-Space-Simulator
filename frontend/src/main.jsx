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
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
