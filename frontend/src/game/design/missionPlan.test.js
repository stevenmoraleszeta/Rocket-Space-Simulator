import assert from 'node:assert/strict'
import test from 'node:test'
import { ANGLE_WINDOW } from '../levels/marsLaunch/marsLaunchRoute.js'
import {
  EARTH_PATHS,
  MARS_PATHS,
  blockReason,
  buildFlightLoadout,
  designReady,
  missionStamps,
  photoReport,
  planScore,
} from './missionPlan.js'

const lightEarth = {
  jobId: 'earth', toolId: 'earth-day', rocketId: 'small', pathId: 'station-orbit', radio: true,
}
const scienceEarth = {
  jobId: 'earth', toolId: 'earth-wide', rocketId: 'big', pathId: 'sun-synchronous', radio: true,
}

test('a heavy tool does not fit on the small rocket', () => {
  const design = { ...lightEarth, toolId: 'earth-wide', rocketId: 'small' }
  assert.match(blockReason(design, 'rocket', 'small'), /big rocket/)
  assert.equal(designReady(design), false)
})

test('a high road needs the big rocket', () => {
  const design = { ...lightEarth, pathId: 'sun-synchronous' }
  assert.match(blockReason(design, 'path', 'sun-synchronous'), /high/)
  assert.equal(designReady({ ...design, rocketId: 'big' }), true)
})

test('two different Earth designs both pass, and the science one scores higher', () => {
  assert.equal(designReady(lightEarth), true)
  assert.equal(designReady(scienceEarth), true)
  const low = planScore(lightEarth)
  const high = planScore(scienceEarth)
  assert.ok(low >= 60 && low < 80)
  assert.ok(high >= 95)
  assert.ok(high > low)
})

test('the quiet Mars road keeps photos until the radio is on', () => {
  const quiet = { jobId: 'mars', toolId: 'mars-camera', rocketId: 'small', pathId: 'quiet', radio: false }
  assert.equal(photoReport(quiet).delivered, 0)
  assert.equal(photoReport({ ...quiet, radio: true }).allHome, true)
  assert.ok(planScore(quiet) >= 60)
})

test('every Mars road sits inside the window that meets Mars', () => {
  for (const path of MARS_PATHS) {
    assert.ok(path.angleDeg >= ANGLE_WINDOW.min && path.angleDeg <= ANGLE_WINDOW.max)
    assert.equal(path.power, 0.75)
  }
})

test('Earth still has a low road and two high roads', () => {
  assert.equal(EARTH_PATHS.filter((path) => path.high).length, 2)
  assert.equal(EARTH_PATHS.filter((path) => !path.high).length, 1)
})

test('a finished flight gets four stamps', () => {
  const stamps = missionStamps(scienceEarth, true)
  assert.deepEqual(stamps.map((stamp) => stamp.id), ['launch', 'tool', 'ground', 'users'])
  assert.ok(stamps.every((stamp) => stamp.ok))
  const missed = missionStamps({ ...lightEarth, jobId: 'mars', toolId: 'mars-camera', pathId: 'quiet', radio: false }, true)
  assert.equal(missed.find((stamp) => stamp.id === 'ground').ok, false)
})

test('the radio and the ice finder are packed onto the rocket', () => {
  const moon = buildFlightLoadout('moon', {
    jobId: 'moon', toolId: 'moon-ice', rocketId: 'big', pathId: 'moon-road', radio: true,
  })
  assert.equal(moon.antenna, 1)
  assert.equal(moon.prospector, 1)
  assert.equal(moon.astronaut, 1)
  assert.equal(buildFlightLoadout('earth', lightEarth).antenna, 1)
  assert.equal(buildFlightLoadout('earth', { ...lightEarth, radio: false }).antenna, undefined)
})
