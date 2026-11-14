/**
 * PHYSICAL CONSTANTS — SI units (meters, kilograms, seconds) unless the name says otherwise.
 * Real values, so trajectories behave like real ones.
 */

export const GRAVITATIONAL_CONSTANT = 6.674_30e-11 // m³ / (kg·s²)

export const EARTH_MASS_KG = 5.972e24
export const EARTH_RADIUS_METERS = 6_371_000
/** Standard gravitational parameter μ = G·M (m³/s²). */
export const EARTH_MU = GRAVITATIONAL_CONSTANT * EARTH_MASS_KG
/** Sidereal rotation rate of the Earth (rad/s). */
export const EARTH_ROTATION_RATE = 7.292_115e-5

/** Standard gravity used by the rocket equation (m/s²). */
export const STANDARD_GRAVITY = 9.806_65

/** Exponential atmosphere: density = SEA_LEVEL_DENSITY · e^(−altitude / SCALE_HEIGHT). */
export const EARTH_SEA_LEVEL_AIR_DENSITY = 1.225 // kg/m³
export const EARTH_ATMOSPHERE_SCALE_HEIGHT_METERS = 8_500
/** Above this altitude the air is so thin that drag is ignored (Kármán line). */
export const EARTH_ATMOSPHERE_TOP_METERS = 100_000
/** Stratosphere limits, only used for display. */
export const STRATOSPHERE_BOTTOM_METERS = 12_000
export const STRATOSPHERE_TOP_METERS = 50_000

export const METERS_PER_KILOMETER = 1000
