/**
 * LAUNCH SIMULATION — integrates the whole flight with real physics (no React, no pixels).
 *
 * The SAME function draws the dotted prediction line while the player aims and runs the real
 * flight after pressing Launch, so what the line shows is exactly what will happen.
 *
 * Flight:
 *   1. Ascent burn with a pitch program, like real rockets: the engine starts pointing straight up
 *      and tilts steadily until it reaches the aim tilt at the end of the burn. The burn stops when
 *      the chosen delta-v has been spent.
 *   2. Coast: only gravity and air drag act.
 *   3. Insertion: at the closest point to the arrival point, the satellite fires the remaining
 *      propellant to turn its speed into a circular orbit (Δv = |v_circular − v|), in whichever
 *      direction it is already going round the Earth. Without enough propellant it keeps flying.
 *
 * Ends with one outcome: orbitReached, earthImpact, satelliteCollision, lostInSpace, missedTarget, noLiftoff.
 */
import { EARTH_RADIUS_METERS, STANDARD_GRAVITY } from '../../physics/constants.js'
import {
  circularOrbitAngularSpeed,
  circularOrbitSpeed,
  eastwardDirection,
  pointOnCircle,
  rocketEquationDeltaV,
  stepState,
} from '../../physics/orbitalMechanics.js'
import { kilometersToMeters } from '../../physics/units.js'
import { HAZARD_RADIUS_KILOMETERS } from './realSatellites.js'

export const SIMULATION_STEP_SECONDS = 1
export const MAX_SIMULATION_SECONDS = 2 * 60 * 60
/** One drawn point every this many seconds of flight. */
export const SAMPLE_EVERY_SECONDS = 5
/** Passing within this distance of the arrival point lets the satellite try the insertion burn. */
export const TARGET_TOLERANCE_KILOMETERS = 150
/** Higher than this the rocket is far above every arrival orbit: the mission is lost. */
export const LOST_ALTITUDE_KILOMETERS = 2500
/** After passing the arrival point, moving this much farther away counts as a miss. */
const MISS_RECEDING_KILOMETERS = 2000
/**
 * Below this thrust-to-weight the rocket never leaves the pad, so every sample sits on the
 * launch site and the dotted path does not appear. Aiming still has to draw that path,
 * even when the hangar rocket has no extra parts, so a weaker rocket flies the preview at
 * this thrust-to-weight. Its own propellant and delta-v are unchanged.
 */
const MIN_PATH_THRUST_TO_WEIGHT = 1.35
/**
 * After a miss the rocket keeps flying with gravity alone: if it falls back it crashes (earthImpact,
 * and it explodes). If it is still up after this long (about one trip around the Earth) it stays
 * in a wrong orbit and the flight ends as missedTarget.
 */
const MISS_FOLLOW_SECONDS = 100 * 60

export const OUTCOMES = Object.freeze({
  ORBIT_REACHED: 'orbitReached',
  EARTH_IMPACT: 'earthImpact',
  SATELLITE_COLLISION: 'satelliteCollision',
  LOST_IN_SPACE: 'lostInSpace',
  MISSED_TARGET: 'missedTarget',
  NO_LIFTOFF: 'noLiftoff',
})

/** Outcomes that end with the rocket blowing up on screen. Flying off into space counts too, so the loss is clear. */
export const EXPLODING_OUTCOMES = Object.freeze([OUTCOMES.EARTH_IMPACT, OUTCOMES.SATELLITE_COLLISION, OUTCOMES.LOST_IN_SPACE])

export const degreesToRadians = (degrees) => (degrees * Math.PI) / 180

/** Position of a real satellite (circular orbit) at time t (meters). */
export function satellitePositionAt(satellite, timeSeconds) {
  const radius = EARTH_RADIUS_METERS + kilometersToMeters(satellite.altitudeKm)
  const angle = degreesToRadians(satellite.startAngleDeg) + circularOrbitAngularSpeed(radius) * timeSeconds
  return pointOnCircle(radius, angle)
}

/** Arrival point (meters) on an orbit of the given altitude, at a given angle around the Earth. */
export function arrivalPosition(altitudeKm, angleRadians) {
  return pointOnCircle(EARTH_RADIUS_METERS + kilometersToMeters(altitudeKm), angleRadians)
}

/** Delta-v left in the tanks for a given current mass (m/s). */
function remainingDeltaV(vehicle, massKg) {
  return rocketEquationDeltaV(vehicle.specificImpulseSeconds, massKg, vehicle.dryMassKg)
}

/** Insertion burn needed to turn the current velocity into a circular orbit at this point. */
function insertionDeltaVAt(state) {
  const radius = Math.hypot(state.x, state.y)
  // Keep going round the Earth the same way the rocket already goes (sign of angular momentum).
  const turning = Math.sign(state.x * state.vy - state.y * state.vx) || 1
  const along = eastwardDirection(Math.atan2(state.y, state.x))
  const speed = circularOrbitSpeed(radius) * turning
  return Math.hypot(along.x * speed - state.vx, along.y * speed - state.vy)
}

/** Same vehicle, with enough thrust to leave the pad so the aimed path can be drawn. */
function vehicleForPath(vehicle) {
  if (vehicle.thrustToWeight >= MIN_PATH_THRUST_TO_WEIGHT) return vehicle
  const thrustToWeight = MIN_PATH_THRUST_TO_WEIGHT
  return {
    ...vehicle,
    thrustNewtons: vehicle.liftoffMassKg * STANDARD_GRAVITY * thrustToWeight,
    thrustToWeight,
  }
}

/**
 * Runs the flight.
 * @param {object} params
 * @param {number} params.siteAngleRadians  where the site is on the rim of the Earth
 * @param {number} params.rotationBoost     speed the Earth's spin gives along this orbit plane (m/s, eastward)
 * @param {{ x: number, y: number }} params.arrival  arrival point (meters)
 * @param {object} params.vehicle           from buildLaunchVehicle()
 * @param {number} params.aimTiltRadians    final tilt of the engine from straight up (+ = eastward)
 * @param {number} params.ascentDeltaV      delta-v spent on the ascent burn (m/s)
 * @param {object[]} params.satellites      real satellites to avoid
 */
export function simulateLaunch({ siteAngleRadians, rotationBoost, arrival, vehicle, aimTiltRadians, ascentDeltaV, satellites }) {
  const flying = vehicleForPath(vehicle)
  const start = pointOnCircle(EARTH_RADIUS_METERS, siteAngleRadians)
  const eastward = eastwardDirection(siteAngleRadians)
  // The air in this plane turns with the ground below it.
  const airRotationRate = rotationBoost / EARTH_RADIUS_METERS

  let state = {
    t: 0,
    x: start.x,
    y: start.y,
    vx: eastward.x * rotationBoost,
    vy: eastward.y * rotationBoost,
    massKg: flying.liftoffMassKg,
  }
  const samples = [{ t: 0, x: state.x, y: state.y, burning: true }]
  const toleranceMeters = kilometersToMeters(TARGET_TOLERANCE_KILOMETERS)
  const hazardMeters = kilometersToMeters(HAZARD_RADIUS_KILOMETERS)
  const lostRadius = EARTH_RADIUS_METERS + kilometersToMeters(LOST_ALTITUDE_KILOMETERS)
  let closestTargetMeters = Infinity
  let bestInsertion = null
  let burnoutTime = 0

  const finish = (type, extra = {}) => {
    const last = samples[samples.length - 1]
    if (last.t !== state.t) samples.push({ t: state.t, x: state.x, y: state.y, burning: false })
    return {
      outcome: { type, t: state.t, x: state.x, y: state.y, ...extra },
      samples,
      arrival,
      burnoutTime: burnoutTime || state.t,
      closestTargetKm: closestTargetMeters / 1000,
      bestInsertion,
    }
  }

  const ascentDeltaVClamped = Math.min(Math.max(0, ascentDeltaV), flying.totalDeltaV)
  const ascentEndMassKg = flying.liftoffMassKg / Math.exp(ascentDeltaVClamped / (flying.specificImpulseSeconds * STANDARD_GRAVITY))
  const massFlowKgPerSecond = flying.thrustNewtons / (flying.specificImpulseSeconds * STANDARD_GRAVITY)
  const burnDurationSeconds = (flying.liftoffMassKg - ascentEndMassKg) / massFlowKgPerSecond
  let hasLeftGround = false
  /** State and distance to the arrival point one step ago (coast only). */
  let previous = null
  /** Time the rocket missed the arrival point; from then on it only falls or circles. */
  let missedAt = null

  while (state.t < MAX_SIMULATION_SECONDS) {
    const burning = state.massKg > ascentEndMassKg + 1e-6
    let thrust = null
    if (burning) {
      // Pitch program: tilt grows linearly from 0 (straight up) to the aim tilt at burnout.
      const tilt = burnDurationSeconds > 0 ? aimTiltRadians * Math.min(1, state.t / burnDurationSeconds) : aimTiltRadians
      const direction = Math.atan2(state.y, state.x) + tilt
      thrust = { forceNewtons: flying.thrustNewtons, directionX: Math.cos(direction), directionY: Math.sin(direction) }
    } else if (!burnoutTime) {
      burnoutTime = state.t
    }
    state = stepState(state, flying, thrust, SIMULATION_STEP_SECONDS, airRotationRate)
    if (burning && state.massKg < ascentEndMassKg) state = { ...state, massKg: ascentEndMassKg }
    if (state.t % SAMPLE_EVERY_SECONDS === 0) samples.push({ t: state.t, x: state.x, y: state.y, burning })

    const radius = Math.hypot(state.x, state.y)
    if (radius > EARTH_RADIUS_METERS + 1000) hasLeftGround = true
    if (radius <= EARTH_RADIUS_METERS) {
      if (hasLeftGround || !burning) return finish(OUTCOMES.EARTH_IMPACT)
      // Still climbing off the pad: keep it on the surface.
      state = { ...state, x: (state.x / radius) * EARTH_RADIUS_METERS, y: (state.y / radius) * EARTH_RADIUS_METERS }
    }
    if (radius > lostRadius) return finish(OUTCOMES.LOST_IN_SPACE)

    for (const satellite of satellites) {
      const position = satellitePositionAt(satellite, state.t)
      if (Math.hypot(position.x - state.x, position.y - state.y) < hazardMeters) {
        return finish(OUTCOMES.SATELLITE_COLLISION, { satelliteName: satellite.name })
      }
    }

    if (burning) continue

    if (missedAt !== null) {
      if (state.t - missedAt > MISS_FOLLOW_SECONDS) return finish(OUTCOMES.MISSED_TARGET)
      continue
    }

    // Insertion burn at the closest point to the arrival point (where the distance stops shrinking).
    const distanceToArrival = Math.hypot(arrival.x - state.x, arrival.y - state.y)
    closestTargetMeters = Math.min(closestTargetMeters, distanceToArrival)
    if (previous && previous.distance < toleranceMeters && distanceToArrival > previous.distance) {
      const closest = previous.state
      const insertionDeltaV = insertionDeltaVAt(closest)
      const availableDeltaV = remainingDeltaV(flying, closest.massKg)
      if (!bestInsertion || insertionDeltaV < bestInsertion.insertionDeltaV) {
        bestInsertion = { insertionDeltaV, availableDeltaV }
      }
      if (insertionDeltaV <= availableDeltaV) {
        state = closest
        return finish(OUTCOMES.ORBIT_REACHED, {
          insertionDeltaV,
          availableDeltaV,
          missKm: previous.distance / 1000,
          orbitRadius: Math.hypot(closest.x, closest.y),
          // +1 counterclockwise (eastward), −1 clockwise
          turning: Math.sign(closest.x * closest.vy - closest.y * closest.vx) || 1,
        })
      }
    }
    // Already went past the arrival point and keeps moving away: it missed. Keep following it,
    // it may fall back and crash.
    if (distanceToArrival > closestTargetMeters + kilometersToMeters(MISS_RECEDING_KILOMETERS)) {
      missedAt = state.t
      continue
    }
    previous = { state, distance: distanceToArrival }
  }
  return finish(OUTCOMES.MISSED_TARGET)
}
