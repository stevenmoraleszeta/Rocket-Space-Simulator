import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CAPTURE_KM,
  EARTH_RADIUS_KM,
  HOHMANN_POWER,
  MOON_DISTANCE_KM,
  MOON_TRAFFIC,
  PARKING_ALTITUDE_KM,
  TRANSFER_OUTCOMES,
  arrivalAccuracy,
  createMoonTable,
  displayRadius,
  findTrafficHits,
  getMoonLook,
  getSunLongitude,
  simulateTransfer,
  siteSpaceAngle,
  speedForApogee,
} from './moonTransfer.js'

const KENNEDY = { longitudeDeg: -80.62 }
const DEG = Math.PI / 180

test('the Sun is near 0° longitude at the March equinox and near 90° at the June solstice', () => {
  const march = getSunLongitude(new Date(Date.UTC(2026, 2, 20, 14, 46)))
  const june = getSunLongitude(new Date(Date.UTC(2026, 5, 21, 8, 24)))
  assert.ok(Math.min(march, 2 * Math.PI - march) < 0.6 * DEG)
  assert.ok(Math.abs(june - 90 * DEG) < 0.6 * DEG)
})

test('the Moon looks full on a real full Moon and dark on a real new Moon', () => {
  // Full Moon 2026-03-03 11:38 UTC, new Moon 2026-03-19 01:23 UTC.
  const full = getMoonLook(new Date(Date.UTC(2026, 2, 3, 11, 38)))
  const fresh = getMoonLook(new Date(Date.UTC(2026, 2, 19, 1, 23)))
  assert.ok(full.illumination > 0.97, `full Moon lit ${full.illumination}`)
  assert.ok(fresh.illumination < 0.03, `new Moon lit ${fresh.illumination}`)
})

test('the squeeze keeps Earth inside and puts the Moon near 1', () => {
  assert.ok(displayRadius(EARTH_RADIUS_KM + 400) > displayRadius(EARTH_RADIUS_KM))
  assert.ok(Math.abs(displayRadius(MOON_DISTANCE_KM) - 1) < 1e-9)
})

test('a Hohmann burn from a 200 km orbit needs about 10.9 km/s', () => {
  const speed = speedForApogee(MOON_DISTANCE_KM, EARTH_RADIUS_KM + PARKING_ALTITUDE_KM)
  assert.ok(speed > 10.85 && speed < 10.95, `speed ${speed}`)
})

test('too little power falls short of the Moon', () => {
  const date = new Date(Date.UTC(2026, 10, 20, 12))
  const result = simulateTransfer({
    siteAngle: siteSpaceAngle(KENNEDY, date),
    aim: { offset: 0, power: 0 },
    moonTable: createMoonTable(date),
  })
  assert.equal(result.outcome.type, TRANSFER_OUTCOMES.SHORT)
})

test('some hour of the day reaches the Moon from Kennedy', () => {
  const start = Date.UTC(2026, 10, 20, 0)
  let arrived = null
  for (let hour = 0; hour < 48 && !arrived; hour += 1) {
    const date = new Date(start + hour * 3_600_000)
    const table = createMoonTable(date)
    const siteAngle = siteSpaceAngle(KENNEDY, date)
    for (let offset = -40; offset <= 40 && !arrived; offset += 5) {
      for (let power = HOHMANN_POWER - 0.1; power <= HOHMANN_POWER + 0.2 && !arrived; power += 0.01) {
        const result = simulateTransfer({ siteAngle, aim: { offset: offset * DEG, power }, moonTable: table })
        if (result.outcome.type === TRANSFER_OUTCOMES.ARRIVED) arrived = result
      }
    }
  }
  assert.ok(arrived, 'no launch in two days reached the Moon')
  assert.ok(arrived.outcome.t > 2 * 86_400 && arrived.outcome.t < 8 * 86_400, `trip ${arrived.outcome.t / 86_400} days`)
  assert.ok(arrivalAccuracy(arrived.outcome, CAPTURE_KM) >= 0.65)
})

test('a path through a satellite is reported as a hit', () => {
  const date = new Date(Date.UTC(2026, 10, 20, 12))
  const iss = MOON_TRAFFIC.find((object) => object.id === 'iss')
  const radius = EARTH_RADIUS_KM + iss.altitudeKm
  // Sit on the ISS for a moment: that has to count.
  const startAngle = (() => {
    const sinceEpoch = date.getTime() / 1000 - Date.UTC(2000, 0, 1, 12) / 1000
    return iss.startAngleDeg * DEG + Math.sqrt(398_600.4418 / radius ** 3) * sinceEpoch
  })()
  const samples = [{ t: 0, x: radius * Math.cos(startAngle), y: radius * Math.sin(startAngle) }]
  const hits = findTrafficHits(samples, date)
  assert.ok(hits.some((hit) => hit.object.id === 'iss'))
})

test('a full Moon gives the best map light and a new Moon the worst', async () => {
  const { mapLightFactor, lightRating } = await import('./moonTransfer.js')
  assert.equal(mapLightFactor(1), 1)
  assert.equal(mapLightFactor(0), 0.6)
  assert.ok(mapLightFactor(0.5) > mapLightFactor(0.2))
  assert.equal(lightRating(0.9).level, 3)
  assert.equal(lightRating(0.1).level, 1)
})

test('the way home from lunar orbit dips into the air at a safe height', async () => {
  const { simulateReturn, arrivalSense, findGoodAim, siteSpaceAngle } = await import('./moonTransfer.js')
  const date = new Date('2026-11-27T00:00:00Z')
  const moonTable = createMoonTable(date)
  const siteAngle = siteSpaceAngle({ longitudeDeg: -80.6 }, date)
  const good = findGoodAim({ siteAngle, moonTable, launchDate: date })
  assert.ok(good)
  const out = simulateTransfer({ siteAngle, aim: good.aim, moonTable })
  const home = simulateReturn({ moonTable, arrivalT: out.outcome.t, sense: arrivalSense(out.samples, moonTable) })
  assert.ok(home)
  assert.ok(home.entered)
  assert.ok(home.perigeeAltitudeKm > 0 && home.perigeeAltitudeKm < 100, String(home.perigeeAltitudeKm))
  const days = (home.samples.at(-1).t - home.departT) / 86400
  assert.ok(days > 1.5 && days < 6, String(days))
})
