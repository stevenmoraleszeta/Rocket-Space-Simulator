/**
 * LAUNCH VEHICLE — turns the hangar loadout (game/parts.js, game/stats.js) into physical numbers.
 *
 * The hangar shows game units ("kg" and "thrust" points). This file documents how they become SI:
 *   real mass       = hangar kg × REAL_KG_PER_HANGAR_KG
 *   thrust force    = thrust points × THRUST_POINT_LIFT_HANGAR_KG × REAL_KG_PER_HANGAR_KG × g0
 *                     (one thrust point can hold up THRUST_POINT_LIFT_HANGAR_KG hangar kg at sea level)
 *   propellant      = PROPELLANT_HANGAR_KG (main tank) + extra propellant carried by some parts
 *   delta-v budget  = Isp · g0 · ln(m_full / m_empty)  (Tsiolkovsky)
 *
 * No condition is arbitrary: a heavy loadout lowers the thrust-to-weight ratio (it may not even lift
 * off) and lowers the delta-v budget (it may not reach orbit).
 */
import { STANDARD_GRAVITY } from '../../physics/constants.js'
import { rocketEquationDeltaV } from '../../physics/orbitalMechanics.js'
import { PARTS } from '../../parts.js'
import { HULL } from '../../stats.js'

export const REAL_KG_PER_HANGAR_KG = 1000
export const THRUST_POINT_LIFT_HANGAR_KG = 22
export const PROPELLANT_HANGAR_KG = 600
/** Extra propellant (hangar kg) carried by parts that are themselves rockets. */
export const PART_PROPELLANT_HANGAR_KG = { boosters: 300 }
/** Effective specific impulse of the whole multi-stage vehicle (s). */
export const VEHICLE_SPECIFIC_IMPULSE_SECONDS = 450
/** Drag coefficient × cross-section area (m²). */
export const VEHICLE_DRAG_AREA_M2 = 10

/** Builds the physical vehicle for a hangar loadout ({ partId: boolean }). */
export function buildLaunchVehicle(equipped) {
  let dryHangarKg = HULL.mass
  let thrustPoints = HULL.thrust
  let propellantHangarKg = PROPELLANT_HANGAR_KG

  for (const part of PARTS) {
    if (!equipped?.[part.id]) continue
    dryHangarKg += part.mass || 0
    thrustPoints += part.thrust || 0
    propellantHangarKg += PART_PROPELLANT_HANGAR_KG[part.id] || 0
  }

  const dryMassKg = dryHangarKg * REAL_KG_PER_HANGAR_KG
  const propellantMassKg = propellantHangarKg * REAL_KG_PER_HANGAR_KG
  const liftoffMassKg = dryMassKg + propellantMassKg
  const thrustNewtons = thrustPoints * THRUST_POINT_LIFT_HANGAR_KG * REAL_KG_PER_HANGAR_KG * STANDARD_GRAVITY

  return {
    dryMassKg,
    propellantMassKg,
    liftoffMassKg,
    thrustNewtons,
    specificImpulseSeconds: VEHICLE_SPECIFIC_IMPULSE_SECONDS,
    dragAreaM2: VEHICLE_DRAG_AREA_M2,
    /** Thrust-to-weight ratio on the pad. Below 1 the rocket cannot lift off. */
    thrustToWeight: thrustNewtons / (liftoffMassKg * STANDARD_GRAVITY),
    totalDeltaV: rocketEquationDeltaV(VEHICLE_SPECIFIC_IMPULSE_SECONDS, liftoffMassKg, dryMassKg),
  }
}
