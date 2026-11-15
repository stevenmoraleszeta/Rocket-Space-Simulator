/**
 * LIFE SUPPORT — real rates, applied to the parts the rocket can carry today.
 *
 * Sources (nominal, one crew member):
 *   Food     1.83 kg/person/day   NASA Baseline Values and Assumptions Document (food + packaging)
 *   Oxygen   0.84 kg/person/day   NASA BVAD metabolic oxygen
 *   Cabin    22 °C                ISS is held near 22 °C; NASA-STD-3001 comfort band is 18–27 °C
 *   Outside  US Standard Atmosphere 1976 up to 86 km
 *   Sunlight about +121 °C        NASA, sunlit surfaces in low Earth orbit
 *   Ascent   about 10 min         crewed rockets usually reach orbit in 8–12 minutes
 *   Orbit    98.6 min at 700 km   the sun-synchronous arrival orbit of mission 1
 *
 * Power on the ship: 1 hangar energy point = 40 W of draw and 40 W the ship can supply.
 * The level-1 ship (shield + boosters + one astronaut) draws 1,040 W from 1,600 W.
 */
import { EARTH_RADIUS_METERS, EARTH_MU } from './physics/constants.js'
import { airDensityAt } from './physics/orbitalMechanics.js'
import { HULL, PARTS, partCount } from './parts.js'

export const FOOD_KG_PER_PERSON_DAY = 1.83
export const O2_KG_PER_PERSON_DAY = 0.84
/** Hangar energy points, as watts the ship can feed and as watts each part draws. */
export const WATTS_PER_ENERGY_POINT = 40
export const CABIN_CELSIUS = 22
/** Above this the crew cannot keep working. Comfort ends near 27 °C. */
export const CABIN_LIMIT_CELSIUS = 35
const DAY_SECONDS = 86400
/** Nose radius used in the Sutton-Graves heat estimate (m). */
const NOSE_RADIUS_METERS = 0.6
const STEFAN_BOLTZMANN = 5.670374419e-8
const SKIN_EMISSIVITY = 0.8
/** Sutton-Graves constant for Earth, heat flux in W/m² with speed in m/s. */
const SUTTON_GRAVES = 1.83e-4

/** One revolution at 700 km, plus the climb to get there. Mission 1 has to last this long. */
export function earthOrbitSeconds() {
  const radius = EARTH_RADIUS_METERS + 700_000
  const period = 2 * Math.PI * Math.sqrt(radius ** 3 / EARTH_MU)
  return Math.round(period + 10 * 60)
}

const FALLBACK_LIMITS = {
  budget: 110,
  mass: 94,
  energy: 40,
  heat: 20,
  thrust: 40,
  minCrew: 1,
  durationSeconds: 6518,
}

/** Food, oxygen, power, mass, and crew actually packed. */
export function supplyReport(equipped, mission) {
  const limits = { ...FALLBACK_LIMITS, ...(mission?.loadout ?? {}) }
  let cost = 0
  let massKg = HULL.mass
  let energyPoints = 0
  let heat = 0
  let thrust = HULL.thrust
  let foodDays = 0
  let o2Kg = HULL.o2Kg
  let crew = 0

  for (const part of PARTS) {
    const count = partCount(equipped, part.id)
    if (count <= 0) continue
    cost += (part.cost || 0) * count
    massKg += (part.mass || 0) * count
    energyPoints += (part.energy || 0) * count
    heat += (part.heat || 0) * count
    thrust += (part.thrust || 0) * count
    foodDays += (part.foodDays || 0) * count
    o2Kg += (part.o2Kg || 0) * count
    if (part.id === 'astronaut') crew += count
  }

  const foodKg = foodDays * FOOD_KG_PER_PERSON_DAY
  const durationSeconds = limits.durationSeconds
  const durationDays = durationSeconds / DAY_SECONDS
  const minCrew = limits.minCrew ?? 1
  // The bars show what the pilots you still need would use, even before they are aboard.
  const planningCrew = Math.max(crew, minCrew)
  const foodNeedKg = planningCrew * FOOD_KG_PER_PERSON_DAY * durationDays
  const o2NeedKg = planningCrew * O2_KG_PER_PERSON_DAY * durationDays
  const foodSeconds = crew > 0 ? (foodDays / crew) * DAY_SECONDS : Infinity
  const airSeconds = crew > 0 ? (o2Kg / (crew * O2_KG_PER_PERSON_DAY)) * DAY_SECONDS : Infinity

  return {
    limits,
    crew,
    minCrew,
    cost,
    massKg,
    heat,
    thrust,
    foodKg,
    foodDays,
    o2Kg,
    foodNeedKg,
    o2NeedKg,
    foodSeconds,
    airSeconds,
    durationSeconds,
    drawWatts: energyPoints * WATTS_PER_ENERGY_POINT,
    supplyWatts: (limits.energy || 0) * WATTS_PER_ENERGY_POINT,
  }
}

/**
 * First supply that runs out during the trip, or null when food and oxygen last.
 * Power is checked at liftoff: either the ship can feed the parts, or it cannot.
 */
export function earliestSupplyEnd(report) {
  if (report.crew <= 0) return null
  let soonest = null
  const consider = (atSeconds, id) => {
    if (atSeconds + 1 < report.durationSeconds && (soonest == null || atSeconds < soonest.atSeconds)) {
      soonest = { id, atSeconds }
    }
  }
  consider(report.foodSeconds, 'outOfFood')
  consider(report.airSeconds, 'outOfAir')
  return soonest
}

/** Food and oxygen still on board after `elapsedSeconds`. */
export function storesAt(report, elapsedSeconds) {
  const elapsed = Math.max(0, elapsedSeconds)
  const foodKg = report.crew > 0
    ? Math.max(0, report.foodKg - report.crew * FOOD_KG_PER_PERSON_DAY * (elapsed / DAY_SECONDS))
    : report.foodKg
  const o2Kg = report.crew > 0
    ? Math.max(0, report.o2Kg - report.crew * O2_KG_PER_PERSON_DAY * (elapsed / DAY_SECONDS))
    : report.o2Kg
  return {
    foodKg,
    o2Kg,
    foodSecondsLeft: report.crew > 0 ? foodKg / (report.crew * FOOD_KG_PER_PERSON_DAY) * DAY_SECONDS : Infinity,
    airSecondsLeft: report.crew > 0 ? o2Kg / (report.crew * O2_KG_PER_PERSON_DAY) * DAY_SECONDS : Infinity,
  }
}

/** Air temperature (°C) from the US Standard Atmosphere 1976. Above 86 km, a sunlit surface. */
export function outsideTemperatureCelsius(altitudeMeters) {
  const km = Math.max(0, altitudeMeters) / 1000
  if (km <= 11) return 15 - 6.5 * km
  if (km <= 20) return -56.5
  if (km <= 32) return -56.5 + (km - 20)
  if (km <= 47) return -44.5 + 2.8 * (km - 32)
  if (km <= 51) return -2.5
  if (km <= 71) return -2.5 - 2.8 * (km - 51)
  if (km <= 86) return -58.5 - 2 * (km - 71)
  return 121
}

/**
 * Temperature of the rocket's skin (°C). In the air it follows aerodynamic heating
 * (Sutton-Graves heat flux, then the temperature that radiates that heat away).
 * Above the atmosphere it is the sunlit-surface temperature.
 */
export function rocketSkinCelsius(altitudeMeters, speedMetersPerSecond) {
  const air = outsideTemperatureCelsius(altitudeMeters)
  if (altitudeMeters >= 86_000) return 121
  const density = airDensityAt(altitudeMeters)
  const speed = Math.max(0, speedMetersPerSecond)
  const heatFlux = SUTTON_GRAVES * Math.sqrt(density / NOSE_RADIUS_METERS) * speed ** 3
  if (!(heatFlux > 1)) return air
  const kelvin = (heatFlux / (SKIN_EMISSIVITY * STEFAN_BOLTZMANN)) ** 0.25
  if (!Number.isFinite(kelvin)) return air
  return Math.max(air, kelvin - 273.15)
}

/** Cabin temperature. A heat shield holds it at 22 °C. Without one, heat soaks in. */
export function cabinCelsius(heat, heatNeed, skinCelsius) {
  if (heatNeed > 0 && heat >= heatNeed) return CABIN_CELSIUS
  const soak = Math.max(0, skinCelsius - CABIN_CELSIUS)
  return Math.min(skinCelsius, CABIN_CELSIUS + soak * 0.45)
}

export function formatKg(kg) {
  const safe = Math.max(0, kg)
  if (safe < 0.005) return '0 kg'
  return safe >= 10 ? `${safe.toFixed(1)} kg` : `${safe.toFixed(2)} kg`
}

export function formatTimeLeft(seconds) {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds <= 0) return '0 min'
  const days = seconds / DAY_SECONDS
  if (days >= 2) return `${days.toFixed(1)} d`
  const hours = seconds / 3600
  if (hours >= 1) return `${hours.toFixed(1)} h`
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}

/** Mission clock: m:ss, h:mm:ss, or days. */
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const days = Math.floor(total / DAY_SECONDS)
  const hours = Math.floor((total % DAY_SECONDS) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (days > 0) return `${days}d ${hours}h`
  const mm = String(minutes).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')
  if (hours > 0) return `${hours}:${mm}:${ss}`
  return `${minutes}:${ss}`
}

/**
 * Rows for the flight panel. `conditions.altitudeMeters` and `speedMetersPerSecond`
 * come from the real trajectory when there is one. A coast in deep space can omit them.
 */
export function flightReadout(equipped, mission, elapsedSeconds, conditions = {}) {
  const report = supplyReport(equipped, mission)
  const stores = storesAt(report, elapsedSeconds)
  const altitude = conditions.altitudeMeters ?? 400_000
  const speed = conditions.speedMetersPerSecond ?? 0
  const outside = outsideTemperatureCelsius(altitude)
  const skin = rocketSkinCelsius(altitude, speed)
  const cabin = cabinCelsius(report.heat, report.limits.heat, skin)
  const foodBad = report.crew > 0 && stores.foodSecondsLeft < 60
  const airBad = report.crew > 0 && stores.airSecondsLeft < 60
  return [
    { id: 'time', label: 'Time', value: formatClock(elapsedSeconds) },
    { id: 'cabin', label: 'Cabin', value: `${Math.round(cabin)}°C`, bad: cabin >= CABIN_LIMIT_CELSIUS },
    { id: 'outside', label: 'Outside', value: `${Math.round(outside)}°C` },
    { id: 'skin', label: 'Rocket', value: `${Math.round(skin)}°C`, bad: cabin >= CABIN_LIMIT_CELSIUS },
    {
      id: 'food',
      label: 'Food',
      value: `${formatKg(stores.foodKg)} · ${formatTimeLeft(stores.foodSecondsLeft)}`,
      bad: foodBad,
    },
    {
      id: 'air',
      label: 'Oxygen',
      value: `${formatKg(stores.o2Kg)} · ${formatTimeLeft(stores.airSecondsLeft)}`,
      bad: airBad,
    },
    {
      id: 'power',
      label: 'Power',
      value: `${Math.round(report.drawWatts)} / ${Math.round(report.supplyWatts)} W`,
      bad: report.drawWatts > report.supplyWatts,
    },
    { id: 'crew', label: 'Crew', value: String(report.crew), bad: report.crew < report.minCrew },
    { id: 'mass', label: 'Mass', value: `${report.massKg} kg`, bad: report.massKg > report.limits.mass },
  ]
}
