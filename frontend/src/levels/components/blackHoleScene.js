/**
 * Black hole for the start screen, drawn pixel by pixel (no React).
 * Shadow, hot disk and jets follow NASA pictures PIA22085, PIA16695 and
 * GSFC_20171208_Archive_e000386. See BlackHoleBackground.jsx for what is in the picture.
 */
export const PIXEL_W = 320
export const PIXEL_H = 180
const CENTER_X = 160
/** Low on the screen, so the menu above it does not cover it. */
const CENTER_Y = 126
/** How flat the disk looks (we see it almost edge-on). */
const TILT = 0.27
const SHADOW_R = 13
const RING_R = 15
const DISK_IN = 18
const DISK_OUT = 74
const PARTICLES = 170
const FLARE_EVERY = 6.5

/** Hot-to-cool colors of the gas, in few steps so it reads as pixel art. */
const HEAT = [
  [26, 6, 10], [74, 12, 14], [140, 30, 16], [212, 74, 22], [250, 132, 38], [255, 196, 92], [255, 236, 170], [255, 255, 240],
]
const JET = [160, 150, 255]
const JET_CORE = [225, 220, 255]

function heatColor(level) {
  const index = Math.max(0, Math.min(HEAT.length - 1, Math.round(level * (HEAT.length - 1))))
  return HEAT[index]
}

/** Small deterministic random so the stars stay put between frames. */
function seeded(seed) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

function makeStars() {
  const random = seeded(618)
  return Array.from({ length: 150 }, () => ({
    x: Math.floor(random() * PIXEL_W),
    y: Math.floor(random() * PIXEL_H),
    bright: 0.35 + random() * 0.65,
    speed: 0.6 + random() * 2.2,
    phase: random() * 6.28,
    blue: random() < 0.3,
  }))
}

function newParticle(random, far = false) {
  return {
    r: far ? DISK_OUT + 6 + random() * 50 : DISK_IN + random() * (DISK_OUT + 40 - DISK_IN),
    a: random() * Math.PI * 2,
    flash: 0,
  }
}

export function createScene() {
  const random = seeded(1963)
  return {
    stars: makeStars(),
    particles: Array.from({ length: PARTICLES }, () => newParticle(Math.random)),
    random,
  }
}

/** Draws one frame into `image` (ImageData of PIXEL_W × PIXEL_H). */
export function drawFrame(image, scene, t, dt) {
  const data = image.data
  data.fill(0)
  const add = (x, y, color, alpha = 1) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= PIXEL_W || y >= PIXEL_H) return
    const i = (y * PIXEL_W + x) * 4
    data[i] = Math.min(255, data[i] + color[0] * alpha)
    data[i + 1] = Math.min(255, data[i + 1] + color[1] * alpha)
    data[i + 2] = Math.min(255, data[i + 2] + color[2] * alpha)
    data[i + 3] = 255
  }
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= PIXEL_W || y >= PIXEL_H) return
    const i = (y * PIXEL_W + x) * 4
    data[i] = color[0]
    data[i + 1] = color[1]
    data[i + 2] = color[2]
    data[i + 3] = 255
  }

  // Deep space
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 4
    data[i + 1] = 3
    data[i + 2] = 14
    data[i + 3] = 255
  }
  for (const star of scene.stars) {
    const glow = star.bright * (0.55 + 0.45 * Math.sin(t * star.speed + star.phase))
    add(star.x, star.y, star.blue ? [150, 180, 255] : [255, 240, 220], glow)
  }

  const flare = Math.max(0, 1 - ((t % FLARE_EVERY) / 0.9)) // a quick flash, then it fades

  // Soft orange haze of hot gas around the hole
  for (let y = -40; y <= 40; y += 1) {
    for (let x = -60; x <= 60; x += 1) {
      const d = Math.hypot(x, y * 1.4)
      if (d < SHADOW_R || d > 60) continue
      add(CENTER_X + x, CENTER_Y + y, [120, 40, 16], 0.35 * (1 - d / 60) ** 2 * (1 + flare))
    }
  }

  // Jets out of the poles: a bright core, a wider violet glow, knots of energy running outward
  for (let d = SHADOW_R - 2; d < CENTER_Y + 2; d += 1) {
    const fade = (1 - d / (CENTER_Y + 4)) ** 0.7
    const pulse = ((d - t * 46) % 24 + 24) % 24 < 4 ? 0.8 : 0
    const strength = (0.5 + pulse + flare * 0.6) * fade
    const wobble = Math.round(Math.sin(d * 0.3 + t * 3) * 0.7)
    const width = d < 30 ? 3 : d < 55 ? 2 : 1
    for (const side of [-1, 1]) {
      const y = CENTER_Y + side * d
      add(CENTER_X + wobble, y, JET_CORE, strength)
      for (let w = 1; w <= width; w += 1) {
        add(CENTER_X + wobble + w, y, JET, strength * (0.6 - w * 0.15))
        add(CENTER_X + wobble - w, y, JET, strength * (0.6 - w * 0.15))
      }
    }
  }

  // Accretion disk, split in the half behind the hole and the half in front
  const diskPixel = (x, y) => {
    const dx = x - CENTER_X
    const dy = (y - CENTER_Y) / TILT
    const r = Math.hypot(dx, dy)
    if (r < DISK_IN || r > DISK_OUT) return null
    const angle = Math.atan2(dy, dx)
    const spin = t * 2.4 * (DISK_IN / r) ** 1.5
    // Spiral streaks of gas plus thin rings, so the disk is not a flat oval
    const streaks = 0.5 + 0.5 * Math.sin(angle * 4 - spin * 6 + r * 0.45)
    const rings = 0.5 + 0.5 * Math.sin(r * 1.1 - spin * 2)
    const bands = streaks * 0.6 + rings * 0.4
    const heat = (DISK_IN / r) ** 0.85
    const beaming = 1 + 0.6 * Math.cos(angle) // the side moving toward us is brighter
    let level = heat * (0.4 + 0.6 * bands) * beaming * 0.95 + flare * 0.12
    if (r > DISK_OUT - 10) level *= (DISK_OUT - r) / 10
    return { level: Math.min(1, level), front: dy > 0 }
  }
  const top = Math.floor(CENTER_Y - DISK_OUT * TILT) - 1
  const bottom = Math.ceil(CENTER_Y + DISK_OUT * TILT) + 1
  const frontPixels = []
  for (let y = top; y <= bottom; y += 1) {
    for (let x = CENTER_X - DISK_OUT; x <= CENTER_X + DISK_OUT; x += 1) {
      const pixel = diskPixel(x, y)
      if (!pixel || pixel.level < 0.06) continue
      if (pixel.front) frontPixels.push([x, y, pixel.level])
      else set(x, y, heatColor(pixel.level))
    }
  }

  // The far side of the disk, bent up and over the shadow by gravity
  for (let step = 0; step < 220; step += 1) {
    const angle = Math.PI + (step / 220) * Math.PI // the upper half of a circle
    for (let ring = 0; ring < 4; ring += 1) {
      const radius = RING_R + 2 + ring
      const x = CENTER_X + Math.cos(angle) * radius
      const y = CENTER_Y + Math.sin(angle) * radius * 0.92
      const level = (0.75 - ring * 0.16) * (0.85 + 0.15 * Math.sin(angle * 5 - t * 4)) + flare * 0.15
      add(x, y, heatColor(level), 0.55)
    }
  }

  // The disk's under side, bent below the shadow too: a thin, faint arc
  for (let step = 0; step < 160; step += 1) {
    const angle = (step / 160) * Math.PI // the lower half of a circle
    const x = CENTER_X + Math.cos(angle) * (RING_R + 1.5)
    const y = CENTER_Y + Math.sin(angle) * (RING_R + 1.5) * 0.9
    add(x, y, heatColor(0.7 + flare * 0.2), 0.35)
  }

  // Shadow and photon ring
  for (let y = -RING_R - 1; y <= RING_R + 1; y += 1) {
    for (let x = -RING_R - 1; x <= RING_R + 1; x += 1) {
      const d = Math.hypot(x, y)
      if (d <= SHADOW_R) set(CENTER_X + x, CENTER_Y + y, [0, 0, 0])
      else if (d <= RING_R) {
        const angle = Math.atan2(y, x)
        const level = 0.8 + 0.2 * Math.cos(angle - Math.PI) + flare * 0.3
        set(CENTER_X + x, CENTER_Y + y, heatColor(Math.min(1, level)))
      }
    }
  }

  // Front half of the disk goes over the shadow
  for (const [x, y, level] of frontPixels) set(x, y, heatColor(level))

  // Particles spiraling in; each one flashes and disappears at the edge of the shadow
  for (const particle of scene.particles) {
    particle.a += dt * 2.6 * (DISK_IN / particle.r) ** 1.5
    particle.r -= dt * (2.5 + 260 / (particle.r * particle.r) * 10)
    const x = CENTER_X + Math.cos(particle.a) * particle.r
    const y = CENTER_Y + Math.sin(particle.a) * particle.r * TILT
    if (particle.r <= RING_R + 1) {
      add(x, y, [255, 255, 255], 1)
      add(x + 1, y, [255, 230, 160], 0.7)
      add(x - 1, y, [255, 230, 160], 0.7)
      Object.assign(particle, newParticle(Math.random, true))
      continue
    }
    const behind = Math.sin(particle.a) < 0 && Math.hypot(x - CENTER_X, y - CENTER_Y) < SHADOW_R + 1
    if (behind) continue
    const color = heatColor(Math.min(1, (DISK_IN / particle.r) ** 0.8 + 0.15))
    add(x, y, color, 0.95)
    const tailX = CENTER_X + Math.cos(particle.a - 0.05) * (particle.r + 0.6)
    const tailY = CENTER_Y + Math.sin(particle.a - 0.05) * (particle.r + 0.6) * TILT
    add(tailX, tailY, color, 0.4)
  }
}
