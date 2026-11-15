// Grows the menu on big screens so it fills the window like it does on a laptop.
// Small screens stay at 1 (their own layout already fits). Sets --ui-zoom on <html>.
const DESIGN_WIDTH = 1180
const DESIGN_HEIGHT = 760
const MAX_ZOOM = 2

function update() {
  const fit = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT)
  const zoom = Math.min(MAX_ZOOM, Math.max(1, fit))
  document.documentElement.style.setProperty('--ui-zoom', zoom.toFixed(3))
}

if (typeof window !== 'undefined') {
  update()
  window.addEventListener('resize', update)
}
