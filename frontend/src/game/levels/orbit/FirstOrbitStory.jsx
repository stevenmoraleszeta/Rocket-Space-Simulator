/**
 * After winning mission 1 ("Eye on Earth"): a pixel astronaut floats in, waves, and tells the
 * story of the first person to orbit Earth, while the background replays that flight in pixels:
 * launch, one loop around Earth, re-entry and a parachute landing.
 * When the last line is read an "Onward!" button appears and takes the player to the missions.
 *
 * History (kept simple and true for ages 8+):
 *   On 12 April 1961 Yuri Gagarin flew Vostok 1 once around Earth, the first person ever to do
 *   it. The flight took 108 minutes. Near the end he left the capsule and landed by parachute.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { PixelStory } from './PixelStory.jsx'
import { reducedMotion } from './reducedMotion.js'

const LINES = [
  'Great job, engineer! Your rocket went all the way around Earth.',
  'You are not the first! On 12 April 1961, Yuri Gagarin became the first person to orbit Earth.',
  'His little ship was called Vostok 1. It went around Earth one time.',
  'The whole trip took just 108 minutes. That is less than two hours!',
  'At the end, he jumped out and came down safely with a parachute.',
  'Today you followed his path. Now more trips are waiting for you!',
]

/* ---------- Pixel replay of the flight (canvas, drawn at 400×225 and scaled up) ----------
 * The same pixel Earth as the orbit map (planets/earth.svg, one art pixel = one canvas pixel)
 * over the game's space background (CSS), with pixel clouds drifting across it.
 */

const W = 400
const H = 225
/** Earth center and radius; earth.svg is 128 art pixels with the planet body 112 across. */
const EARTH = { x: 252, y: 98, r: 56 }
const SPRITE = 128
const ORBIT = { a: 96, b: 30 }
/** One replay: launch, one orbit, re-entry and parachute (ms). */
const PHASES = { launch: 2600, orbit: 9000, landing: 3400 }
const LOOP_MS = PHASES.launch + PHASES.orbit + PHASES.landing
/** Where on the orbit the flight starts and ends (radians; π/2 is the front, nearest us). */
const START = Math.PI * 0.82

/* Clouds: smooth value noise, wrapping all the way around the globe. */
const NOISE_PERIOD = 16
const lattice = Array.from({ length: NOISE_PERIOD * NOISE_PERIOD }, (_, index) => {
  const s = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
})

function noise(u, v) {
  const x0 = Math.floor(u)
  const y0 = Math.floor(v)
  const fx = u - x0
  const fy = v - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const at = (x, y) => lattice[(((y % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD) * NOISE_PERIOD + (((x % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD)]
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
  return top + (bottom - top) * sy
}

/** How cloudy the sky is at a longitude/latitude (0..1). Bands of puffy clouds, few at the poles' edge. */
function cloudiness(lon, lat) {
  const u = (lon / (Math.PI * 2)) * NOISE_PERIOD
  const v = (lat / Math.PI + 0.5) * NOISE_PERIOD * 0.5
  const n = noise(u * 2, v * 2) * 0.5 + noise(u * 4 + 5, v * 4 + 3) * 0.32 + noise(u * 8 + 9, v * 8 + 1) * 0.18
  // More clouds in the storm belts (around 50° north and south) and along the equator
  const belts = 0.08 * Math.cos(lat * 4)
  return n + belts
}

const CLOUD = { core: 0.66, edge: 0.615 }
const CLOUD_COLORS = { core: '#f7fbff', edge: 'rgba(214, 228, 244, 0.75)', coreNight: '#9aa8c4', edgeNight: 'rgba(125, 138, 168, 0.75)', shadow: 'rgba(8, 20, 60, 0.3)' }

function orbitPoint(angle) {
  return { x: EARTH.x + Math.cos(angle) * ORBIT.a, y: EARTH.y + Math.sin(angle) * ORBIT.b, behind: Math.sin(angle) < 0 }
}

function surfacePoint(angle) {
  const p = orbitPoint(angle)
  const dx = p.x - EARTH.x
  const dy = p.y - EARTH.y
  const len = Math.hypot(dx, dy) || 1
  return { x: EARTH.x + (dx / len) * (EARTH.r - 1), y: EARTH.y + (dy / len) * (EARTH.r - 1) }
}

const ease = (k) => k * k * (3 - 2 * k)
const mix = (a, b, k) => a + (b - a) * k

/** Where the ship is at `time` ms into the loop, and how it looks. */
function shipAt(time) {
  if (time < PHASES.launch) {
    const k = ease(time / PHASES.launch)
    const ground = surfacePoint(START - 0.35)
    const orbit = orbitPoint(START)
    return { phase: 'launch', progress: time / PHASES.launch, x: mix(ground.x, orbit.x, k), y: mix(ground.y, orbit.y, k), behind: false, flame: true }
  }
  time -= PHASES.launch
  if (time < PHASES.orbit) {
    const k = time / PHASES.orbit
    return { phase: 'orbit', progress: k, ...orbitPoint(START + k * Math.PI * 2), flame: false }
  }
  time -= PHASES.orbit
  const k = Math.min(1, time / PHASES.landing)
  const orbit = orbitPoint(START)
  const ground = surfacePoint(START + 0.3)
  const fall = ease(Math.min(1, k / 0.7))
  return {
    phase: 'landing',
    progress: k,
    x: mix(orbit.x, ground.x, fall),
    y: mix(orbit.y, ground.y, fall) - 6 * Math.min(1, Math.max(0, (k - 0.55) / 0.2)),
    behind: false,
    glow: k > 0.08 && k < 0.55,
    chute: k > 0.5,
  }
}

/** Earth's pixels that are in the shade: earth.svg darkens the lower-right half, on a diagonal. */
const inShade = (x, y) => x + y > EARTH.r * 0.12

function drawClouds(ctx, now) {
  const turn = now / 9000
  const r = EARTH.r - 1
  const cells = []
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = (x * x + y * y) / (r * r)
      if (d > 1) continue
      const z = Math.sqrt(1 - d)
      const lat = Math.asin(y / r)
      const lon = Math.atan2(x / r, z) + turn
      const c = cloudiness(lon, lat)
      if (c > CLOUD.edge) cells.push([x, y, c > CLOUD.core])
    }
  }
  // Shadows first, one pixel down and right, then the clouds on top
  ctx.fillStyle = CLOUD_COLORS.shadow
  for (const [x, y] of cells) {
    if (x + 1 <= r && (x + 1) ** 2 + (y + 1) ** 2 <= r * r) ctx.fillRect(EARTH.x + x + 1, EARTH.y + y + 1, 1, 1)
  }
  for (const [x, y, core] of cells) {
    const shade = inShade(x, y)
    ctx.fillStyle = core ? (shade ? CLOUD_COLORS.coreNight : CLOUD_COLORS.core) : (shade ? CLOUD_COLORS.edgeNight : CLOUD_COLORS.edge)
    ctx.fillRect(EARTH.x + x, EARTH.y + y, 1, 1)
  }
}

function drawFrame(ctx, earth, now, time) {
  ctx.clearRect(0, 0, W, H)

  const ship = shipAt(time)
  if (ship.behind) drawShip(ctx, ship, now)

  if (earth?.complete && earth.naturalWidth > 0) {
    ctx.drawImage(earth, EARTH.x - SPRITE / 2, EARTH.y - SPRITE / 2, SPRITE, SPRITE)
  } else {
    ctx.fillStyle = '#2f7be0'
    ctx.beginPath()
    ctx.arc(EARTH.x, EARTH.y, EARTH.r, 0, Math.PI * 2)
    ctx.fill()
  }
  drawClouds(ctx, now)

  // The orbit path, dotted, only where it is not hidden behind Earth
  ctx.fillStyle = 'rgba(255, 210, 63, 0.7)'
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const p = orbitPoint(a)
    const d = Math.hypot(p.x - EARTH.x, p.y - EARTH.y)
    if (p.behind && d < EARTH.r + 3) continue
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
  }

  if (!ship.behind) drawShip(ctx, ship, now)
}

/** Vostok 1, drawn in 2×2 blocks so it reads at this size. */
function drawShip(ctx, ship, now) {
  const x = Math.round(ship.x)
  const y = Math.round(ship.y)
  const px = (dx, dy, w, h, color) => {
    ctx.fillStyle = color
    ctx.fillRect(x + dx * 2, y + dy * 2, w * 2, h * 2)
  }
  if (ship.flame) {
    const flicker = Math.floor(now / 80) % 2
    px(0, 2, 1, 2 + flicker, '#ffd23f')
    px(0, 4 + flicker, 1, 1, '#ff7a2a')
    px(-1, 3, 1, 1, '#ff5d73')
  }
  if (ship.glow) px(-2, -2, 5, 5, Math.floor(now / 90) % 2 ? '#ff7a2a' : '#ffd23f')
  if (ship.chute) {
    px(-3, -6, 7, 1, '#ff5d73')
    px(-2, -7, 5, 1, '#ff5d73')
    px(-1, -7, 1, 1, '#ffffff')
    px(1, -6, 1, 1, '#ffffff')
    px(-3, -5, 1, 3, '#c6cedc')
    px(3, -5, 1, 3, '#c6cedc')
  }
  // A round grey capsule with a little blue window
  px(-1, -1, 3, 3, '#c6cedc')
  px(-1, -1, 2, 1, '#ffffff')
  px(1, 0, 1, 1, '#3a5bd9')
}

function FlightReplay({ onTick }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return undefined
    ctx.imageSmoothingEnabled = false
    const earth = new Image()
    earth.src = ASSETS.earthPlanet.src
    if (reducedMotion()) {
      const time = PHASES.launch + PHASES.orbit * 0.3
      const draw = () => drawFrame(ctx, earth, 0, time)
      earth.onload = draw
      draw()
      onTick(shipAt(time))
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const loop = (now) => {
      const time = (now - start) % LOOP_MS
      drawFrame(ctx, earth, now, time)
      onTick(shipAt(time))
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [onTick])

  return <canvas ref={canvasRef} className="fo-replay" width={W} height={H} aria-hidden="true" />
}

/** "Minute 37 of 108" and the phase name, from where the ship is in the replay. */
function missionMinute(ship) {
  if (ship.phase === 'launch') return Math.round(ship.progress * 10)
  if (ship.phase === 'orbit') return 10 + Math.round(ship.progress * 78)
  return 88 + Math.round(ship.progress * 20)
}

const PHASE_LABEL = { launch: 'Liftoff', orbit: 'Around Earth', landing: 'Coming home' }

/* ---------- The scene ---------- */

export function FirstOrbitStory({ onDone }) {
  const [clock, setClock] = useState({ phase: 'launch', minute: 0 })
  const onTick = useCallback((ship) => {
    const minute = missionMinute(ship)
    setClock((now) => (now.minute === minute && now.phase === ship.phase ? now : { phase: ship.phase, minute }))
  }, [])
  return (
    <PixelStory
      lines={LINES}
      replay={<FlightReplay onTick={onTick} />}
      clock={{
        ship: t('Vostok 1 · 12 April 1961'),
        phase: t(PHASE_LABEL[clock.phase]),
        detail: t('Minute {{minute}} of 108', { minute: clock.minute }),
      }}
      onDone={onDone}
    />
  )
}
