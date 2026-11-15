/**
 * The trailer's voice, spoken by the browser (Web Speech API). There are no voice files,
 * so it can say any name the player types, in English or Spanish.
 *
 *   speak('Engineer Sam!', { language: 'en', volume: 1 })
 *
 * Browsers only let it talk after the player has clicked or typed something.
 */

// Accents tried in order for each game language.
const LOCALES = {
  en: ['en-US', 'en-GB', 'en'],
  es: ['es-MX', 'es-US', 'es-419', 'es-ES', 'es'],
}
// A little faster than normal speech, so the trailer sounds excited.
const RATE = { en: 1.15, es: 1.2 }
// A line that had to wait for the one before it is said faster, to catch up with the picture.
const CATCH_UP = 1.2
const PITCH = 1.05
// Some browsers never report the end of a sentence; forget it after this long.
const FORGET_AFTER_MS = 10000

// Sentences being spoken. Chrome can cut one off if nothing holds on to it.
const speaking = new Set()

function engine() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (typeof window.SpeechSynthesisUtterance !== 'function') return null
  return window.speechSynthesis
}

/** True when this browser can talk. */
export function canSpeak() {
  return Boolean(engine())
}

/** Asks the browser for its voices early: the list loads in the background. */
export function warmUpVoice() {
  engine()?.getVoices()
}

function localeRank(voice, wanted) {
  const lang = voice.lang.replace('_', '-').toLowerCase()
  return wanted.findIndex((locale) => {
    const code = locale.toLowerCase()
    return lang === code || lang.startsWith(`${code}-`)
  })
}

/** Best voice for the language: the preferred accent first, natural-sounding voices ahead. */
function pickVoice(language) {
  const wanted = LOCALES[language] ?? LOCALES.en
  let best = null
  let bestScore = -1
  for (const voice of engine()?.getVoices() ?? []) {
    const rank = localeRank(voice, wanted)
    if (rank < 0) continue
    const natural = /natural|neural|google|online/i.test(voice.name) ? 5 : 0
    const score = (wanted.length - rank) * 10 + natural + (voice.default ? 1 : 0)
    if (score > bestScore) {
      best = voice
      bestScore = score
    }
  }
  return best
}

/**
 * Says one sentence.
 * queue: wait for the sentence being spoken instead of cutting it off. If a second one
 * is already waiting, the line starts fresh so the voice never falls far behind the picture.
 */
export function speak(text, { language = 'en', volume = 1, queue = false } = {}) {
  const synth = engine()
  if (!synth || !text || volume <= 0) return
  if (!queue || synth.pending) synth.cancel()
  if (synth.paused) synth.resume()
  const late = queue && synth.speaking

  const sentence = new window.SpeechSynthesisUtterance(text)
  const voice = pickVoice(language)
  if (voice) sentence.voice = voice
  sentence.lang = voice?.lang ?? (LOCALES[language] ?? LOCALES.en)[0]
  sentence.volume = Math.min(1, volume)
  sentence.rate = (RATE[language] ?? RATE.en) * (late ? CATCH_UP : 1)
  sentence.pitch = PITCH

  const forget = () => {
    clearTimeout(timer)
    speaking.delete(sentence)
  }
  const timer = setTimeout(forget, FORGET_AFTER_MS)
  sentence.onend = forget
  sentence.onerror = forget
  speaking.add(sentence)
  synth.speak(sentence)
}

/** Stops talking right now. */
export function stopSpeaking() {
  engine()?.cancel()
}
