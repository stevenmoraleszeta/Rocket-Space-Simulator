/**
 * ARRIVAL ORBITS for mission 1 ("Eye on Earth": a satellite that takes pictures of the planet).
 *
 * altitudeKm      real altitude of that kind of orbit
 * inclinationDeg  real tilt of the orbit (98° = sun-synchronous, 51.6° = space station)
 * missionFit      how well the orbit serves THIS mission (1 = ideal), used for the score
 * color           color of its ring on the planet and of its card in the panel
 *
 * The first level does not ask the player to choose an orbit: it always uses the hardest one.
 * The arrival point starts SUGGESTED_ARRIVAL_OFFSET_DEG east of the launch site.
 */
import { TARGET_TOLERANCE_KILOMETERS } from './launchSimulation.js'

/** Default arrival point: degrees east of the launch site. */
export const SUGGESTED_ARRIVAL_OFFSET_DEG = 30

/** Orbits steeper than this need a polar launch direction (north or south). */
export const POLAR_INCLINATION_DEG = 80

export const ORBIT_TARGETS = [
  {
    id: 'sun-synchronous',
    name: 'Sun-synchronous orbit',
    altitudeKm: 700,
    inclinationDeg: 98,
    missionFit: 1,
    color: '#3ddc97',
    why: 'Passes over every place at the same time of day, so every photo has the same light. Landsat and Sentinel use it.',
  },
  {
    id: 'station-orbit',
    name: 'Space station orbit',
    altitudeKm: 420,
    inclinationDeg: 51.6,
    missionFit: 0.6,
    color: '#4fc3ff',
    why: 'Easy to reach, but crowded (the ISS and its cargo ships) and the thin air slows satellites down, so they fall sooner.',
  },
  {
    id: 'tropical-orbit',
    name: 'Tropical orbit',
    altitudeKm: 850,
    inclinationDeg: 20,
    missionFit: 0.75,
    color: '#ff8fd8',
    why: 'Watches the tropics many times a day, great for rain and storms, but it never sees the poles.',
  },
]

/**
 * Can this site launch into this orbit? Pure physics and safety, no arbitrary rules:
 *   - an orbit cannot be tilted less than the latitude of the site,
 *   - polar orbits need a safe northward or southward flight path, the others an eastward one.
 * @returns {{ ok: boolean, reason: string }}
 */
export function checkTargetFromSite(site, target) {
  const latitude = Math.abs(site.latitudeDeg)
  if (target.inclinationDeg < latitude) {
    return { ok: false, reason: `From ${latitude}° latitude, an orbit cannot be tilted less than ${latitude}°.` }
  }
  if (target.inclinationDeg >= POLAR_INCLINATION_DEG && !site.allowsPolar) {
    return { ok: false, reason: 'A polar launch from here would fly over towns.' }
  }
  if (target.inclinationDeg < POLAR_INCLINATION_DEG && !site.allowsEastward) {
    return { ok: false, reason: 'An eastward launch from here would fly over land and towns.' }
  }
  return { ok: true, reason: '' }
}

/**
 * How hard an orbit is to reach. A higher orbit costs more speed, and a steeper tilt gets less
 * help from the spin of the Earth. Past 90° that spin works against the rocket.
 */
export function orbitDifficulty(target) {
  const spinHelp = Math.cos((target.inclinationDeg * Math.PI) / 180)
  return target.altitudeKm - spinHelp * 400
}

/** Hardest arrival orbit. The first level uses this one and does not offer a choice. */
export function hardestOrbit(targets = ORBIT_TARGETS) {
  return targets.reduce((hardest, candidate) =>
    (orbitDifficulty(candidate) > orbitDifficulty(hardest) ? candidate : hardest))
}

/** How good a site is for this mission: the best orbit it can reach. */
export function rateSiteForMission(site) {
  const reachable = ORBIT_TARGETS.filter((target) => checkTargetFromSite(site, target).ok)
  const bestFit = Math.max(0, ...reachable.map((target) => target.missionFit))
  if (bestFit >= 1) return { level: 'great', label: 'Great for this mission' }
  if (bestFit >= 0.7) return { level: 'ok', label: 'Works, not ideal' }
  return { level: 'poor', label: 'Poor for this mission' }
}

/**
 * Score (0–100) of a successful insertion: the right orbit counts most, then precision.
 * Reported to the mission progress (src/levels) as `pct`.
 */
export function scoreOrbitInsertion(target, missKm) {
  const precision = Math.max(0, 1 - missKm / TARGET_TOLERANCE_KILOMETERS)
  return Math.round(55 + 30 * target.missionFit + 15 * precision)
}
