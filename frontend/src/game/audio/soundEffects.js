/**
 * SOUND EFFECTS — short UI sounds from src/assets/audio.
 * Any screen can call playSound('select'). Add new entries here when other sounds are needed.
 */
import selectUrl from '../../assets/audio/ui/select.wav'
import confirmUrl from '../../assets/audio/ui/confirm.wav'
import cancelUrl from '../../assets/audio/ui/cancel.wav'

const SOUND_URLS = Object.freeze({
  select: selectUrl,
  confirm: confirmUrl,
  cancel: cancelUrl,
})

/** Volume for UI sounds, from 0 to 1. */
export const UI_SOUND_VOLUME = 0.5

/**
 * Plays one sound. Failures are ignored on purpose: a blocked or missing sound
 * must never stop the game (for example when the browser blocks autoplay).
 */
export function playSound(soundName, volume = UI_SOUND_VOLUME) {
  const url = SOUND_URLS[soundName]
  if (!url || typeof Audio === 'undefined') return
  try {
    const sound = new Audio(url)
    sound.volume = volume
    sound.play().catch(() => {})
  } catch {
    /* audio not available: keep playing silently */
  }
}
