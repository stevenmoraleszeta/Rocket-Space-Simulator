/**
 * EARTH → MARS ROUTE for mission 3 (no React, no pixels). Same idea as launchSimulation.js:
 * the SAME function draws the dotted line while the player aims and plays the real flight.
 *
 * The real trip: a Hohmann transfer orbit. The rocket leaves Earth's orbit (1 AU) going the same
 * way the Earth moves and coasts around the Sun on half an ellipse to Mars's orbit (1.524 AU),
 * about 259 days. Mars moves about 0.524° a day, so Mars has to be ~44° ahead of Earth at launch
 * to be there when the rocket arrives. Units: AU and days, angles counterclockwise from the right.
 *
 * Game rules on top of the real orbit:
 *   - On this launch day the best direction from Earth is TARGET_ANGLE_DEG (135.55°): Earth sits
 *     at 45.55° around the Sun and the rocket leaves along Earth's own path.
 *   - Any direction from ANGLE_WINDOW.min to ANGLE_WINDOW.max (134°–138°) still meets Mars. Outside
 *     it, the map EXAGGERATES the mistake: the path bends away little by little (it always leaves
 *     from Earth) until, at Mars's orbit, it is turned far enough that Mars is not there
 *     (in the real sky a few degrees barely move the arrival point).
 *   - Power (how far the player drags) sets how far out the ellipse reaches, and with Kepler's law
 *     how long the trip takes. Too little never reaches Mars's orbit; too much arrives early.
 *   - Space debris and satellites drift on their own orbits across the road. The rocket never
 *     crashes into them: passing too close (a bad aim) only grazes one, which warns the player
 *     and costs GRAZE_PENALTY points.
 */

export const MU_SUN = 2.959122e-4 // Sun's gravity, AU^3/day^2
export const EARTH_ORBIT_AU = 1
export const MARS_ORBIT_AU = 1.524
export const AU_KM = 149_597_871

/** The one direction (degrees, counterclockwise from the right) that meets Mars. */
export const TARGET_ANGLE_DEG = 135.55
/** Earth's place around the Sun on launch day: leaving along its path means 90° more. */
export const EARTH_START_DEG = TARGET_ANGLE_DEG - 90
/** Arriving within this angle of Mars (seen from the Sun) counts as meeting it. */
export const MARS_CAPTURE_DEG = 2.2
/** Directions (degrees) that still meet Mars with the right power: the allowed margin of error. */
export const ANGLE_WINDOW = Object.freeze({ min: 134, max: 138 })
/** The path never turns more than this (a wild aim is lost either way). */
const MAX_TURN_DEG = 180

/**
 * How much the drawn path turns around the Sun for an aiming mistake. The edges of ANGLE_WINDOW
 * turn it exactly MARS_CAPTURE_DEG (the last arrival that still meets Mars); farther out it keeps
 * turning at the same rate, so Mars has moved away.
 */
export function pathTurnDeg(angleErrorDeg) {
  const side = angleErrorDeg < 0 ? TARGET_ANGLE_DEG - ANGLE_WINDOW.min : ANGLE_WINDOW.max - TARGET_ANGLE_DEG
  const turn = (angleErrorDeg / side) * MARS_CAPTURE_DEG
  return Math.max(-MAX_TURN_DEG, Math.min(MAX_TURN_DEG, turn))
}

/** Power (fraction of the full drag) that gives the textbook trip. Shown as a percentage. */
export const IDEAL_POWER = 0.75
/** How much the far end of the ellipse moves per unit of power (AU per AU of Mars's orbit). */
const POWER_TO_REACH = 0.6
/** At the ideal power the ellipse reaches a little past Mars's orbit, so it crosses it. */
const IDEAL_REACH = 1.02

const degToRad = (deg) => (deg * Math.PI) / 180
export const radToDeg = (rad) => (rad * 180) / Math.PI
const wrapDeg = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180

/** Angular speed (degrees a day) of a circular orbit of this radius. */
export function degreesPerDay(radiusAu) {
  return radToDeg(Math.sqrt(MU_SUN / radiusAu ** 3))
}

export const EARTH_DEG_PER_DAY = degreesPerDay(EARTH_ORBIT_AU)
export const MARS_DEG_PER_DAY = degreesPerDay(MARS_ORBIT_AU)

/** Position on a circular orbit around the Sun. */
export function circlePosition(radiusAu, startDeg, day) {
  const angle = degToRad(startDeg + degreesPerDay(radiusAu) * day)
  return { x: radiusAu * Math.cos(angle), y: radiusAu * Math.sin(angle) }
}

/** Transfer ellipse for a power: perihelion at Earth's orbit, aphelion farther out. */
function transferEllipse(power) {
  const aphelion = MARS_ORBIT_AU * (IDEAL_REACH + (power - IDEAL_POWER) * POWER_TO_REACH)
  const perihelion = EARTH_ORBIT_AU
  const semiMajor = (aphelion + perihelion) / 2
  const eccentricity = Math.max(0, (aphelion - perihelion) / (aphelion + perihelion))
  const meanMotion = Math.sqrt(MU_SUN / semiMajor ** 3) // radians a day
  return { aphelion, semiMajor, eccentricity, meanMotion }
}

/** Point on the ellipse `day` days after leaving perihelion (Kepler's equation). */
function ellipsePoint(ellipse, perihelionDeg, day) {
  const { semiMajor: a, eccentricity: e, meanMotion: n } = ellipse
  const mean = n * day
  let eccentric = mean
  for (let i = 0; i < 12; i += 1) eccentric -= (eccentric - e * Math.sin(eccentric) - mean) / (1 - e * Math.cos(eccentric))
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eccentric / 2), Math.sqrt(1 - e) * Math.cos(eccentric / 2))
  const radius = a * (1 - e * Math.cos(eccentric))
  const angle = degToRad(perihelionDeg) + trueAnomaly
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), radius }
}

/** Days from perihelion until the ellipse reaches `radius` (null if it never does). */
function daysToRadius(ellipse, radius) {
  const { semiMajor: a, eccentricity: e, meanMotion: n } = ellipse
  if (e <= 0 || a * (1 + e) < radius) return null
  const cosTrue = (a * (1 - e * e) / radius - 1) / e
  const trueAnomaly = Math.acos(Math.min(1, Math.max(-1, cosTrue)))
  const eccentric = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(trueAnomaly / 2))
  return (eccentric - e * Math.sin(eccentric)) / n
}

/** Mars's start so that the textbook aim (exact angle, ideal power) meets it on arrival. */
const IDEAL_ARRIVAL = (() => {
  const ellipse = transferEllipse(IDEAL_POWER)
  const day = daysToRadius(ellipse, MARS_ORBIT_AU)
  const point = ellipsePoint(ellipse, EARTH_START_DEG, day)
  return { day, angleDeg: radToDeg(Math.atan2(point.y, point.x)) }
})()
export const IDEAL_TRIP_DAYS = IDEAL_ARRIVAL.day
export const MARS_START_DEG = IDEAL_ARRIVAL.angleDeg - MARS_DEG_PER_DAY * IDEAL_ARRIVAL.day

export function earthPosition(day) {
  return circlePosition(EARTH_ORBIT_AU, EARTH_START_DEG, day)
}

export function marsPosition(day) {
  return circlePosition(MARS_ORBIT_AU, MARS_START_DEG, day)
}

/**
 * Hazards on the Earth–Mars road. All are real objects that orbit the Sun (not Earth); here they
 * are placed on this practice road, not on their real positions for one launch day.
 * kind 'debris' = an old rocket stage, kind 'satellite' = a spacecraft or a test payload.
 * dangerAu: passing closer than this is a crash (much bigger than the real thing, so it shows).
 * On launch day they are spread around the Sun (at least 40° apart, none on Earth or Mars), and
 * every aim inside the 134°–138° window (with the right power) passes each one outside its danger
 * zone. Other aims and powers can graze one.
 */
export const MARS_HAZARDS = [
  {
    id: 'soho', kind: 'satellite', name: 'SOHO', radiusAu: 1.101, startDeg: 60, dangerAu: 0.035,
    summary: 'A NASA and ESA telescope that watches the Sun all day, every day.',
  },
  {
    id: 'j002e3', kind: 'debris', name: 'Apollo 12 rocket stage', radiusAu: 1.198, startDeg: 20, dangerAu: 0.035,
    summary: 'The top stage of the Saturn V that took Apollo 12 to the Moon in 1969. It still circles the Sun.',
  },
  {
    id: 'jwst', kind: 'satellite', name: 'James Webb telescope', radiusAu: 1.282, startDeg: 100, dangerAu: 0.035,
    summary: 'The biggest space telescope. It looks at the first stars and galaxies with infrared light.',
  },
  {
    id: 'surveyor-centaur', kind: 'debris', name: 'Surveyor 2 rocket stage', radiusAu: 1.36, startDeg: 340, dangerAu: 0.035,
    summary: 'The Centaur stage that launched Surveyor 2 in 1966. It was found again in 2020.',
  },
  {
    id: 'roadster', kind: 'satellite', name: "Starman's Tesla Roadster", radiusAu: 1.428, startDeg: 140, dangerAu: 0.035,
    summary: 'A red sports car with a dummy driver, launched as a test payload in 2018. Its orbit crosses Mars’s.',
  },
  {
    id: 'dscovr-stage', kind: 'debris', name: 'Falcon 9 rocket stage', radiusAu: 1.483, startDeg: 300, dangerAu: 0.035,
    summary: 'The upper stage that launched the DSCOVR weather satellite in 2015, now drifting around the Sun.',
  },
]

export function hazardPosition(hazard, day) {
  return circlePosition(hazard.radiusAu, hazard.startDeg, day)
}

/** Points lost each time the rocket grazes a satellite or a piece of debris. */
export const GRAZE_PENALTY = 15

export const MARS_OUTCOMES = Object.freeze({
  REACHED: 'marsReached',
  MISSED: 'marsMissed',
  SHORT: 'marsShort',
  HAZARD: 'marsHazard',
})

/** Outcomes where the rocket blows up. */
export const MARS_EXPLODING = [MARS_OUTCOMES.HAZARD]

const SAMPLE_EVERY_DAYS = 2

/**
 * The whole trip for one aim.
 * @param {number} aimDeg  direction from Earth, degrees counterclockwise from the right
 * @param {number} power   fraction of the full drag (IDEAL_POWER is the textbook trip)
 * @returns {{ outcome, samples, angleErrorDeg }}
 */
export function simulateMarsTrip(aimDeg, power) {
  const angleErrorDeg = wrapDeg(aimDeg - TARGET_ANGLE_DEG)
  const turnDeg = pathTurnDeg(angleErrorDeg)
  const ellipse = transferEllipse(power)
  const crossDay = daysToRadius(ellipse, MARS_ORBIT_AU)
  // Too little power: it turns back at the far end of its ellipse, short of Mars's orbit.
  const endDay = crossDay ?? Math.PI / ellipse.meanMotion
  // The path leaves from Earth and bends by the aiming mistake bit by bit, all of it at the end.
  const pointAt = (day) => {
    const raw = ellipsePoint(ellipse, EARTH_START_DEG, day)
    const bend = degToRad(turnDeg * Math.min(1, day / endDay))
    const cos = Math.cos(bend)
    const sin = Math.sin(bend)
    return { x: raw.x * cos - raw.y * sin, y: raw.x * sin + raw.y * cos }
  }

  const samples = []
  // Close passes: each hazard is grazed at most once, at its closest moment inside its danger zone.
  const grazes = new Map()
  for (let day = 0; ; day = Math.min(endDay, day + SAMPLE_EVERY_DAYS)) {
    const point = pointAt(day)
    samples.push({ day, x: point.x, y: point.y })
    for (const hazard of MARS_HAZARDS) {
      const spot = hazardPosition(hazard, day)
      const distance = Math.hypot(spot.x - point.x, spot.y - point.y)
      if (distance < hazard.dangerAu && (!grazes.has(hazard.id) || distance < grazes.get(hazard.id).distance)) {
        grazes.set(hazard.id, { hazard, day, distance, x: point.x, y: point.y })
      }
    }
    if (day >= endDay) break
  }
  const grazeList = [...grazes.values()].sort((a, b) => a.day - b.day)

  const last = samples[samples.length - 1]
  if (crossDay == null) {
    return { outcome: { type: MARS_OUTCOMES.SHORT, day: endDay, x: last.x, y: last.y }, samples, angleErrorDeg, grazes: grazeList }
  }
  const mars = marsPosition(crossDay)
  // How far Mars is from the arrival point, seen from the Sun (+ = Mars is already past it).
  const marsOffsetDeg = wrapDeg(radToDeg(Math.atan2(mars.y, mars.x) - Math.atan2(last.y, last.x)))
  // A hair of slack so the window edges (134° and 138°) still count after rounding.
  const met = Math.abs(marsOffsetDeg) <= MARS_CAPTURE_DEG + 0.01
  return {
    outcome: {
      type: met ? MARS_OUTCOMES.REACHED : MARS_OUTCOMES.MISSED,
      day: crossDay,
      x: last.x,
      y: last.y,
      marsOffsetDeg,
      // Days Mars needs to cover that gap at its real speed.
      marsOffsetDays: Math.abs(marsOffsetDeg) / MARS_DEG_PER_DAY,
      missKm: (Math.abs(degToRad(marsOffsetDeg)) * MARS_ORBIT_AU * AU_KM),
    },
    samples,
    angleErrorDeg,
    grazes: grazeList,
  }
}

/** Position of the rocket on the samples at a day (straight line between samples). */
export function tripPointAt(samples, day) {
  if (day <= samples[0].day) return samples[0]
  for (let i = 1; i < samples.length; i += 1) {
    const b = samples[i]
    if (day <= b.day) {
      const a = samples[i - 1]
      const k = (day - a.day) / (b.day - a.day || 1)
      return { day, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
  }
  return samples[samples.length - 1]
}

/** Score 0–100: how close to Mars and how close to the best angle (135.55°) the aim was. */
export function scoreMarsArrival(outcome, angleErrorDeg) {
  const closeness = 1 - Math.min(1, Math.abs(outcome.marsOffsetDeg ?? MARS_CAPTURE_DEG) / MARS_CAPTURE_DEG)
  const exactness = 1 - Math.min(1, Math.abs(pathTurnDeg(angleErrorDeg)) / MARS_CAPTURE_DEG)
  return Math.round(60 + 25 * closeness + 15 * exactness)
}
