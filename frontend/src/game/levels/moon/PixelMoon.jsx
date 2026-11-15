import { useMemo } from 'react'

/**
 * Pixel-art Moon sprite that can show any phase. It uses the same colors as planets/moon.svg:
 * a light gray lit side with darker craters, and a dark blue-gray night side.
 * The lit part follows the same rule as the round disk in MoonPhaseCard: waxing = lit on the right.
 */
const GRID = 16
const COLORS = {
  outline: '#11142a',
  night: '#2e3140',
  nightCrater: '#262937',
  lit: '#c9ccd6',
  light: '#e6e8ef',
  crater: '#9da2b3',
  shade: '#aeb2c0',
}

// Fixed craters (cell positions on the 16×16 grid), so every phase looks like the same Moon.
const CRATERS = new Set(['5,4', '6,4', '5,5', '10,6', '11,6', '10,7', '11,7', '4,9', '7,11', '8,11', '11,11', '12,10'])

function cells(illumination, waxing) {
  const result = []
  const center = (GRID - 1) / 2
  const radius = GRID / 2 - 0.5
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const dx = (x - center) / radius
      const dy = (y - center) / radius
      const distance = Math.hypot(dx, dy)
      if (distance > 1.06) continue
      if (distance > 0.94) {
        result.push({ x, y, fill: COLORS.outline })
        continue
      }
      // Terminator: half-width of the ellipse that splits day and night at this row.
      const halfWidth = Math.sqrt(Math.max(0, 1 - dy * dy))
      const edge = (1 - 2 * illumination) * halfWidth
      const lit = illumination > 0.97 || (illumination >= 0.03 && (waxing ? dx >= edge : dx <= -edge))
      const crater = CRATERS.has(`${x},${y}`)
      let fill
      if (!lit) fill = crater ? COLORS.nightCrater : COLORS.night
      else if (crater) fill = COLORS.crater
      else if (dx + dy < -0.75) fill = COLORS.light
      else if (dx + dy > 0.95) fill = COLORS.shade
      else fill = COLORS.lit
      result.push({ x, y, fill })
    }
  }
  return result
}

export function PixelMoon({ look, className = 'pixel-moon' }) {
  const { illumination, waxing = true } = look
  const pixels = useMemo(() => cells(illumination, waxing), [illumination, waxing])
  return (
    <svg viewBox={`0 0 ${GRID} ${GRID}`} className={className} shapeRendering="crispEdges" aria-hidden="true">
      {pixels.map(({ x, y, fill }) => (
        <rect key={`${x},${y}`} x={x} y={y} width="1.02" height="1.02" fill={fill} />
      ))}
    </svg>
  )
}
