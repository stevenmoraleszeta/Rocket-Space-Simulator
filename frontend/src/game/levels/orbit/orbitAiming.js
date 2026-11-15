/**
 * AIMING — turns where the player points (click held) into launch parameters.
 *
 *   direction from the base to the pointer -> aimTiltRadians: final tilt of the engine from straight
 *                                             up (positive = eastward, the way the Earth turns)
 *   distance from the base to the pointer  -> power: fraction of the delta-v budget for the ascent burn
 *
 * The drawn altitude is enlarged (see orbitRenderer.js) but only along the vertical, so directions
 * measured at the base on screen are the same as in the real world.
 */
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { pointOnCircle } from '../../physics/orbitalMechanics.js'
import { degreesToRadians } from './launchSimulation.js'

/** Lowest power (fraction of the delta-v budget) the pointer can choose. */
export const MIN_AIM_POWER = 0.3
/** Power used before the player moves the pointer. */
export const DEFAULT_AIM_POWER = 0.72

export const siteAngleOf = (site) => degreesToRadians(site.longitudeDeg)

/** Signed angle from the local vertical (straight up at the base) to a world direction. */
function tiltFromVertical(siteAngleRadians, directionX, directionY) {
  const radialX = Math.cos(siteAngleRadians)
  const radialY = Math.sin(siteAngleRadians)
  const cross = radialX * directionY - radialY * directionX
  const dot = radialX * directionX + radialY * directionY
  return Math.atan2(cross, dot)
}

const clampPower = (power) => Math.min(1, Math.max(MIN_AIM_POWER, power))

/** First aim: toward the arrival point, at the default power. */
export function initialAim(site, arrival) {
  const siteAngle = siteAngleOf(site)
  const start = pointOnCircle(EARTH_RADIUS_METERS, siteAngle)
  return {
    tiltRadians: tiltFromVertical(siteAngle, arrival.x - start.x, arrival.y - start.y),
    power: DEFAULT_AIM_POWER,
  }
}

/**
 * Aim from the pointer position (screen pixels) while the click is held.
 * mapRotation: how much the map is turned on screen (see mapRotationAt in orbitRenderer.js).
 */
export function aimFromPointer(site, siteScreen, pointerX, pointerY, aimMaxPixels, mapRotation = 0) {
  const screenDx = pointerX - siteScreen.x
  const screenDy = pointerY - siteScreen.y
  const distance = Math.hypot(screenDx, screenDy)
  if (distance < 4) return null
  // Screen y grows downward; world y grows upward. Undo the map turn to get the world direction.
  const dx = screenDx / distance
  const dy = -screenDy / distance
  const cos = Math.cos(-mapRotation)
  const sin = Math.sin(-mapRotation)
  return {
    tiltRadians: tiltFromVertical(siteAngleOf(site), dx * cos - dy * sin, dx * sin + dy * cos),
    power: clampPower(distance / aimMaxPixels),
  }
}
