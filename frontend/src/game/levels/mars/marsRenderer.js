/**
 * MARS TRANSIT — draws the cruise. Physics and hit tests live in marsRoute.js.
 * The picture is a side view: Earth on the left, Mars on the right, the asteroid
 * belt farther right. Up and down are the high road and the low road.
 */
import { EXPLODING, MARS_OUTCOMES } from './marsRoute.js'

const LABEL_FONT = '"Pixelify Sans", sans-serif'
const PATH_GOOD = '#3ddc97'
const PATH_BAD = '#ff5d73'
const PATH_WARN = '#ffd23f'

export function createMarsView(width, height) {
  const padX = 56
  const padY = 28
  return {
    width,
    height,
    originX: padX,
    originY: height * 0.54,
    scaleX: Math.max(1, (width - padX - 24) / 1.42),
    scaleY: Math.max(1, (height - padY * 2) / 1.2),
  }
}

export function worldToScreen(view, x, y) {
  return {
    x: view.originX + x * view.scaleX,
    y: view.originY - y * view.scaleY,
  }
}

/** Pointer → lane and power. Power 1 means the pointer is as far along as Mars. */
export function aimFromPointer(view, point) {
  const worldX = (point.x - view.originX) / view.scaleX
  const worldY = (view.originY - point.y) / view.scaleY
  return {
    power: Math.max(0.25, Math.min(1.35, worldX)),
    lane: Math.max(-1, Math.min(1, worldY / 0.7)),
  }
}

function pathColor(type) {
  if (type === MARS_OUTCOMES.ARRIVED) return PATH_GOOD
  if (
    type === MARS_OUTCOMES.OFF_CORRIDOR ||
    type === MARS_OUTCOMES.BAD_SPEED ||
    type === MARS_OUTCOMES.NO_PARACHUTE ||
    type === MARS_OUTCOMES.NO_ROVER
  ) {
    return PATH_WARN
  }
  return PATH_BAD
}

function drawImage(ctx, image, x, y, size) {
  if (!image?.complete || !image.naturalWidth) return
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size)
}

function drawAsteroid(ctx, sheet, frame, x, y, size) {
  if (!sheet?.complete || !sheet.naturalWidth) return
  ctx.drawImage(sheet, frame * 32, 0, 32, 32, x - size / 2, y - size / 2, size, size)
}

function drawLabel(ctx, text, x, y, align = 'center') {
  ctx.font = `13px ${LABEL_FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#05061a'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = '#f4f7fb'
  ctx.fillText(text, x, y)
}

function drawGate(ctx, view, half) {
  const top = worldToScreen(view, 0.96, half)
  const bottom = worldToScreen(view, 0.96, -half)
  ctx.strokeStyle = '#ffd23f'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(top.x - 10, top.y)
  ctx.lineTo(top.x + 8, top.y)
  ctx.lineTo(top.x + 8, top.y + 8)
  ctx.moveTo(bottom.x - 10, bottom.y)
  ctx.lineTo(bottom.x + 8, bottom.y)
  ctx.lineTo(bottom.x + 8, bottom.y - 8)
  ctx.stroke()
}

function drawBelt(ctx, view) {
  ctx.fillStyle = 'rgba(185, 194, 236, 0.14)'
  const left = worldToScreen(view, 1.1, 0.42)
  const right = worldToScreen(view, 1.4, -0.42)
  ctx.fillRect(left.x, left.y, right.x - left.x, right.y - left.y)
  ctx.fillStyle = 'rgba(201, 184, 160, 0.85)'
  for (let i = 0; i < 18; i += 1) {
    const x = 1.12 + ((i * 37) % 26) / 100
    const y = (((i * 53) % 70) - 35) / 100
    const spot = worldToScreen(view, x, y)
    ctx.fillRect(spot.x, spot.y, i % 3 === 0 ? 4 : 3, i % 3 === 0 ? 4 : 3)
  }
  const label = worldToScreen(view, 1.24, -0.34)
  drawLabel(ctx, 'Asteroid belt', label.x, label.y)
}

function drawRadioBand(ctx, view) {
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.85)'
  ctx.lineWidth = 2
  for (let i = 0; i < 5; i += 1) {
    const x = 0.5 + i * 0.025
    ctx.beginPath()
    for (let s = 0; s <= 8; s += 1) {
      const y = -0.16 + (s / 8) * 0.32
      const wobble = Math.sin(s * 1.4 + i) * 0.012
      const spot = worldToScreen(view, x + wobble, y)
      if (s === 0) ctx.moveTo(spot.x, spot.y)
      else ctx.lineTo(spot.x, spot.y)
    }
    ctx.stroke()
  }
}

/** Sample at cruise fraction `t` (the samples already include radio drift). */
export function sampleAt(samples, t) {
  if (!samples?.length) return { t: 0, x: 0, y: 0 }
  let prev = samples[0]
  for (const sample of samples) {
    if (sample.t >= t) {
      const span = sample.t - prev.t
      const mix = span > 0 ? (t - prev.t) / span : 0
      return {
        t,
        x: prev.x + (sample.x - prev.x) * mix,
        y: prev.y + (sample.y - prev.y) * mix,
      }
    }
    prev = sample
  }
  return prev
}

export function drawMarsScene(ctx, view, scene) {
  const { images, window: cruise, prediction, bodies, flight, aimPoint } = scene
  ctx.clearRect(0, 0, view.width, view.height)
  drawBelt(ctx, view)

  const sunY = cruise?.conjunction ? -0.3 : -0.48
  const sun = worldToScreen(view, 0.48, sunY)
  drawImage(ctx, images.sun, sun.x, sun.y, 44)
  if (cruise?.conjunction) drawRadioBand(ctx, view)

  if (cruise) drawGate(ctx, view, cruise.corridorHalf)

  if (prediction?.samples?.length) {
    ctx.fillStyle = pathColor(prediction.outcome.type)
    for (const sample of prediction.samples) {
      if (sample.t < 0.02) continue
      const spot = worldToScreen(view, sample.x, sample.y)
      ctx.fillRect(spot.x, spot.y, 4, 4)
    }
  }

  for (const body of bodies) {
    const spot = worldToScreen(view, body.t, body.y)
    if (body.image === 'phobos') drawImage(ctx, images.phobos, spot.x, spot.y, 28)
    else if (body.image === 'deimos') drawImage(ctx, images.deimos, spot.x, spot.y, 20)
    else drawAsteroid(ctx, images.asteroid, body.frame ?? 0, spot.x, spot.y, 26)
  }

  const earth = worldToScreen(view, 0, 0)
  const mars = worldToScreen(view, 1, 0)
  drawImage(ctx, images.earth, earth.x, earth.y, 78)
  if (cruise?.dust) {
    ctx.strokeStyle = 'rgba(232, 120, 60, 0.7)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(mars.x, mars.y, 48, 0, Math.PI * 2)
    ctx.stroke()
  }
  drawImage(ctx, images.mars, mars.x, mars.y, 84)
  drawLabel(ctx, 'Earth', earth.x, earth.y + 44)
  drawLabel(ctx, 'Mars', mars.x, mars.y + 48)
  drawLabel(ctx, 'Gate', worldToScreen(view, 0.96, (cruise?.corridorHalf ?? 0.1) + 0.06).x, worldToScreen(view, 0.96, (cruise?.corridorHalf ?? 0.1) + 0.06).y)

  if (aimPoint && scene.step === 'aim') {
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 2
    ctx.strokeRect(aimPoint.x - 6, aimPoint.y - 6, 12, 12)
  }

  if (flight && prediction) {
    const pose = sampleAt(prediction.samples, Math.min(flight.t, prediction.outcome.t))
    const ahead = sampleAt(prediction.samples, Math.min(prediction.end, pose.t + 0.02))
    const spot = worldToScreen(view, pose.x, pose.y)
    const next = worldToScreen(view, ahead.x, ahead.y)
    const angle = Math.atan2(next.y - spot.y, next.x - spot.x)
    const exploding = flight.done && EXPLODING.has(prediction.outcome.type)
    if (exploding && images.explosion?.complete) {
      const frame = Math.min(7, Math.floor(flight.sinceEnd * 10))
      ctx.drawImage(images.explosion, frame * 32, 0, 32, 32, spot.x - 36, spot.y - 36, 72, 72)
    } else if (images.rocket?.complete) {
      ctx.save()
      ctx.translate(spot.x, spot.y)
      ctx.rotate(angle + Math.PI / 2)
      const frame = Math.floor(flight.t * 12) % 2
      const half = 16 * (images.rocket.grow ?? 1)
      ctx.drawImage(images.rocket, 192 + frame * 32, 64, 32, 32, -half, -half, half * 2, half * 2)
      ctx.restore()
    }
  }
}
