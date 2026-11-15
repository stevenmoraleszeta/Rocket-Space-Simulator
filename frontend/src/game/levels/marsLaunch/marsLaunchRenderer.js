/**
 * Draws the Earth → Mars map on a canvas: the Sun in the middle, Earth's and Mars's orbits,
 * the hazards on the road, the dotted path and the rocket. Sizes are not to scale (planets and
 * hazards are drawn big so they can be seen); distances from the Sun are.
 */
import { ASSETS } from '../../rendering/assetManifest.js'
import {
  ANGLE_WINDOW,
  EARTH_ORBIT_AU,
  MARS_HAZARDS,
  MARS_ORBIT_AU,
  MARS_OUTCOMES,
  TARGET_ANGLE_DEG,
  earthPosition,
  hazardPosition,
  marsPosition,
  tripPointAt,
} from './marsLaunchRoute.js'

/** Mars's orbit uses this fraction of half the smaller side of the canvas. */
const MAP_FILL = 0.86
/** Drag this far (fraction of the smaller side) for full power. */
const AIM_MAX_VIEW_FRACTION = 0.42
const PLANET_PIXELS = { earth: 34, mars: 28, sun: 46 }
const ROCKET_PIXELS = 30
const HAZARD_PIXELS = 18
const EXPLOSION = { frameSize: 32, frames: 8, fps: 10, pixels: 96 }
/** The drawn path leaves from the launch base and blends into the real orbit over these days. */
const BASE_BLEND_DAYS = 16

const COLORS = {
  earthOrbit: 'rgba(79, 195, 255, 0.35)',
  marsOrbit: 'rgba(255, 120, 80, 0.4)',
  debris: '#c9d1dc',
  satellite: '#ffe81f',
  pathGood: '#3ddc97',
  pathMiss: '#ffd23f',
  pathCrash: '#ff5d73',
  label: '#ffffff',
  protractor: 'rgba(255, 255, 255, 0.55)',
}

export function createMarsView(width, height) {
  const smallerSide = Math.min(width, height)
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    pixelsPerAu: (smallerSide / 2 / MARS_ORBIT_AU) * MAP_FILL,
    aimMaxPixels: smallerSide * AIM_MAX_VIEW_FRACTION,
  }
}

export function toScreen(view, x, y) {
  return { x: view.centerX + x * view.pixelsPerAu, y: view.centerY - y * view.pixelsPerAu }
}

/**
 * Where a launch base sits on the drawn Earth (seen from above the North Pole, like mission 1):
 * on the rim of the Earth picture at the base's longitude.
 */
export function baseScreenPosition(view, site, day = 0) {
  const earthWorld = earthPosition(day)
  const earth = toScreen(view, earthWorld.x, earthWorld.y)
  const angle = ((site?.longitudeDeg ?? 0) * Math.PI) / 180
  const rim = PLANET_PIXELS.earth / 2
  return { x: earth.x + Math.cos(angle) * rim, y: earth.y - Math.sin(angle) * rim }
}

/**
 * Screen point of a path sample. Planets are drawn much bigger than real, so near Earth the path
 * is pulled to start at the launch base on the Earth picture and then joins the real orbit.
 */
export function pathScreenPoint(view, sample, site) {
  const point = toScreen(view, sample.x, sample.y)
  if (!site || sample.day >= BASE_BLEND_DAYS) return point
  const earthWorld = earthPosition(0)
  const earth = toScreen(view, earthWorld.x, earthWorld.y)
  const base = baseScreenPosition(view, site, 0)
  const pull = 1 - sample.day / BASE_BLEND_DAYS
  return { x: point.x + (base.x - earth.x) * pull, y: point.y + (base.y - earth.y) * pull }
}

/** Direction (degrees, counterclockwise from the right) and power from the launch base to the pointer. */
export function aimFromPointer(view, pointerX, pointerY, site) {
  const base = baseScreenPosition(view, site)
  const dx = pointerX - base.x
  const dy = base.y - pointerY
  const distance = Math.hypot(dx, dy)
  if (distance < 6) return null
  const angleDeg = (((Math.atan2(dy, dx) * 180) / Math.PI) % 360 + 360) % 360
  return { angleDeg, power: Math.min(1, Math.max(0.2, distance / view.aimMaxPixels)) }
}

/** Screen point the pointer would be at for an aim (to draw the aim line from the base). */
export function aimScreenPoint(view, aim, site) {
  const base = baseScreenPosition(view, site)
  const angle = (aim.angleDeg * Math.PI) / 180
  const length = aim.power * view.aimMaxPixels
  return { x: base.x + Math.cos(angle) * length, y: base.y - Math.sin(angle) * length }
}

function circle(ctx, x, y, radius, fill) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function dottedRing(ctx, view, radiusAu, color) {
  const radius = radiusAu * view.pixelsPerAu
  const dots = Math.max(60, Math.round((radius * Math.PI * 2) / 10))
  ctx.fillStyle = color
  for (let i = 0; i < dots; i += 1) {
    const angle = (i / dots) * Math.PI * 2
    ctx.fillRect(Math.round(view.centerX + Math.cos(angle) * radius) - 1, Math.round(view.centerY + Math.sin(angle) * radius) - 1, 3, 3)
  }
}

function label(ctx, text, x, y, color = COLORS.label, align = 'center', size = 13) {
  ctx.font = `700 ${size}px "Pixelify Sans", monospace`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(5, 6, 26, 0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function drawImageCentered(ctx, image, x, y, size) {
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, Math.round(x - size / 2), Math.round(y - size / 2), size, size)
    return true
  }
  return false
}

function drawPlanets(ctx, view, images, day) {
  const sun = { x: view.centerX, y: view.centerY }
  circle(ctx, sun.x, sun.y, PLANET_PIXELS.sun * 0.75, 'rgba(255, 200, 60, 0.18)')
  if (!drawImageCentered(ctx, images.sun, sun.x, sun.y, PLANET_PIXELS.sun)) circle(ctx, sun.x, sun.y, PLANET_PIXELS.sun / 2, '#ffd23f')
  label(ctx, 'Sun', sun.x, sun.y + PLANET_PIXELS.sun / 2 + 12, '#ffe8a3')

  const earthWorld = earthPosition(day)
  const earth = toScreen(view, earthWorld.x, earthWorld.y)
  // The same Earth as the mission menu (levels/assets/earth.svg).
  if (!drawImageCentered(ctx, images.menuEarth, earth.x, earth.y, PLANET_PIXELS.earth)) circle(ctx, earth.x, earth.y, PLANET_PIXELS.earth / 2, '#2f8fe6')
  label(ctx, 'Earth', earth.x, earth.y + PLANET_PIXELS.earth / 2 + 12, '#9fdcff')

  const marsWorld = marsPosition(day)
  const mars = toScreen(view, marsWorld.x, marsWorld.y)
  if (!drawImageCentered(ctx, images.mars, mars.x, mars.y, PLANET_PIXELS.mars)) circle(ctx, mars.x, mars.y, PLANET_PIXELS.mars / 2, '#e2643b')
  label(ctx, 'Mars', mars.x, mars.y + PLANET_PIXELS.mars / 2 + 12, '#ffb199')
}

/**
 * Hazards: before the launch only a pixel light (drawPixelLight); once launched,
 * the satellite sprites show and debris looks like a tumbling rocket stage.
 */
/**
 * Before the launch each hazard is a small pixel light: all the same size, a 4 × 4 grid of equal
 * pixels with the corners cut off, always on, its color stepping red, green, blue. Each light
 * starts on a different color so they do not all match.
 */
const PIXEL_LIGHT_COLORS = ['#ff2d2d', '#2dff4f', '#2d6bff']
const PIXEL_LIGHT_PIXEL = 4
const PIXEL_LIGHT_GRID = 4
const PIXEL_LIGHT_STEP_SECONDS = 0.5
const PIXEL_LIGHT_CELLS = (() => {
  const cells = []
  const last = PIXEL_LIGHT_GRID - 1
  for (let y = 0; y < PIXEL_LIGHT_GRID; y += 1) {
    for (let x = 0; x < PIXEL_LIGHT_GRID; x += 1) {
      const corner = (x === 0 || x === last) && (y === 0 || y === last)
      if (!corner) cells.push([x, y])
    }
  }
  return cells
})()

function drawPixelLight(ctx, spot, index, clockSeconds) {
  const color = PIXEL_LIGHT_COLORS[(Math.floor(clockSeconds / PIXEL_LIGHT_STEP_SECONDS) + index) % PIXEL_LIGHT_COLORS.length]
  const size = PIXEL_LIGHT_PIXEL
  const half = (PIXEL_LIGHT_GRID * size) / 2
  // Snap to the pixel grid so every square stays crisp.
  const left = Math.round((spot.x - half) / size) * size
  const top = Math.round((spot.y - half) / size) * size
  ctx.fillStyle = color
  for (const [x, y] of PIXEL_LIGHT_CELLS) ctx.fillRect(left + x * size, top + y * size, size, size)
}

function drawHazards(ctx, view, images, day, launched, clockSeconds) {
  MARS_HAZARDS.forEach((hazard, index) => drawHazard(ctx, view, images, day, launched, clockSeconds, hazard, index))
}

function drawHazard(ctx, view, images, day, launched, clockSeconds, hazard, index) {
  const world = hazardPosition(hazard, day)
  const spot = toScreen(view, world.x, world.y)
  const color = hazard.kind === 'debris' ? COLORS.debris : COLORS.satellite
  if (!launched) {
    drawPixelLight(ctx, spot, index, clockSeconds)
    return
  }
  if (hazard.kind === 'satellite' && images.satellite?.complete && images.satellite.naturalWidth > 0) {
    drawImageCentered(ctx, images.satellite, spot.x, spot.y, HAZARD_PIXELS + 6)
  } else {
    // Tumbling old rocket stage: a gray body with a dark nozzle, slowly turning.
    ctx.save()
    ctx.translate(spot.x, spot.y)
    ctx.rotate(clockSeconds * 0.8 + hazard.startDeg)
    ctx.fillStyle = color
    ctx.fillRect(-4, -HAZARD_PIXELS / 2, 8, HAZARD_PIXELS - 4)
    ctx.fillStyle = '#5c6772'
    ctx.fillRect(-5, HAZARD_PIXELS / 2 - 5, 10, 4)
    ctx.restore()
  }
  label(ctx, hazard.name, spot.x, spot.y - HAZARD_PIXELS, color, 'center', 12)
}

export function pathColor(outcome) {
  if (outcome.type === MARS_OUTCOMES.REACHED) return COLORS.pathGood
  if (outcome.type === MARS_OUTCOMES.HAZARD) return COLORS.pathCrash
  return COLORS.pathMiss
}

function drawPath(ctx, view, samples, site, color, untilDay = Infinity, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  for (const sample of samples) {
    if (sample.day > untilDay) break
    const point = pathScreenPoint(view, sample, site)
    ctx.fillRect(Math.round(point.x) - 2, Math.round(point.y) - 2, 4, 4)
  }
  ctx.globalAlpha = 1
}

/** Little protractor at the launch base: the 0° line to the right and the current direction. */
function drawProtractor(ctx, view, aim, site) {
  const earth = baseScreenPosition(view, site)
  const radius = 44
  ctx.strokeStyle = COLORS.protractor
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(earth.x, earth.y)
  ctx.lineTo(earth.x + radius + 16, earth.y)
  ctx.stroke()
  ctx.setLineDash([])
  label(ctx, '0°', earth.x + radius + 28, earth.y, COLORS.protractor, 'center', 11)
  if (!aim) return
  const angle = (aim.angleDeg * Math.PI) / 180
  ctx.beginPath()
  ctx.arc(earth.x, earth.y, radius, 0, -angle, true)
  ctx.stroke()
  const tip = aimScreenPoint(view, aim, site)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(earth.x, earth.y)
  ctx.lineTo(tip.x, tip.y)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(Math.round(tip.x) - 7, Math.round(tip.y) - 1, 14, 3)
  ctx.fillRect(Math.round(tip.x) - 1, Math.round(tip.y) - 7, 3, 14)
}

function drawRocket(ctx, view, images, here, ahead, site) {
  const image = images.rocket
  if (!image?.complete) return
  const a = pathScreenPoint(view, here, site)
  const b = pathScreenPoint(view, ahead, site)
  const sprite = ASSETS.rocketUpperStage
  const cell = sprite.frameX + (Math.floor(performance.now() / 90) % sprite.frames) * sprite.frameWidth
  ctx.save()
  ctx.translate(Math.round(a.x), Math.round(a.y))
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2)
  ctx.drawImage(image, cell, sprite.frameY, sprite.frameWidth, sprite.frameHeight, -ROCKET_PIXELS / 2, -ROCKET_PIXELS / 2, ROCKET_PIXELS, ROCKET_PIXELS)
  ctx.restore()
}

function drawExplosion(ctx, view, images, point, secondsSince, site) {
  const frame = Math.floor(secondsSince * EXPLOSION.fps)
  if (frame >= EXPLOSION.frames || !images.explosion?.complete) return
  const at = pathScreenPoint(view, point, site)
  ctx.drawImage(
    images.explosion,
    frame * EXPLOSION.frameSize, 0, EXPLOSION.frameSize, EXPLOSION.frameSize,
    Math.round(at.x - EXPLOSION.pixels / 2), Math.round(at.y - EXPLOSION.pixels / 2), EXPLOSION.pixels, EXPLOSION.pixels,
  )
}

/** Launch bases on the Earth picture: all of them while choosing, then only the chosen one. */
function drawBases(ctx, view, sites, chosenId, day, choosing) {
  for (const site of sites) {
    const chosen = site.id === chosenId
    if (!choosing && !chosen) continue
    const spot = baseScreenPosition(view, site, day)
    circle(ctx, spot.x, spot.y, chosen ? 5 : 3.5, chosen ? '#ffd23f' : '#ff8fa6')
    if (chosen) label(ctx, site.name, spot.x, spot.y - 14, '#ffd23f', 'center', 12)
  }
}

/**
 * scene: { step, trip, aim, site, sites, flight: { day, secondsSinceEnd, crash } | null, images, clockSeconds }
 *   step 'site': planets on launch day and every launch base on Earth; the chosen one is yellow
 *   step 'aim': planets on launch day, hazards as dots, the dotted prediction and the protractor
 *   step 'flight' / 'result': everything moves with the trip day; the rocket follows the path
 */
export function drawMarsScene(ctx, view, scene) {
  ctx.clearRect(0, 0, view.width, view.height)
  ctx.imageSmoothingEnabled = false
  const launched = scene.step === 'flight' || scene.step === 'result'
  const day = launched && scene.flight ? scene.flight.day : 0

  dottedRing(ctx, view, EARTH_ORBIT_AU, COLORS.earthOrbit)
  dottedRing(ctx, view, MARS_ORBIT_AU, COLORS.marsOrbit)
  drawHazards(ctx, view, scene.images, day, launched, scene.clockSeconds)
  drawPlanets(ctx, view, scene.images, day)
  drawBases(ctx, view, scene.sites ?? [], scene.site?.id, day, scene.step === 'site')

  const { trip, site } = scene
  if (!trip || scene.step === 'site') return
  const color = pathColor(trip.outcome)
  if (!launched) {
    drawPath(ctx, view, trip.samples, site, color)
    drawProtractor(ctx, view, scene.aim, site)
    label(ctx, `Aim: ${TARGET_ANGLE_DEG}° (from ${ANGLE_WINDOW.min}° to ${ANGLE_WINDOW.max}° still works)`, view.width / 2, 22, '#ffd23f', 'center', 15)
    return
  }
  drawPath(ctx, view, trip.samples, site, color, Infinity, 0.25)
  drawPath(ctx, view, trip.samples, site, color, day)
  const { outcome } = trip
  const crash = scene.flight?.crash
  if (crash) {
    // A crew choice blew up the ship at a close pass.
    drawExplosion(ctx, view, scene.images, crash, scene.flight.secondsSinceEnd, site)
  } else if (day < outcome.day) {
    const here = tripPointAt(trip.samples, day)
    drawRocket(ctx, view, scene.images, here, tripPointAt(trip.samples, day + 3), site)
  } else if (outcome.type === MARS_OUTCOMES.HAZARD) {
    drawExplosion(ctx, view, scene.images, outcome, scene.flight?.secondsSinceEnd ?? 0, site)
  } else {
    const before = tripPointAt(trip.samples, outcome.day - 3)
    drawRocket(ctx, view, scene.images, outcome, { day: outcome.day + 3, x: outcome.x * 2 - before.x, y: outcome.y * 2 - before.y }, site)
  }
}
