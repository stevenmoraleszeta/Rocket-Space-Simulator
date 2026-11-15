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
import { t } from '../../../i18n/index.js'
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { circularOrbitAngularSpeed, pointOnCircle } from '../../physics/orbitalMechanics.js'
import { EXPLODING_OUTCOMES, OUTCOMES, degreesToRadians, satellitePositionAt } from './launchSimulation.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { SATELLITE_KIND_COLORS } from './realSatellites.js'

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
/** Before the launch satellites are only small dots of their type's color. */
const SATELLITE_DOT_RADIUS_PIXELS = 5
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

/**
 * Screen position of a launch site on the polar map.
 * The sprite puts the North Pole at the center and the South Pole on the rim,
 * with the same angle as the orbit view (0° east to the right, 90° east up).
 */
/** Screen spot of a launch base: its real place on the polar map, or on the rim (onRimOnly). */
export function siteScreenPosition(view, site, onRimOnly = false) {
  const point = pointOnCircle(EARTH_RADIUS_METERS, degreesToRadians(site.longitudeDeg))
  const onRim = worldToScreen(view, point.x, point.y)
  if (onRimOnly) return onRim
  const radiusFraction = (90 - site.latitudeDeg) / 180
  return {
    x: view.centerX + (onRim.x - view.centerX) * radiusFraction,
    y: view.centerY + (onRim.y - view.centerY) * radiusFraction,
  }
}

function drawCircle(ctx, x, y, radius, fill) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function drawLabel(ctx, text, x, y, align, color, size = 15) {
  const shown = t(text)
  ctx.font = `700 ${size}px ${LABEL_FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(5, 6, 26, 0.9)'
  ctx.strokeText(shown, x, y)
  ctx.fillStyle = color
  ctx.fillText(shown, x, y)
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

function drawEarth(ctx, view, images, clockSeconds = 0) {
  // Thin atmosphere glow just above the surface, breathing a little.
  const glow = 6 + Math.sin(clockSeconds * 1.2) * 1.5
  drawCircle(ctx, view.centerX, view.centerY, view.earthRadiusPixels + glow, COLORS.atmosphere)
  if (images.earth?.complete && images.earth.naturalWidth > 0) {
    const scale = images.earth.naturalWidth / 256
    const size = view.earthRadiusPixels * 2
    ctx.save()
    ctx.imageSmoothingEnabled = false
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

/** How much bigger a dot gets at the top of its blink, and how often it blinks. */
const SATELLITE_BLINK_GROW = 0.9
const SATELLITE_BLINK_SECONDS = 1.8

/**
 * A satellite dot's blink: once per blink it swells (grow 0 → 1) and settles back to its own
 * size (grow back to 0). Each satellite has its own start, so they twinkle one after another
 * instead of all together.
 */
function satelliteBlink(index, clockSeconds) {
  const phase = (clockSeconds / SATELLITE_BLINK_SECONDS + index * 0.137) % 1
  const swell = 0.35 // share of each blink spent growing and shrinking; the rest it rests
  return phase < swell ? Math.sin((phase / swell) * Math.PI) : 0
}

/** Before the launch: each satellite is only a small dot in the color of its type, blinking. */
/**
 * Before the route is aimed every satellite is a colored dot. The one under the cursor
 * (highlightId) is drawn as its real satellite, with its orbit ring, so only that one shows up.
 */
function drawSatelliteDots(ctx, view, satellites, timeSeconds, highlightId = null, images = null, clockSeconds = 0) {
  const types = satelliteTypes(satellites)
  satellites.forEach((satellite, index) => {
    if (satellite.id === highlightId) {
      drawDottedRing(ctx, view, orbitRingRadius(view, satellite.altitudeKm), COLORS.satelliteOrbit, 2, 9)
      drawSatellite(ctx, view, satellite, types[index], index, timeSeconds, images, clockSeconds)
      return
    }
    const world = satellitePositionAt(satellite, timeSeconds)
    const screen = worldToScreen(view, world.x, world.y)
    const color = SATELLITE_KIND_COLORS[satellite.kind] ?? COLORS.satellite
    const grow = satelliteBlink(index, clockSeconds)
    const radius = SATELLITE_DOT_RADIUS_PIXELS * (1 + SATELLITE_BLINK_GROW * grow)
    // Dot in its type's color that blinks: it swells and settles back to its size, with a halo ring on the swell,
    // a soft glow of its current color and a white sparkle in the middle.
    if (grow > 0) {
      ctx.save()
      ctx.globalAlpha = grow * 0.6
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(screen.x, screen.y, radius + 4 + grow * 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 10 + grow * 10
    drawCircle(ctx, screen.x, screen.y, radius, color)
    ctx.restore()
    drawCircle(ctx, screen.x, screen.y, radius / 2.5, 'rgba(255, 255, 255, 0.85)')
  })
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
    drawSatellite(ctx, view, satellite, types[index], index, timeSeconds, images, clockSeconds)
  })
}

/** One satellite with its sprite, danger zone and name. */
function drawSatellite(ctx, view, satellite, type, index, timeSeconds, images, clockSeconds) {
  const world = satellitePositionAt(satellite, timeSeconds)
  const screen = worldToScreen(view, world.x, world.y)
  // Danger zone around the satellite
  drawCircle(ctx, screen.x, screen.y, SATELLITE_SIZE_PIXELS, COLORS.danger)
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

const ARRIVAL_DRAW_SIZE = 32

/** The point the rocket has to reach, drawn from the arrival-target sprite. */
function drawArrivalMarker(ctx, view, arrival, images) {
  if (!arrival) return
  const screen = worldToScreen(view, arrival.x, arrival.y)
  const image = images?.arrivalTarget
  if (!image?.complete || image.naturalWidth <= 0) return
  const half = ARRIVAL_DRAW_SIZE / 2
  ctx.drawImage(
    image,
    Math.round(screen.x - half),
    Math.round(screen.y - half),
    ARRIVAL_DRAW_SIZE,
    ARRIVAL_DRAW_SIZE,
  )
}

function pathColor(outcomeType) {
  if (outcomeType === OUTCOMES.ORBIT_REACHED) return COLORS.pathOrbit
  if (EXPLODING_OUTCOMES.includes(outcomeType)) return COLORS.pathCrash
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

/** The predicted trajectory: only dots (no end mark, so a crash is not given away). */
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

/**
 * spin: extra turn in radians (used to stand the rocket up for a landing).
 * upperStage: always draw the short upper stage (a rocket coming back down keeps its size).
 */
function drawRocket(ctx, view, pose, headingPoint, images, spin = 0, upperStage = false) {
  const screen = worldToScreen(view, pose.x, pose.y)
  const ahead = worldToScreen(view, headingPoint.x, headingPoint.y)
  const inSpace = Math.hypot(pose.x, pose.y) - EARTH_RADIUS_METERS > STAGE_SEPARATION_ALTITUDE_METERS
  const upper = images.rocketUpperStage
  const image = (inSpace || upperStage) && upper?.complete ? upper : pose.burning ? images.rocketLit : images.rocketOff
  if (!image?.complete) return
  // The sprite points up: rotate it toward where it is going on screen.
  const heading = Math.atan2(ahead.y - screen.y, ahead.x - screen.x)
  const half = ROCKET_DRAW_SIZE / 2
  ctx.save()
  ctx.translate(Math.round(screen.x), Math.round(screen.y))
  ctx.rotate(heading + Math.PI / 2 + spin)
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

/**
 * A rocket called home comes back to Earth along a smooth curve: it keeps moving forward a
 * little while it gently loses height, then slows down and lands upright on its engine,
 * like modern reusable rockets. progress 0 = where it turned back, 1 = on the ground.
 */
const RETURN_FORWARD_RADIANS = 0.5
/** From here on the engine is lit for the landing burn and the rocket stands up. */
const LANDING_BURN_FROM = 0.72

const easeInOut = (t) => t * t * (3 - 2 * t)

/** falling: a crash, it drops faster at the end (no landing burn to slow it). */
function returnPoint(start, progress, falling = false) {
  const startRadius = Math.hypot(start.x, start.y)
  const startAngle = Math.atan2(start.y, start.x)
  const ahead = start.next ?? start
  // Which way it was going around the Earth
  const direction = Math.sign(start.x * (ahead.y - start.y) - start.y * (ahead.x - start.x)) || 1
  const angle = startAngle + direction * RETURN_FORWARD_RADIANS * Math.sin((progress * Math.PI) / 2)
  const drop = falling ? progress ** 1.7 : easeInOut(progress)
  const radius = startRadius - (startRadius - EARTH_RADIUS_METERS) * drop
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

/** Thin dotted line of the way home (light blue), or a bright yellow trail behind a falling rocket. */
function drawReturnTrail(ctx, view, start, progress, falling = false) {
  ctx.fillStyle = falling ? '#ffd23f' : 'rgba(158, 212, 255, 0.6)'
  const size = falling ? 6 : 4
  const steps = Math.floor(progress * 40)
  for (let index = 0; index <= steps; index += falling ? 1 : 2) {
    const spot = returnPoint(start, index / 40, falling)
    const point = worldToScreen(view, spot.x, spot.y)
    ctx.fillRect(Math.round(point.x - size / 2), Math.round(point.y - size / 2), size, size)
  }
}

/** Blinking yellow ring around a falling rocket, so the eye follows it down. */
function drawFallMarker(ctx, view, spot, clockSeconds) {
  const point = worldToScreen(view, spot.x, spot.y)
  const on = Math.floor(clockSeconds * 6) % 2 === 0
  ctx.save()
  ctx.strokeStyle = on ? '#ffd23f' : 'rgba(255, 210, 63, 0.45)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(Math.round(point.x), Math.round(point.y), ROCKET_DRAW_SIZE * 0.62, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/**
 * The rocket on its way home: nose first while it glides down, then it turns upright
 * (engine to the ground) and fires its engine for a soft landing.
 */
function drawReturningRocket(ctx, view, start, progress, images) {
  const here = returnPoint(start, progress)
  const ahead = returnPoint(start, Math.min(1, progress + 0.02))
  if (progress < LANDING_BURN_FROM) {
    drawRocket(ctx, view, { ...here, burning: false }, ahead, images, 0, true)
    return
  }
  // Landing burn: turn from the glide direction to upright, engine on until it touches down.
  const turn = Math.min(1, (progress - LANDING_BURN_FROM) / 0.12)
  const screen = worldToScreen(view, here.x, here.y)
  const glide = worldToScreen(view, ahead.x, ahead.y)
  const up = worldToScreen(view, here.x * 1.01, here.y * 1.01)
  const glideAngle = Math.atan2(glide.y - screen.y, glide.x - screen.x)
  const upAngle = Math.atan2(up.y - screen.y, up.x - screen.x)
  let delta = upAngle - glideAngle
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  // drawRocket points the nose along the glide; the extra turn stands it up for landing.
  drawRocket(ctx, view, { ...here, burning: progress < 1 }, ahead, images, delta * turn, true)
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
 *   flight: { simTime, realSecondsSinceEnd, returnHome } while flying or after the end
 *     returnHome: { t, progress (0..1), landed, crash } when the rocket leaves its path: called home
 *       (no food: lands upright) or falling back (no boosters, crash: true: hits the Earth and blows up)
 *   highlightSatelliteId: the satellite under the cursor while picking a base
 */
export function drawOrbitScene(ctx, view, scene) {
  ctx.clearRect(0, 0, view.width, view.height)
  ctx.imageSmoothingEnabled = false

  const simTime = scene.flight?.simTime ?? 0
  // The satellites show up for real from the moment the route is aimed. While picking a base
  // they are colored dots, and only the one under the cursor shows up.
  const showSatellites = scene.step === 'aim' || scene.step === 'flight' || scene.step === 'result'
  if (showSatellites) drawSatellites(ctx, view, scene.satellites, simTime, scene.images, scene.clockSeconds)
  else drawSatelliteDots(ctx, view, scene.satellites, simTime, scene.highlightSatelliteId, scene.images, scene.clockSeconds)
  drawEarth(ctx, view, scene.images, scene.clockSeconds)
  drawOrbitRings(ctx, view, scene.orbits, scene.selectedOrbitId, scene.step)
  if (scene.step !== 'site') drawArrivalMarker(ctx, view, scene.arrival, scene.images)

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
    const home = scene.flight?.returnHome
    if (home && simTime >= home.t) {
      // Called home (no food): it comes back down along a smooth curve and lands upright.
      const start = flightPoseAt(samples, home.t)
      const progress = home.landed ? 1 : home.progress
      drawReturnTrail(ctx, view, start, progress, home.crash)
      if (!home.crash) {
        drawReturningRocket(ctx, view, start, progress, scene.images)
      } else if (!home.landed) {
        // Falling back: nose down along the fall, engine out, marked by a blinking yellow ring
        const here = returnPoint(start, progress, true)
        drawFallMarker(ctx, view, here, scene.clockSeconds ?? 0)
        drawRocket(ctx, view, { ...here, burning: false }, returnPoint(start, Math.min(1, progress + 0.02), true), scene.images, 0, true)
      } else {
        drawExplosion(ctx, view, returnPoint(start, 1, true), scene.flight.realSecondsSinceEnd, scene.images)
      }
    } else if (simTime <= outcome.t) {
      const pose = flightPoseAt(samples, simTime)
      drawRocket(ctx, view, pose, pose.next ?? pose, scene.images)
    } else if (outcome.type === OUTCOMES.ORBIT_REACHED) {
      const secondsAfter = simTime - outcome.t
      drawRocket(ctx, view, { ...orbitingPoint(outcome, secondsAfter), burning: false }, orbitingPoint(outcome, secondsAfter + 30), scene.images)
    } else if (EXPLODING_OUTCOMES.includes(outcome.type)) {
      drawExplosion(ctx, view, outcome, scene.flight.realSecondsSinceEnd, scene.images)
    } else if (outcome.type === OUTCOMES.NO_LIFTOFF) {
      const up = pointOnCircle(EARTH_RADIUS_METERS * 2, Math.atan2(outcome.y, outcome.x))
      drawRocket(ctx, view, { x: outcome.x, y: outcome.y, burning: true }, up, scene.images)
    }
  }
}
