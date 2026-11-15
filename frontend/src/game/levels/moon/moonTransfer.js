/**
 * EARTH → MOON TRANSFER — the physics behind the dotted line of mission 2.
 *
 * Real pieces:
 *   - The Moon's place comes from its real orbit (getMoonPosition, a short lunar theory),
 *     so the day and hour of launch decide where the Moon is when the ship gets there.
 *   - Earth turns once a sidereal day: the launch base sits at GMST + its longitude.
 *   - The Sun's direction comes from its real ecliptic longitude, so the Moon phase,
 *     and the day and night halves of Earth and Moon, match the chosen date.
 *   - The ship flies under the pull of Earth AND of the moving Moon (two-body plus the Moon
 *     as a third body, in the Earth-centered frame), integrated with RK4.
 *   - The ship starts on a 200 km parking orbit over the base, like Apollo, and the
 *     "power" of the drag sets the high point of the path (the apogee), the way a real
 *     translunar burn is planned.
 *
 * Simplified on purpose (it is a game for kids):
 *   - Everything is flat: the Moon's 5° tilt and the base latitude are left out of the path.
 *   - Satellites and debris fly modeled circular orbits, not live tracking.
 *   - The screen squeezes distances (see displayRadius) so low orbits and the Moon fit together.
 */
import { getGreenwichSiderealAngle, getMoonPosition } from './moonLaunchPlanning.js'
import { REAL_SATELLITES } from '../orbit/realSatellites.js'

export const EARTH_RADIUS_KM = 6371
export const MOON_RADIUS_KM = 1737.4
export const MOON_DISTANCE_KM = 384_400
export const PARKING_ALTITUDE_KM = 200
const MU_EARTH = 398_600.4418
const MU_MOON = 4_902.8
const DAY_SECONDS = 86_400
const EARTH_SIDEREAL_RATE = (2 * Math.PI) / 86_164.0905

/** The ship gives up after this many days without reaching the Moon. */
export const MAX_FLIGHT_DAYS = 10
/**
 * The trip to the Moon is planned for 3 days: the ship has to reach the spot where the Moon
 * will be on day 3, at that moment. Meeting the Moon sooner or later does not count.
 */
export const TRIP_DAYS = 3
/** How far from day 3 the meeting can be and still count (a quarter of a day: 6 hours). */
export const TRIP_WINDOW_DAYS = 0.25
/**
 * The path goes straight out from Earth to the Moon: it may curve a little as Earth turns,
 * but never swing around Earth. More than this turn around Earth (degrees) is a loop.
 */
export const MAX_TURN_AROUND_EARTH_DEG = 75
/** The path is only followed a little past day 3, and a little past the Moon's distance. */
const TRIP_MAX_SECONDS = (TRIP_DAYS + TRIP_WINDOW_DAYS + 0.5) * 86_400
const PAST_MOON_FACTOR = 1.15
/** Start aim: straight out from the base (offset -90° from "along Earth's spin"), medium power. */
export const DEFAULT_AIM = Object.freeze({ offset: -Math.PI / 2, power: 0.6 })
/** Inside this distance from the Moon's center the lander can brake into orbit. */
export const CAPTURE_KM = 30_000
/** The side fuel tank pays for a midcourse correction, so a wider miss still works. */
export const CAPTURE_KM_WITH_FUEL = 42_000
/** Closest approach (above the surface) that counts as a perfect arrival. */
export const PERFECT_PERILUNE_ALTITUDE_KM = 3_000

/** Power 0..1 of the drag → apogee of the transfer orbit. About 0.41 reaches the Moon's distance. */
export const MIN_APOGEE_KM = 200_000
export const MAX_APOGEE_KM = 650_000

export const TRANSFER_OUTCOMES = Object.freeze({
  ARRIVED: 'moonArrived',
  MOON_IMPACT: 'moonImpact',
  EARTH_IMPACT: 'earthImpact',
  SHORT: 'moonShort',
  PAST: 'moonPast',
  // Met the Moon, but not on day 3 (see TRIP_DAYS)
  TOO_EARLY: 'moonTooEarly',
  TOO_LATE: 'moonTooLate',
  // Swung around Earth instead of going straight out to the Moon
  LOOP: 'moonLoop',
})

/** How far (degrees) a path turns around Earth's center from its first sample to its last. */
export function turnAroundEarthDeg(samples) {
  let total = 0
  let previous = Math.atan2(samples[0].y, samples[0].x)
  for (const sample of samples) {
    const angle = Math.atan2(sample.y, sample.x)
    let step = angle - previous
    if (step > Math.PI) step -= TAU
    if (step < -Math.PI) step += TAU
    total += step
    previous = angle
  }
  return Math.abs(total) / DEG
}

const TAU = Math.PI * 2
const DEG = Math.PI / 180

export function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU
}

function signedAngle(angle) {
  return normalizeAngle(angle + Math.PI) - Math.PI
}

// ------------------------------------------------------------------ Sun, Earth, Moon

/** Sun's ecliptic longitude (radians) for a date. Low-precision solar formula, about 0.01°. */
export function getSunLongitude(date) {
  const days = date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545
  const meanAnomaly = (357.529 + 0.98560028 * days) * DEG
  const meanLongitude = 280.459 + 0.98564736 * days
  return normalizeAngle((meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG)
}

/** Phase name from how much of the Moon is lit and whether the lit part grows. */
export function phaseName(illumination, waxing) {
  if (illumination < 0.03) return { name: 'New Moon', symbol: '🌑' }
  if (illumination > 0.97) return { name: 'Full Moon', symbol: '🌕' }
  if (Math.abs(illumination - 0.5) <= 0.04) {
    return waxing ? { name: 'First quarter', symbol: '🌓' } : { name: 'Last quarter', symbol: '🌗' }
  }
  if (illumination < 0.5) {
    return waxing ? { name: 'Waxing crescent', symbol: '🌒' } : { name: 'Waning crescent', symbol: '🌘' }
  }
  return waxing ? { name: 'Waxing gibbous', symbol: '🌔' } : { name: 'Waning gibbous', symbol: '🌖' }
}

/**
 * How the Moon looks from Earth on a date: elongation from the Sun (0 = new, π = full),
 * lit fraction, waxing or waning, and the phase name.
 */
export function getMoonLook(date) {
  const moon = getMoonPosition(date)
  const sunLongitude = getSunLongitude(date)
  const elongation = normalizeAngle(moon.longitude - sunLongitude)
  const illumination = (1 - Math.cos(elongation)) / 2
  const waxing = elongation < Math.PI
  const phase = phaseName(illumination, waxing)
  return {
    elongation,
    illumination,
    waxing,
    name: phase.name,
    symbol: phase.symbol,
    sunLongitude,
    moonLongitude: moon.longitude,
    distanceKm: moon.distanceKm,
  }
}

/** Angle (radians, in space) of a launch base on the turning Earth at a date. */
export function siteSpaceAngle(site, date) {
  return normalizeAngle(getGreenwichSiderealAngle(date) + site.longitudeDeg * DEG)
}

/** How far Earth has turned (radians) at a date: rotate the polar Earth map by this. */
export function earthTurnAngle(date) {
  return getGreenwichSiderealAngle(date)
}

/**
 * The Moon's place every half hour from `date`, so the flight can ask for it fast.
 * Positions are in km, Earth at (0, 0), x toward the vernal equinox, y 90° east of it.
 */
/** The table covers the trip out, the stay at the Moon and the trip home. */
const TABLE_DAYS = MAX_FLIGHT_DAYS + 9

export function createMoonTable(date, days = TABLE_DAYS, stepSeconds = 1800) {
  const count = Math.ceil((days * DAY_SECONDS) / stepSeconds) + 1
  const xs = new Float64Array(count)
  const ys = new Float64Array(count)
  for (let index = 0; index < count; index += 1) {
    const moon = getMoonPosition(new Date(date.getTime() + index * stepSeconds * 1000))
    xs[index] = moon.distanceKm * Math.cos(moon.longitude)
    ys[index] = moon.distanceKm * Math.sin(moon.longitude)
  }
  return { startMs: date.getTime(), stepSeconds, count, xs, ys }
}

/** The Moon's position (km) `seconds` after the table's date. */
export function moonAt(table, seconds) {
  const f = Math.min(table.count - 1.000001, Math.max(0, seconds / table.stepSeconds))
  const index = Math.floor(f)
  const frac = f - index
  return {
    x: table.xs[index] + (table.xs[index + 1] - table.xs[index]) * frac,
    y: table.ys[index] + (table.ys[index + 1] - table.ys[index]) * frac,
  }
}

// ------------------------------------------------------------------ screen squeeze

/** Earth's radius on the squeezed map, where the Moon's mean distance is 1. */
export const DISPLAY_EARTH_RADIUS = 0.14
/** Below 0.5 gives low orbits more room, so satellites near Earth can be seen apart. */
const DISPLAY_EXPONENT = 0.38

/**
 * Squeezed distance from Earth's center: low orbits get room, the Moon still sits at about 1.
 * The angle around Earth is never changed, only the distance.
 */
export function displayRadius(radiusKm) {
  if (radiusKm <= EARTH_RADIUS_KM) return (radiusKm / EARTH_RADIUS_KM) * DISPLAY_EARTH_RADIUS
  const above = (radiusKm - EARTH_RADIUS_KM) / (MOON_DISTANCE_KM - EARTH_RADIUS_KM)
  return DISPLAY_EARTH_RADIUS + (1 - DISPLAY_EARTH_RADIUS) * above ** DISPLAY_EXPONENT
}

/** Space position (km) → squeezed map position (Moon distance = 1, y up). */
export function toDisplay(x, y) {
  const radius = Math.hypot(x, y)
  if (radius === 0) return { x: 0, y: 0 }
  const scale = displayRadius(radius) / radius
  return { x: x * scale, y: y * scale }
}

// ------------------------------------------------------------------ satellites and debris

const PICKED_SATELLITES = {
  iss: {
    harm: 'Its crew had to hide in their capsule until you passed.',
    damage: 'A loose piece of its solar panel bent your radio dish.',
    effect: { breaks: 'antenna', dataLoss: 10 },
  },
  hubble: {
    harm: 'Hubble lost a solar panel and has to stop looking at the stars for a while.',
    damage: 'Your camera window cracked. The Moon pictures will be blurry.',
    effect: { scienceFactor: 0.85 },
  },
  'landsat-9': {
    harm: 'Landsat 9 cannot take pictures of farms and forests for a while.',
    damage: 'One of your solar panels cracked, so the tools get less power.',
    effect: { scienceFactor: 0.9 },
  },
  'noaa-20': {
    harm: 'Weather forecasts get worse until NOAA-20 is fixed.',
    damage: 'A radiator panel tore off. The ship runs hot and loses some data.',
    effect: { dataLoss: 10 },
  },
}

/** Modeled traffic the dotted line has to fly around. Angles at the epoch below. */
const TRAFFIC_EPOCH_SECONDS = Date.UTC(2000, 0, 1, 12) / 1000

export const MOON_TRAFFIC = [
  ...REAL_SATELLITES.filter((satellite) => PICKED_SATELLITES[satellite.id]).map((satellite) => ({
    id: satellite.id,
    kind: 'satellite',
    name: satellite.name,
    shortName: satellite.shortName,
    type: satellite.kind,
    altitudeKm: satellite.altitudeKm,
    startAngleDeg: satellite.startAngleDeg,
    summary: satellite.summary,
    ...PICKED_SATELLITES[satellite.id],
  })),
  {
    id: 'gps',
    kind: 'satellite',
    name: 'a GPS satellite',
    shortName: 'GPS',
    type: 'Navigation satellite',
    altitudeKm: 20_180,
    startAngleDeg: 140,
    summary: 'One of about 31 GPS satellites. Phones and planes use their signals to know where they are.',
    harm: 'Phones and planes lose a little accuracy until it is fixed.',
    damage: 'Your navigation lost its fix, so the ship drifts off its aim.',
    effect: { scoreLoss: 10 },
  },
  {
    id: 'goes-16',
    kind: 'satellite',
    name: 'the GOES-16 weather satellite',
    shortName: 'GOES-16',
    type: 'Weather satellite',
    altitudeKm: 35_786,
    // Geostationary: it stays over 75.2° W while Earth turns.
    longitudeDeg: -75.2,
    summary: 'It hovers over the Americas and photographs storms and hurricanes every few minutes.',
    harm: 'Storm pictures for the Americas stop for a day.',
    damage: 'Your solar panel lost a corner, so the tools get less power.',
    effect: { scienceFactor: 0.9 },
  },
  {
    id: 'fengyun-debris',
    kind: 'debris',
    name: 'the Fengyun-1C debris cloud',
    shortName: 'Fengyun-1C junk',
    type: 'Space junk',
    altitudeKm: 865,
    startAngleDeg: 40,
    spanDeg: 36,
    summary: 'In 2007 a missile test smashed the old Fengyun-1C weather satellite into more than 3,000 pieces.',
    harm: 'You knocked more pieces loose, so the cloud grows for everyone.',
    damage: 'Tiny pieces hit the computer. Some of the map data was lost.',
    effect: { dataLoss: 20 },
  },
  {
    id: 'iridium-cosmos-debris',
    kind: 'debris',
    name: 'the Iridium–Cosmos debris cloud',
    shortName: 'Iridium–Cosmos junk',
    type: 'Space junk',
    altitudeKm: 790,
    startAngleDeg: 205,
    spanDeg: 32,
    summary: 'In 2009 the Iridium 33 and Cosmos 2251 satellites crashed into each other over Siberia.',
    harm: 'You knocked more pieces loose, so the cloud grows for everyone.',
    damage: 'Tiny pieces hit the data drive. Some of the map data was lost.',
    effect: { dataLoss: 20 },
  },
  {
    id: 'cosmos-1408-debris',
    kind: 'debris',
    name: 'the Cosmos 1408 debris cloud',
    shortName: 'Cosmos 1408 junk',
    type: 'Space junk',
    altitudeKm: 480,
    startAngleDeg: 300,
    spanDeg: 28,
    summary: 'In 2021 a missile test broke the old Cosmos 1408 satellite. The ISS crew had to take cover.',
    harm: 'You knocked more pieces loose, so the cloud grows for everyone.',
    damage: 'Tiny pieces hit the computer. Some of the map data was lost.',
    effect: { dataLoss: 15 },
  },
  {
    id: 'briz-m-debris',
    kind: 'debris',
    name: 'the Briz-M rocket stage debris',
    shortName: 'Briz-M junk',
    type: 'Space junk',
    altitudeKm: 5_000,
    startAngleDeg: 120,
    spanDeg: 30,
    summary: 'In 2012 a Russian Briz-M rocket stage, still holding fuel, blew apart into hundreds of pieces.',
    harm: 'You knocked more pieces loose, so the cloud grows for everyone.',
    damage: 'A piece dented the fuel line. Some of the map data was lost while you fixed it.',
    effect: { dataLoss: 15 },
  },
  {
    id: 'transtage-debris',
    kind: 'debris',
    name: 'the Titan Transtage debris',
    shortName: 'Transtage junk',
    type: 'Space junk',
    altitudeKm: 20_000,
    startAngleDeg: 250,
    spanDeg: 26,
    summary: 'Old Titan Transtage rocket stages broke up far from Earth. Their pieces still drift in high orbits.',
    harm: 'You knocked more pieces loose, so the cloud grows for everyone.',
    damage: 'A piece scratched the star tracker. Some of the map data was lost.',
    effect: { dataLoss: 15 },
  },
  {
    id: 'intelsat-33e-debris',
    kind: 'debris',
    name: 'the Intelsat 33e debris cloud',
    shortName: 'Intelsat 33e junk',
    type: 'Space junk',
    altitudeKm: 35_786,
    startAngleDeg: 10,
    spanDeg: 22,
    summary: 'In 2024 the Intelsat 33e satellite broke into about 500 pieces in the high ring where TV satellites live.',
    harm: 'You knocked more pieces loose, near satellites that bring TV and internet to millions.',
    damage: 'A piece cracked the solar panel. The tools get less power.',
    effect: { scienceFactor: 0.9 },
  },
]

function circularRate(altitudeKm) {
  const radius = EARTH_RADIUS_KM + altitudeKm
  return Math.sqrt(MU_EARTH / radius ** 3)
}

/** Angle (radians) of a traffic object around Earth, `seconds` after the launch date. */
/**
 * The flight plays days in a few seconds, so at real speed the ISS would circle Earth about seven
 * times a second on screen. Satellites and junk clouds move on this slower clock instead: about one
 * ISS lap every 1.7 seconds, quick enough to feel like traffic. Hits use the same angles, so what
 * the player sees is still what counts.
 */
export const TRAFFIC_TIME_SCALE = 1 / 12

export function trafficAngle(object, launchDate, seconds) {
  const shown = seconds * TRAFFIC_TIME_SCALE
  if (object.longitudeDeg != null) {
    return normalizeAngle(getGreenwichSiderealAngle(launchDate) + EARTH_SIDEREAL_RATE * shown + object.longitudeDeg * DEG)
  }
  const sinceEpoch = launchDate.getTime() / 1000 - TRAFFIC_EPOCH_SECONDS + shown
  return normalizeAngle(object.startAngleDeg * DEG + circularRate(object.altitudeKm) * sinceEpoch)
}

/** Position (km) of a traffic object `seconds` after the launch date. */
export function trafficPosition(object, launchDate, seconds) {
  const radius = EARTH_RADIUS_KM + object.altitudeKm
  const angle = trafficAngle(object, launchDate, seconds)
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), angle }
}

/** How close (squeezed map units) the ship can pass a satellite before hitting it. */
export const SATELLITE_HIT_RADIUS = 0.032
/** Half thickness (squeezed map units) of a debris cloud's band. */
export const DEBRIS_BAND_HALF = 0.016

/**
 * Satellites and debris clouds the path runs into, in the order the ship meets them.
 * Checked on the squeezed map, so what the player sees is what counts.
 */
export function findTrafficHits(samples, launchDate, traffic = MOON_TRAFFIC) {
  const hits = []
  const hitIds = new Set()
  const farthestTraffic = EARTH_RADIUS_KM + 40_000
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]
    const radius = Math.hypot(sample.x, sample.y)
    if (radius > farthestTraffic) continue
    const ship = toDisplay(sample.x, sample.y)
    const shipRadius = displayRadius(radius)
    const shipAngle = Math.atan2(sample.y, sample.x)
    for (const object of traffic) {
      if (hitIds.has(object.id)) continue
      if (object.kind === 'debris') {
        const band = displayRadius(EARTH_RADIUS_KM + object.altitudeKm)
        if (Math.abs(shipRadius - band) > DEBRIS_BAND_HALF) continue
        const center = trafficAngle(object, launchDate, sample.t)
        if (Math.abs(signedAngle(shipAngle - center)) > (object.spanDeg * DEG) / 2) continue
      } else {
        const position = trafficPosition(object, launchDate, sample.t)
        const spot = toDisplay(position.x, position.y)
        if (Math.hypot(spot.x - ship.x, spot.y - ship.y) > SATELLITE_HIT_RADIUS) continue
      }
      hitIds.add(object.id)
      hits.push({ object, index, t: sample.t, x: sample.x, y: sample.y })
    }
  }
  return hits
}

// ------------------------------------------------------------------ the flight

/** Speed (km/s) on the parking orbit radius that reaches a given apogee. */
export function speedForApogee(apogeeKm, startRadiusKm = EARTH_RADIUS_KM + PARKING_ALTITUDE_KM) {
  return Math.sqrt((MU_EARTH * 2 * apogeeKm) / (startRadiusKm * (startRadiusKm + apogeeKm)))
}

export function apogeeForPower(power) {
  return MIN_APOGEE_KM + Math.min(1, Math.max(0, power)) * (MAX_APOGEE_KM - MIN_APOGEE_KM)
}

/** Power that reaches the Moon's mean distance on a straight Hohmann path. */
export const HOHMANN_POWER = (MOON_DISTANCE_KM - MIN_APOGEE_KM) / (MAX_APOGEE_KM - MIN_APOGEE_KM)

function acceleration(x, y, moon) {
  const r2 = x * x + y * y
  const r = Math.sqrt(r2)
  const earthPull = -MU_EARTH / (r2 * r)
  const dx = x - moon.x
  const dy = y - moon.y
  const d2 = dx * dx + dy * dy
  const d = Math.sqrt(d2)
  const moonPull = -MU_MOON / (d2 * d)
  const m2 = moon.x * moon.x + moon.y * moon.y
  const m = Math.sqrt(m2)
  // Earth itself is pulled by the Moon; in Earth's frame that shows up as this extra term.
  const indirect = -MU_MOON / (m2 * m)
  return {
    ax: earthPull * x + moonPull * dx + indirect * moon.x,
    ay: earthPull * y + moonPull * dy + indirect * moon.y,
  }
}

/**
 * Fly one aimed launch.
 *   siteAngle   where the base is in space (siteSpaceAngle)
 *   aim         { offset, power }: offset = burn direction turned from "straight ahead along
 *               Earth's spin" (radians, counter-clockwise = away from Earth), power 0..1
 *   moonTable   createMoonTable(launch date)
 *   captureKm   how close to the Moon counts as arriving
 * Returns the samples { t, x, y } (seconds, km), the outcome and the closest pass of the Moon.
 */
export function simulateTransfer({ siteAngle, aim, moonTable, captureKm = CAPTURE_KM }) {
  const startRadius = EARTH_RADIUS_KM + PARKING_ALTITUDE_KM
  const speed = speedForApogee(apogeeForPower(aim.power), startRadius)
  const heading = siteAngle + Math.PI / 2 + aim.offset
  let x = startRadius * Math.cos(siteAngle)
  let y = startRadius * Math.sin(siteAngle)
  let vx = speed * Math.cos(heading)
  let vy = speed * Math.sin(heading)
  let t = 0
  const samples = [{ t, x, y }]
  const maxT = Math.min(MAX_FLIGHT_DAYS * DAY_SECONDS, TRIP_MAX_SECONDS)
  let closest = { distanceKm: Infinity, t: 0, index: 0, relativeSpeed: 0 }
  let maxRadius = startRadius
  let outcome = null
  let insideCapture = false
  let previousAngle = Math.atan2(y, x)
  let turned = 0

  while (t < maxT && samples.length < 6000) {
    const moon = moonAt(moonTable, t)
    const radius = Math.hypot(x, y)
    const moonDistance = Math.hypot(x - moon.x, y - moon.y)
    const shipSpeed = Math.hypot(vx, vy)
    const dt = Math.min(900, Math.max(2, (0.012 * Math.min(radius, moonDistance)) / Math.max(shipSpeed, 0.05)))

    // RK4 step, with the Moon moving inside the step.
    const moonMid = moonAt(moonTable, t + dt / 2)
    const moonEnd = moonAt(moonTable, t + dt)
    const a1 = acceleration(x, y, moon)
    const x2 = x + (vx * dt) / 2
    const y2 = y + (vy * dt) / 2
    const vx2 = vx + (a1.ax * dt) / 2
    const vy2 = vy + (a1.ay * dt) / 2
    const a2 = acceleration(x2, y2, moonMid)
    const x3 = x + (vx2 * dt) / 2
    const y3 = y + (vy2 * dt) / 2
    const vx3 = vx + (a2.ax * dt) / 2
    const vy3 = vy + (a2.ay * dt) / 2
    const a3 = acceleration(x3, y3, moonMid)
    const x4 = x + vx3 * dt
    const y4 = y + vy3 * dt
    const vx4 = vx + a3.ax * dt
    const vy4 = vy + a3.ay * dt
    const a4 = acceleration(x4, y4, moonEnd)
    x += (dt / 6) * (vx + 2 * vx2 + 2 * vx3 + vx4)
    y += (dt / 6) * (vy + 2 * vy2 + 2 * vy3 + vy4)
    vx += (dt / 6) * (a1.ax + 2 * a2.ax + 2 * a3.ax + a4.ax)
    vy += (dt / 6) * (a1.ay + 2 * a2.ay + 2 * a3.ay + a4.ay)
    t += dt
    samples.push({ t, x, y })

    const newRadius = Math.hypot(x, y)
    maxRadius = Math.max(maxRadius, newRadius)
    // Swinging around Earth instead of heading out: stop the path there.
    const angleNow = Math.atan2(y, x)
    let turnStep = angleNow - previousAngle
    if (turnStep > Math.PI) turnStep -= TAU
    if (turnStep < -Math.PI) turnStep += TAU
    turned += turnStep
    previousAngle = angleNow
    if (Math.abs(turned) > MAX_TURN_AROUND_EARTH_DEG * DEG) {
      outcome = { type: TRANSFER_OUTCOMES.LOOP, t, index: samples.length - 1 }
      break
    }
    if (newRadius < EARTH_RADIUS_KM) {
      outcome = { type: TRANSFER_OUTCOMES.EARTH_IMPACT, t, index: samples.length - 1 }
      break
    }
    const moonNow = moonEnd
    const distance = Math.hypot(x - moonNow.x, y - moonNow.y)
    if (distance < closest.distanceKm) {
      const later = moonAt(moonTable, t + 60)
      closest = {
        distanceKm: distance,
        t,
        index: samples.length - 1,
        relativeSpeed: Math.hypot(vx - (later.x - moonNow.x) / 60, vy - (later.y - moonNow.y) / 60),
      }
    }
    if (distance < MOON_RADIUS_KM) {
      outcome = { type: TRANSFER_OUTCOMES.MOON_IMPACT, t, index: samples.length - 1 }
      break
    }
    if (distance < captureKm) insideCapture = true
    // Past the closest point inside the capture zone: that is where the lander brakes.
    if (insideCapture && distance > closest.distanceKm + 1) {
      // It only counts on day 3: the planned meeting with the Moon.
      const arrivalDays = closest.t / DAY_SECONDS
      const onTime = Math.abs(arrivalDays - TRIP_DAYS) <= TRIP_WINDOW_DAYS
      outcome = {
        type: onTime
          ? TRANSFER_OUTCOMES.ARRIVED
          : arrivalDays < TRIP_DAYS ? TRANSFER_OUTCOMES.TOO_EARLY : TRANSFER_OUTCOMES.TOO_LATE,
        t: closest.t,
        index: closest.index,
        periluneAltitudeKm: closest.distanceKm - MOON_RADIUS_KM,
        arrivalDays,
      }
      samples.length = closest.index + 1
      break
    }
    // A little past the Moon's distance: the path does not go on behind it.
    if (newRadius > MOON_DISTANCE_KM * PAST_MOON_FACTOR) break
  }

  if (!outcome) {
    const reachedMoonDistance = maxRadius >= MOON_DISTANCE_KM * 0.92
    outcome = {
      type: reachedMoonDistance ? TRANSFER_OUTCOMES.PAST : TRANSFER_OUTCOMES.SHORT,
      t,
      index: samples.length - 1,
    }
  }

  return { samples, outcome, closest, speed, maxRadiusKm: maxRadius }
}

/** Score 0..1 for how well the ship arrived: a low pass over the Moon is best. */
export function arrivalAccuracy(outcome, captureKm = CAPTURE_KM) {
  if (outcome.type !== TRANSFER_OUTCOMES.ARRIVED) return 0
  const altitude = outcome.periluneAltitudeKm
  if (altitude <= PERFECT_PERILUNE_ALTITUDE_KM) return 1
  const worst = captureKm - MOON_RADIUS_KM
  return Math.max(0.65, 1 - (0.35 * (altitude - PERFECT_PERILUNE_ALTITUDE_KM)) / (worst - PERFECT_PERILUNE_ALTITUDE_KM))
}

/** Sample index at a given flight time (seconds). */
export function sampleIndexAt(samples, seconds) {
  let low = 0
  let high = samples.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (samples[mid].t <= seconds) low = mid
    else high = mid - 1
  }
  return low
}

/**
 * "Help me" button: the best aim from this base at this time, or null when no aim reaches the Moon.
 * Prefers paths that hit nothing, then the closest pass over the Moon.
 */
export function findGoodAim({ siteAngle, moonTable, captureKm = CAPTURE_KM, launchDate }) {
  let best = null
  for (let offsetDeg = -150; offsetDeg <= -30; offsetDeg += 5) {
    for (let power = 0.3; power <= 1; power += 0.02) {
      const aim = { offset: offsetDeg * DEG, power }
      const result = simulateTransfer({ siteAngle, aim, moonTable, captureKm })
      if (result.outcome.type !== TRANSFER_OUTCOMES.ARRIVED) continue
      const hits = findTrafficHits(result.samples, launchDate).length
      const altitude = result.outcome.periluneAltitudeKm
      const rank = hits * 1e6 + altitude
      if (!best || rank < best.rank) best = { aim, rank, hits }
    }
  }
  return best ? { aim: best.aim, hits: best.hits } : null
}

// ------------------------------------------------------------------ light for the maps

/** How long the trip takes (TRIP_DAYS): used to show the Moon on arrival day. */
export const TYPICAL_TRIP_SECONDS = TRIP_DAYS * DAY_SECONDS

/**
 * The cameras map the side of the Moon that faces Earth, and they need sunlight.
 * Full Moon: that side is all lit (best maps). New Moon: it is dark (poor maps).
 * Returns a score factor from 0.6 (dark) to 1 (all lit).
 */
export function mapLightFactor(illumination) {
  return 0.6 + 0.4 * Math.min(1, Math.max(0, illumination))
}

/** A simple rating of the light at arrival, for the panel and the day strip. */
export function lightRating(illumination) {
  if (illumination >= 0.75) return { level: 3, label: 'Great light', tone: 'good' }
  if (illumination >= 0.4) return { level: 2, label: 'Some light', tone: 'warn' }
  return { level: 1, label: 'Too dark', tone: 'bad' }
}

// ------------------------------------------------------------------ the trip home

/** Height of the lunar orbit the crew maps from (Apollo flew about 110 km up). */
export const LUNAR_ORBIT_ALTITUDE_KM = 110
/** Time spent at the Moon: landing, mapping, and getting ready to leave. */
export const STAY_SECONDS = DAY_SECONDS
/** The air starts at about 120 km. Apollo aimed for a lowest point about 40 km up. */
const ENTRY_ALTITUDE_KM = 120
const TARGET_PERIGEE_ALTITUDE_KM = 40
const MAX_RETURN_SECONDS = 6 * DAY_SECONDS

/** One RK4 step under Earth and Moon gravity, the Moon moving inside the step. */
function stepShip(state, dt, moonTable) {
  const { t, x, y, vx, vy } = state
  const moon = moonAt(moonTable, t)
  const moonMid = moonAt(moonTable, t + dt / 2)
  const moonEnd = moonAt(moonTable, t + dt)
  const a1 = acceleration(x, y, moon)
  const a2 = acceleration(x + (vx * dt) / 2, y + (vy * dt) / 2, moonMid)
  const vx2 = vx + (a1.ax * dt) / 2
  const vy2 = vy + (a1.ay * dt) / 2
  const a3 = acceleration(x + (vx2 * dt) / 2, y + (vy2 * dt) / 2, moonMid)
  const vx3 = vx + (a2.ax * dt) / 2
  const vy3 = vy + (a2.ay * dt) / 2
  const a4 = acceleration(x + vx3 * dt, y + vy3 * dt, moonEnd)
  const vx4 = vx + a3.ax * dt
  const vy4 = vy + a3.ay * dt
  return {
    t: t + dt,
    x: x + (dt / 6) * (vx + 2 * vx2 + 2 * vx3 + vx4),
    y: y + (dt / 6) * (vy + 2 * vy2 + 2 * vy3 + vy4),
    vx: vx + (dt / 6) * (a1.ax + 2 * a2.ax + 2 * a3.ax + a4.ax),
    vy: vy + (dt / 6) * (a1.ay + 2 * a2.ay + 2 * a3.ay + a4.ay),
  }
}

/** Which way the ship goes around the Moon when it arrives: +1 counter-clockwise, -1 clockwise. */
export function arrivalSense(samples, moonTable) {
  const last = samples[samples.length - 1]
  const before = samples[Math.max(0, samples.length - 3)]
  const moon = moonAt(moonTable, last.t)
  const moonBefore = moonAt(moonTable, before.t)
  const rx = last.x - moon.x
  const ry = last.y - moon.y
  const dvx = last.x - before.x - (moon.x - moonBefore.x)
  const dvy = last.y - before.y - (moon.y - moonBefore.y)
  return rx * dvy - ry * dvx >= 0 ? 1 : -1
}

/**
 * Leave lunar orbit with one engine burn (trans-Earth injection) and fall home under the
 * pull of Earth and the moving Moon. `angle` is where on the lunar orbit the burn happens,
 * `burn` the extra speed (km/s). Returns where the ship's lowest point over Earth ends up.
 */
function flyHome(moonTable, departT, angle, burn, sense, record) {
  const moon = moonAt(moonTable, departT)
  const later = moonAt(moonTable, departT + 60)
  const orbitRadius = MOON_RADIUS_KM + LUNAR_ORBIT_ALTITUDE_KM
  const speed = Math.sqrt(MU_MOON / orbitRadius) + burn
  let state = {
    t: departT,
    x: moon.x + orbitRadius * Math.cos(angle),
    y: moon.y + orbitRadius * Math.sin(angle),
    vx: (later.x - moon.x) / 60 - sense * Math.sin(angle) * speed,
    vy: (later.y - moon.y) / 60 + sense * Math.cos(angle) * speed,
  }
  const samples = record ? [{ t: state.t, x: state.x, y: state.y }] : null
  let lowest = Infinity
  let entered = false
  while (state.t < departT + MAX_RETURN_SECONDS) {
    const moonNow = moonAt(moonTable, state.t)
    const radius = Math.hypot(state.x, state.y)
    const moonDistance = Math.hypot(state.x - moonNow.x, state.y - moonNow.y)
    const dt = Math.min(900, Math.max(2, (0.012 * Math.min(radius, moonDistance)) / Math.max(Math.hypot(state.vx, state.vy), 0.05)))
    state = stepShip(state, dt, moonTable)
    const newRadius = Math.hypot(state.x, state.y)
    if (Math.hypot(state.x - moonAt(moonTable, state.t).x, state.y - moonAt(moonTable, state.t).y) < MOON_RADIUS_KM) {
      return { crashed: true, perigeeAltitudeKm: Infinity, samples }
    }
    if (newRadius > MOON_DISTANCE_KM * 2.2) break
    if (!entered && samples) samples.push({ t: state.t, x: state.x, y: state.y })
    if (newRadius < EARTH_RADIUS_KM + ENTRY_ALTITUDE_KM) entered = true
    if (newRadius < lowest) lowest = newRadius
    const radialSpeed = (state.x * state.vx + state.y * state.vy) / newRadius
    // Far from the Moon and falling: Earth alone steers the ship, so its lowest point comes
    // straight from the orbit's shape (it can even be "below ground" for a too-steep path).
    if (!samples && radialSpeed < 0 && newRadius < 120_000) {
      const h = state.x * state.vy - state.y * state.vx
      const energy = (state.vx ** 2 + state.vy ** 2) / 2 - MU_EARTH / newRadius
      const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / MU_EARTH ** 2))
      return { crashed: false, entered: false, perigeeAltitudeKm: (h * h) / MU_EARTH / (1 + e) - EARTH_RADIUS_KM, samples, departT }
    }
    if (entered || newRadius < EARTH_RADIUS_KM || (radialSpeed > 0 && newRadius < MOON_DISTANCE_KM * 0.5)) break
  }
  return { crashed: false, entered, perigeeAltitudeKm: lowest - EARTH_RADIUS_KM, samples, departT }
}

/** How far (radians) the ship turns around the Moon from `fromAngle` to `toAngle`, going `sense` way. */
function turnBetween(fromAngle, toAngle, sense) {
  return normalizeAngle(sense * (toAngle - fromAngle))
}

/** The ship leaves from the side opposite to where it arrived, give or take this much. */
const OPPOSITE_SIDE_SLACK = 30 * DEG

/**
 * The trip home from lunar orbit, found like mission control does: try burns at many points
 * of the orbit and keep the smallest one whose path dips into the air at the right height.
 * The ship keeps going round the Moon the way it arrived (`sense`). When `arrival` (the last
 * sample of the trip out) is given it leaves after half a turn, from the side opposite to the one
 * it came in on, even if that needs a bigger burn than the cheapest point of the orbit.
 * Returns { samples (t from launch, km), burn (km/s), perigeeAltitudeKm, entered } or null.
 */
export function simulateReturn({ moonTable, arrivalT, sense = 1, stay = STAY_SECONDS, arrival = null }) {
  const departT = arrivalT + stay
  const moonAtArrival = moonAt(moonTable, arrivalT)
  const arrivalAngle = arrival ? Math.atan2(arrival.y - moonAtArrival.y, arrival.x - moonAtArrival.x) : null
  const miss = (angleDeg, burn, way) => {
    const result = flyHome(moonTable, departT, angleDeg * DEG, burn, way, false)
    return result.crashed || !Number.isFinite(result.perigeeAltitudeKm) ? null : result.perigeeAltitudeKm - TARGET_PERIGEE_ALTITUDE_KM
  }
  /** For one burn point: the lowest point over Earth changes smoothly with the burn size, so find
   *  where it crosses the target height, then home in on it (bisection). */
  const solveAt = (angleDeg, way, maxBurn) => {
    let previous = null
    for (let burn = 0.6; burn <= 1.6001; burn += 0.1) {
      if (burn - 0.1 > maxBurn) return null
      const value = miss(angleDeg, burn, way)
      if (previous && value !== null && Math.sign(value) !== Math.sign(previous.value)) {
        let low = previous.burn
        let high = burn
        let lowValue = previous.value
        for (let step = 0; step < 14; step += 1) {
          const mid = (low + high) / 2
          const midValue = miss(angleDeg, mid, way)
          if (midValue === null) break
          if (Math.sign(midValue) === Math.sign(lowValue)) {
            low = mid
            lowValue = midValue
          } else {
            high = mid
          }
        }
        const found = (low + high) / 2
        const error = Math.abs(miss(angleDeg, found, way) ?? Infinity)
        return error < 5 ? { angleDeg, burn: found, way } : null
      }
      previous = value === null ? null : { burn, value }
    }
    return null
  }
  // Half a turn after arriving: the burn home happens on the far side, so the way home leaves
  // from the side opposite to the one the ship came in on.
  const isOppositeSide = (angleDeg, way) => {
    if (arrivalAngle === null) return false
    return Math.abs(turnBetween(arrivalAngle, angleDeg * DEG, way) - Math.PI) <= OPPOSITE_SIDE_SLACK
  }

  let best = null
  for (const way of [sense, -sense]) {
    let cheapest = null
    let cheapestOpposite = null
    for (let angleDeg = 0; angleDeg < 360; angleDeg += 6) {
      const opposite = isOppositeSide(angleDeg, way)
      // A bigger burn than one already found cannot be better: skip the search past it.
      const limit = opposite ? (cheapestOpposite?.burn ?? Infinity) : (cheapest?.burn ?? Infinity)
      const option = solveAt(angleDeg, way, limit)
      if (!option) continue
      if (opposite && (!cheapestOpposite || option.burn < cheapestOpposite.burn)) cheapestOpposite = option
      if (!cheapest || option.burn < cheapest.burn) cheapest = option
    }
    best = cheapestOpposite ?? cheapest
    if (best) break
  }
  if (!best) return null
  const flown = flyHome(moonTable, departT, best.angleDeg * DEG, best.burn, best.way, true)
  return {
    samples: flown.samples,
    burn: best.burn,
    sense: best.way,
    departT,
    perigeeAltitudeKm: TARGET_PERIGEE_ALTITUDE_KM + (miss(best.angleDeg, best.burn, best.way) ?? 0),
    entered: flown.entered,
  }
}

// ------------------------------------------------------------------ calendar words

/** Constellations along the Moon's path, by ecliptic longitude (degrees, approximate). */
const ECLIPTIC_CONSTELLATIONS = [
  [29, 'Aries'], [53, 'Taurus'], [90, 'Gemini'], [118, 'Cancer'], [138, 'Leo'], [174, 'Virgo'],
  [218, 'Libra'], [241, 'Scorpius'], [248, 'Ophiuchus'], [266, 'Sagittarius'], [300, 'Capricornus'],
  [328, 'Aquarius'], [352, 'Pisces'], [360, 'Aries'],
]

/** The constellation behind the Moon, seen from Earth (the stars it sits in front of). */
export function constellationAt(longitudeRad) {
  const degrees = (normalizeAngle(longitudeRad) / DEG + 360) % 360
  let name = 'Pisces'
  for (const [start, next] of ECLIPTIC_CONSTELLATIONS) {
    if (degrees < start) return name
    name = next
  }
  return name
}
