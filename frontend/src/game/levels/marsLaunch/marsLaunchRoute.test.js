import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ANGLE_WINDOW,
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

test('every angle from 134° to 138° meets Mars and slips between the hazards', () => {
  for (let angle = ANGLE_WINDOW.min; angle <= ANGLE_WINDOW.max + 1e-9; angle += 0.25) {
    const trip = simulateMarsTrip(angle, IDEAL_POWER)
    assert.equal(trip.outcome.type, MARS_OUTCOMES.REACHED, `${angle}°`)
    for (const hazard of MARS_HAZARDS) {
      const closest = Math.min(...trip.samples.map((s) => {
        const spot = hazardPosition(hazard, s.day)
        return Math.hypot(spot.x - s.x, spot.y - s.y)
      }))
      assert.ok(closest > hazard.dangerAu, `${angle}°: ${hazard.id} passes ${closest.toFixed(3)} AU away`)
    }
  }
})

test('outside 134°–138° Mars has moved away', () => {
  for (const angle of [ANGLE_WINDOW.min - 0.1, ANGLE_WINDOW.max + 0.1, 130, 142]) {
    const trip = simulateMarsTrip(angle, IDEAL_POWER)
    assert.notEqual(trip.outcome.type, MARS_OUTCOMES.REACHED, `${angle}°`)
  }
})

test('a missed Mars says how many days away it was, at its real speed', () => {
  const trip = simulateMarsTrip(ANGLE_WINDOW.min - 0.5, IDEAL_POWER)
  assert.equal(trip.outcome.type, MARS_OUTCOMES.MISSED)
  assert.ok(Math.abs(MARS_DEG_PER_DAY - 0.524) < 0.001)
  assert.ok(Math.abs(trip.outcome.marsOffsetDays - Math.abs(trip.outcome.marsOffsetDeg) / MARS_DEG_PER_DAY) < 1e-9)
})

test('too little power never reaches Mars orbit', () => {
  assert.equal(simulateMarsTrip(TARGET_ANGLE_DEG, 0.68).outcome.type, MARS_OUTCOMES.SHORT)
})

test('the right path stops for 1 to 3 crew choices, each with one good, one mild and one bad answer', async () => {
  const { CHOICE, MAX_ENCOUNTERS, SPACE_FACTS, tripEncounters } = await import('./marsEncounters.js')
  for (const angle of [ANGLE_WINDOW.min, TARGET_ANGLE_DEG, ANGLE_WINDOW.max]) {
    const trip = simulateMarsTrip(angle, IDEAL_POWER)
    const passes = tripEncounters(trip)
    assert.ok(passes.length >= 1 && passes.length <= MAX_ENCOUNTERS, `${angle}°: ${passes.length} passes`)
    let lastDay = 0
    for (const pass of passes) {
      assert.ok(pass.day >= lastDay && pass.day < trip.outcome.day)
      lastDay = pass.day
      const kinds = pass.situation.choices.map((choice) => choice.kind).sort()
      assert.deepEqual(kinds, [CHOICE.BAD, CHOICE.GOOD, CHOICE.MILD].sort())
      assert.ok(!pass.situation.question.includes('{name}'))
    }
  }
  assert.ok(SPACE_FACTS.length >= 10)
})

test('every path leaves from Earth, even with a bad angle', async () => {
  const { earthPosition } = await import('./marsLaunchRoute.js')
  const earth = earthPosition(0)
  for (const angle of [120, 125, 134, 135.55, 138, 145, 150]) {
    const first = simulateMarsTrip(angle, IDEAL_POWER).samples[0]
    assert.ok(Math.hypot(first.x - earth.x, first.y - earth.y) < 1e-9, `${angle}°`)
  }
})

test('on launch day no hazard light sits on top of Earth or Mars', async () => {
  const { earthPosition, marsPosition } = await import('./marsLaunchRoute.js')
  for (const hazard of MARS_HAZARDS) {
    const spot = hazardPosition(hazard, 0)
    for (const planet of [earthPosition(0), marsPosition(0)]) {
      assert.ok(Math.hypot(spot.x - planet.x, spot.y - planet.y) > 0.15, hazard.id)
    }
  }
})

test('a rocket with every food and water pack never starves or runs dry on the way to Mars', async () => {
  const { hasAllFoodAndWater, FOOD_AND_WATER_FAILURES } = await import('./marsSupplies.js')
  const maxima = { food: 4, water: 4 }
  assert.equal(hasAllFoodAndWater({ food: 4, water: 4 }, maxima), true)
  assert.equal(hasAllFoodAndWater({ food: 4, water: 3 }, maxima), false)
  assert.equal(hasAllFoodAndWater({ food: 2, water: 4 }, maxima), false)
  assert.equal(hasAllFoodAndWater({}, maxima), false)
  for (const id of ['noFood', 'outOfFood', 'noWater', 'outOfWater']) assert.ok(FOOD_AND_WATER_FAILURES.has(id))
  assert.ok(!FOOD_AND_WATER_FAILURES.has('outOfAir'))
  assert.ok(!FOOD_AND_WATER_FAILURES.has('spaceSick'))
})
