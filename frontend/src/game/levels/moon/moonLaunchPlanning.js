import { EARTH_RADIUS_METERS } from '../../physics/constants.js'

const EARTH_RADIUS_KILOMETERS = EARTH_RADIUS_METERS / 1000
export const MOON_MEAN_DISTANCE_KM = 384_400
export const MOON_SYNODIC_MONTH_DAYS = 29.530588853
export const MOON_ORBIT_ECCENTRICITY = 0.0549
export const MOON_WINDOW_TOLERANCE_DEGREES = 8
export const MOON_MIN_CLEARANCE_KM = 50
export const MOON_TRANSFER_DAYS = Math.PI * Math.sqrt(
  ((EARTH_RADIUS_KILOMETERS + 200 + MOON_MEAN_DISTANCE_KM) / 2) ** 3 / 398600.4418,
) / 86400

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
const MOON_EPOCH_JD = 2451545
const NEW_MOON_EPOCH_JD = 2451550.1
const PARKING_ORBIT_KM = EARTH_RADIUS_KILOMETERS + 200
const EARTH_MU_KM = 398600.4418
const TRAFFIC_EPOCH = Date.UTC(2000, 0, 1, 12) / 1000
const ORBITAL_TRAFFIC = [
  { id: 'iss', name: 'ISS · satellite', altitudeKm: 420, phase: radians(15), kind: 'satellite' },
  { id: 'leo-satellite', name: 'Imaging satellite', altitudeKm: 700, phase: radians(118), kind: 'satellite' },
  { id: 'leo-debris-a', name: 'Debris track A', altitudeKm: 560, phase: radians(224), kind: 'debris' },
  { id: 'leo-debris-b', name: 'Debris track B', altitudeKm: 900, phase: radians(301), kind: 'debris' },
  { id: 'geo-satellite', name: 'Weather satellite', altitudeKm: 35786, phase: radians(262), kind: 'satellite' },
]

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5
}

function radians(degrees) {
  return degrees * DEG_TO_RAD
}

function normalizeRadians(angle) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

function signedRadians(angle) {
  return ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
}

export function parseLaunchDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getMoonPosition(date) {
  const days = julianDay(date) - MOON_EPOCH_JD
  const centuries = days / 36525
  const meanLongitude = 218.3164477 + 481267.88123421 * centuries
  const meanAnomaly = radians(134.9633964 + 477198.8675055 * centuries)
  const elongation = radians(297.8501921 + 445267.1114034 * centuries)
  const argumentLatitude = radians(93.272095 + 483202.0175233 * centuries)
  let eccentricAnomaly = meanAnomaly
  for (let iteration = 0; iteration < 5; iteration += 1) {
    eccentricAnomaly -= (
      eccentricAnomaly - MOON_ORBIT_ECCENTRICITY * Math.sin(eccentricAnomaly) - meanAnomaly
    ) / (1 - MOON_ORBIT_ECCENTRICITY * Math.cos(eccentricAnomaly))
  }
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + MOON_ORBIT_ECCENTRICITY) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - MOON_ORBIT_ECCENTRICITY) * Math.cos(eccentricAnomaly / 2),
  )
  const longitude = radians(
    meanLongitude
      + 6.289 * Math.sin(meanAnomaly)
      + 1.274 * Math.sin(2 * elongation - meanAnomaly)
      + 0.658 * Math.sin(2 * elongation)
      + 0.214 * Math.sin(2 * meanAnomaly),
  )
  const latitude = radians(
    5.128 * Math.sin(argumentLatitude)
      + 0.280 * Math.sin(meanAnomaly + argumentLatitude)
      + 0.277 * Math.sin(meanAnomaly - argumentLatitude),
  )
  const distanceKm = 385000.56
    - 20905 * Math.cos(meanAnomaly)
    - 3699 * Math.cos(2 * elongation - meanAnomaly)
    - 2956 * Math.cos(2 * elongation)
    - 570 * Math.cos(2 * meanAnomaly)

  return {
    longitude,
    latitude,
    distanceKm,
    eccentricity: MOON_ORBIT_ECCENTRICITY,
    perigeeLongitude: normalizeRadians(longitude - trueAnomaly),
  }
}

export function getLunarPhase(date) {
  const ageDays = ((julianDay(date) - NEW_MOON_EPOCH_JD) % MOON_SYNODIC_MONTH_DAYS + MOON_SYNODIC_MONTH_DAYS)
    % MOON_SYNODIC_MONTH_DAYS
  const phaseAngle = (ageDays / MOON_SYNODIC_MONTH_DAYS) * Math.PI * 2
  const names = [
    'New Moon',
    'Waxing crescent',
    'First quarter',
    'Waxing gibbous',
    'Full Moon',
    'Waning gibbous',
    'Last quarter',
    'Waning crescent',
  ]
  const phaseIndex = Math.round((ageDays / MOON_SYNODIC_MONTH_DAYS) * names.length) % names.length
  const symbols = ['moon-new', 'moon-crescent', 'moon-half', 'moon-gibbous', 'moon-full', 'moon-waning-gibbous', 'moon-last-quarter', 'moon-waning-crescent']
  return {
    ageDays,
    phaseIndex,
    name: names[phaseIndex],
    symbol: symbols[phaseIndex],
    illumination: (1 - Math.cos(phaseAngle)) / 2,
  }
}

export function getGreenwichSiderealAngle(date) {
  const jd = julianDay(date)
  const centuries = (jd - MOON_EPOCH_JD) / 36525
  const degrees = 280.46061837
    + 360.98564736629 * (jd - MOON_EPOCH_JD)
    + 0.000387933 * centuries ** 2
    - centuries ** 3 / 38710000
  return normalizeRadians(radians(degrees))
}

export function getLaunchSitePosition(site, date) {
  const angle = normalizeRadians(getGreenwichSiderealAngle(date) + radians(site.longitudeDeg))
  const latitude = radians(site.latitudeDeg)
  const projectedRadius = Math.cos(latitude)
  return {
    angle,
    latitude,
    x: projectedRadius * Math.cos(angle),
    y: projectedRadius * Math.sin(angle),
  }
}

export function getMoonTransferPlan(site, date) {
  const departure = getLaunchSitePosition(site, date)
  const arrivalDate = new Date(date.getTime() + MOON_TRANSFER_DAYS * 86400000)
  const moonAtArrival = getMoonPosition(arrivalDate)
  const expectedArrivalAngle = normalizeRadians(departure.angle + Math.PI)
  const angularMiss = signedRadians(moonAtArrival.longitude - expectedArrivalAngle)
  const periapsisKm = PARKING_ORBIT_KM
  const apoapsisKm = MOON_MEAN_DISTANCE_KM
  const semiMajorAxisKm = (periapsisKm + apoapsisKm) / 2
  const eccentricity = (apoapsisKm - periapsisKm) / (apoapsisKm + periapsisKm)
  const transferSeconds = MOON_TRANSFER_DAYS * 86400
  const pointAt = (elapsedSeconds) => {
    const meanAnomaly = Math.PI * elapsedSeconds / transferSeconds
    let eccentricAnomaly = meanAnomaly
    for (let iteration = 0; iteration < 5; iteration += 1) {
      eccentricAnomaly -= (
        eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly
      ) / (1 - eccentricity * Math.cos(eccentricAnomaly))
    }
    const localX = semiMajorAxisKm * (Math.cos(eccentricAnomaly) - eccentricity)
    const localY = semiMajorAxisKm * Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentricAnomaly)
    const x = localX * Math.cos(departure.angle) - localY * Math.sin(departure.angle)
    const y = localX * Math.sin(departure.angle) + localY * Math.cos(departure.angle)
    return { x, y, elapsedSeconds }
  }
  const trajectory = Array.from({ length: 97 }, (_, index) => pointAt((transferSeconds * index) / 96))
  const traffic = ORBITAL_TRAFFIC.map((object) => {
    const radiusKm = EARTH_RADIUS_KILOMETERS + object.altitudeKm
    const meanMotion = Math.sqrt(EARTH_MU_KM / radiusKm ** 3)
    const initialAngle = normalizeRadians(
      object.phase + meanMotion * (date.getTime() / 1000 - TRAFFIC_EPOCH),
    )
    let closestKm = Infinity
    for (let elapsedSeconds = 0; elapsedSeconds <= transferSeconds; elapsedSeconds += 600) {
      const probe = pointAt(elapsedSeconds)
      const objectAngle = initialAngle + meanMotion * elapsedSeconds
      const objectX = radiusKm * Math.cos(objectAngle)
      const objectY = radiusKm * Math.sin(objectAngle)
      closestKm = Math.min(closestKm, Math.hypot(probe.x - objectX, probe.y - objectY))
    }
    return {
      ...object,
      radiusKm,
      meanMotion,
      initialAngle,
      closestKm,
    }
  })
  const closestApproachKm = Math.min(...traffic.map((object) => object.closestKm))

  return {
    departure,
    arrivalDate,
    moonAtArrival,
    expectedArrivalAngle,
    angularMiss,
    missDegrees: Math.abs(angularMiss * RAD_TO_DEG),
    transferDays: MOON_TRANSFER_DAYS,
    phaseAtLaunch: getLunarPhase(date),
    phaseAtArrival: getLunarPhase(arrivalDate),
    traffic,
    closestApproachKm,
    safeWindow: Math.abs(angularMiss * RAD_TO_DEG) <= MOON_WINDOW_TOLERANCE_DEGREES
      && closestApproachKm >= MOON_MIN_CLEARANCE_KM,
    trajectory,
  }
}

export function createMoonFlightView(site, date) {
  const plan = getMoonTransferPlan(site, date)
  const orbitRadius = 0.37 + (
    (plan.moonAtArrival.distanceKm - 363300) / (405500 - 363300)
  ) * 0.04
  const earth = { x: 0.5, y: 0.5, radius: 0.11, gravity: 0.7 }
  const moon = {
    x: earth.x + orbitRadius * Math.cos(plan.moonAtArrival.longitude),
    y: earth.y - orbitRadius * Math.sin(plan.moonAtArrival.longitude),
    radius: 0.055,
    gravity: 0.15,
    captureRadius: 0.12,
  }
  const launch = {
    x: earth.x + earth.radius * Math.cos(plan.departure.angle),
    y: earth.y - earth.radius * Math.sin(plan.departure.angle),
  }

  return {
    width: 400,
    height: 600,
    earth,
    moon,
    launch,
    asteroids: [
      { x: 0.24, y: 0.49, radius: 0.025 },
      { x: 0.73, y: 0.39, radius: 0.028 },
      { x: 0.36, y: 0.27, radius: 0.022 },
    ],
  }
}

export function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function formatLaunchDate(date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
