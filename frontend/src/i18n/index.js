/**
 * English and Spanish for the whole game.
 * English is the default. English sentences are the translation keys, so a
 * missing Spanish line still shows English. Spanish lives in ./es.js.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { es } from './es.js'

export const LANGUAGES = Object.freeze([
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
])

export function normalizeLanguage(value) {
  return value === 'es' ? 'es' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: {} },
    es: { translation: es },
  },
  lng: 'en',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  parseMissingKeyHandler: (key) => key,
})

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeLanguage(language)
  }
})

/** Locale used for dates and grouped numbers. */
export function numberLocale() {
  return i18n.language === 'es' ? 'es' : 'en'
}

export function formatNumber(value) {
  return Number(value).toLocaleString(numberLocale())
}

/** A fixed number of decimals, with a comma in Spanish. */
export function formatDecimal(value, digits) {
  return Number(value).toLocaleString(numberLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatDate(date, options) {
  return new Intl.DateTimeFormat(numberLocale(), options).format(date)
}

function fillPlaceholders(text, options) {
  if (!options || typeof text !== 'string' || !text.includes('{{')) return text
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name) => (
    options[name] == null ? match : String(options[name])
  ))
}

/**
 * Translate one player-facing string. `key` is the English sentence.
 * `{{name}}` placeholders are filled from `options`.
 * English has no dictionary, so a missing key comes back as the sentence
 * itself and the placeholders are filled here.
 */
export function t(key, options) {
  if (key == null || key === '') return ''
  if (typeof key !== 'string') return String(key)
  return fillPlaceholders(i18n.t(key, options), options)
}

/** Switch language now, before the next React render. */
export function applyLanguage(value) {
  const language = normalizeLanguage(value)
  if (i18n.language !== language) i18n.changeLanguage(language)
  if (typeof document !== 'undefined') document.documentElement.lang = language
  return language
}

export default i18n
