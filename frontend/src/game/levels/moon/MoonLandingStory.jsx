/**
 * After winning mission 2 (the Moon): the pixel astronaut tells what the first Moon landing
 * meant, over a pixel replay of Apollo 11: the spacecraft arrives, the lunar lander (the Eagle)
 * separates and lands in a puff of dust, two astronauts climb down, hop across the ground and
 * plant the United States flag, leaving footprints. The Earth hangs in the black sky.
 * Uses the same scene as mission 1 (orbit/PixelStory.jsx).
 *
 * History (kept simple and true for ages 8–12):
 *   Apollo 11 landed on 20 July 1969. Neil Armstrong and Buzz Aldrin walked on the Moon while
 *   Michael Collins orbited it in the command module. About 600 million people watched on TV.
 *   With no wind, the flag hung from a rod across its top, and the footprints are still there.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { PixelStory } from '../orbit/PixelStory.jsx'
import { reducedMotion } from '../orbit/reducedMotion.js'

const LINES = [
  'You reached the Moon, engineer! A real crew did it first, long ago.',
  'On 20 July 1969, Apollo 11 landed on the Moon. Its lander was called the Eagle.',
  'Neil Armstrong stepped out first and said: “That’s one small step for man, one giant leap for mankind.”',
  'Buzz Aldrin joined him. Michael Collins flew around the Moon, waiting to take them home.',
  'They planted the flag of the United States and brought back Moon rocks for scientists.',
  'About 600 million people watched it on TV. The whole world was cheering.',
  'Building Apollo pushed forward computers and new materials we still use today.',
  'Their footprints are still there: the Moon has no wind to blow them away. On to the next adventure!',
]

/* ---------- Pixel replay (canvas, drawn at 320×180, big pixels, and scaled up) ---------- */

const W = 320
const H = 180
const HORIZON = 118
/** Ground height at x: a gentle curve, the Moon is round. */
const groundY = (x) => Math.round(HORIZON + ((x - 160) ** 2) / 4200)

/** The story, in ms. After FLAG_DONE the scene stays, with the crew waving. */
const T = {
  separate: 3000,
  descend: 3600,
  touchdown: 7600,
  firstOut: 8400,
  firstAtFlag: 11000,
  secondOut: 9600,
  secondAtFlag: 12000,
  flagUp: 11300,
  flagOpen: 12100,
  flagDone: 12900,
}
const LANDER_X = 208
const FLAG_X = 150
const FIRST_STOP = 138
const SECOND_STOP = 174

const GREY = { light: '#b9bac3', base: '#9093a0', dark: '#6c6f7c', deep: '#4b4e5a' }

const ease = (k) => k * k * (3 - 2 * k)
const mix = (a, b, k) => a + (b - a) * k
const clamp01 = (k) => Math.max(0, Math.min(1, k))
const span = (time, from, to) => clamp01((time - from) / (to - from))

/** Small seeded random numbers, so the craters are the same every time. */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** The Moon's ground with its craters, drawn once. */
function paintGround() {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const random = seeded(1969)
  for (let x = 0; x < W; x++) {
    const top = groundY(x)
    for (let y = top; y < H; y++) {
      const depth = (y - top) / (H - top)
      const speck = random()
      ctx.fillStyle = speck < 0.08 ? GREY.dark : speck > 0.94 ? GREY.light : depth > 0.55 ? '#848795' : GREY.base
      ctx.fillRect(x, y, 1, 1)
    }
    ctx.fillStyle = GREY.light
    ctx.fillRect(x, top, 1, 1)
  }
  // Craters: a dark bowl with a lit far rim and a shaded near rim (the Sun is to the left)
  for (let index = 0; index < 16; index++) {
    const cx = Math.round(random() * W)
    const top = groundY(cx)
    const cy = Math.round(top + 6 + random() * (H - top - 10))
    const rx = Math.round(3 + random() * 9 * ((cy - top) / (H - top) + 0.4))
    const ry = Math.max(1, Math.round(rx * 0.32))
    if (Math.abs(cx - LANDER_X) < 22 && cy < top + 18) continue
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const d = (dx / rx) ** 2 + (dy / ry) ** 2
        if (d > 1) continue
        ctx.fillStyle = d > 0.6 ? (dx < 0 ? GREY.deep : GREY.light) : dx < -rx * 0.2 ? GREY.deep : GREY.dark
        ctx.fillRect(cx + dx, cy + dy, 1, 1)
      }
    }
  }
  return canvas
}

function rects(ctx, x, y, list, flip = false, width = 0) {
  for (const [dx, dy, w, h, color] of list) {
    ctx.fillStyle = color
    ctx.fillRect(flip ? x + width - dx - w : x + dx, y + dy, w, h)
  }
}

/** Apollo 11 on its way: service module, cone-shaped command module, the lander in front. */
function drawSpacecraft(ctx, x, y, now, withLander) {
  const flame = Math.floor(now / 70) % 2
  rects(ctx, x, y, [
    [-3 - flame, 2, 2 + flame, 2, '#ffd23f'],
    [-1, 1, 2, 4, '#4b4e5a'],
    [1, 0, 10, 6, '#d6d9e2'], [1, 4, 10, 2, '#a8adbb'], [4, 1, 1, 4, '#8a8fa0'],
    [11, 0, 2, 6, '#eef0f5'], [13, 1, 2, 4, '#eef0f5'], [15, 2, 1, 2, '#c9ccd4'],
  ])
  if (withLander) drawLander(ctx, x + 17, y - 4, 0.45)
}

/** The Eagle: grey cabin on top, gold descent stage, four legs with round feet. */
function drawLander(ctx, x, y, scale = 1) {
  if (scale !== 1) {
    rects(ctx, x, y, [[1, 0, 4, 3, '#c9ccd4'], [0, 3, 6, 3, '#d8a23a'], [0, 6, 1, 2, '#8a8fa0'], [5, 6, 1, 2, '#8a8fa0']])
    return
  }
  rects(ctx, x, y, [
    // antenna and cabin (ascent stage)
    [15, -3, 1, 3, '#c9ccd4'], [14, -4, 3, 1, '#eef0f5'],
    [6, 0, 11, 9, '#c9ccd4'], [6, 7, 11, 2, '#a8adbb'], [16, 1, 1, 6, '#9a9fae'],
    [8, 3, 2, 2, '#1d2a52'], [13, 3, 2, 2, '#1d2a52'], [8, 3, 1, 1, '#6d8bd6'],
    [10, 6, 3, 3, '#4b4e5a'],
    // gold foil descent stage
    [3, 9, 17, 8, '#d8a23a'], [3, 9, 17, 1, '#f2c94c'], [6, 11, 1, 6, '#a8781e'], [12, 11, 1, 6, '#a8781e'], [17, 11, 1, 6, '#a8781e'],
    [9, 17, 5, 2, '#4b4e5a'],
    // legs, ladder and footpads
    [2, 13, 1, 3, '#8a8fa0'], [1, 16, 1, 4, '#8a8fa0'], [0, 20, 1, 4, '#8a8fa0'], [-1, 24, 3, 1, '#c9ccd4'],
    [20, 13, 1, 3, '#8a8fa0'], [21, 16, 1, 4, '#8a8fa0'], [22, 20, 1, 4, '#8a8fa0'], [21, 24, 3, 1, '#c9ccd4'],
    [5, 17, 1, 7, '#8a8fa0'], [7, 17, 1, 7, '#8a8fa0'], [6, 18, 1, 1, '#c9ccd4'], [6, 21, 1, 1, '#c9ccd4'], [4, 24, 4, 1, '#c9ccd4'],
  ])
}

/** A Moon walker in a white suit, gold visor and backpack. 7×10 pixels, facing right. */
function drawWalker(ctx, x, y, { flip = false, step = 0, wave = false }) {
  const legs = step ? [[1, 7, 2, 2, '#f2f4f8'], [4, 7, 2, 2, '#f2f4f8'], [1, 9, 2, 1, '#6c6f7c'], [4, 9, 2, 1, '#6c6f7c']]
    : [[2, 7, 3, 2, '#f2f4f8'], [2, 9, 3, 1, '#6c6f7c']]
  rects(ctx, x, y, [
    [0, 3, 1, 4, '#a8adbb'],
    [1, 0, 5, 3, '#f2f4f8'], [4, 1, 2, 2, '#e0a73a'], [4, 1, 1, 1, '#fff2b0'],
    [1, 3, 5, 4, '#f2f4f8'], [1, 6, 5, 1, '#c6cedc'], [2, 4, 2, 1, '#3a5bd9'],
    ...(wave ? [[5, 0, 1, 3, '#f2f4f8'], [5, -1, 1, 1, '#c6cedc']] : [[5, 4, 1, 3, '#f2f4f8']]),
    ...legs,
  ], flip, 7)
}

/** The United States flag on its pole, with the rod across the top that kept it open. */
function drawFlag(ctx, poleX, groundAt, rise, open) {
  const height = Math.round(24 * rise)
  if (height <= 0) return
  const top = groundAt - height
  ctx.fillStyle = '#d6d9e2'
  ctx.fillRect(poleX, top, 1, height)
  const width = Math.round(17 * open)
  if (width <= 0) return
  ctx.fillRect(poleX + 1, top, width, 1)
  for (let row = 0; row < 10; row++) {
    ctx.fillStyle = row % 2 ? '#f7f7f7' : '#c8102e'
    ctx.fillRect(poleX + 1, top + 1 + row, width, 1)
  }
  const canton = Math.min(width, 7)
  ctx.fillStyle = '#1f3a8f'
  ctx.fillRect(poleX + 1, top + 1, canton, 5)
  ctx.fillStyle = '#ffffff'
  for (let sy = 0; sy < 2; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const px = poleX + 2 + sx * 2 + sy
      if (px < poleX + 1 + canton) ctx.fillRect(px, top + 2 + sy * 2, 1, 1)
    }
  }
}

/** Where a walker is: climbing out of the lander at `out`, hopping to `stop` by `arrive`. */
function walkerAt(time, out, arrive, stop) {
  if (time < out) return null
  const k = span(time, out + 400, arrive)
  const x = mix(LANDER_X + 4, stop, ease(k))
  const hopping = k > 0 && k < 1
  const hop = hopping ? Math.abs(Math.sin(k * Math.PI * 7)) * 4 : 0
  return { x, hop, walking: hopping, k }
}

function drawFrame(ctx, ground, earth, now, time, steps) {
  ctx.clearRect(0, 0, W, H)

  // Earth in the black sky, small and far away
  if (earth?.complete && earth.naturalWidth > 0) ctx.drawImage(earth, 238, 16, 40, 40)

  // The spacecraft arrives; after the split the command module flies on (Michael Collins)
  if (time < T.separate) {
    const k = ease(span(time, 0, T.separate))
    drawSpacecraft(ctx, Math.round(mix(-40, 186, k)), Math.round(mix(22, 40, k) - Math.sin(k * Math.PI) * 10), now, true)
  } else if (time < T.touchdown + 2000) {
    const k = span(time, T.separate, T.touchdown + 2000)
    drawSpacecraft(ctx, Math.round(mix(186, 350, k)), Math.round(mix(40, 24, k)), now, false)
  }

  ctx.drawImage(ground, 0, 0)

  // Footprints left by the walkers
  ctx.fillStyle = '#5f6270'
  for (const [x, y] of steps) ctx.fillRect(x, y, 2, 1)

  // The lander: splits off, comes down slowly with its engine on, lands in a puff of dust
  const landAt = groundY(LANDER_X) - 25
  if (time >= T.separate) {
    const k = ease(span(time, T.descend, T.touchdown))
    const x = Math.round(mix(204, LANDER_X - 11, ease(span(time, T.separate, T.touchdown))))
    const y = Math.round(mix(36, landAt, k))
    if (time < T.touchdown) {
      const flicker = Math.floor(now / 60) % 2
      ctx.fillStyle = '#ffd23f'
      ctx.fillRect(x + 10, y + 19, 3, 2 + flicker * 2)
      ctx.fillStyle = '#ff7a2a'
      ctx.fillRect(x + 11, y + 21 + flicker * 2, 1, 2)
    }
    drawLander(ctx, x, y)
    // Dust thrown sideways by the engine near the ground (no air, so it flies flat and falls)
    const dust = span(time, T.touchdown - 900, T.touchdown + 1000)
    if (dust > 0 && dust < 1) {
      const ground = groundY(LANDER_X)
      for (let index = 0; index < 18; index++) {
        const side = index % 2 ? 1 : -1
        const reach = (6 + (index * 7) % 24) * dust
        ctx.fillStyle = index % 3 ? GREY.light : '#d8d9e0'
        ctx.globalAlpha = 1 - dust
        ctx.fillRect(Math.round(LANDER_X + side * (8 + reach)), ground - 1 - Math.round(Math.sin(dust * Math.PI) * ((index % 4) + 1)), 1, 1)
      }
      ctx.globalAlpha = 1
    }
  }

  // The flag goes in once the first walker reaches it
  drawFlag(ctx, FLAG_X, groundY(FLAG_X), ease(span(time, T.flagUp, T.flagOpen)), ease(span(time, T.flagOpen, T.flagDone)))

  // Two walkers climb down and bunny-hop over, then wave
  const walkers = [walkerAt(time, T.firstOut, T.firstAtFlag, FIRST_STOP), walkerAt(time, T.secondOut, T.secondAtFlag, SECOND_STOP)]
  walkers.forEach((walker, index) => {
    if (!walker) return
    const base = groundY(Math.round(walker.x)) - 10
    const done = time > T.flagDone
    const idleHop = done ? Math.max(0, Math.sin(now / 260 + index * 2)) * 2 : 0
    drawWalker(ctx, Math.round(walker.x), Math.round(base - walker.hop - idleHop), {
      // Hopping over they face left; once there they face each other across the flag
      flip: walker.walking || index === 1,
      step: walker.walking ? Math.floor(now / 120) % 2 : 0,
      wave: done && Math.floor(now / 400 + index) % 2 === 0,
    })
  })
}

/** Where the story is, for the mission clock. */
function phaseAt(time) {
  if (time < T.descend) return 'arrive'
  if (time < T.touchdown) return 'descend'
  if (time < T.firstOut) return 'landed'
  if (time < T.flagUp) return 'steps'
  if (time < T.flagDone) return 'flag'
  return 'done'
}

const PHASE_LABEL = {
  arrive: 'Arriving at the Moon',
  descend: 'The Eagle is landing',
  landed: 'The Eagle has landed',
  steps: 'First steps',
  flag: 'Planting the flag',
  done: 'Walking on the Moon',
}

function LandingReplay({ onPhase }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return undefined
    ctx.imageSmoothingEnabled = false
    const ground = paintGround()
    const earth = new Image()
    earth.src = ASSETS.earthPlanet.src
    const steps = []
    const lastStep = [null, null]

    if (reducedMotion()) {
      const time = T.flagDone + 500
      const draw = () => drawFrame(ctx, ground, earth, 0, time, steps)
      earth.onload = draw
      draw()
      onPhase(phaseAt(time))
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const loop = (now) => {
      const time = now - start
      // Leave a footprint every few pixels a walker hops
      ;[[T.firstOut, T.firstAtFlag, FIRST_STOP], [T.secondOut, T.secondAtFlag, SECOND_STOP]].forEach(([out, arrive, stop], index) => {
        const walker = walkerAt(time, out, arrive, stop)
        if (!walker?.walking || walker.hop > 0.6) return
        const x = Math.round(walker.x) + 2
        if (lastStep[index] !== null && Math.abs(lastStep[index] - x) < 4) return
        lastStep[index] = x
        steps.push([x, groundY(x) + 1 + index])
      })
      drawFrame(ctx, ground, earth, now, time, steps)
      onPhase(phaseAt(time))
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [onPhase])

  return <canvas ref={canvasRef} className="fo-replay" width={W} height={H} aria-hidden="true" />
}

/* ---------- The scene ---------- */

export function MoonLandingStory({ onDone }) {
  const [phase, setPhase] = useState('arrive')
  const onPhase = useCallback((next) => setPhase((now) => (now === next ? now : next)), [])
  return (
    <PixelStory
      lines={LINES}
      replay={<LandingReplay onPhase={onPhase} />}
      clock={{
        ship: t('Apollo 11 · 20 July 1969'),
        phase: t(PHASE_LABEL[phase]),
        detail: t('384,400 km from home'),
      }}
      onDone={onDone}
    />
  )
}
