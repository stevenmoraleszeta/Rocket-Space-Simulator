import { useSyncExternalStore } from 'react'

/**
 * One scale factor for the whole UI, from the window size.
 *
 * The layout was designed for a 1600×900 window. The factor fits that design
 * inside the current window (the smaller of the two ratios), so a big monitor
 * gets bigger text, panels and rocket, and a small laptop gets smaller ones.
 * Phones (≤ 720 px wide) keep their own stacked layout at factor 1.
 *
 * It is written to the `--ui` custom property on <html>. The root font size is
 * 16px × --ui, so every rem in the CSS follows it; sprite scales multiply by it.
 */
const DESIGN_WIDTH = 1600
const DESIGN_HEIGHT = 900
const PHONE_MAX_WIDTH = 720
const MIN_SCALE = 0.7
const MAX_SCALE = 2.5

function computeScale() {
  if (typeof window === 'undefined') return 1
  const { innerWidth: width, innerHeight: height } = window
  if (width <= PHONE_MAX_WIDTH) return 1
  const fit = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(fit * 1000) / 1000))
}

let current = computeScale()
const listeners = new Set()

function apply() {
  document.documentElement.style.setProperty('--ui', String(current))
}

function update() {
  const next = computeScale()
  if (next === current) return
  current = next
  apply()
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  apply()
  window.addEventListener('resize', update)
  window.visualViewport?.addEventListener('resize', update)
}

export function getUiScale() {
  return current
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current UI scale factor; re-renders when the window is resized. */
export function useUiScale() {
  return useSyncExternalStore(subscribe, getUiScale, getUiScale)
}
