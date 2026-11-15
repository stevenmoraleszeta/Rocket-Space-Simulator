/**
 * EARTH–MOON ROUTE — the coast the player aims, in a flat picture of the real trip.
 *
 * Distances on screen are not to scale (the Moon would be a dot). The order is real:
 * Earth, the Van Allen belts, a long almost-empty gap, then the Moon.
 * There is no asteroid belt on this road. The main belt starts past Mars.
 *
 * Sources:
 *   Apollo 11 mission report: launch 16 July 1969, one midcourse correction,
 *   lunar orbit at about 76 hours, splashdown 8 days 3 hours after launch.
 *   Mean Earth–Moon distance 384,400 km.
 *   Van Allen belts: Apollo crossed a thin edge in about an hour. The whole
 *   Apollo 11 dose was about 1.8 mSv. Lingering in the heart of the belts
 *   is the danger, not flying around a wall of rocks.
 *   MMOD: NASA plans for fast grains. Orbital debris is crowded near Earth,
 *   not along the whole coast.
 *   469219 Kamo'oalewa is a quasi-satellite of Earth. It is not parked on the
 *   straight line to the Moon. This practice path sets a rock like it aside.
 *   Kordylewski clouds: faint dust at the Earth–Moon balance points, off this road.
 *   Earth–Moon L1 is about 326,000 km from Earth, short of the Moon.
 *   The Moon's exosphere cannot slow a ship. Apollo landed on a rocket.
 *   LiOH canisters cleaned exhaled carbon dioxide. Apollo 13 ran short of that.
 *   LCROSS, 9 October 2009, found ice in Cabeus, a dark south-pole crater.
 *   August 1972 solar particle event, between Apollo 16 and Apollo 17.
 *
 * The rocks are real kinds of hazard, placed on this practice path so a high
 * or low road can hit them. They are not an ephemeris for one launch day.
 * Space on the way to the Moon is almost empty.
 */

import { t } from '../../../i18n/index.js'

/** Pointing short of this never reaches the Moon. */
export const POWER_SHORT = 0.82
/** Reaches the Moon, but too slow to be captured. Extra fuel loosens this. */
export const POWER_SLOW = 0.9
export const POWER_SLOW_WITH_FUEL = 0.86
/** Reaches the Moon, but so fast the lander cannot stop. */
export const POWER_FAST = 1.1
export const POWER_FAST_WITH_FUEL = 1.14
/** Past this, the ship flies beyond the Moon into empty space. */
export const POWER_PAST = 1.2
export const POWER_PAST_WITH_FUEL = 1.26

/** Solar particle event, as a fraction of the coast. Only the storm window has one. */
export const STORM_T = 0.45
/** Where a south-pole window loses Earth, if there is no dish. */
export const BLACKOUT_T = 0.8
/** Without a carbon-dioxide filter the cabin turns bad on day 2. */
export const CO2_DAYS = 2

export const MOON_OUTCOMES = Object.freeze({
  ARRIVED: 'arrived',
  SHORT: 'short',
  PAST: 'past',
  ROCK: 'rock',
  STORM: 'storm',
  BLACKOUT: 'blackout',
  OFF_CORRIDOR: 'offCorridor',
  BAD_SPEED: 'badSpeed',
  NO_LANDER: 'noLander',
  NO_PROSPECTOR: 'noProspector',
  OUT_OF_FOOD: 'outOfFood',
  OUT_OF_WATER: 'outOfWater',
  OUT_OF_AIR: 'outOfAir',
  SPACE_SICK: 'spaceSick',
  BAD_AIR: 'badAir',
})

/**
 * Bodies on the coast. `t` is how far along the Earth–Moon line (0 to 1).
 * `y` is up. `radius` 0 is a landmark: it can be tapped, and it is not a hit.
 * A straight road has y = lane × 0.7 × t, so a rock only threatens a high or low aim.
 */
export const MOON_BODIES = Object.freeze([
  {
    id: 'debris',
    name: 'Orbital debris',
    t: 0.42,
    y: 0.18,
    radius: 0.04,
    image: 'debris',
    summary: 'A dead satellite on the high road. Most junk orbits close to Earth, not all the way to the Moon. NASA still plans for a hit, because a small piece is going very fast.',
  },
  {
    id: 'grain',
    name: 'Micrometeoroid',
    t: 0.46,
    y: -0.15,
    radius: 0.04,
    frame: 2,
    summary: 'A grain of rock, smaller than a pea, going very fast. It can punch a hole. This is not an asteroid belt. The belt is past Mars. This one grain sits on the low road.',
  },
  {
    id: 'kamo',
    name: "Kamo'oalewa",
    t: 0.64,
    y: 0.18,
    radius: 0.05,
    frame: 5,
    summary: 'A small real rock that stays near Earth, also called 469219 Kamo\'oalewa. It is not parked on the straight line to the Moon. This practice path puts one like it on the high road.',
  },
  {
    id: 'l1',
    name: 'Earth–Moon L1',
    t: 0.85,
    y: 0,
    radius: 0,
    summary: 'A balance point about 326,000 km from Earth, still short of the Moon. Earth’s pull and the Moon’s pull match here. The ship does not stop. It coasts on through.',
  },
])

/** Tappable places that are not rocks. Drawn by the scene, never a collision. */
export const MOON_LANDMARKS = Object.freeze([
  {
    id: 'inner-belt',
    name: 'Inner radiation belt',
    x: 0.11,
    y: 0.22,
    summary: 'A doughnut of fast protons around Earth, starting a few hundred kilometers up. Apollo did not fly through the thick middle. It crossed a thin edge in minutes. This rocket does the same, so the belt is not a wall.',
  },
  {
    id: 'outer-belt',
    name: 'Outer radiation belt',
    x: 0.26,
    y: 0.22,
    summary: 'A wider doughnut of fast electrons. Apollo 11 was inside the belts for about an hour, on the way up. The crew’s whole trip was about 1.8 mSv, a small dose. Stopping here would be the mistake.',
  },
  {
    id: 'dust',
    name: 'Kordylewski cloud',
    x: 0.7,
    y: -0.36,
    summary: 'A faint cloud of dust at a balance point far off this straight road. It is dust, not a field of rocks. A trip to the Moon does not fly through it.',
  },
  {
    id: 'beyond',
    name: 'Past the Moon',
    x: 1.16,
    y: 0.28,
    summary: 'More empty space. The asteroid belt does not start here. It starts past Mars, much farther from the Sun.',
  },
])

const ARRIVAL_SCALE = 0.7

export function cruisePoint(t, lane, drift = false) {
  let y = lane * ARRIVAL_SCALE * t
  if (drift && t > 0.7) y += 0.35 * ((t - 0.7) / 0.3)
  return { t, x: t, y }
}

export function reachT(power, past) {
  if (power < POWER_SHORT) return 0.92 * (power / POWER_SHORT)
  if (power > past) return 1.22
  return 1
}

function hitBody(point) {
  let found = null
  for (const body of MOON_BODIES) {
    if (!(body.radius > 0)) continue
    if (Math.abs(point.t - body.t) > 0.045) continue
    const gap = Math.hypot(point.t - body.t, point.y - body.y)
    if (gap <= body.radius && (!found || gap < found.gap)) found = { body, gap }
  }
  return found
}

/** Score for a landing inside the gate. The rim is the mission pass (60). The middle is 100. */
export function scoreGate(offset, half) {
  if (!(half > 0)) return 60
  const ratio = Math.min(1, Math.abs(offset) / half)
  return Math.round(60 + 40 * (1 - ratio))
}

function outcome(type, t, extra = {}) {
  return { type, t, bodyName: null, offset: 0, ...extra }
}

/**
 * Fly one aimed coast.
 * Supply fractions are 0..1 of this window, or null when that store lasts.
 * `hasFuel` is the side tank: more propellant for the midcourse firing, so a
 * slightly hot or cold arrival can still be corrected.
 */
export function simulateTransit({
  lane = 0,
  power = 0.4,
  corridorHalf = 0.1,
  storm = false,
  blackout = false,
  hasShelter = false,
  hasAntenna = false,
  hasFilter = false,
  hasLander = false,
  hasProspector = false,
  hasFuel = false,
  durationDays = 8,
  foodAt = null,
  waterAt = null,
  airAt = null,
  sickAt = null,
}) {
  const slow = hasFuel ? POWER_SLOW_WITH_FUEL : POWER_SLOW
  const fast = hasFuel ? POWER_FAST_WITH_FUEL : POWER_FAST
  const past = hasFuel ? POWER_PAST_WITH_FUEL : POWER_PAST
  const drift = Boolean(blackout && !hasAntenna)
  const co2At = hasFilter ? null : Math.min(0.95, CO2_DAYS / Math.max(1, durationDays))
  const end = reachT(power, past)
  const samples = []
  let stop = null

  const consider = (t, next) => {
    if (t > end + 1e-6) return
    if (!stop || t < stop.t) stop = next
  }

  for (let step = 0; step <= 240; step += 1) {
    const t = (end * step) / 240
    const point = cruisePoint(t, lane, drift)
    samples.push(point)

    if (storm && !hasShelter && t + 1e-6 >= STORM_T) {
      consider(STORM_T, outcome(MOON_OUTCOMES.STORM, STORM_T))
    }
    if (co2At != null) consider(co2At, outcome(MOON_OUTCOMES.BAD_AIR, co2At))
    if (foodAt != null) consider(foodAt, outcome(MOON_OUTCOMES.OUT_OF_FOOD, foodAt))
    if (waterAt != null) consider(waterAt, outcome(MOON_OUTCOMES.OUT_OF_WATER, waterAt))
    if (sickAt != null) consider(sickAt, outcome(MOON_OUTCOMES.SPACE_SICK, sickAt))
    if (airAt != null) consider(airAt, outcome(MOON_OUTCOMES.OUT_OF_AIR, airAt))
    if (drift && t + 1e-6 >= BLACKOUT_T) {
      consider(BLACKOUT_T, outcome(MOON_OUTCOMES.BLACKOUT, BLACKOUT_T))
    }

    const hit = hitBody(point)
    if (hit) consider(t, outcome(MOON_OUTCOMES.ROCK, t, { bodyName: hit.body.name }))
    if (stop && t + 1e-6 >= stop.t) break
  }

  const arrival = cruisePoint(Math.min(1, end), lane, drift)

  if (!stop && end < 1) stop = outcome(MOON_OUTCOMES.SHORT, end)
  if (!stop && power > past) stop = outcome(MOON_OUTCOMES.PAST, 1.12)
  if (!stop && Math.abs(arrival.y) > corridorHalf) {
    stop = outcome(MOON_OUTCOMES.OFF_CORRIDOR, 1, {
      offset: arrival.y,
      high: arrival.y > 0,
    })
  }
  if (!stop && (power < slow || power > fast)) {
    stop = outcome(MOON_OUTCOMES.BAD_SPEED, 1, {
      offset: arrival.y,
      fast: power > fast,
    })
  }
  if (!stop && !hasLander) stop = outcome(MOON_OUTCOMES.NO_LANDER, 1, { offset: arrival.y })
  if (!stop && !hasProspector) stop = outcome(MOON_OUTCOMES.NO_PROSPECTOR, 1, { offset: arrival.y })
  if (!stop) stop = outcome(MOON_OUTCOMES.ARRIVED, 1, { offset: arrival.y })

  return { samples, drift, end, arrival, outcome: stop }
}

const EXPLAIN = {
  [MOON_OUTCOMES.ARRIVED]: {
    tone: 'good',
    text: 'The path goes through the gate. The lander can set down, and the rover can look for ice.',
  },
  [MOON_OUTCOMES.SHORT]: {
    tone: 'bad',
    text: 'Not far enough. The ship stops short of the Moon. Drag closer to it.',
  },
  [MOON_OUTCOMES.PAST]: {
    tone: 'bad',
    text: 'Too much power. The ship flies past the Moon into empty space. There is no asteroid belt here.',
  },
  [MOON_OUTCOMES.ROCK]: {
    tone: 'bad',
    text: 'The road hits something. Stay nearer the middle. The middle of this trip is almost empty.',
  },
  [MOON_OUTCOMES.STORM]: {
    tone: 'bad',
    text: 'A storm from the Sun hits the crew. They need a safe room, or a path with no storm.',
  },
  [MOON_OUTCOMES.BLACKOUT]: {
    tone: 'bad',
    text: 'Earth slips behind the crater rim. With no way to call home, the landing stops.',
  },
  [MOON_OUTCOMES.OFF_CORRIDOR]: {
    tone: 'warn',
    text: 'It reaches the Moon outside the yellow gate.',
  },
  [MOON_OUTCOMES.BAD_SPEED]: {
    tone: 'warn',
    text: 'It reaches the gate too fast or too slow to land.',
  },
  [MOON_OUTCOMES.NO_LANDER]: {
    tone: 'warn',
    text: 'The path is good, but the Moon has almost no air. Nothing can slow the ship, so it crashes.',
  },
  [MOON_OUTCOMES.NO_PROSPECTOR]: {
    tone: 'warn',
    text: 'The ship can land, but nothing rolls into the dark crater to look for ice.',
  },
  [MOON_OUTCOMES.OUT_OF_FOOD]: {
    tone: 'bad',
    text: 'The food runs out before this path is over.',
  },
  [MOON_OUTCOMES.OUT_OF_WATER]: {
    tone: 'bad',
    text: 'The water runs out before this path is over.',
  },
  [MOON_OUTCOMES.SPACE_SICK]: {
    tone: 'bad',
    text: 'Someone gets sick on the way, and there is no medicine aboard.',
  },
  [MOON_OUTCOMES.OUT_OF_AIR]: {
    tone: 'bad',
    text: 'The oxygen runs out before this path is over.',
  },
  [MOON_OUTCOMES.BAD_AIR]: {
    tone: 'bad',
    text: 'The gas the crew breathes out fills the cabin. Apollo 13 had this problem. The air has to be cleaned.',
  },
}

/** One line for the aim panel. A rock hit names the body. */
export function describeTransit(prediction) {
  const found = EXPLAIN[prediction.outcome.type] ?? EXPLAIN[MOON_OUTCOMES.SHORT]
  if (prediction.outcome.type === MOON_OUTCOMES.ROCK && prediction.outcome.bodyName) {
    return {
      tone: 'bad',
      text: t('The road hits {{name}}. Stay nearer the middle.', { name: t(prediction.outcome.bodyName) }),
    }
  }
  if (prediction.outcome.type === MOON_OUTCOMES.OFF_CORRIDOR) {
    return {
      tone: 'warn',
      text: prediction.outcome.high
        ? t('Too high. The ship misses the crater and flies past the limb.')
        : t('Too low. The ship hits the ground outside the gate.'),
    }
  }
  if (prediction.outcome.type === MOON_OUTCOMES.BAD_SPEED) {
    return {
      tone: 'warn',
      text: prediction.outcome.fast
        ? t('Too fast at the gate. The lander cannot stop. Aim a little shorter.')
        : t('Too slow at the gate. The Moon’s pull will not catch the ship. Aim a little closer.'),
    }
  }
  return { ...found, text: t(found.text) }
}

/** Supply fraction for this window, or null when the stores last the whole coast. */
export function supplyFraction(atSeconds, durationSeconds) {
  if (atSeconds == null || !(durationSeconds > 0)) return null
  if (atSeconds + 1 >= durationSeconds) return null
  return Math.max(0, atSeconds / durationSeconds)
}

export function shouldExplode(outcome) {
  if (!outcome) return false
  if (outcome.type === MOON_OUTCOMES.ROCK || outcome.type === MOON_OUTCOMES.NO_LANDER) return true
  if (outcome.type === MOON_OUTCOMES.OFF_CORRIDOR) return !outcome.high
  if (outcome.type === MOON_OUTCOMES.BAD_SPEED) return Boolean(outcome.fast)
  return false
}
