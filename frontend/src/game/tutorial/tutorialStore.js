/**
 * Is the optional Tutorial on? One flag shared by the hangar and the launch screen, so the
 * hands keep guiding after "Aim" opens the next screen. It is kept for the browser tab
 * (sessionStorage), so a refresh in the middle of the tutorial keeps it on.
 */
import { useEffect, useState } from 'react'

const KEY = 'rss.tutorial'
const listeners = new Set()

function readStored() {
  try {
    return window.sessionStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
}

let tutorialOn = typeof window === 'undefined' ? false : readStored()

export function setTutorial(on) {
  tutorialOn = Boolean(on)
  try {
    if (tutorialOn) window.sessionStorage.setItem(KEY, 'on')
    else window.sessionStorage.removeItem(KEY)
  } catch {
    /* storage blocked: the flag still lives for this page */
  }
  for (const listener of listeners) listener(tutorialOn)
}

/** [on, setOn] like useState, shared by every screen. */
export function useTutorial() {
  const [on, setOn] = useState(tutorialOn)
  useEffect(() => {
    listeners.add(setOn)
    setOn(tutorialOn)
    return () => listeners.delete(setOn)
  }, [])
  return [on, setTutorial]
}
