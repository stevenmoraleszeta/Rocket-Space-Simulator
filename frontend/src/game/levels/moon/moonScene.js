/**
 * Draws the Earth → Moon map of mission 2 on a canvas (design pixels, see uiScale.js).
 *
 * Earth is the polar map from mission 1 (North Pole in the middle), turned by how far
 * Earth has spun at the chosen date, so the launch base sits where it really is.
 * Earth and Moon are lit from the real direction of the Sun: their night halves are dark.
 * Distances are squeezed (moonTransfer.js displayRadius); angles are real.
 *
 * The Sun is far off the map: its light crosses the whole map from one side, and the small
 * Moons on the Moon's orbit show why the Moon has phases (the Sun always lights the same half).
 * After mapping, the ship flies home: the trip out and the trip back draw a figure 8.
 */
import {
  CAPTURE_KM,
  DEBRIS_BAND_HALF,
  DISPLAY_EARTH_RADIUS,
  EARTH_RADIUS_KM,
  LUNAR_ORBIT_ALTITUDE_KM,
  MOON_RADIUS_KM,
  TRANSFER_OUTCOMES,
  TRIP_DAYS,
  displayRadius,
  moonAt,
  toDisplay,
  trafficAngle,
  trafficPosition,
} from './moonTransfer.js'

const EARTH_SPRITE_BODY = { x: 16, y: 16, size: 224 }
const MOON_SPRITE_BODY = { x: 12, y: 12, size: 232 }
/** Drawn Moon radius, in squeezed map units. Bigger than real so it can be seen. */
const MOON_DRAW_RADIUS = 0.05
/** Drag farther than this fraction of the map size gives full power. */
export const AIM_MAX_FRACTION = 0.42
const LABEL_FONT = '"Pixelify Sans", system-ui, sans-serif'

const COLORS = {
  moonOrbit: 'rgba(160, 180, 230, 0.55)',
  geoRing: 'rgba(120, 150, 210, 0.22)',
  pathGood: '#3ddc97',
  pathBad: '#ff5d73',
  pathWarn: '#ffd23f',
  satellite: '#ffd23f',
  debris: '#ff9f6b',
  hit: '#ff5d73',
  label: '#ffffff',
  night: 'rgba(3, 6, 22, 0.62)',
  sun: '#ffd84a',
  home: '#7fd1ff',
}

/** Builds the view for a canvas area (design pixels). */
export function createMoonView(width, height) {
  const unit = Math.min(width, height) * 0.45
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height / 2,
    unit,
    aimMaxPixels: Math.min(width, height) * AIM_MAX_FRACTION,
  }
}

/** Space position (km) → screen (design pixels). */
export function spaceToScreen(view, x, y) {
  const spot = toDisplay(x, y)
  return { x: view.centerX + spot.x * view.unit, y: view.centerY - spot.y * view.unit }
}

/** Screen point of the launch base: on Earth's rim, at its angle in space. */
export function baseScreenPosition(view, siteAngle) {
  const radius = DISPLAY_EARTH_RADIUS * view.unit
  return {
    x: view.centerX + radius * Math.cos(siteAngle),
    y: view.centerY - radius * Math.sin(siteAngle),
  }
}

/**
 * Aim from a pointer: the direction from the base is where the burn points,
 * the distance is the power. Returns { offset, power } (offset from straight ahead).
 */
export function aimFromPointer(view, siteAngle, pointer) {
  const base = baseScreenPosition(view, siteAngle)
  const dx = pointer.x - base.x
  const dy = -(pointer.y - base.y)
  const distance = Math.hypot(dx, dy)
  if (distance < 6) return null
  const direction = Math.atan2(dy, dx)
  let offset = direction - (siteAngle + Math.PI / 2)
  offset = ((offset + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  return { offset, power: Math.min(1, distance / view.aimMaxPixels) }
}

/** Screen point where the aim handle sits for a given aim. */
export function aimHandlePosition(view, siteAngle, aim) {
  const base = baseScreenPosition(view, siteAngle)
  const direction = siteAngle + Math.PI / 2 + aim.offset
  const length = Math.max(0.08, aim.power) * view.aimMaxPixels
  return { x: base.x + length * Math.cos(direction), y: base.y - length * Math.sin(direction) }
}

function drawLabel(ctx, text, x, y, align = 'center', color = COLORS.label, size = 13) {
  ctx.font = `700 ${size}px ${LABEL_FONT}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(5, 6, 26, 0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

/** Darkens the half of a round body that faces away from the Sun. */
function drawNightSide(ctx, x, y, radius, sunLongitude, strength = COLORS.night) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(x, y)
  // Screen angles turn the other way (y points down).
  ctx.rotate(-sunLongitude)
  const glow = ctx.createLinearGradient(-radius * 0.15, 0, radius * 0.15, 0)
  glow.addColorStop(0, strength)
  glow.addColorStop(1, 'rgba(3, 6, 22, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(-radius * 0.15, -radius, radius * 0.3, radius * 2)
  ctx.fillStyle = strength
  ctx.fillRect(-radius - 1, -radius - 1, radius * 0.85 + 1, radius * 2 + 2)
  ctx.restore()
}

function drawSprite(ctx, image, body, x, y, radius, rotation = 0) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.imageSmoothingEnabled = false
  const scale = image.naturalWidth / 256
  ctx.drawImage(
    image,
    body.x * scale, body.y * scale, body.size * scale, body.size * scale,
    -radius, -radius, radius * 2, radius * 2,
  )
  ctx.restore()
}

function drawEarth(ctx, view, scene) {
  const radius = DISPLAY_EARTH_RADIUS * view.unit
  const { centerX: x, centerY: y } = view
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(79, 195, 255, 0.25)'
  ctx.fill()
  ctx.restore()
  const image = scene.images.earth
  if (image?.complete && image.naturalWidth) {
    // The polar map puts longitude 0 to the right; turn it by Earth's spin.
    drawSprite(ctx, image, EARTH_SPRITE_BODY, x, y, radius, -scene.earthTurn)
  } else {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#2f7be0'
    ctx.fill()
  }
  drawNightSide(ctx, x, y, radius, scene.sunLongitude)
}

function drawMoonBody(ctx, view, scene, position, alpha = 1) {
  const screen = spaceToScreen(view, position.x, position.y)
  const radius = MOON_DRAW_RADIUS * view.unit
  ctx.save()
  ctx.globalAlpha *= alpha
  const image = scene.images.moon
  if (image?.complete && image.naturalWidth) {
    drawSprite(ctx, image, MOON_SPRITE_BODY, screen.x, screen.y, radius)
  } else {
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#c9ccd6'
    ctx.fill()
  }
  drawNightSide(ctx, screen.x, screen.y, radius, scene.sunLongitude, 'rgba(3, 6, 22, 0.86)')
  ctx.restore()
  return { ...screen, radius }
}

/** A few stars that twinkle over the painted background. */
function drawTwinkles(ctx, view, clock) {
  ctx.save()
  for (let star = 0; star < 28; star += 1) {
    const x = ((star * 0.6180339) % 1) * view.width
    const y = ((star * 0.4142135) % 1) * view.height
    ctx.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(clock * (0.8 + (star % 5) * 0.3) + star))
    ctx.fillStyle = star % 3 ? '#cfe3ff' : '#fff3c4'
    const size = star % 4 === 0 ? 3 : 2
    ctx.fillRect(Math.round(x), Math.round(y), size, size)
  }
  ctx.restore()
}

/** Point where a ray from the map center in direction (dx, dy) leaves the canvas. */
function edgePoint(view, dx, dy) {
  const reachX = dx > 0 ? view.width - view.centerX : view.centerX
  const reachY = dy > 0 ? view.height - view.centerY : view.centerY
  const t = Math.min(dx ? reachX / Math.abs(dx) : Infinity, dy ? reachY / Math.abs(dy) : Infinity)
  return { x: view.centerX + dx * t, y: view.centerY + dy * t }
}

/**
 * Sunlight: the Sun is 150 million km away, far off the map. Its light arrives as parallel
 * rays that cross the whole map, so Earth and the Moon are lit on the same side.
 * A glowing Sun peeks in at the edge to say where the light comes from.
 */
function drawSunlight(ctx, view, sunLongitude, clock) {
  const toSun = { x: Math.cos(sunLongitude), y: -Math.sin(sunLongitude) }
  const across = { x: -toSun.y, y: toSun.x }
  const span = Math.hypot(view.width, view.height)
  const edge = edgePoint(view, toSun.x, toSun.y)
  ctx.save()
  // Soft warm wash on the sunny side of the map.
  const wash = ctx.createLinearGradient(edge.x, edge.y, view.centerX - toSun.x * span * 0.3, view.centerY - toSun.y * span * 0.3)
  wash.addColorStop(0, 'rgba(255, 216, 74, 0.13)')
  wash.addColorStop(1, 'rgba(255, 216, 74, 0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, view.width, view.height)
  // Parallel rays that travel away from the Sun.
  ctx.lineCap = 'round'
  ctx.lineWidth = 2
  for (let ray = -9; ray <= 9; ray += 1) {
    const side = (ray * span) / 19 + (ray % 2) * 9
    const travel = (((clock * 70 + ray * 137) % span) + span) % span
    const along = span / 2 - travel
    const headX = view.centerX + across.x * side + toSun.x * along
    const headY = view.centerY + across.y * side + toSun.y * along
    const tailX = headX + toSun.x * 90
    const tailY = headY + toSun.y * 90
    const streak = ctx.createLinearGradient(tailX, tailY, headX, headY)
    streak.addColorStop(0, 'rgba(255, 224, 120, 0)')
    streak.addColorStop(1, 'rgba(255, 224, 120, 0.22)')
    ctx.strokeStyle = streak
    ctx.beginPath()
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(headX, headY)
    ctx.stroke()
  }
  // The Sun peeking in at the edge, with turning rays.
  ctx.translate(edge.x, edge.y)
  const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 120)
  glow.addColorStop(0, 'rgba(255, 216, 74, 0.45)')
  glow.addColorStop(1, 'rgba(255, 216, 74, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, 120, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.rotate(clock * 0.3)
  ctx.fillStyle = 'rgba(255, 216, 74, 0.7)'
  for (let ray = 0; ray < 12; ray += 1) {
    ctx.rotate(Math.PI / 6)
    ctx.fillRect(-2.5, 34, 5, 12 + 5 * Math.sin(clock * 3 + ray))
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(0, 0, 30 + Math.sin(clock * 2) * 1.5, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.sun
  ctx.shadowColor = COLORS.sun
  ctx.shadowBlur = 30
  ctx.fill()
  ctx.restore()
  // Label and arrow inside the map, pointing the way the light goes.
  const labelX = edge.x - toSun.x * 82
  const labelY = edge.y - toSun.y * 82
  drawLabel(ctx, 'SUNLIGHT', labelX, labelY, 'center', COLORS.sun, 12)
  ctx.save()
  ctx.translate(labelX - toSun.x * 22, labelY - toSun.y * 22)
  ctx.rotate(Math.atan2(-toSun.y, -toSun.x))
  ctx.fillStyle = COLORS.sun
  ctx.beginPath()
  ctx.moveTo(8, 0)
  ctx.lineTo(-4, -6)
  ctx.lineTo(-4, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * Little Moons around the Moon's orbit. The Sun lights the same half of each one,
 * but from Earth (in the middle) we see a different part of that lit half: the phases.
 */
function drawPhaseRing(ctx, view, sunLongitude) {
  const radius = 6
  for (let spot = 0; spot < 8; spot += 1) {
    const angle = (spot * Math.PI) / 4 + Math.PI / 8
    const x = view.centerX + view.unit * Math.cos(angle)
    const y = view.centerY - view.unit * Math.sin(angle)
    ctx.save()
    ctx.globalAlpha *= 0.8
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = '#d9dbe4'
    ctx.fill()
    ctx.restore()
    drawNightSide(ctx, x, y, radius, sunLongitude, 'rgba(10, 12, 30, 0.9)')
  }
}

function drawRings(ctx, view) {
  ctx.save()
  ctx.setLineDash([2, 9])
  ctx.lineWidth = 2
  ctx.strokeStyle = COLORS.moonOrbit
  ctx.beginPath()
  ctx.arc(view.centerX, view.centerY, view.unit, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([2, 6])
  ctx.lineWidth = 1
  ctx.strokeStyle = COLORS.geoRing
  ctx.beginPath()
  ctx.arc(view.centerX, view.centerY, displayRadius(EARTH_RADIUS_KM + 35_786) * view.unit, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** Which picture each satellite uses (the sprites of the orbit level). */
const SATELLITE_LOOKS = {
  iss: { image: 'goldSatellite', frameWidth: 24, frameHeight: 16, frames: 4, scale: 1.7 },
  hubble: { image: 'spaceTelescope', frameWidth: 32, frameHeight: 32, frames: 1, scale: 1.25 },
  'landsat-9': { image: 'goldSatellite', frameWidth: 24, frameHeight: 16, frames: 4, scale: 1.5 },
  'noaa-20': { image: 'commsSatellite', frameWidth: 32, frameHeight: 32, frames: 1, scale: 1.15 },
  gps: { image: 'commsSatellite', frameWidth: 32, frameHeight: 32, frames: 1, scale: 1.25 },
  'goes-16': { image: 'commsSatellite', frameWidth: 32, frameHeight: 32, frames: 1, scale: 1.35 },
}

function drawSatellite(ctx, scene, object, screen, clock, hit, hovered) {
  const look = SATELLITE_LOOKS[object.id] ?? SATELLITE_LOOKS.gps
  const image = scene.images[look.image]
  const width = Math.round(look.frameWidth * look.scale)
  const height = Math.round(look.frameHeight * look.scale)
  ctx.save()
  // Hit: a red ring that pulses, so the player sees what the dots run into.
  if (hit) {
    ctx.strokeStyle = COLORS.hit
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, width * 0.6 + Math.sin(clock * 8) * 3, 0, Math.PI * 2)
    ctx.stroke()
  } else if (hovered) {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, width * 0.6, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.translate(Math.round(screen.x), Math.round(screen.y))
  ctx.rotate(Math.sin(clock * 0.8 + object.altitudeKm) * 0.18)
  if (image?.complete && image.naturalWidth) {
    ctx.imageSmoothingEnabled = false
    const frame = Math.floor(clock * 6) % look.frames
    ctx.drawImage(image, frame * look.frameWidth, 0, look.frameWidth, look.frameHeight, -width / 2, -height / 2, width, height)
  } else {
    ctx.fillStyle = COLORS.satellite
    ctx.fillRect(-6, -6, 12, 12)
  }
  ctx.restore()
  if (hit || hovered) drawLabel(ctx, object.shortName, screen.x, screen.y - height / 2 - 10, 'center', hit ? COLORS.hit : '#ffffff', 12)
}

function drawDebris(ctx, view, scene, object, seconds, clock, hit, hovered, turn = 0) {
  const radius = displayRadius(EARTH_RADIUS_KM + object.altitudeKm) * view.unit
  const center = trafficAngle(object, scene.launchDate, seconds) + turn
  const span = (object.spanDeg * Math.PI) / 180
  const thickness = DEBRIS_BAND_HALF * view.unit
  ctx.save()
  // Faint band, so the cloud reads as one thing.
  ctx.strokeStyle = hit ? 'rgba(255, 93, 115, 0.3)' : hovered ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 159, 107, 0.16)'
  ctx.lineWidth = thickness * 2
  ctx.beginPath()
  ctx.arc(view.centerX, view.centerY, radius, -(center - span / 2), -(center + span / 2), true)
  ctx.stroke()
  // Grains that tumble a little.
  for (let grain = 0; grain < 34; grain += 1) {
    const along = ((grain * 0.6180339) % 1) - 0.5
    const across = (((grain * 0.7548776) % 1) - 0.5) * 2 + Math.sin(clock * 2 + grain) * 0.05
    const angle = center + along * span
    const r = radius + across * thickness
    const size = grain % 5 === 0 ? 4 : grain % 2 ? 3 : 2
    ctx.fillStyle = hit ? COLORS.hit : grain % 3 ? COLORS.debris : '#c9b39a'
    ctx.fillRect(Math.round(view.centerX + r * Math.cos(angle)) - 1, Math.round(view.centerY - r * Math.sin(angle)) - 1, size, size)
  }
  ctx.restore()
  if (hit || hovered) {
    const labelRadius = radius + thickness + 12
    drawLabel(ctx, object.shortName, view.centerX + labelRadius * Math.cos(center), view.centerY - labelRadius * Math.sin(center), 'center', hit ? COLORS.hit : '#ffffff', 12)
  }
}

function drawTraffic(ctx, view, scene, seconds, clock, intro) {
  scene.traffic.forEach((object, order) => {
    const hit = scene.hitIds?.has(object.id)
    const hovered = scene.hoverId === object.id
    // Intro: each one flies out of Earth to its orbit, one after another.
    scaledFromEarth(ctx, view, grow(intro, 0.25 + order * 0.07, 0.7), () => {
      const turn = scene.glide?.traffic?.[object.id] ?? 0
      if (object.kind === 'debris') {
        drawDebris(ctx, view, scene, object, seconds, clock, hit, hovered, turn)
        return
      }
      const position = rotateAboutEarth(trafficPosition(object, scene.launchDate, seconds), turn)
      drawSatellite(ctx, scene, object, spaceToScreen(view, position.x, position.y), clock, hit, hovered)
    })
  })
}

/** The satellite or junk cloud under a point on the map (design pixels), or null. */
export function trafficAtPoint(view, traffic, launchDate, point, seconds = 0) {
  let best = null
  let bestDistance = Infinity
  for (const object of traffic) {
    let distance = Infinity
    if (object.kind === 'debris') {
      const radius = displayRadius(EARTH_RADIUS_KM + object.altitudeKm) * view.unit
      const dx = point.x - view.centerX
      const dy = view.centerY - point.y
      const off = Math.atan2(dy, dx) - trafficAngle(object, launchDate, seconds)
      const wrapped = Math.atan2(Math.sin(off), Math.cos(off))
      const across = Math.abs(Math.hypot(dx, dy) - radius)
      if (Math.abs(wrapped) <= (object.spanDeg * Math.PI) / 360 + 0.04 && across <= DEBRIS_BAND_HALF * view.unit + 10) distance = across
    } else {
      const position = trafficPosition(object, launchDate, seconds)
      const screen = spaceToScreen(view, position.x, position.y)
      distance = Math.hypot(point.x - screen.x, point.y - screen.y)
      if (distance > 26) distance = Infinity
    }
    if (distance < bestDistance) {
      bestDistance = distance
      best = object
    }
  }
  return best
}

/** The way home, shifted so it starts at the Moon where the ship meets it (see drawMoonScene). */
function homeFromMeetingPoint(samples, meetMoon, leaveMoon) {
  const dx = meetMoon.x - leaveMoon.x
  const dy = meetMoon.y - leaveMoon.y
  const startRadius = Math.hypot(samples[0].x, samples[0].y)
  const fadeTo = startRadius * 0.4
  return samples.map((sample) => {
    const radius = Math.hypot(sample.x, sample.y)
    const weight = Math.min(1, Math.max(0, (radius - fadeTo) / (startRadius - fadeTo)))
    return { ...sample, x: sample.x + dx * weight, y: sample.y + dy * weight }
  })
}

function pathColor(outcomeType) {
  if (outcomeType === TRANSFER_OUTCOMES.ARRIVED) return COLORS.pathGood
  if (
    outcomeType === TRANSFER_OUTCOMES.SHORT
    || outcomeType === TRANSFER_OUTCOMES.PAST
    || outcomeType === TRANSFER_OUTCOMES.TOO_EARLY
    || outcomeType === TRANSFER_OUTCOMES.TOO_LATE
    || outcomeType === TRANSFER_OUTCOMES.LOOP
  ) return COLORS.pathWarn
  return COLORS.pathBad
}

/** Radius (design pixels) of the lunar orbit ring drawn around the Moon. */
function orbitRing(view) {
  return MOON_DRAW_RADIUS * view.unit + 12
}

/** On-screen distance from the Moon for a real distance (km), inside the "Moon lens". */
function lensDistance(view, distanceKm, captureKm) {
  const orbitKm = MOON_RADIUS_KM + LUNAR_ORBIT_ALTITUDE_KM
  return orbitRing(view) * (1 + (0.6 * Math.max(0, distanceKm - orbitKm)) / (captureKm - orbitKm))
}

/**
 * Screen point of a ship sample { x, y, t }. The drawn Moon is much bigger than the real one,
 * so near the Moon the map zooms in around it (a "lens"): the ship really reaches the drawn
 * Moon at the same time as the real ship reaches the real Moon, and its orbit is visible.
 */
export function shipScreen(view, scene, sample) {
  const base = spaceToScreen(view, sample.x, sample.y)
  if (!scene.moonTable) return base
  const moon = moonAt(scene.moonTable, sample.t ?? 0)
  const dx = sample.x - moon.x
  const dy = sample.y - moon.y
  const distance = Math.hypot(dx, dy)
  const captureKm = scene.captureKm ?? CAPTURE_KM
  const far = captureKm * 4
  if (distance >= far || distance === 0) return base
  const moonScreen = spaceToScreen(view, moon.x, moon.y)
  const reach = lensDistance(view, distance, captureKm)
  const lensed = { x: moonScreen.x + (dx / distance) * reach, y: moonScreen.y - (dy / distance) * reach }
  const s = distance <= captureKm ? 1 : 1 - (distance - captureKm) / (far - captureKm)
  const w = s * s * (3 - 2 * s)
  return { x: base.x + (lensed.x - base.x) * w, y: base.y + (lensed.y - base.y) * w }
}

/** Dots along a line of screen points. `phase` (pixels) makes the dots march forward. */
function drawScreenDots(ctx, points, color, untilIndex = points.length - 1, alpha = 1, phase = 0, size = 5) {
  const spacing = 11
  const half = Math.floor(size / 2)
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = color
  let toNext = spacing - (phase % spacing)
  for (let index = 1; index <= untilIndex && index < points.length; index += 1) {
    const previous = points[index - 1]
    const point = points[index]
    const dx = point.x - previous.x
    const dy = point.y - previous.y
    const length = Math.hypot(dx, dy)
    let travelled = 0
    while (toNext <= length - travelled) {
      travelled += toNext
      const f = travelled / length
      ctx.fillRect(Math.round(previous.x + dx * f) - half, Math.round(previous.y + dy * f) - half, size, size)
      toNext = spacing
    }
    toNext -= length - travelled
  }
  ctx.restore()
}

/** Dotted path of simulated samples ({ t, x, y } in km), drawn through the Moon lens. */
function drawDottedPath(ctx, view, scene, samples, color, untilIndex = samples.length - 1, alpha = 1, phase = 0, size = 5) {
  const points = samples.map((sample) => shipScreen(view, scene, sample))
  drawScreenDots(ctx, points, color, untilIndex, alpha, phase, size)
  return points
}

function drawHits(ctx, view, scene, hits, clock) {
  for (const hit of hits) {
    const screen = shipScreen(view, scene, hit)
    const size = 8 + Math.sin(clock * 8) * 2
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(screen.x - size, screen.y - size)
    ctx.lineTo(screen.x + size, screen.y + size)
    ctx.moveTo(screen.x + size, screen.y - size)
    ctx.lineTo(screen.x - size, screen.y + size)
    ctx.strokeStyle = '#05061a'
    ctx.lineWidth = 7
    ctx.stroke()
    ctx.strokeStyle = COLORS.hit
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }
}

function drawBase(ctx, view, siteAngle, clock) {
  const base = baseScreenPosition(view, siteAngle)
  ctx.save()
  const baseAlpha = ctx.globalAlpha
  // Beacon rings, so the base is easy to find.
  for (let ring = 0; ring < 2; ring += 1) {
    const grow = (clock * 0.8 + ring * 0.5) % 1
    ctx.globalAlpha = baseAlpha * (1 - grow)
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(base.x, base.y, 7 + grow * 16, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = baseAlpha
  ctx.fillStyle = '#ffd23f'
  ctx.strokeStyle = '#05061a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(base.x, base.y, 7, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fill()
  ctx.restore()
  return base
}

function drawAimHandle(ctx, view, scene) {
  const base = baseScreenPosition(view, scene.siteAngle)
  const handle = aimHandlePosition(view, scene.siteAngle, scene.aim)
  ctx.save()
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(base.x, base.y)
  ctx.lineTo(handle.x, handle.y)
  ctx.stroke()
  ctx.setLineDash([])
  // Arrow on the handle, pointing the way the ship will go.
  ctx.translate(handle.x, handle.y)
  ctx.rotate(Math.atan2(handle.y - base.y, handle.x - base.x))
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#05061a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fill()
  ctx.fillStyle = '#05061a'
  ctx.beginPath()
  ctx.moveTo(6, 0)
  ctx.lineTo(-3, -5)
  ctx.lineTo(-3, 5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A see-through hand that shows how to drag, until the player tries it. */
function drawHandHint(ctx, view, scene, clock) {
  const base = baseScreenPosition(view, scene.siteAngle)
  const handle = aimHandlePosition(view, scene.siteAngle, scene.aim)
  const cycle = (clock % 2.4) / 2.4
  const move = Math.min(1, cycle / 0.7)
  const ease = move * move * (3 - 2 * move)
  ctx.save()
  ctx.globalAlpha *= cycle > 0.85 ? (1 - cycle) / 0.15 : 0.9
  ctx.font = '30px system-ui, "Segoe UI Emoji", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('👆', base.x + (handle.x - base.x) * ease - 8, base.y + (handle.y - base.y) * ease - 2)
  ctx.restore()
  drawLabel(ctx, 'HOLD AND DRAG', base.x, base.y + 26, 'center', '#ffffff', 12)
}

/** Ship sample { x, y, t } between two samples, for smooth movement. */
function shipPose(samples, position) {
  const index = Math.min(samples.length - 1, Math.max(0, Math.floor(position)))
  const next = Math.min(samples.length - 1, index + 1)
  const f = position - index
  return {
    x: samples[index].x + (samples[next].x - samples[index].x) * f,
    y: samples[index].y + (samples[next].y - samples[index].y) * f,
    t: samples[index].t + (samples[next].t - samples[index].t) * f,
  }
}

/** Ship with an exhaust trail, at a fractional sample position along `samples`. */
function drawShipOn(ctx, view, scene, samples, position, clock, { size = 36, flame = true, heat = 0 } = {}) {
  const screen = shipScreen(view, scene, shipPose(samples, position))
  const next = shipScreen(view, scene, shipPose(samples, Math.min(samples.length - 1, position + 1.5)))
  const back1 = shipScreen(view, scene, shipPose(samples, Math.max(0, position - 1.5)))
  const heading = Math.hypot(next.x - screen.x, next.y - screen.y) > 0.5
    ? Math.atan2(next.y - screen.y, next.x - screen.x)
    : Math.atan2(screen.y - back1.y, screen.x - back1.x)
  // Exhaust trail: fading puffs behind the ship.
  ctx.save()
  for (let puff = 1; puff <= 14; puff += 1) {
    const back = shipScreen(view, scene, shipPose(samples, Math.max(0, position - puff * 0.9)))
    ctx.globalAlpha = (1 - puff / 15) * 0.7
    ctx.fillStyle = puff < 4 ? '#ffd23f' : puff < 8 ? '#ff9f6b' : '#9aa6c8'
    const puffSize = Math.max(2, 7 - puff * 0.35)
    ctx.fillRect(Math.round(back.x - puffSize / 2), Math.round(back.y - puffSize / 2), puffSize, puffSize)
  }
  ctx.restore()
  // Falling into the air: the heat shield glows.
  if (heat > 0) {
    ctx.save()
    ctx.globalAlpha = (0.5 + 0.4 * Math.sin(clock * 30)) * Math.min(1, heat * 2)
    ctx.fillStyle = heat > 0.5 ? '#ff7a3c' : '#ffb347'
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, 12 + heat * 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const image = scene.images.rocket
  // The upgraded rocket is drawn bigger (rendering/upgradedRocket.js)
  size *= image?.grow ?? 1
  ctx.save()
  ctx.translate(Math.round(screen.x), Math.round(screen.y))
  ctx.rotate(heading + Math.PI / 2)
  if (flame) {
    ctx.fillStyle = '#ffb347'
    ctx.fillRect(-3, size * 0.39, 6, 8 + Math.sin(clock * 40) * 3)
  }
  if (image?.complete && image.naturalWidth) {
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, -size / 2, -size / 2, size, size)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-4, -8, 8, 16)
  }
  ctx.restore()
  return screen
}

function drawExplosion(ctx, view, scene, point, secondsSinceEnd, image) {
  const screen = shipScreen(view, scene, point)
  // Shock ring.
  if (secondsSinceEnd < 1) {
    ctx.save()
    ctx.globalAlpha = 1 - secondsSinceEnd
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, 10 + secondsSinceEnd * 70, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  const frame = Math.floor(secondsSinceEnd * 12)
  if (frame >= 8 || !image?.complete) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, frame * 32, 0, 32, 32, Math.round(screen.x - 40), Math.round(screen.y - 40), 80, 80)
  ctx.restore()
}

/**
 * After a good arrival the ship circles the Moon: it starts exactly where it arrived and
 * spirals down onto the orbit ring, going the same way round as it came in.
 */
function drawOrbitingShip(ctx, view, moonScreen, arrival, secondsSinceArrival, image) {
  const ring = orbitRing(view)
  const startAngle = Math.atan2(-(arrival.y - moonScreen.y), arrival.x - moonScreen.x)
  const startRadius = Math.hypot(arrival.x - moonScreen.x, arrival.y - moonScreen.y)
  const settle = Math.min(1, secondsSinceArrival / 2.2)
  const ease = settle * settle * (3 - 2 * settle)
  const angle = startAngle + arrival.sense * secondsSinceArrival * 1.3
  const radius = startRadius + (ring - startRadius) * ease
  ctx.save()
  ctx.globalAlpha = 0.45 * ease
  ctx.strokeStyle = '#3ddc97'
  ctx.setLineDash([3, 5])
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(moonScreen.x, moonScreen.y, ring, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  // Sparkles when it settles.
  if (secondsSinceArrival > 1.6 && secondsSinceArrival < 4) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - (secondsSinceArrival - 1.6) / 2.4)
    for (let spark = 0; spark < 10; spark += 1) {
      const a = (spark / 10) * Math.PI * 2
      const r = ring + 4 + (secondsSinceArrival - 1.6) * 28
      ctx.fillStyle = spark % 2 ? '#ffd23f' : '#3ddc97'
      ctx.fillRect(moonScreen.x + r * Math.cos(a) - 2, moonScreen.y - r * Math.sin(a) - 2, 4, 4)
    }
    ctx.restore()
  }
  const x = moonScreen.x + radius * Math.cos(angle)
  const y = moonScreen.y - radius * Math.sin(angle)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(-angle - (arrival.sense > 0 ? 0 : Math.PI))
  if (image?.complete && image.naturalWidth) {
    ctx.imageSmoothingEnabled = false
    const half = 13 * (image.grow ?? 1)
    ctx.drawImage(image, -half, -half, half * 2, half * 2)
  }
  ctx.restore()
  return { x, y }
}

/** Arrow along the Moon's orbit from where it is at launch to where it is at arrival. */
function drawMoonTravel(ctx, view, fromMoon, toMoon) {
  const from = Math.atan2(fromMoon.y, fromMoon.x)
  let sweep = Math.atan2(toMoon.y, toMoon.x) - from
  sweep = ((sweep % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  if (sweep < 0.05) return
  const radius = displayRadius(Math.hypot(fromMoon.x, fromMoon.y)) * view.unit + MOON_DRAW_RADIUS * view.unit + 10
  // Stop short of the Moon so the arrow tip does not cover it.
  const gap = (MOON_DRAW_RADIUS * view.unit + 6) / radius
  const start = from + gap
  const end = from + sweep - gap
  if (end <= start) return
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.8)'
  ctx.lineWidth = 3
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  // Space angles turn counter-clockwise; on the canvas that is a negative angle.
  ctx.arc(view.centerX, view.centerY, radius, -start, -end, true)
  ctx.stroke()
  ctx.setLineDash([])
  const tipX = view.centerX + radius * Math.cos(end)
  const tipY = view.centerY - radius * Math.sin(end)
  const heading = -(end + Math.PI / 2)
  ctx.fillStyle = 'rgba(255, 210, 63, 0.95)'
  ctx.translate(tipX, tipY)
  ctx.rotate(heading)
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.lineTo(-5, -6)
  ctx.lineTo(-5, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  const middle = from + sweep / 2
  drawLabel(
    ctx,
    'THE MOON MOVES',
    view.centerX + (radius + 16) * Math.cos(middle),
    view.centerY - (radius + 16) * Math.sin(middle),
    'center',
    '#ffd23f',
    10,
  )
}

// ------------------------------------------------------------------ intro and the trip home

function easeOutBack(t) {
  const c = 1.4
  const x = t - 1
  return 1 + (c + 1) * x * x * x + c * x * x
}

/** 0 → 1 (with a little overshoot) between `start` and `start + duration` seconds. */
function grow(seconds, start, duration) {
  const t = Math.min(1, Math.max(0, (seconds - start) / duration))
  return t >= 1 ? 1 : easeOutBack(t)
}

/** Draws with everything pulled toward Earth by `k` (0 = inside Earth, 1 = in place). */
function scaledFromEarth(ctx, view, k, draw) {
  if (k <= 0.001) return
  if (Math.abs(k - 1) < 0.001) {
    draw()
    return
  }
  ctx.save()
  ctx.translate(view.centerX, view.centerY)
  ctx.scale(k, k)
  ctx.translate(-view.centerX, -view.centerY)
  draw()
  ctx.restore()
}

/** Splashdown: rings on the sea and a parachute. */
function drawSplash(ctx, point, since, clock) {
  ctx.save()
  for (let ring = 0; ring < 3; ring += 1) {
    const grown = (since * 0.9 + ring / 3) % 1
    ctx.globalAlpha = 1 - grown
    ctx.strokeStyle = COLORS.home
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(point.x, point.y, 6 + grown * 26, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
  ctx.save()
  ctx.font = '26px system-ui, "Segoe UI Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('🪂', point.x, point.y - 6 + Math.sin(clock * 3) * 2)
  ctx.restore()
  drawLabel(ctx, 'SPLASHDOWN!', point.x, point.y - 44, 'center', COLORS.home, 13)
}

/** Shortest turn from angle a to angle b (radians). */
export function angleBetween(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a))
}

function rotateAboutEarth(point, angle) {
  if (!angle) return point
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { ...point, x: point.x * c - point.y * s, y: point.x * s + point.y * c }
}

/**
 * Draws the whole map.
 * scene: {
 *   step, images, launchDate, earthTurn, sunLongitude, siteAngle, aim, moonTable,
 *   prediction ({ samples, outcome, closest }), returnPrediction ({ samples, departT }) or null,
 *   hits, hitIds, traffic, captureKm, showHandHint, hoverId,
 *   introSeconds (time since the map opened, for the intro),
 *   glide ({ earth, site, sun, moon, traffic: { id: angle }, fade }) angles still left to turn
 *     after the day or hour changed, so everything moves smoothly to its new place,
 *   flight ({ seconds, position, secondsSinceEnd, orbiting, home, secondsSinceArrival, hitFlash,
 *     returnPosition, secondsSinceSplash }) or null,
 *   clockSeconds
 * }
 */
export function drawMoonScene(ctx, view, sceneIn) {
  const glide = sceneIn.glide
  const scene = glide
    ? {
        ...sceneIn,
        earthTurn: sceneIn.earthTurn + glide.earth,
        siteAngle: sceneIn.siteAngle + glide.site,
        sunLongitude: sceneIn.sunLongitude + glide.sun,
      }
    : sceneIn
  const clock = scene.clockSeconds ?? 0
  ctx.clearRect(0, 0, view.width, view.height)
  const flight = scene.flight
  const flying = Boolean(flight)
  const prediction = scene.prediction
  const flightPosition = flying ? flight.position : 0
  const flightIndex = Math.floor(flightPosition)
  const shownSeconds = flying ? flight.seconds ?? 0 : 0
  // Seconds since the ship last hit something (large when it never did).
  const flash = flying ? flight.hitFlash ?? 99 : 99
  // Intro: Earth grows, then rings, satellites, junk and the Moon come out of it.
  const intro = scene.introSeconds ?? 99
  // The path fades out while things glide to a new day, and back in when they are there.
  const planAlpha = Math.min(1, Math.max(0, (intro - 1.3) / 0.5)) * (1 - (glide?.fade ?? 0))

  ctx.save()
  // A little shake when the ship hits something.
  if (flash < 0.4) {
    const strength = 1 - flash / 0.4
    ctx.translate(Math.sin(clock * 90) * 4 * strength, Math.cos(clock * 77) * 3 * strength)
  }

  drawTwinkles(ctx, view, clock)
  ctx.save()
  ctx.globalAlpha = Math.min(1, Math.max(0, intro / 0.8))
  drawSunlight(ctx, view, scene.sunLongitude, clock)
  ctx.restore()
  scaledFromEarth(ctx, view, grow(intro, 0.15, 0.7), () => drawRings(ctx, view))
  scaledFromEarth(ctx, view, grow(intro, 0.9, 0.6), () => drawPhaseRing(ctx, view, scene.sunLongitude))
  drawTraffic(ctx, view, scene, shownSeconds, clock, intro)

  const showHome = scene.returnPrediction && (scene.step === 'aim' || flight?.home || scene.step === 'orbit')
  ctx.save()
  ctx.globalAlpha = planAlpha
  if (prediction && !flying && planAlpha > 0) {
    // The Moon keeps moving while the ship flies: an arrow along its orbit, from launch to day 3.
    const meetSeconds = TRIP_DAYS * 86400
    drawMoonTravel(ctx, view, moonAt(scene.moonTable, 0), moonAt(scene.moonTable, meetSeconds))
    // Where the Moon will be on day 3: the spot the ship has to reach at that moment.
    const meet = moonAt(scene.moonTable, meetSeconds)
    const ghost = drawMoonBody(ctx, view, scene, meet, 0.5)
    const capture = lensDistance(view, scene.captureKm ?? CAPTURE_KM, scene.captureKm ?? CAPTURE_KM)
    ctx.save()
    ctx.setLineDash([4, 6])
    ctx.lineDashOffset = -clock * 12
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(ghost.x, ghost.y, capture + 2 + Math.sin(clock * 3) * 1.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    drawLabel(ctx, `MOON ON DAY ${TRIP_DAYS}`, ghost.x, ghost.y + capture + 14, 'center', '#ffd23f', 11)
    drawLabel(ctx, '(meet it here, right then)', ghost.x, ghost.y + capture + 28, 'center', '#ffd23f', 10)
  }
  ctx.restore()

  scaledFromEarth(ctx, view, 0.35 + 0.65 * grow(intro, 0, 0.6), () => drawEarth(ctx, view, scene))
  const moonNow = rotateAboutEarth(moonAt(scene.moonTable, shownSeconds), flying ? 0 : glide?.moon ?? 0)
  const moonGrow = grow(intro, 0.6, 0.8)
  let moonScreen = null
  scaledFromEarth(ctx, view, moonGrow, () => {
    moonScreen = drawMoonBody(ctx, view, scene, moonNow)
  })
  if (!moonScreen || moonGrow !== 1) {
    const screen = spaceToScreen(view, moonNow.x, moonNow.y)
    moonScreen = { ...screen, radius: MOON_DRAW_RADIUS * view.unit }
  }
  if (!flying && moonGrow >= 1) drawLabel(ctx, 'MOON AT LAUNCH', moonScreen.x, moonScreen.y - moonScreen.radius - 14, 'center', COLORS.label, 11)

  ctx.save()
  ctx.globalAlpha = planAlpha
  // The way home: found with real gravity (simulateReturn), shown with the trip out.
  let homePoints = null
  if (showHome) {
    const travelling = flight?.home
    // While aiming the ship is not there yet: the way home is drawn leaving from the Moon on
    // day 3 (the yellow ring), so it clearly starts at the Moon. The day the crew spends there
    // moves the Moon a little; that shift fades out as the path comes down to Earth.
    const homeSamples = !flying && prediction
      ? homeFromMeetingPoint(scene.returnPrediction.samples, moonAt(scene.moonTable, prediction.outcome.t), moonAt(scene.moonTable, scene.returnPrediction.samples[0].t))
      : scene.returnPrediction.samples
    homePoints = drawDottedPath(ctx, view, scene, homeSamples, COLORS.home, homeSamples.length - 1, travelling ? 0.35 : 0.75, travelling ? 0 : clock * 22, 4)
    if (travelling) drawDottedPath(ctx, view, scene, homeSamples, COLORS.home, Math.floor(flight.returnPosition ?? 0), 1)
    if (!flying) {
      const middle = homePoints[Math.floor(homePoints.length * 0.55)]
      drawLabel(ctx, 'WAY HOME', middle.x, middle.y - 14, 'center', COLORS.home, 11)
    }
  }
  if (prediction) {
    const color = pathColor(prediction.outcome.type)
    if (flying && (flight.orbiting || flight.home)) {
      // The trip out stays on the map, next to the way home.
      drawDottedPath(ctx, view, scene, prediction.samples, color, prediction.samples.length - 1, 0.55)
    } else if (flying) {
      drawDottedPath(ctx, view, scene, prediction.samples, color, prediction.samples.length - 1, 0.22)
      drawDottedPath(ctx, view, scene, prediction.samples, color, flightIndex)
    } else {
      drawDottedPath(ctx, view, scene, prediction.samples, color, prediction.samples.length - 1, 1, clock * 22)
    }
    drawHits(ctx, view, scene, (scene.hits ?? []).filter((hit) => !flying || hit.index <= flightIndex), clock)
  }

  drawBase(ctx, view, scene.siteAngle, clock)
  if (scene.step === 'aim' && scene.aim) {
    drawAimHandle(ctx, view, scene)
    if (scene.showHandHint && planAlpha >= 1) drawHandHint(ctx, view, scene, clock)
  }
  ctx.restore()

  if (flying && prediction) {
    const ended = flight.secondsSinceEnd > 0
    const outcome = prediction.outcome
    const crashed = outcome.type === TRANSFER_OUTCOMES.EARTH_IMPACT || outcome.type === TRANSFER_OUTCOMES.MOON_IMPACT
    if (flight.home && scene.returnPrediction) {
      const homeSamples = scene.returnPrediction.samples
      const last = homeSamples.length - 1
      const position = Math.min(last, flight.returnPosition ?? 0)
      if (position >= last) {
        drawSplash(ctx, shipScreen(view, scene, homeSamples[last]), flight.secondsSinceSplash ?? 0, clock)
      } else {
        drawShipOn(ctx, view, scene, homeSamples, position, clock, { size: 30, flame: position < 6, heat: Math.max(0, (position / last - 0.9) / 0.1) })
      }
    } else if (flight.orbiting) {
      const lastSample = prediction.samples[prediction.samples.length - 1]
      const arrivalMoon = moonAt(scene.moonTable, lastSample.t)
      const arrivalScreen = shipScreen(view, scene, lastSample)
      const moonAtArrival = spaceToScreen(view, arrivalMoon.x, arrivalMoon.y)
      // Keep the arrival point fixed to the Moon while it moves on.
      const arrival = {
        x: moonScreen.x + (arrivalScreen.x - moonAtArrival.x),
        y: moonScreen.y + (arrivalScreen.y - moonAtArrival.y),
        sense: scene.arrivalSense ?? 1,
      }
      drawOrbitingShip(ctx, view, moonScreen, arrival, flight.secondsSinceArrival ?? 99, scene.images.rocket)
    } else if (ended && crashed) {
      drawExplosion(ctx, view, scene, prediction.samples[prediction.samples.length - 1], flight.secondsSinceEnd, scene.images.explosion)
    } else {
      const ship = drawShipOn(ctx, view, scene, prediction.samples, flightPosition, clock)
      if (flash < 0.5) {
        ctx.save()
        ctx.globalAlpha = 1 - flash / 0.5
        ctx.strokeStyle = COLORS.hit
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(ship.x, ship.y, 14 + flash * 60, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    }
  }
  ctx.restore()
}
