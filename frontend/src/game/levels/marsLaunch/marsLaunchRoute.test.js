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

test('the right path stops for crew choices: close passes plus the two runaway asteroids', async () => {
  const { CHOICE, MAX_ENCOUNTERS, RUNAWAY_ASTEROIDS, SPACE_FACTS, tripEncounters } = await import('./marsEncounters.js')
  for (const angle of [ANGLE_WINDOW.min, TARGET_ANGLE_DEG, ANGLE_WINDOW.max]) {
    const trip = simulateMarsTrip(angle, IDEAL_POWER)
    const passes = tripEncounters(trip)
    const asteroids = passes.filter((pass) => pass.asteroid)
    assert.equal(asteroids.length, RUNAWAY_ASTEROIDS.length, `${angle}°`)
    assert.ok(passes.length - asteroids.length <= MAX_ENCOUNTERS)
    let lastDay = 0
    for (const pass of passes) {
      assert.ok(pass.day >= lastDay && pass.day < trip.outcome.day)
      lastDay = pass.day
      if (pass.shower) continue // the asteroid shower is a dodging game, not a choice card
      const kinds = pass.situation.choices.map((choice) => choice.kind).sort()
      assert.deepEqual(kinds, [CHOICE.BAD, CHOICE.GOOD, CHOICE.MILD].sort())
      // Questions are translated as templates, then filled with the (translated) name
      assert.ok(!/\{name\}/.test(pass.situation.question.replace(/\{\{name\}\}/g, '')))
    }
  }
  assert.ok(SPACE_FACTS.length >= 10)
})

test('one runaway asteroid is made of ice and tells where Earth got its water', async () => {
  const { RUNAWAY_ASTEROIDS, tripEncounters } = await import('./marsEncounters.js')
  assert.equal(RUNAWAY_ASTEROIDS.filter((asteroid) => asteroid.icy).length, 1)
  const ice = tripEncounters(simulateMarsTrip(TARGET_ANGLE_DEG, IDEAL_POWER)).find((pass) => pass.hazard.icy)
  assert.match(ice.situation.story, /water/)
})

test('a bad aim never crashes into a satellite or debris, it only grazes them', () => {
  let grazed = 0
  for (let angle = 100; angle <= 170; angle += 1) {
    for (let power = 0.4; power <= 1; power += 0.05) {
      const trip = simulateMarsTrip(angle, power)
      assert.notEqual(trip.outcome.type, MARS_OUTCOMES.HAZARD)
      grazed += trip.grazes.length
    }
  }
  assert.ok(grazed > 0, 'some bad aims graze something')
  for (let angle = ANGLE_WINDOW.min; angle <= ANGLE_WINDOW.max + 1e-9; angle += 0.25) {
    assert.equal(simulateMarsTrip(angle, IDEAL_POWER).grazes.length, 0, `${angle}°`)
  }
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

test('a well packed crew does not run out of air, push, food or water', async () => {
  const { FOOD_BAR_ENOUGH, forgivenFailures, marsSupplyFacts } = await import('./marsSupplies.js')
  const maxima = { food: 4, water: 4 }
  const packed = marsSupplyFacts({ scrubber: 1, boosters: 1, food: 2, water: 4 }, maxima, 600, 1000)
  const forgiven = forgivenFailures(packed)
  for (const id of ['noAir', 'outOfAir', 'noBoosters', 'outOfFood', 'noFood', 'outOfWater', 'noWater']) {
    assert.ok(forgiven.has(id), id)
  }
  assert.ok(!forgiven.has('spaceSick'))
  // The food bar under half, no air parts, no boosters and not every water pack: nothing is forgiven.
  const short = forgivenFailures(marsSupplyFacts({ food: 1, water: 2 }, maxima, (FOOD_BAR_ENOUGH - 0.1) * 1000, 1000))
  assert.equal(short.size, 0)
  // An air filter counts as much as the scrubber.
  assert.ok(forgivenFailures(marsSupplyFacts({ filter: 1 }, maxima, 0, 1000)).has('outOfAir'))
})

test('the asteroid shower can be survived by dodging, and breaks the ship if you never move', async () => {
  const S = await import('./asteroidShower.js')
  const play = (seed, brain) => {
    const game = S.createShower(seed)
    while (!game.over) S.stepShower(game, 1 / 60, brain(game))
    return game
  }
  const dodge = (game) => {
    let best = game.shipX
    let bestScore = -Infinity
    for (let x = 6; x <= S.FIELD_W - 6; x += 2) {
      let danger = 0
      for (const rock of game.rocks) {
        const time = (S.SHIP.y - rock.y) / rock.speed
        if (time < -0.1 || time > 1.2) continue
        const gap = Math.abs(rock.x + rock.drift * time - x) - rock.r - S.SHIP.halfWidth
        if (gap < 3 || Math.abs(x - game.shipX) / S.SHIP.speed > time + 0.05) danger += (1.3 - time) * (gap < 3 ? 10 : 1)
      }
      const score = -danger - Math.abs(x - game.shipX) * 0.01
      if (score > bestScore) { bestScore = score; best = x }
    }
    return best
  }
  let dodged = 0
  let stood = 0
  for (let seed = 1; seed <= 20; seed += 1) {
    if (play(seed * 7919, dodge).survived) dodged += 1
    if (play(seed * 7919, () => null).survived) stood += 1
  }
  assert.ok(dodged >= 19, `dodging survived ${dodged} of 20`)
  assert.ok(stood <= 12, `standing still survived ${stood} of 20`)
})
