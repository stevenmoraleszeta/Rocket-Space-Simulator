/**
 * ORBITAL MECHANICS — pure functions, no React, no pixels. SI units.
 *
 * Coordinates: 2D plane of the orbit, origin at the center of the Earth, x to the right,
 * y up. Angles grow counterclockwise, which is the direction the Earth turns (eastward).
 *
 * Forces on the rocket:
 *   gravity  a = −μ / r² · r̂                     (Newton's law of gravitation, μ = G·M)
 *   drag     a = −½ · ρ(h) · |v_air| · v_air · CdA / m (exponential atmosphere, air turns with the Earth)
 *
 * The air turns with the ground. In the 2D plane of an orbit only part of the Earth's spin lies in
 * that plane, so the views pass `airRotationRate` = (in-plane ground speed) / R. By default it is the
 * full rotation rate (an equatorial plane).
 *   thrust   a = F / m along the aim direction    (mass drops as propellant burns: ṁ = F / (Isp·g0))
 */
import {
  EARTH_ATMOSPHERE_SCALE_HEIGHT_METERS,
  EARTH_ATMOSPHERE_TOP_METERS,
  EARTH_MU,
  EARTH_RADIUS_METERS,
  EARTH_ROTATION_RATE,
  EARTH_SEA_LEVEL_AIR_DENSITY,
  STANDARD_GRAVITY,
} from './constants.js'

/** Air density at a given altitude (kg/m³). Zero above the top of the atmosphere. */
export function airDensityAt(altitudeMeters) {
  if (altitudeMeters >= EARTH_ATMOSPHERE_TOP_METERS) return 0
  return EARTH_SEA_LEVEL_AIR_DENSITY * Math.exp(-Math.max(0, altitudeMeters) / EARTH_ATMOSPHERE_SCALE_HEIGHT_METERS)
}

/** Speed of a circular orbit at distance r from the center (m/s): v = √(μ / r). */
export function circularOrbitSpeed(radiusMeters, mu = EARTH_MU) {
  return Math.sqrt(mu / radiusMeters)
}

/** Angular speed of a circular orbit (rad/s): n = √(μ / r³). */
export function circularOrbitAngularSpeed(radiusMeters, mu = EARTH_MU) {
  return Math.sqrt(mu / radiusMeters ** 3)
}

/** Position on a circle of radius r at angle θ. */
export function pointOnCircle(radiusMeters, angleRadians) {
  return { x: radiusMeters * Math.cos(angleRadians), y: radiusMeters * Math.sin(angleRadians) }
}

/** Unit vector pointing counterclockwise (eastward) at angle θ. */
export function eastwardDirection(angleRadians) {
  return { x: -Math.sin(angleRadians), y: Math.cos(angleRadians) }
}

/**
 * Speed the Earth's rotation adds along the orbit (m/s). For an orbit tilted by `inclination`,
 * the eastward ground speed ω·R·cos(latitude) projects onto the orbit as ω·R·cos(inclination).
 * Equatorial orbits get the full boost, polar ones almost nothing, retrograde ones lose speed.
 */
export function rotationBoostForInclination(inclinationDegrees) {
  return EARTH_ROTATION_RATE * EARTH_RADIUS_METERS * Math.cos((inclinationDegrees * Math.PI) / 180)
}

/** Velocity of the rocket relative to the air around it, which turns with the Earth. */
export function velocityRelativeToAir(state, airRotationRate = EARTH_ROTATION_RATE) {
  return {
    airVx: state.vx + airRotationRate * state.y,
    airVy: state.vy - airRotationRate * state.x,
  }
}

/**
 * Accelerations acting on the rocket at one instant (m/s²).
 * @param {object} state    { x, y, vx, vy, massKg }
 * @param {object} vehicle  { dragAreaM2 } (drag coefficient × cross-section area)
 * @param {object|null} thrust  { forceNewtons, directionX, directionY } or null when the engine is off
 * @param {number} airRotationRate  angular speed of the air in this plane (rad/s)
 */
export function computeAcceleration(state, vehicle, thrust, airRotationRate = EARTH_ROTATION_RATE) {
  const radius = Math.hypot(state.x, state.y)

  // Gravity, always toward the center of the Earth.
  const gravityMagnitude = EARTH_MU / (radius * radius)
  let ax = (-gravityMagnitude * state.x) / radius
  let ay = (-gravityMagnitude * state.y) / radius

  // Drag against the velocity relative to the air, which turns with the Earth.
  const density = airDensityAt(radius - EARTH_RADIUS_METERS)
  if (density > 0) {
    const { airVx, airVy } = velocityRelativeToAir(state, airRotationRate)
    const airSpeed = Math.hypot(airVx, airVy)
    const dragFactor = (0.5 * density * airSpeed * vehicle.dragAreaM2) / state.massKg
    ax -= dragFactor * airVx
    ay -= dragFactor * airVy
  }

  if (thrust) {
    ax += (thrust.forceNewtons / state.massKg) * thrust.directionX
    ay += (thrust.forceNewtons / state.massKg) * thrust.directionY
  }
  return { ax, ay }
}

/**
 * Advances the state by dt seconds (semi-implicit Euler: velocity first, then position).
 * Burning the engine also consumes propellant: Δm = F / (Isp·g0) · dt.
 * Returns a NEW state.
 */
export function stepState(state, vehicle, thrust, dtSeconds, airRotationRate = EARTH_ROTATION_RATE) {
  const { ax, ay } = computeAcceleration(state, vehicle, thrust, airRotationRate)
  const vx = state.vx + ax * dtSeconds
  const vy = state.vy + ay * dtSeconds
  let massKg = state.massKg
  if (thrust) {
    const massFlowKgPerSecond = thrust.forceNewtons / (vehicle.specificImpulseSeconds * STANDARD_GRAVITY)
    massKg = Math.max(vehicle.dryMassKg, massKg - massFlowKgPerSecond * dtSeconds)
  }
  return {
    t: state.t + dtSeconds,
    x: state.x + vx * dtSeconds,
    y: state.y + vy * dtSeconds,
    vx,
    vy,
    massKg,
  }
}

/** Delta-v given by burning from mass m0 down to m1 (Tsiolkovsky rocket equation). */
export function rocketEquationDeltaV(specificImpulseSeconds, initialMassKg, finalMassKg) {
  return specificImpulseSeconds * STANDARD_GRAVITY * Math.log(initialMassKg / finalMassKg)
}

/** Specific orbital energy ε = v²/2 − μ/r. Negative = bound orbit, positive = escape. */
export function specificOrbitalEnergy(state) {
  return (state.vx ** 2 + state.vy ** 2) / 2 - EARTH_MU / Math.hypot(state.x, state.y)
}
