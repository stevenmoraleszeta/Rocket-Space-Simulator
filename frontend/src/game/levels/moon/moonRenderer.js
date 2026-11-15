/**
 * MOON TRANSIT — draws the coast. Hit tests live in moonRoute.js.
 * The picture is a side view: Earth on the left, the Moon on the right.
 * Up and down are the high road and the low road. The belts are drawn, not hit.
 */
import { t } from '../../../i18n/index.js'
import { MOON_LANDMARKS, MOON_OUTCOMES, shouldExplode } from './moonRoute.js'

const LABEL_FONT = '"Pixelify Sans", sans-serif'
const PATH_GOOD = '#3ddc97'
const PATH_BAD = '#ff5d73'
const PATH_WARN = '#ffd23f'

export function createMoonView(width, height) {
  const padX = 56
  const padY = 28
  return {
    width,
    height,
    originX: padX,
    originY: height * 0.54,
    scaleX: Math.max(1, (width - padX - 24) / 1.35),
    scaleY: Math.max(1, (height - padY * 2) / 1.2),
  }
}

export function worldToScreen(view, x, y) {
  return {
    x: view.originX + x * view.scaleX,
    y: view.originY - y * view.scaleY,
  }
}

/** Pointer → lane and power. Power 1 means the pointer is as far along as the Moon. */
export function aimFromPointer(view, point) {
  const worldX = (point.x - view.originX) / view.scaleX
  const worldY = (view.originY - point.y) / view.scaleY
  return {
    power: Math.max(0.25, Math.min(1.35, worldX)),
    lane: Math.max(-1, Math.min(1, worldY / 0.7)),
  }
}

function pathColor(type) {
  if (type === MOON_OUTCOMES.ARRIVED) return PATH_GOOD
  if (
    type === MOON_OUTCOMES.OFF_CORRIDOR ||
    type === MOON_OUTCOMES.BAD_SPEED ||
    type === MOON_OUTCOMES.NO_LANDER ||
    type === MOON_OUTCOMES.NO_PROSPECTOR
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
  const shown = t(text)
  ctx.font = `13px ${LABEL_FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#05061a'
  ctx.strokeText(shown, x, y)
  ctx.fillStyle = '#f4f7fb'
  ctx.fillText(shown, x, y)
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

function drawBand(ctx, view, x0, x1, color) {
  const left = worldToScreen(view, x0, 0.46)
  const right = worldToScreen(view, x1, -0.46)
  ctx.fillStyle = color
  ctx.fillRect(left.x, left.y, right.x - left.x, right.y - left.y)
}

function drawDust(ctx, view) {
  const dust = MOON_LANDMARKS.find((item) => item.id === 'dust')
  ctx.fillStyle = 'rgba(210, 214, 230, 0.45)'
  for (let i = 0; i < 10; i += 1) {
    const spot = worldToScreen(view, dust.x + ((i * 17) % 9) / 100 - 0.04, dust.y + ((i * 13) % 8) / 100 - 0.03)
    ctx.fillRect(spot.x, spot.y, 2, 2)
  }
}

function drawDiamond(ctx, x, y) {
  ctx.strokeStyle = '#ffd23f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - 7)
  ctx.lineTo(x + 7, y)
  ctx.lineTo(x, y + 7)
  ctx.lineTo(x - 7, y)
  ctx.closePath()
  ctx.stroke()
}

/** Sample at coast fraction `t`. */
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

export function drawMoonScene(ctx, view, scene) {
  const { images, window: cruise, prediction, bodies, flight, aimPoint } = scene
  ctx.clearRect(0, 0, view.width, view.height)

  drawBand(ctx, view, 0.08, 0.14, 'rgba(255, 93, 115, 0.22)')
  drawBand(ctx, view, 0.2, 0.32, 'rgba(120, 150, 255, 0.2)')
  drawDust(ctx, view)

  const sunY = cruise?.storm ? -0.1 : -0.24
  const sun = worldToScreen(view, 0.86, sunY)
  drawImage(ctx, images.sun, sun.x, sun.y, cruise?.storm ? 52 : 40)

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
    if (body.image === 'debris') drawImage(ctx, images.debris, spot.x, spot.y, 28)
    else if (body.radius > 0) drawAsteroid(ctx, images.asteroid, body.frame ?? 0, spot.x, spot.y, 26)
    else drawDiamond(ctx, spot.x, spot.y)
  }

  const earth = worldToScreen(view, 0, 0)
  const moon = worldToScreen(view, 1, 0)
  drawImage(ctx, images.earth, earth.x, earth.y, 74)
  drawImage(ctx, images.moon, moon.x, moon.y, 64)
  if (cruise?.blackout) {
    ctx.fillStyle = '#14182a'
    ctx.fillRect(moon.x - 5, moon.y + 16, 10, 6)
  }
  drawLabel(ctx, 'Earth', earth.x, earth.y + 42)
  drawLabel(ctx, 'Moon', moon.x, moon.y + 38)
  const gateLabel = worldToScreen(view, 0.84, 0.2)
  drawLabel(ctx, 'Gate', gateLabel.x, gateLabel.y)
  const dust = MOON_LANDMARKS.find((item) => item.id === 'dust')
  const dustLabel = worldToScreen(view, dust.x, dust.y - 0.08)
  drawLabel(ctx, 'Dust', dustLabel.x, dustLabel.y)

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
    const exploding = flight.done && shouldExplode(prediction.outcome)
    if (exploding && images.explosion?.complete) {
      const frame = Math.min(7, Math.floor(flight.sinceEnd * 10))
      ctx.drawImage(images.explosion, frame * 32, 0, 32, 32, spot.x - 36, spot.y - 36, 72, 72)
    } else if (images.rocket?.complete) {
      ctx.save()
      ctx.translate(spot.x, spot.y)
      ctx.rotate(angle + Math.PI / 2)
      const frame = Math.floor(flight.t * 12) % 2
      ctx.drawImage(images.rocket, 192 + frame * 32, 64, 32, 32, -16, -16, 32, 32)
      ctx.restore()
    }
  }
}
