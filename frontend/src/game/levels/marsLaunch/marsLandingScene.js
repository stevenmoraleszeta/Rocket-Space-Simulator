/**
 * Mars landing animation, drawn pixel by pixel (no React): the recon dome comes down slowly.
 *
 *   0 → PARACHUTE_CUT   the dome hangs under a striped parachute, swaying a little
 *   → THRUST_START      the parachute lets go and the dome drops on its own
 *   → TOUCHDOWN         the braking rockets fire and slow it down to the ground
 *   after TOUCHDOWN     red dust puffs out, the legs settle, the antenna light blinks
 *
 * Drawn at SCENE_W × SCENE_H and scaled up with smoothing off (MarsLanding.jsx).
 */

export const SCENE_W = 192
export const SCENE_H = 108
/** Seconds of each part of the landing. */
export const PARACHUTE_CUT = 4.2
export const THRUST_START = 4.6
export const TOUCHDOWN = 6.6
export const LANDING_SECONDS = 8.4

const GROUND_Y = 88
const START_Y = 26
const DOME_X = 96
/** Dome radius in pixels, and how far it falls under the parachute. */
const R = 12
const PARACHUTE_FALL = 38

function seeded(seed) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

/** Fixed rocks and distant hills, made once. */
export function createLandingScene() {
  const random = seeded(203)
  const rocks = Array.from({ length: 26 }, () => ({
    x: Math.floor(random() * SCENE_W),
    y: GROUND_Y + 2 + Math.floor(random() * (SCENE_H - GROUND_Y - 3)),
    size: random() < 0.25 ? 3 : random() < 0.6 ? 2 : 1,
  }))
  const hills = Array.from({ length: SCENE_W }, (_, x) =>
    Math.round(70 + 5 * Math.sin(x * 0.045) + 3 * Math.sin(x * 0.13 + 1.3) + 2 * Math.sin(x * 0.31)),
  )
  const far = Array.from({ length: SCENE_W }, (_, x) => Math.round(62 + 4 * Math.sin(x * 0.028 + 2) + 2 * Math.sin(x * 0.09)))
  return { rocks, hills, far, dust: [] }
}

/** Height of the dome's base at time t (pixels from the top). */
export function domeY(t) {
  if (t >= TOUCHDOWN) return GROUND_Y
  if (t <= PARACHUTE_CUT) {
    // Slow, steady fall under the parachute
    return START_Y + (t / PARACHUTE_CUT) * PARACHUTE_FALL
  }
  const from = START_Y + PARACHUTE_FALL
  const k = (t - PARACHUTE_CUT) / (TOUCHDOWN - PARACHUTE_CUT)
  // A quick drop that the rockets slow down to a gentle touch
  return from + (GROUND_Y - from) * (1 - (1 - k) ** 2)
}

const DOME = {
  shell: '#e8ecf2',
  shellDark: '#a9b3c2',
  shine: '#ffffff',
  window: '#2b4c8f',
  windowLight: '#7fb8ff',
  ring: '#e2b31f',
  ringDark: '#a87b12',
  leg: '#6b7385',
}

export function drawLandingFrame(image, scene, t) {
  const data = image.data
  const put = (x, y, hex, alpha = 1) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= SCENE_W || y >= SCENE_H) return
    const i = (y * SCENE_W + x) * 4
    const c = typeof hex === 'string' ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] : hex
    data[i] = Math.round(data[i] * (1 - alpha) + c[0] * alpha)
    data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + c[1] * alpha)
    data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + c[2] * alpha)
    data[i + 3] = 255
  }
  const rect = (x, y, w, h, hex, alpha) => {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) put(x + i, y + j, hex, alpha)
  }

  // Dusty Mars sky: pinkish tan, darker up high, in bands like pixel art
  const sky = ['#3b2230', '#5a3036', '#7a4035', '#9a5638', '#b8703f', '#cf8a52']
  for (let y = 0; y < GROUND_Y; y += 1) {
    const band = Math.min(sky.length - 1, Math.floor((y / GROUND_Y) * sky.length))
    for (let x = 0; x < SCENE_W; x += 1) put(x, y, sky[band])
  }
  // The small, pale Sun seen from Mars
  for (let j = -3; j <= 3; j += 1) for (let i = -3; i <= 3; i += 1) {
    if (i * i + j * j <= 9) put(150 + i, 18 + j, '#fff2d6', i * i + j * j <= 4 ? 1 : 0.6)
  }
  // Far hills, near hills
  for (let x = 0; x < SCENE_W; x += 1) {
    for (let y = scene.far[x]; y < GROUND_Y; y += 1) put(x, y, '#8a4a34')
    for (let y = scene.hills[x]; y < GROUND_Y; y += 1) put(x, y, '#a3553a')
  }
  // Ground
  for (let y = GROUND_Y; y < SCENE_H; y += 1) {
    const shade = y < GROUND_Y + 3 ? '#c06a42' : y < GROUND_Y + 9 ? '#b25f3c' : '#9e5236'
    for (let x = 0; x < SCENE_W; x += 1) put(x, y, shade)
  }
  for (const rock of scene.rocks) {
    rect(rock.x, rock.y, rock.size, rock.size, '#6e3424')
    put(rock.x, rock.y - 1, '#d98a5c')
  }

  const baseY = domeY(t)
  const sway = t < PARACHUTE_CUT ? Math.round(Math.sin(t * 2.2) * 2) : 0
  const x0 = DOME_X + sway

  // Shadow on the ground, bigger and darker as the dome gets close
  const near = Math.max(0, Math.min(1, (baseY - 20) / (GROUND_Y - 20)))
  const shadowW = Math.round(8 + near * 22)
  rect(DOME_X - Math.floor(shadowW / 2), GROUND_Y + 1, shadowW, 2, '#5a2a1c', 0.25 + near * 0.45)

  // Parachute while it is on, with its lines
  if (t < PARACHUTE_CUT) {
    const topY = Math.round(baseY - R - 26)
    for (let row = 0; row < 8; row += 1) {
      const half = Math.round(5 + Math.sqrt(row + 1) * 5.6)
      for (let i = -half; i <= half; i += 1) {
        const stripe = Math.floor((i + half) / 4) % 2 === 0 ? '#ff7a2e' : '#ffffff'
        put(x0 + i, topY + row, row === 7 ? '#c24f17' : stripe)
      }
    }
    const lineTop = topY + 8
    const lineBottom = baseY - R - 2
    for (let k = 0; k <= 20; k += 1) {
      const f = k / 20
      put(x0 - 16 + (16 - 6) * f, lineTop + f * (lineBottom - lineTop), '#f5e6d0', 0.8)
      put(x0 + 16 - (16 - 6) * f, lineTop + f * (lineBottom - lineTop), '#f5e6d0', 0.8)
    }
  }

  // Braking rockets under the dome, flickering
  if (t >= THRUST_START && t < TOUCHDOWN + 0.15) {
    const flicker = Math.floor(t * 18) % 2
    for (const side of [-6, -5, 5, 6]) {
      const length = 5 + flicker * 3
      for (let k = 0; k < length; k += 1) {
        put(x0 + side, baseY + 1 + k, k < 2 ? '#fff2a8' : k < 4 ? '#ffb347' : '#ff6a2e', 1 - k / (length + 1))
      }
    }
  }

  // Three legs with little feet
  for (const side of [-1, 1]) {
    put(x0 + side * (R - 3), baseY - 2, DOME.leg)
    put(x0 + side * (R - 2), baseY - 1, DOME.leg)
    put(x0 + side * (R - 1), baseY, DOME.leg)
    put(x0 + side * R, baseY, DOME.leg)
  }
  put(x0, baseY - 1, DOME.leg)
  put(x0, baseY, DOME.leg)
  // Gold base ring
  rect(x0 - R, baseY - 5, 2 * R + 1, 2, DOME.ring)
  rect(x0 - R, baseY - 3, 2 * R + 1, 1, DOME.ringDark)
  // Dome shell: a half circle, lit from the top left, with a window band and rivets
  for (let j = 0; j <= R; j += 1) {
    const half = Math.round(Math.sqrt(Math.max(0, R * R - j * j)))
    const y = baseY - 6 - j
    for (let i = -half; i <= half; i += 1) {
      let color = i < -half / 3 && j > 3 && j < R - 1 ? DOME.shine : i > half / 2 ? DOME.shellDark : DOME.shell
      if (j >= 4 && j <= 6 && Math.abs(i) <= half - 2) color = i < -2 && i > -8 && j === 6 ? DOME.windowLight : DOME.window
      if (j === 1 && i % 4 === 0) color = DOME.shellDark
      put(x0 + i, y, color)
    }
  }
  // Antenna and its blinking light
  for (let k = 1; k <= 4; k += 1) put(x0 + 3, baseY - 6 - R - k, DOME.leg)
  if (Math.floor(t * 2) % 2 === 0 || t < TOUCHDOWN) put(x0 + 3, baseY - 6 - R - 5, '#ff5d73')

  // Red dust puffing out from the touchdown
  if (t >= TOUCHDOWN) {
    const since = t - TOUCHDOWN
    if (since < 1.6) {
      for (let k = 0; k < 14; k += 1) {
        const side = k % 2 === 0 ? -1 : 1
        const spread = R + since * 20 * (0.5 + (k % 5) / 5)
        const rise = Math.max(0, 3 + (k % 3) * 2 - since * 3)
        put(DOME_X + side * spread, GROUND_Y - rise, '#d9946a', Math.max(0, 0.85 - since * 0.5))
      }
    }
  }
}
