/**
 * EARTH–MARS ROUTE — the cruise the player aims, in a flat picture of the real trip.
 *
 * Distances on screen are not to scale (Mars would be a dot). The order is real:
 * Earth, then a few bodies that actually share this road, then Mars, then the
 * main asteroid belt farther out. The belt is not between Earth and Mars.
 *
 * Sources used for the layout and the copy:
 *   Perseverance: launch 30 July 2020, landing 18 February 2021, 203 days,
 *   about 471 million km, entry near 19,500 km/h, about 7 minutes of landing.
 *   NASA/JPL Mars 2020 press kit.
 *   Solar conjunction: NASA stands down from commanding Mars for about two weeks
 *   when the Sun is between Earth and Mars (JPL, 2021 fleet conjunction).
 *   MSL-RAD cruise: galactic cosmic rays plus a few solar particle events
 *   (NASA briefing, Zeitlin et al.). A storm shelter is a real crewed-mission idea.
 *   Phobos orbits about 9,400 km from Mars's center. Deimos about 23,500 km.
 *   5261 Eureka is the first known Mars trojan (1990), sharing Mars's orbit.
 *   433 Eros is a Mars-crossing asteroid; NEAR Shoemaker landed on it in 2001.
 *   The main belt begins past Mars, near 2.2 AU (Ceres is about 2.8 AU).
 *
 * The rocks are real, placed on this practice path so a high or low road can hit
 * them. They are not an ephemeris for one launch day. Space is almost empty;
 * the game gathers the hazards a navigator still has to know.
 */

/** Pointing short of this never reaches Mars. */
export const POWER_SHORT = 0.82
/** Reaches Mars, but too slow to land. */
export const POWER_SLOW = 0.9
/** Reaches Mars, but so fast it would skip off the air. */
export const POWER_FAST = 1.1
/** Past this, the ship flies beyond Mars into the belt. */
export const POWER_PAST = 1.16

/** Solar particle event, as a fraction of the cruise. Every window has one. */
export const STORM_T = 0.4
/** Where a conjunction window loses the radio, if there is no dish. */
export const BLACKOUT_T = 0.55

export const MARS_OUTCOMES = Object.freeze({
  ARRIVED: 'arrived',
  SHORT: 'short',
  PAST: 'past',
  ROCK: 'rock',
  STORM: 'storm',
  BLACKOUT: 'blackout',
  OFF_CORRIDOR: 'offCorridor',
  BAD_SPEED: 'badSpeed',
  NO_PARACHUTE: 'noParachute',
  NO_ROVER: 'noRover',
  OUT_OF_FOOD: 'outOfFood',
  OUT_OF_WATER: 'outOfWater',
  SPACE_SICK: 'spaceSick',
  OUT_OF_AIR: 'outOfAir',
})

/**
 * Bodies drawn on the cruise. `t` is how far along the Earth–Mars line (0 to 1).
 * `y` is up. `radius` 0 is a landmark: it can be tapped, and it is not a hit.
 * `frame` picks a cell of asteroid_sheet.png (8 frames of 32×32).
 */
export const CRUISE_BODIES = Object.freeze([
  {
    id: 'grain',
    name: 'Micrometeoroid',
    t: 0.24,
    y: 0.1,
    radius: 0.04,
    frame: 1,
    summary: 'A grain of rock, smaller than a pea, going very fast. NASA plans for these because a grain can punch a hole. This one sits on the high road.',
  },
  {
    id: 'eros',
    name: '433 Eros',
    t: 0.46,
    y: -0.22,
    radius: 0.055,
    frame: 4,
    summary: 'A real asteroid that crosses Mars’s orbit, about 34 km long. NEAR Shoemaker landed on it in 2001. It is not always in the way. This path puts a rock like it on the low road.',
  },
  {
    id: 'eureka',
    name: '5261 Eureka',
    t: 0.74,
    y: 0.2,
    radius: 0.05,
    frame: 6,
    summary: 'The first Mars trojan ever found, in 1990. It shares Mars’s path around the Sun, so it stays near the end of the trip. About 1 to 2 km across.',
  },
  {
    id: 'phobos',
    name: 'Phobos',
    t: 0.92,
    y: 0.18,
    radius: 0.035,
    image: 'phobos',
    summary: 'The bigger moon of Mars. It orbits about 9,400 km from the center of Mars, and it goes around faster than Mars spins. A high aim can cross it.',
  },
  {
    id: 'deimos',
    name: 'Deimos',
    t: 0.96,
    y: -0.18,
    radius: 0,
    image: 'deimos',
    summary: 'The smaller moon, farther out, about 23,500 km from the center of Mars. This road leaves it alone.',
  },
])

const ARRIVAL_SCALE = 0.7

/** Point on the cruise before any radio drift. `lane` −1..1, positive is the high road. */
export function cruisePoint(t, lane) {
  return { t, x: t, y: lane * ARRIVAL_SCALE * t }
}

function driftedPoint(t, lane, drift) {
  const point = cruisePoint(t, lane)
  if (drift && t > BLACKOUT_T) {
    point.y += 0.22 * ((t - BLACKOUT_T) / (1 - BLACKOUT_T))
  }
  return point
}

export function reachT(power) {
  if (power < POWER_SHORT) return 0.92 * (power / POWER_SHORT)
  if (power > POWER_PAST) return 1.22
  return 1
}

function hitBody(point) {
  let found = null
  for (const body of CRUISE_BODIES) {
    if (!(body.radius > 0)) continue
    if (Math.abs(point.t - body.t) > 0.045) continue
    const gap = Math.hypot(point.t - body.t, point.y - body.y)
    if (gap <= body.radius && (!found || gap < found.gap)) found = { body, gap }
  }
  return found
}

/**
 * Score for a landing inside the gate. The rim is the mission pass (60).
 * The middle is 100.
 */
export function scoreGate(offset, half) {
  if (!(half > 0)) return 60
  const ratio = Math.min(1, Math.abs(offset) / half)
  return Math.round(60 + 40 * (1 - ratio))
}

function outcome(type, t, extra = {}) {
  return { type, t, bodyName: null, offset: 0, ...extra }
}

/**
 * Fly one aimed cruise.
 * `foodAt`, `waterAt`, `airAt`, and `sickAt` are fractions of this window (0..1), or null if that store lasts.
 * Flags are the Mars parts: shelter, antenna, parachute, rover.
 */
export function simulateCruise({
  lane = 0,
  power = 0.4,
  corridorHalf = 0.1,
  conjunction = false,
  hasShelter = false,
  hasAntenna = false,
  hasParachute = false,
  hasRover = false,
  foodAt = null,
  waterAt = null,
  airAt = null,
  sickAt = null,
}) {
  const drift = Boolean(conjunction && !hasAntenna)
  const end = reachT(power)
  const samples = []
  let stop = null

  const consider = (t, next) => {
    if (t > end + 1e-6) return
    if (!stop || t < stop.t) stop = next
  }

  for (let step = 0; step <= 240; step += 1) {
    const t = (end * step) / 240
    const point = driftedPoint(t, lane, drift)
    samples.push(point)

    if (!hasShelter && t + 1e-6 >= STORM_T) {
      consider(STORM_T, outcome(MARS_OUTCOMES.STORM, STORM_T))
    }
    if (foodAt != null) consider(foodAt, outcome(MARS_OUTCOMES.OUT_OF_FOOD, foodAt))
    if (waterAt != null) consider(waterAt, outcome(MARS_OUTCOMES.OUT_OF_WATER, waterAt))
    if (sickAt != null) consider(sickAt, outcome(MARS_OUTCOMES.SPACE_SICK, sickAt))
    if (airAt != null) consider(airAt, outcome(MARS_OUTCOMES.OUT_OF_AIR, airAt))

    const hit = hitBody(point)
    if (hit) {
      const type = drift && t > BLACKOUT_T ? MARS_OUTCOMES.BLACKOUT : MARS_OUTCOMES.ROCK
      consider(t, outcome(type, t, { bodyName: hit.body.name }))
    }
    if (stop && t + 1e-6 >= stop.t) break
  }

  const arrival = driftedPoint(Math.min(1, end), lane, drift)

  if (!stop && end < 1) {
    stop = outcome(MARS_OUTCOMES.SHORT, end)
  }
  if (!stop && power > POWER_PAST) {
    stop = outcome(MARS_OUTCOMES.PAST, 1.12)
  }
  if (!stop && Math.abs(arrival.y) > corridorHalf) {
    stop = outcome(MARS_OUTCOMES.OFF_CORRIDOR, 1, {
      offset: arrival.y,
      high: arrival.y > 0,
    })
  }
  if (!stop && (power < POWER_SLOW || power > POWER_FAST)) {
    stop = outcome(MARS_OUTCOMES.BAD_SPEED, 1, {
      offset: arrival.y,
      fast: power > POWER_FAST,
    })
  }
  if (!stop && !hasParachute) {
    stop = outcome(MARS_OUTCOMES.NO_PARACHUTE, 1, { offset: arrival.y })
  }
  if (!stop && !hasRover) {
    stop = outcome(MARS_OUTCOMES.NO_ROVER, 1, { offset: arrival.y })
  }
  if (!stop) {
    stop = outcome(MARS_OUTCOMES.ARRIVED, 1, { offset: arrival.y })
  }

  return {
    samples,
    drift,
    end,
    arrival,
    outcome: stop,
  }
}

const EXPLAIN = {
  [MARS_OUTCOMES.ARRIVED]: {
    tone: 'good',
    text: 'The path goes through the gate. Mars can catch the ship.',
  },
  [MARS_OUTCOMES.SHORT]: {
    tone: 'bad',
    text: 'Not far enough. The ship stops short of Mars. Drag closer to the planet.',
  },
  [MARS_OUTCOMES.PAST]: {
    tone: 'bad',
    text: 'Too much power. The ship flies past Mars and into the asteroid belt. The belt is past Mars, not on the way.',
  },
  [MARS_OUTCOMES.ROCK]: {
    tone: 'bad',
    text: 'The road hits a rock. Stay nearer the middle.',
  },
  [MARS_OUTCOMES.STORM]: {
    tone: 'bad',
    text: 'A storm from the Sun hits the crew. They need a safe room for it.',
  },
  [MARS_OUTCOMES.BLACKOUT]: {
    tone: 'bad',
    text: 'The Sun sits on the radio line. With no way to call home, the ship drifts off the road.',
  },
  [MARS_OUTCOMES.OFF_CORRIDOR]: {
    tone: 'warn',
    text: 'It reaches Mars outside the yellow gate. Too high skips off the air. Too low burns up.',
  },
  [MARS_OUTCOMES.BAD_SPEED]: {
    tone: 'warn',
    text: 'It reaches the gate too fast or too slow to land. Aim at the gate, not past it and not short of it.',
  },
  [MARS_OUTCOMES.NO_PARACHUTE]: {
    tone: 'warn',
    text: 'The path is good, but Mars’s air is very thin. The ship is still too fast at the end.',
  },
  [MARS_OUTCOMES.NO_ROVER]: {
    tone: 'warn',
    text: 'The ship can land, but nothing rolls out to look at the rocks.',
  },
  [MARS_OUTCOMES.OUT_OF_FOOD]: {
    tone: 'bad',
    text: 'The food runs out before this path is over.',
  },
  [MARS_OUTCOMES.OUT_OF_WATER]: {
    tone: 'bad',
    text: 'The water runs out before this path is over. Bottles alone do not last seven months.',
  },
  [MARS_OUTCOMES.SPACE_SICK]: {
    tone: 'bad',
    text: 'Someone gets sick on the long flight, and there is no medicine aboard.',
  },
  [MARS_OUTCOMES.OUT_OF_AIR]: {
    tone: 'bad',
    text: 'The air goes bad before this path is over. Breathing for months has to be cleaned, not only bottled.',
  },
}

/** One line for the aim panel. Rock and blackout name the body when there is one. */
export function describeCruise(prediction) {
  const found = EXPLAIN[prediction.outcome.type] ?? EXPLAIN[MARS_OUTCOMES.SHORT]
  if (prediction.outcome.type === MARS_OUTCOMES.ROCK && prediction.outcome.bodyName) {
    return { tone: 'bad', text: `The road hits ${prediction.outcome.bodyName}. Stay nearer the middle.` }
  }
  if (prediction.outcome.type === MARS_OUTCOMES.BLACKOUT && prediction.outcome.bodyName) {
    return {
      tone: 'bad',
      text: `The radio goes quiet and the ship drifts into ${prediction.outcome.bodyName}.`,
    }
  }
  if (prediction.outcome.type === MARS_OUTCOMES.OFF_CORRIDOR) {
    return {
      tone: 'warn',
      text: prediction.outcome.high
        ? 'Too high. Mars’s thin air would let the ship skip past.'
        : 'Too low. The ship would burn in Mars’s air.',
    }
  }
  if (prediction.outcome.type === MARS_OUTCOMES.BAD_SPEED) {
    return {
      tone: 'warn',
      text: prediction.outcome.fast
        ? 'Too fast at the gate. It would skip off the air. Aim a little shorter.'
        : 'Too slow at the gate. Aim a little closer to Mars.',
    }
  }
  return found
}

/** Food or oxygen fraction for this window, or null when the stores last the whole cruise. */
export function supplyFraction(atSeconds, durationSeconds) {
  if (atSeconds == null || !(durationSeconds > 0)) return null
  if (atSeconds + 1 >= durationSeconds) return null
  return Math.max(0, atSeconds / durationSeconds)
}

export const EXPLODING = new Set([
  MARS_OUTCOMES.ROCK,
  MARS_OUTCOMES.PAST,
  MARS_OUTCOMES.BLACKOUT,
  MARS_OUTCOMES.NO_PARACHUTE,
  MARS_OUTCOMES.OFF_CORRIDOR,
])
