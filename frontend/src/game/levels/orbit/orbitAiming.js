/**
 * AIMING — turns where the player points (click held) into launch parameters.
 *
 *   direction from the base to the pointer -> aimTiltRadians: final tilt of the engine from straight
 *                                             up (positive = eastward, the way the Earth turns)
 *   distance from the base to the pointer  -> power: fraction of the delta-v budget for the ascent burn
 *
 * The drawn altitude is enlarged (see orbitRenderer.js) but only along the vertical, so directions
 * measured at the base on screen are the same as in the real world.
 *
 * The aim works like a mechanical arm: it can tilt at most AIM_TILT_MAX from straight up (just
 * short of flat, never into the ground), and both the tilt and the power move in small clicks
 * (AIM_TILT_STEP, AIM_POWER_STEP). The crosshair is drawn where the arm really points.
 * Reaching orbit needs a nearly flat aim (about 73° to 88°) and a precise power, so
 * findGoodLaunchAim() backs the "Help me aim" button.
 */
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { pointOnCircle } from '../../physics/orbitalMechanics.js'
import { OUTCOMES, degreesToRadians, simulateLaunch } from './launchSimulation.js'

/** Lowest power (fraction of the delta-v budget) the pointer can choose. */
export const MIN_AIM_POWER = 0.3
/** Power used before the player moves the pointer. */
export const DEFAULT_AIM_POWER = 0.72
/** Farthest the arm tilts from straight up: almost flat, but never pointing into Earth. */
export const AIM_TILT_MAX = degreesToRadians(88)
/** The arm moves in clicks: 1° of tilt, 1% of power. */
export const AIM_TILT_STEP = degreesToRadians(1)
export const AIM_POWER_STEP = 0.01

export const siteAngleOf = (site) => degreesToRadians(site.longitudeDeg)

/** Signed angle from the local vertical (straight up at the base) to a world direction. */
function tiltFromVertical(siteAngleRadians, directionX, directionY) {
  const radialX = Math.cos(siteAngleRadians)
  const radialY = Math.sin(siteAngleRadians)
  const cross = radialX * directionY - radialY * directionX
  const dot = radialX * directionX + radialY * directionY
  return Math.atan2(cross, dot)
}

const clampPower = (power) => Math.min(1, Math.max(MIN_AIM_POWER, Math.round(power / AIM_POWER_STEP) * AIM_POWER_STEP))
const clampTilt = (tilt) => Math.max(-AIM_TILT_MAX, Math.min(AIM_TILT_MAX, Math.round(tilt / AIM_TILT_STEP) * AIM_TILT_STEP))

/** Screen direction (unit vector, y down) of the arm for a tilt at a base. */
function armDirection(siteAngleRadians, tiltRadians) {
  const angle = siteAngleRadians + tiltRadians
  return { x: Math.cos(angle), y: -Math.sin(angle) }
}

/** First aim: toward the arrival point, at the default power. */
export function initialAim(site, arrival) {
  const siteAngle = siteAngleOf(site)
  const start = pointOnCircle(EARTH_RADIUS_METERS, siteAngle)
  return {
    tiltRadians: clampTilt(tiltFromVertical(siteAngle, arrival.x - start.x, arrival.y - start.y)),
    power: DEFAULT_AIM_POWER,
  }
}

/** Where the arm's crosshair sits on screen for an aim (screen pixels). */
export function aimArmPoint(site, siteScreen, aim, aimMaxPixels) {
  const arm = armDirection(siteAngleOf(site), aim.tiltRadians)
  return {
    x: siteScreen.x + arm.x * aim.power * aimMaxPixels,
    y: siteScreen.y + arm.y * aim.power * aimMaxPixels,
    base: { x: siteScreen.x, y: siteScreen.y },
  }
}

/**
 * "Help me aim": the first aim on the arm's clicks that reaches the target orbit without hitting
 * a satellite. Orbit is only possible on nearly flat tilts (about 60° to 88°) with about 60–85%
 * power, so it looks only there, flattest first, eastward then westward, and stops at the first
 * aim that works (fast enough to run on a click). Null when nothing from this base works.
 */
export function findGoodLaunchAim({ site, arrival, vehicle, rotationBoost, satellites }) {
  const siteAngleRadians = siteAngleOf(site)
  for (const sign of [1, -1]) {
    for (let degrees = 88; degrees >= 60; degrees -= 1) {
      const tiltRadians = degreesToRadians(degrees * sign)
      for (let step = 60; step <= 85; step += 1) {
        const power = step / 100
        const result = simulateLaunch({
          siteAngleRadians,
          rotationBoost,
          arrival,
          vehicle,
          aimTiltRadians: tiltRadians,
          ascentDeltaV: power * vehicle.totalDeltaV,
          satellites,
        })
        if (result.outcome.type === OUTCOMES.ORBIT_REACHED) return { tiltRadians, power }
      }
    }
  }
  return null
}

/**
 * Aim from the pointer position (screen pixels) while the click is held. Also returns `point`,
 * where the arm's crosshair goes (the clamped, clicked aim), and `base`, where the arm starts.
 */
export function aimFromPointer(site, siteScreen, pointerX, pointerY, aimMaxPixels) {
  const screenDx = pointerX - siteScreen.x
  const screenDy = pointerY - siteScreen.y
  const distance = Math.hypot(screenDx, screenDy)
  if (distance < 4) return null
  // Screen y grows downward; world y grows upward.
  const siteAngle = siteAngleOf(site)
  const tiltRadians = clampTilt(tiltFromVertical(siteAngle, screenDx / distance, -screenDy / distance))
  const power = clampPower(distance / aimMaxPixels)
  const arm = armDirection(siteAngle, tiltRadians)
  return {
    tiltRadians,
    power,
    base: { x: siteScreen.x, y: siteScreen.y },
    point: { x: siteScreen.x + arm.x * power * aimMaxPixels, y: siteScreen.y + arm.y * power * aimMaxPixels },
  }
}
