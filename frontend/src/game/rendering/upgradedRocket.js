/**
 * The upgraded rocket (Moon and Mars hangar "Upgrade", lifeSupport.js loadout.upgrade):
 * 25% bigger and gold, so it is easy to tell apart in every scene.
 *
 * DOM scenes (Rocket.jsx) use .rocket--grown in game.css: scale(UPGRADE_GROW) and GOLD_FILTER.
 * Canvas scenes (the Moon and Mars maps) use goldRocketImage(), the same color matrices
 * applied pixel by pixel, and draw the sprite UPGRADE_GROW times bigger (image.grow).
 */
import { partCount } from '../parts.js'

export const UPGRADE_GROW = 1.25

/** Kept equal to the filter on .rocket--grown .rocket__body (game.css). */
export const GOLD = { sepia: 0.9, saturate: 2.4, brightness: 1.04 }

export function isUpgraded(equipped) {
  return partCount(equipped, 'upgrade') > 0
}

// CSS filter-function matrices (Filter Effects spec), applied in sRGB like the CSS filters
function sepiaMatrix(a) {
  const k = 1 - a
  return [
    0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k,
    0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k,
    0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k,
  ]
}

function saturateMatrix(s) {
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ]
}

function apply(m, r, g, b) {
  return [
    m[0] * r + m[1] * g + m[2] * b,
    m[3] * r + m[4] * g + m[5] * b,
    m[6] * r + m[7] * g + m[8] * b,
  ]
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))

/**
 * An Image of the rocket sprite. When `gold` is true it switches to a gold copy once the
 * sprite has loaded, and carries `grow` so the scene draws it bigger.
 */
export function goldRocketImage(src, gold) {
  const image = new Image()
  image.src = src
  if (!gold) return image
  image.grow = UPGRADE_GROW
  const raw = new Image()
  raw.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = raw.naturalWidth
      canvas.height = raw.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(raw, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const px = data.data
      const sepia = sepiaMatrix(GOLD.sepia)
      const saturate = saturateMatrix(GOLD.saturate)
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue
        let rgb = apply(sepia, px[i], px[i + 1], px[i + 2])
        rgb = apply(saturate, clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2]))
        px[i] = clamp(clamp(rgb[0]) * GOLD.brightness)
        px[i + 1] = clamp(clamp(rgb[1]) * GOLD.brightness)
        px[i + 2] = clamp(clamp(rgb[2]) * GOLD.brightness)
      }
      ctx.putImageData(data, 0, 0)
      image.src = canvas.toDataURL()
    } catch {
      /* keep the plain sprite */
    }
  }
  raw.src = src
  return image
}
