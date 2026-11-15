/**
 * What the intro trailer remembers on this device (no React here):
 *   - whether the player has already seen it, so it only opens by itself the first time
 *   - how the voice should say the player's name, once the player has confirmed it
 */
const STORAGE_KEY = 'space-mission:intro'
export const MAX_SPOKEN_LENGTH = 40

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(patch) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), ...patch }))
  } catch {
    /* no storage available: the trailer just opens again next time */
  }
}

/** Trims, collapses spaces and caps the length of a spelling for the voice. */
export function cleanSpoken(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trimStart().slice(0, MAX_SPOKEN_LENGTH)
}

export function introSeen() {
  return read().seen === true
}

export function markIntroSeen() {
  write({ seen: true })
}

/**
 * The spelling the voice reads for `name`, or '' when the player has not confirmed one.
 * It belongs to that exact name: a new name has to be checked again.
 */
export function spokenNameFor(name) {
  const saved = read()
  if (!name || saved.forName !== name || typeof saved.spokenName !== 'string') return ''
  return cleanSpoken(saved.spokenName).trim()
}

/** Remembers that the voice says `name` right when it reads `spoken`. */
export function saveSpokenName(name, spoken) {
  write({ forName: name, spokenName: cleanSpoken(spoken).trim() || name })
}
