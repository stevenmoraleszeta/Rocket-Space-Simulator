/**
 * LIFE SUPPORT — real rates, applied to the parts the rocket can carry today.
 *
 * Sources (nominal, one crew member):
 *   Food     1.83 kg/person/day   NASA Baseline Values and Assumptions Document (food + packaging)
 *   Water    2.50 kg/person/day   NASA-STD-3001 potable water (drinking + food rehydration)
 *   Oxygen   0.84 kg/person/day   NASA BVAD metabolic oxygen
 *   Plants   0.50 kg water/day    NASA Veggie drinks while its lights are on (~70 W)
 *   Sick     about day 2          space motion sickness peaks 24–48 h into a long flight
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
import { HULL, PARTS, partCount, partsForMission } from './parts.js'

export const FOOD_KG_PER_PERSON_DAY = 1.83
export const WATER_KG_PER_PERSON_DAY = 2.5
export const O2_KG_PER_PERSON_DAY = 0.84
/** Space motion sickness usually peaks between the first and second day. */
export const SPACE_SICK_SECONDS = 36 * 3600
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
  budget: 124,
  mass: 100,
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
  let waterDays = 0
  let plantWaterPerDay = 0
  let waterRecycle = 0
  let medicineCount = 0
  let o2Kg = HULL.o2Kg
  let o2Recycle = 0
  let crew = 0
  const offered = partsForMission(mission?.id)
  const tracksWater = offered.some((part) => part.waterDays)
  const tracksMedicine = offered.some((part) => part.medicine)

  for (const part of PARTS) {
    const count = partCount(equipped, part.id)
    if (count <= 0) continue
    cost += (part.cost || 0) * count
    massKg += (part.mass || 0) * count
    energyPoints += (part.energy || 0) * count
    heat += (part.heat || 0) * count
    thrust += (part.thrust || 0) * count
    foodDays += (part.foodDays || 0) * count
    waterDays += (part.waterDays || 0) * count
    plantWaterPerDay += (part.waterKgPerDay || 0) * count
    if (part.waterRecycle) waterRecycle = Math.max(waterRecycle, part.waterRecycle)
    if (part.medicine) medicineCount += count
    o2Kg += (part.o2Kg || 0) * count
    if (part.o2Recycle) o2Recycle = Math.max(o2Recycle, part.o2Recycle)
    if (part.id === 'astronaut') crew += count
  }

  // A scrubber puts most exhaled oxygen back. Makeup is the fraction still drawn from the tanks.
  const o2Makeup = 1 - Math.min(0.97, Math.max(0, o2Recycle))
  // A recycler does the same for drinking water. Plants still drink fresh water.
  const waterMakeup = 1 - Math.min(0.98, Math.max(0, waterRecycle))

  const foodKg = foodDays * FOOD_KG_PER_PERSON_DAY
  // Cabin water covers a short orbit. Bottles are what a longer trip drinks.
  const waterKg = waterDays * WATER_KG_PER_PERSON_DAY + (HULL.waterKg || 0)
  const durationSeconds = limits.durationSeconds
  const durationDays = durationSeconds / DAY_SECONDS
  const minCrew = limits.minCrew ?? 1
  // The bars show what the pilots you still need would use, even before they are aboard.
  const planningCrew = Math.max(crew, minCrew)
  const foodNeedKg = planningCrew * FOOD_KG_PER_PERSON_DAY * durationDays
  const waterNeedKg = tracksWater
    ? (planningCrew * WATER_KG_PER_PERSON_DAY * waterMakeup + plantWaterPerDay) * durationDays
    : 0
  const o2NeedKg = planningCrew * O2_KG_PER_PERSON_DAY * o2Makeup * durationDays
  const foodSeconds = crew > 0 ? (foodDays / crew) * DAY_SECONDS : Infinity
  const waterPerDay = tracksWater
    ? crew * WATER_KG_PER_PERSON_DAY * waterMakeup + plantWaterPerDay
    : 0
  const waterSeconds = waterPerDay > 0 ? (waterKg / waterPerDay) * DAY_SECONDS : Infinity
  const airSeconds = crew > 0 ? (o2Kg / (crew * O2_KG_PER_PERSON_DAY * o2Makeup)) * DAY_SECONDS : Infinity

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
    waterKg,
    waterNeedKg,
    plantWaterPerDay,
    medicineCount,
    tracksWater,
    tracksMedicine,
    o2Kg,
    foodNeedKg,
    o2NeedKg,
    foodSeconds,
    waterSeconds,
    airSeconds,
    waterMakeup,
    o2Makeup,
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
  consider(report.waterSeconds, 'outOfWater')
  consider(report.airSeconds, 'outOfAir')
  // A loop around Earth is over before space sickness shows up. Longer trips are not.
  // Only missions that sell a medical kit can fail this way.
  if (report.tracksMedicine && report.medicineCount <= 0 && report.durationSeconds > DAY_SECONDS) {
    consider(SPACE_SICK_SECONDS, 'spaceSick')
  }
  return soonest
}

/** Food and oxygen still on board after `elapsedSeconds`. */
export function storesAt(report, elapsedSeconds) {
  const elapsed = Math.max(0, elapsedSeconds)
  const foodKg = report.crew > 0
    ? Math.max(0, report.foodKg - report.crew * FOOD_KG_PER_PERSON_DAY * (elapsed / DAY_SECONDS))
    : report.foodKg
  const makeup = report.o2Makeup ?? 1
  const waterPerDay = report.tracksWater
    ? report.crew * WATER_KG_PER_PERSON_DAY * (report.waterMakeup ?? 1) + (report.plantWaterPerDay || 0)
    : 0
  const waterKg = waterPerDay > 0
    ? Math.max(0, (report.waterKg || 0) - waterPerDay * (elapsed / DAY_SECONDS))
    : (report.waterKg || 0)
  const o2Kg = report.crew > 0
    ? Math.max(0, report.o2Kg - report.crew * O2_KG_PER_PERSON_DAY * makeup * (elapsed / DAY_SECONDS))
    : report.o2Kg
  return {
    foodKg,
    waterKg,
    o2Kg,
    foodSecondsLeft: report.crew > 0 ? foodKg / (report.crew * FOOD_KG_PER_PERSON_DAY) * DAY_SECONDS : Infinity,
    waterSecondsLeft: waterPerDay > 0 ? (waterKg / waterPerDay) * DAY_SECONDS : Infinity,
    airSecondsLeft: report.crew > 0 ? o2Kg / (report.crew * O2_KG_PER_PERSON_DAY * makeup) * DAY_SECONDS : Infinity,
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
  const waterBad = report.crew > 0 && stores.waterSecondsLeft < 60
  const airBad = report.crew > 0 && stores.airSecondsLeft < 60
  const longTrip = report.tracksMedicine && report.durationSeconds > DAY_SECONDS
  const rows = [
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
    ...(report.tracksWater
      ? [{
        id: 'water',
        label: 'Water',
        value: `${formatKg(stores.waterKg)} · ${formatTimeLeft(stores.waterSecondsLeft)}`,
        bad: waterBad,
      }]
      : []),
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
  if (longTrip) {
    rows.push({
      id: 'medicine',
      label: 'Medicine',
      value: report.medicineCount > 0 ? 'on board' : 'none',
      bad: report.medicineCount <= 0 && elapsedSeconds + 60 >= SPACE_SICK_SECONDS,
    })
  }
  return rows
}
