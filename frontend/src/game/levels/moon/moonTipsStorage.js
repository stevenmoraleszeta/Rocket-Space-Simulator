/** Remembers whether the player turned the Moon tips off (MoonTips.jsx). */
const STORAGE_KEY = 'rss:moon-tips-off'

/** True when the player asked not to see the tips again. */
export function tipsTurnedOff() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Saves the choice. In private mode it lasts this visit only. */
export function turnTipsOff(off) {
  try {
    if (off) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage blocked: nothing to save */
  }
}
