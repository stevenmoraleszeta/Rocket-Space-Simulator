import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  IDEAL_POWER,
  MARS_DEG_PER_DAY,
  MARS_HAZARDS,
  MARS_OUTCOMES,
  TARGET_ANGLE_DEG,
  hazardPosition,
  simulateMarsTrip,
} from './marsLaunchRoute.js'

test('the exact angle with the ideal power meets Mars', () => {
  const trip = simulateMarsTrip(TARGET_ANGLE_DEG, IDEAL_POWER)
  assert.equal(trip.outcome.type, MARS_OUTCOMES.REACHED)
  assert.ok(Math.abs(trip.outcome.marsOffsetDeg) < 0.01)
})

test('the right path slips between every hazard', () => {
  const trip = simulateMarsTrip(TARGET_ANGLE_DEG, IDEAL_POWER)
  for (const hazard of MARS_HAZARDS) {
    const closest = Math.min(...trip.samples.map((s) => {
      const spot = hazardPosition(hazard, s.day)
      return Math.hypot(spot.x - s.x, spot.y - s.y)
    }))
    assert.ok(closest > hazard.dangerAu, `${hazard.id} passes ${closest.toFixed(3)} AU away`)
  }
})

test('a few tenths of a degree off no longer meets Mars', () => {
  for (const angle of [TARGET_ANGLE_DEG - 0.3, TARGET_ANGLE_DEG + 0.3, 130, 140]) {
    const trip = simulateMarsTrip(angle, IDEAL_POWER)
    assert.notEqual(trip.outcome.type, MARS_OUTCOMES.REACHED, `${angle}°`)
  }
})

test('a missed Mars says how many days away it was, at its real speed', () => {
  const trip = simulateMarsTrip(TARGET_ANGLE_DEG - 0.3, IDEAL_POWER)
  assert.equal(trip.outcome.type, MARS_OUTCOMES.MISSED)
  assert.ok(Math.abs(MARS_DEG_PER_DAY - 0.524) < 0.001)
  assert.ok(Math.abs(trip.outcome.marsOffsetDays - Math.abs(trip.outcome.marsOffsetDeg) / MARS_DEG_PER_DAY) < 1e-9)
})

test('too little power never reaches Mars orbit', () => {
  assert.equal(simulateMarsTrip(TARGET_ANGLE_DEG, 0.68).outcome.type, MARS_OUTCOMES.SHORT)
})
