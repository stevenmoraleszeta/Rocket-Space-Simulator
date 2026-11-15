/**
 * Starry background of the asteroid shower (no React): a deep sky in bands, two dithered nebulas,
 * three layers of stars that slide down at different speeds (far ones twinkle, near ones are big
 * crosses), and a shooting star now and then. Field pixels, like asteroidShower.js.
 */
import { FIELD_H, FIELD_W, seededRandom } from './asteroidShower.js'

const SKY_BANDS = ['#0d0628', '#120a33', '#0f1038', '#0a0f30', '#070a24', '#05061a']
const STAR_COLORS = ['#ffffff', '#cfe0ff', '#fff1c4', '#ffd1ec', '#bfe9ff']
const LAYERS = [
  { count: 90, speed: 5, size: 1, alpha: 0.55, twinkle: true },
  { count: 45, speed: 16, size: 1, alpha: 0.9, twinkle: false },
  { count: 12, speed: 34, size: 2, alpha: 1, twinkle: false },
]

/** The still part (sky and nebulas), painted once into its own canvas. */
function paintBackdrop(random) {
  const canvas = document.createElement('canvas')
  canvas.width = FIELD_W
  canvas.height = FIELD_H
  const ctx = canvas.getContext('2d')
  SKY_BANDS.forEach((color, index) => {
    ctx.fillStyle = color
    const top = Math.floor((index / SKY_BANDS.length) * FIELD_H)
    ctx.fillRect(0, top, FIELD_W, Math.ceil(FIELD_H / SKY_BANDS.length) + 1)
  })
  // Nebulas: soft clouds made of dithered pixels (a checkerboard thins out toward the edge)
  const nebulas = [
    { x: 38, y: 34, rx: 34, ry: 18, color: '#5b2a86' },
    { x: 118, y: 78, rx: 30, ry: 16, color: '#1d5a6e' },
  ]
  for (const nebula of nebulas) {
    for (let y = nebula.y - nebula.ry; y <= nebula.y + nebula.ry; y += 1) {
      for (let x = nebula.x - nebula.rx; x <= nebula.x + nebula.rx; x += 1) {
        const d = ((x - nebula.x) / nebula.rx) ** 2 + ((y - nebula.y) / nebula.ry) ** 2
        if (d > 1) continue
        const dense = d < 0.35 || (d < 0.7 && (x + y) % 2 === 0) || (x % 2 === 0 && y % 2 === 0 && random() < 0.6)
        if (!dense) continue
        ctx.globalAlpha = 0.18 + (1 - d) * 0.22
        ctx.fillStyle = nebula.color
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
  ctx.globalAlpha = 1
  return canvas
}

export function createShowerSky(seed = 618) {
  const random = seededRandom(seed)
  const stars = LAYERS.flatMap((layer) =>
    Array.from({ length: layer.count }, () => ({
      layer,
      x: Math.floor(random() * FIELD_W),
      y: random() * FIELD_H,
      color: STAR_COLORS[Math.floor(random() * STAR_COLORS.length)],
      phase: random() * 6.28,
    })),
  )
  return { backdrop: paintBackdrop(random), stars, random, meteor: null, nextMeteor: 2 }
}

/** Draws the sky at `time` seconds (dt for the shooting star). `flash` tints it red after a hit. */
export function drawShowerSky(ctx, sky, time, dt, flash = false) {
  ctx.drawImage(sky.backdrop, 0, 0)
  for (const star of sky.stars) {
    const { layer } = star
    const y = Math.floor((star.y + time * layer.speed) % FIELD_H)
    const glow = layer.twinkle ? layer.alpha * (0.5 + 0.5 * Math.sin(time * 3 + star.phase)) : layer.alpha
    ctx.globalAlpha = glow
    ctx.fillStyle = star.color
    if (layer.size === 2) {
      // Big shining star: a small cross
      ctx.fillRect(star.x - 1, y, 3, 1)
      ctx.fillRect(star.x, y - 1, 1, 3)
    } else {
      ctx.fillRect(star.x, y, 1, 1)
    }
  }
  // A shooting star now and then
  sky.nextMeteor -= dt
  if (!sky.meteor && sky.nextMeteor <= 0) {
    sky.meteor = { x: 20 + sky.random() * (FIELD_W - 40), y: -4, life: 0 }
    sky.nextMeteor = 3 + sky.random() * 4
  }
  if (sky.meteor) {
    const meteor = sky.meteor
    meteor.life += dt
    meteor.x += 90 * dt
    meteor.y += 60 * dt
    for (let k = 0; k < 6; k += 1) {
      ctx.globalAlpha = 0.9 - k * 0.14
      ctx.fillStyle = k === 0 ? '#ffffff' : '#bfe4ff'
      ctx.fillRect(Math.round(meteor.x - k * 1.5), Math.round(meteor.y - k), 1, 1)
    }
    if (meteor.life > 1.2 || meteor.y > FIELD_H) sky.meteor = null
  }
  ctx.globalAlpha = 1
  if (flash) {
    ctx.fillStyle = 'rgba(255, 60, 80, 0.22)'
    ctx.fillRect(0, 0, FIELD_W, FIELD_H)
  }
}
