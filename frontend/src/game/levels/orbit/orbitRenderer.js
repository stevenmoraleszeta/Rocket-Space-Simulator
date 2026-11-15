/**
 * ORBIT RENDERER — draws the orbit view on a 2D canvas. The only place where meters become pixels.
 *
 * Projection (display only, the physics always uses real meters):
 *   - the angle around the Earth is kept exactly,
 *   - the ALTITUDE is drawn enlarged: displayed = maxHeight · (1 − e^(−altitude / ALTITUDE_DISPLAY_SCALE_KM)).
 * At real scale a 700 km orbit would sit a few pixels above a full Earth and nothing could be read.
 * With this curve low orbits are spread out and readable, higher altitudes are squeezed, and the
 * order of heights never changes (a higher orbit is always drawn higher).
 *
 * View:
 *   centerX, centerY     screen position of the center of the Earth (CSS pixels)
 *   earthRadiusPixels    radius of the drawn Earth
 */
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { circularOrbitAngularSpeed, pointOnCircle } from '../../physics/orbitalMechanics.js'
import { OUTCOMES, degreesToRadians, satellitePositionAt } from './launchSimulation.js'
import { ASSETS } from '../../rendering/assetManifest.js'

/** Altitude where the display curve starts to squeeze heights (km). */
export const ALTITUDE_DISPLAY_SCALE_KM = 1200
/** Highest drawn altitude, in Earth radii above the surface. */
export const ALTITUDE_DISPLAY_MAX_EARTH_RADII = 0.6
/** Full aim distance (maximum power), as a fraction of the smaller side of the view. */
export const AIM_MAX_VIEW_FRACTION = 0.45

/** The planet body inside earth.svg (the rest is a glow), in image pixels. */
const EARTH_SPRITE_BODY = { x: 16, y: 16, size: 224 }
const DOT_SPACING_PIXELS = 11
const DOT_SIZE_PIXELS = 5
const SATELLITE_SIZE_PIXELS = 10
/**
 * The three satellite looks. `image` is the key in scene.images, sizes are in art pixels,
 * `scale` turns them into screen pixels. Animated sheets have more than one frame.
 */
const SATELLITE_TYPES = [
  { image: 'goldSatellite', frameWidth: 24, frameHeight: 16, frames: 4, scale: 1.25 },
  { image: 'commsSatellite', frameWidth: 32, frameHeight: 32, frames: 1, scale: 0.9 },
  { image: 'spaceTelescope', frameWidth: 32, frameHeight: 32, frames: 1, scale: 0.9 },
]
const SATELLITE_FRAMES_PER_SECOND = 6
const satelliteTypeCache = new WeakMap()
const ROCKET_DRAW_SIZE = 40
/** Kármán line, where space begins: above it the rear stage has dropped and only the short stage flies. */
const STAGE_SEPARATION_ALTITUDE_METERS = 100_000
/** Rows of the short stage cell that are hull; the rows below are its flame. */
const UPPER_STAGE_HULL_ROWS = 17
const EXPLOSION_FRAME_SIZE = 32
const EXPLOSION_FRAME_COUNT = 8
const EXPLOSION_FRAMES_PER_SECOND = 10
const EXPLOSION_DRAW_SIZE = 112
const LABEL_FONT = '"Pixelify Sans", monospace'

const COLORS = {
  atmosphere: 'rgba(120, 190, 255, 0.22)',
  satelliteOrbit: 'rgba(255, 210, 63, 0.22)',
  satellite: '#ffd23f',
  danger: 'rgba(255, 93, 115, 0.55)',
  ringDisabled: 'rgba(185, 194, 236, 0.3)',
  ringSelected: '#ffd23f',
  pathOrbit: '#3ddc97',
  pathCrash: '#ff5d73',
  pathOther: '#ffd23f',
  label: '#ffffff',
}

/** Builds the view for a canvas area: the whole Earth plus the highest drawn altitude fit inside. */
export function createView(width, height) {
  const smallerSide = Math.min(width, height)
  const earthRadiusPixels = (smallerSide / 2 / (1 + ALTITUDE_DISPLAY_MAX_EARTH_RADII)) * 0.94
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    earthRadiusPixels,
    aimMaxPixels: smallerSide * AIM_MAX_VIEW_FRACTION,
  }
}

/** Drawn height above the surface (pixels) for a real altitude (meters). */
export function displayAltitudePixels(view, altitudeMeters) {
  const altitudeKm = Math.max(0, altitudeMeters / 1000)
  return view.earthRadiusPixels * ALTITUDE_DISPLAY_MAX_EARTH_RADII * (1 - Math.exp(-altitudeKm / ALTITUDE_DISPLAY_SCALE_KM))
}

/** Screen radius of a circular orbit of the given altitude (km). */
export function orbitRingRadius(view, altitudeKm) {
  return view.earthRadiusPixels + displayAltitudePixels(view, altitudeKm * 1000)
}

/** World point (meters) → screen point (pixels). */
export function worldToScreen(view, x, y) {
  const radius = Math.hypot(x, y)
  const angle = Math.atan2(y, x)
  const screenRadius = view.earthRadiusPixels + displayAltitudePixels(view, radius - EARTH_RADIUS_METERS)
  return { x: view.centerX + screenRadius * Math.cos(angle), y: view.centerY - screenRadius * Math.sin(angle) }
}

/** Angle around the Earth (world radians) of a screen point. */
export function screenToWorldAngle(view, screenX, screenY) {
  return Math.atan2(-(screenY - view.centerY), screenX - view.centerX)
}

/** Screen position of a launch site on the rim of the Earth. */
export function siteScreenPosition(view, site) {
  const point = pointOnCircle(EARTH_RADIUS_METERS, degreesToRadians(site.longitudeDeg))
  return worldToScreen(view, point.x, point.y)
}

function drawCircle(ctx, x, y, radius, fill) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function drawLabel(ctx, text, x, y, align, color, size = 15) {
  ctx.font = `700 ${size}px ${LABEL_FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(5, 6, 26, 0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

/** Dotted circle made of square dots, like the trajectory. */
function drawDottedRing(ctx, view, radius, color, dotSize = 3, spacing = DOT_SPACING_PIXELS) {
  const count = Math.max(12, Math.floor((2 * Math.PI * radius) / spacing))
  ctx.fillStyle = color
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2
    ctx.fillRect(
      Math.round(view.centerX + radius * Math.cos(angle) - dotSize / 2),
      Math.round(view.centerY + radius * Math.sin(angle) - dotSize / 2),
      dotSize,
      dotSize,
    )
  }
}

function drawEarth(ctx, view, images) {
  // Thin atmosphere glow just above the surface.
  drawCircle(ctx, view.centerX, view.centerY, view.earthRadiusPixels + 6, COLORS.atmosphere)
  if (images.earth?.complete && images.earth.naturalWidth > 0) {
    const scale = images.earth.naturalWidth / 256
    const size = view.earthRadiusPixels * 2
    ctx.save()
    ctx.beginPath()
    ctx.arc(view.centerX, view.centerY, view.earthRadiusPixels, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(
      images.earth,
      EARTH_SPRITE_BODY.x * scale, EARTH_SPRITE_BODY.y * scale, EARTH_SPRITE_BODY.size * scale, EARTH_SPRITE_BODY.size * scale,
      view.centerX - size / 2, view.centerY - size / 2, size, size,
    )
    ctx.restore()
  } else {
    drawCircle(ctx, view.centerX, view.centerY, view.earthRadiusPixels, '#2f7be0')
  }
}

/**
 * Picks a look for each satellite. They are ordered by where they start on the orbit and the
 * three looks are dealt in turn, so satellites next to each other (like the Starlink train)
 * never share a look. With this list Hubble gets the space telescope.
 */
function satelliteTypes(satellites) {
  let types = satelliteTypeCache.get(satellites)
  if (types) return types
  const order = satellites
    .map((satellite, index) => ({ index, angle: ((satellite.startAngleDeg ?? 0) % 360 + 360) % 360 }))
    .sort((a, b) => a.angle - b.angle)
  types = new Array(satellites.length)
  order.forEach(({ index }, position) => {
    types[index] = SATELLITE_TYPES[position % SATELLITE_TYPES.length]
  })
  satelliteTypeCache.set(satellites, types)
  return types
}

/** Draws one satellite sprite centered on screen. Animated looks start on different frames. */
function drawSatelliteSprite(ctx, screen, type, image, clockSeconds, index) {
  const frame = type.frames > 1 ? (Math.floor(clockSeconds * SATELLITE_FRAMES_PER_SECOND) + index) % type.frames : 0
  const width = Math.round(type.frameWidth * type.scale)
  const height = Math.round(type.frameHeight * type.scale)
  ctx.drawImage(
    image,
    frame * type.frameWidth, 0, type.frameWidth, type.frameHeight,
    Math.round(screen.x - width / 2), Math.round(screen.y - height / 2), width, height,
  )
}

function drawSatellites(ctx, view, satellites, timeSeconds, images, clockSeconds) {
  const drawnRings = new Set()
  for (const satellite of satellites) {
    if (drawnRings.has(satellite.altitudeKm)) continue
    drawnRings.add(satellite.altitudeKm)
    drawDottedRing(ctx, view, orbitRingRadius(view, satellite.altitudeKm), COLORS.satelliteOrbit, 2, 9)
  }
  const types = satelliteTypes(satellites)
  satellites.forEach((satellite, index) => {
    const world = satellitePositionAt(satellite, timeSeconds)
    const screen = worldToScreen(view, world.x, world.y)
    // Danger zone around the satellite
    drawCircle(ctx, screen.x, screen.y, SATELLITE_SIZE_PIXELS, COLORS.danger)
    const type = types[index]
    const image = images?.[type.image]
    if (image?.complete && image.naturalWidth > 0) {
      drawSatelliteSprite(ctx, screen, type, image, clockSeconds ?? 0, index)
    } else {
      // Fallback while the sprite loads: a plain pixel square.
      ctx.fillStyle = COLORS.satellite
      ctx.fillRect(Math.round(screen.x - SATELLITE_SIZE_PIXELS / 2), Math.round(screen.y - SATELLITE_SIZE_PIXELS / 2), SATELLITE_SIZE_PIXELS, SATELLITE_SIZE_PIXELS)
    }
    if (satellite.shortName) {
      const outward = Math.atan2(-(screen.y - view.centerY), screen.x - view.centerX)
      drawLabel(ctx, satellite.shortName, screen.x + Math.cos(outward) * 20, screen.y - Math.sin(outward) * 18, Math.cos(outward) >= 0 ? 'left' : 'right', COLORS.satellite, 13)
    }
  })
}

/**
 * Arrival orbits as big dotted rings, each in its own color (the same color as its card in the panel).
 * Only the chosen ring gets a label, so labels never pile up. While aiming the ring is faint,
 * so the dotted trajectory stands out.
 */
function drawOrbitRings(ctx, view, orbits, selectedOrbitId, step) {
  const choosing = step === 'target'
  for (const orbit of orbits) {
    const selected = orbit.id === selectedOrbitId
    if (!choosing && !selected) continue
    const color = orbit.available ? orbit.color : COLORS.ringDisabled
    const radius = orbitRingRadius(view, orbit.altitudeKm)
    ctx.globalAlpha = choosing ? 1 : 0.35
    drawDottedRing(ctx, view, radius, color, selected && choosing ? 5 : 4, 10)
    ctx.globalAlpha = 1
    if (selected && choosing) {
      drawLabel(ctx, `${orbit.altitudeKm} km`, view.centerX, view.centerY - radius - 16, 'center', color, 16)
    }
  }
}

function drawArrivalMarker(ctx, view, arrival) {
  if (!arrival) return
  const screen = worldToScreen(view, arrival.x, arrival.y)
  ctx.strokeStyle = COLORS.ringSelected
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = COLORS.ringSelected
  ctx.fillRect(Math.round(screen.x - 4), Math.round(screen.y - 4), 8, 8)
  ctx.lineWidth = 1
}

function pathColor(outcomeType) {
  if (outcomeType === OUTCOMES.ORBIT_REACHED) return COLORS.pathOrbit
  if (outcomeType === OUTCOMES.EARTH_IMPACT || outcomeType === OUTCOMES.SATELLITE_COLLISION) return COLORS.pathCrash
  return COLORS.pathOther
}

/** Square dots evenly spaced along the screen path, up to `untilTime` seconds of flight. */
function drawDottedPath(ctx, view, samples, color, untilTime = Infinity) {
  ctx.fillStyle = color
  let carried = 0
  let previous = null
  for (const sample of samples) {
    if (sample.t > untilTime) break
    const point = worldToScreen(view, sample.x, sample.y)
    if (previous) {
      const dx = point.x - previous.x
      const dy = point.y - previous.y
      const length = Math.hypot(dx, dy)
      let along = DOT_SPACING_PIXELS - carried
      while (along <= length) {
        const x = previous.x + (dx * along) / length
        const y = previous.y + (dy * along) / length
        ctx.fillRect(Math.round(x - DOT_SIZE_PIXELS / 2), Math.round(y - DOT_SIZE_PIXELS / 2), DOT_SIZE_PIXELS, DOT_SIZE_PIXELS)
        along += DOT_SPACING_PIXELS
      }
      carried = length - (along - DOT_SPACING_PIXELS)
    }
    previous = point
  }
}

/** The predicted trajectory: only dots, no mark where it crashes. */
function drawPrediction(ctx, view, prediction, alpha = 1) {
  if (!prediction) return
  const { outcome } = prediction
  const color = pathColor(outcome.type)
  ctx.globalAlpha = alpha
  drawDottedPath(ctx, view, prediction.samples, color)
  if (outcome.type === OUTCOMES.ORBIT_REACHED) {
    drawDottedRing(ctx, view, orbitRingRadius(view, (outcome.orbitRadius - EARTH_RADIUS_METERS) / 1000), color, 3, 14)
  }
  ctx.globalAlpha = 1
}

/** Position and heading (screen radians) of the rocket at a flight time, interpolated between samples. */
export function flightPoseAt(samples, timeSeconds) {
  if (samples.length === 1) return { x: samples[0].x, y: samples[0].y, burning: false }
  let index = samples.findIndex((sample) => sample.t >= timeSeconds)
  if (index <= 0) index = index === 0 ? 1 : samples.length - 1
  const from = samples[index - 1]
  const to = samples[index]
  const span = to.t - from.t || 1
  const progress = Math.min(1, Math.max(0, (timeSeconds - from.t) / span))
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    next: to,
    burning: from.burning,
  }
}

function drawRocket(ctx, view, pose, headingPoint, images) {
  const screen = worldToScreen(view, pose.x, pose.y)
  const ahead = worldToScreen(view, headingPoint.x, headingPoint.y)
  const inSpace = Math.hypot(pose.x, pose.y) - EARTH_RADIUS_METERS > STAGE_SEPARATION_ALTITUDE_METERS
  const upper = images.rocketUpperStage
  const image = inSpace && upper?.complete ? upper : pose.burning ? images.rocketLit : images.rocketOff
  if (!image?.complete) return
  // The sprite points up: rotate it toward where it is going on screen.
  const heading = Math.atan2(ahead.y - screen.y, ahead.x - screen.x)
  const half = ROCKET_DRAW_SIZE / 2
  ctx.save()
  ctx.translate(Math.round(screen.x), Math.round(screen.y))
  ctx.rotate(heading + Math.PI / 2)
  if (image === upper) {
    // Short upper stage: flickering flame while burning, hull only (no flame) when coasting.
    const sprite = ASSETS.rocketUpperStage
    const cell = sprite.frameX + (Math.floor(performance.now() / 90) % sprite.frames) * sprite.frameWidth
    const rows = pose.burning ? sprite.frameHeight : UPPER_STAGE_HULL_ROWS
    const scale = ROCKET_DRAW_SIZE / sprite.frameHeight
    ctx.drawImage(image, cell, sprite.frameY, sprite.frameWidth, rows, -half, -half, ROCKET_DRAW_SIZE, rows * scale)
  } else {
    ctx.drawImage(image, -half, -half, ROCKET_DRAW_SIZE, ROCKET_DRAW_SIZE)
  }
  ctx.restore()
}

function drawExplosion(ctx, view, outcome, secondsSinceEnd, images) {
  const frame = Math.floor(secondsSinceEnd * EXPLOSION_FRAMES_PER_SECOND)
  if (frame >= EXPLOSION_FRAME_COUNT || !images.explosion?.complete) return
  const screen = worldToScreen(view, outcome.x, outcome.y)
  ctx.drawImage(
    images.explosion,
    frame * EXPLOSION_FRAME_SIZE, 0, EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE,
    Math.round(screen.x - EXPLOSION_DRAW_SIZE / 2), Math.round(screen.y - EXPLOSION_DRAW_SIZE / 2), EXPLOSION_DRAW_SIZE, EXPLOSION_DRAW_SIZE,
  )
}

/** Satellite going round its new orbit after a successful insertion. */
function orbitingPoint(outcome, secondsAfterInsertion) {
  const angle = Math.atan2(outcome.y, outcome.x) + outcome.turning * circularOrbitAngularSpeed(outcome.orbitRadius) * secondsAfterInsertion
  return pointOnCircle(outcome.orbitRadius, angle)
}

/**
 * Draws one frame.
 * scene: { step, orbits, selectedOrbitId, arrival, satellites, prediction, aimPoint, flight, images, clockSeconds }
 *   clockSeconds: real time in seconds, drives sprite animations (animated satellites)
 *   flight: { simTime, realSecondsSinceEnd } while flying or after the end
 */
export function drawOrbitScene(ctx, view, scene) {
  ctx.clearRect(0, 0, view.width, view.height)
  ctx.imageSmoothingEnabled = false

  const simTime = scene.flight?.simTime ?? 0
  drawSatellites(ctx, view, scene.satellites, simTime, scene.images, scene.clockSeconds)
  drawEarth(ctx, view, scene.images)
  drawOrbitRings(ctx, view, scene.orbits, scene.selectedOrbitId, scene.step)
  if (scene.step !== 'site') drawArrivalMarker(ctx, view, scene.arrival)

  if (scene.step === 'aim') {
    drawPrediction(ctx, view, scene.prediction)
    if (scene.aimPoint) {
      // Small crosshair where the player is pointing.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(scene.aimPoint.x - 7), Math.round(scene.aimPoint.y - 1), 14, 3)
      ctx.fillRect(Math.round(scene.aimPoint.x - 1), Math.round(scene.aimPoint.y - 7), 3, 14)
    }
  }

  if ((scene.step === 'flight' || scene.step === 'result') && scene.prediction) {
    const { outcome, samples } = scene.prediction
    drawPrediction(ctx, view, scene.prediction, 0.3)
    drawDottedPath(ctx, view, samples, pathColor(outcome.type), simTime)
    if (simTime <= outcome.t) {
      const pose = flightPoseAt(samples, simTime)
      drawRocket(ctx, view, pose, pose.next ?? pose, scene.images)
    } else if (outcome.type === OUTCOMES.ORBIT_REACHED) {
      const secondsAfter = simTime - outcome.t
      drawRocket(ctx, view, { ...orbitingPoint(outcome, secondsAfter), burning: false }, orbitingPoint(outcome, secondsAfter + 30), scene.images)
    } else if (outcome.type === OUTCOMES.EARTH_IMPACT || outcome.type === OUTCOMES.SATELLITE_COLLISION) {
      drawExplosion(ctx, view, outcome, scene.flight.realSecondsSinceEnd, scene.images)
    } else if (outcome.type === OUTCOMES.NO_LIFTOFF) {
      const up = pointOnCircle(EARTH_RADIUS_METERS * 2, Math.atan2(outcome.y, outcome.x))
      drawRocket(ctx, view, { x: outcome.x, y: outcome.y, burning: true }, up, scene.images)
    }
  }
}
