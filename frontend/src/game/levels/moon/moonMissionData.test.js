import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assessMoonBuild,
  calculateMoonMetrics,
  createMoonEventOrder,
  MOON_EVENTS,
  resolveMoonEvent,
  SUGGESTED_MOON_LOADOUT,
} from './moonMissionData.js'

const change = (patch) => ({
  ...SUGGESTED_MOON_LOADOUT,
  instruments: [...SUGGESTED_MOON_LOADOUT.instruments],
  systems: [...SUGGESTED_MOON_LOADOUT.systems],
  crew: [...SUGGESTED_MOON_LOADOUT.crew],
  ...patch,
})

test('the suggested spacecraft passes all preflight checks', () => {
  const result = assessMoonBuild(SUGGESTED_MOON_LOADOUT, 'basic', () => 0)
  assert.equal(result.success, true)
  assert.equal(result.cost, 109)
  assert.deepEqual(result.lucky, [])
  assert.equal(result.checks.some((check) => check.lucky), false)
  assert.equal(result.checks.find((check) => check.id === 'instrument').ok, true)
})

test('the suggested spacecraft is ready for the fixed medium difficulty', () => {
  const result = assessMoonBuild(SUGGESTED_MOON_LOADOUT, 'intermediate')
  assert.equal(result.success, true)
  assert.equal(result.cost, 109)
})

test('preflight reports every main failure cause', () => {
  const cases = [
    ['small rocket cannot reach the Moon', change({ rocket: 'small' }), 'rocket', 'basic'],
    ['missing mapping instrument', change({ instruments: ['ice', 'thermometer'] }), 'instrument', 'basic'],
    ['budget is too low', SUGGESTED_MOON_LOADOUT, 'budget', 'advanced'],
    ['mass is over capacity', change({
      instruments: ['camera', 'laser', 'thermometer', 'ice', 'radiation', 'compass', 'radar'],
      systems: ['solar', 'battery', 'radiator', 'heater', 'fuel', 'antenna-high', 'storage', 'shield', 'spare'],
      crew: ['spark', 'wrench'],
    }), 'mass', 'experimental'],
    ['energy is too low', change({ systems: ['antenna-medium', 'storage', 'fuel'] }), 'energy', 'basic'],
    ['heat is too high', change({
      instruments: ['camera', 'laser', 'thermometer', 'ice', 'radiation', 'compass', 'radar'],
      systems: ['solar', 'battery', 'heater', 'fuel', 'antenna-medium', 'storage'],
    }), 'heat', 'basic'],
    ['data cannot be sent or stored', change({ systems: ['solar', 'battery', 'radiator', 'heater', 'fuel'] }), 'data', 'basic'],
    ['crew needs food and air', change({ crew: ['lens'] }), 'crew', 'advanced'],
    ['fuel is too low for the three burns', change({ systems: ['solar', 'battery', 'radiator', 'heater', 'antenna-medium', 'storage'] }), 'fuel', 'basic'],
  ]

  for (const [label, loadout, checkId, difficulty] of cases) {
    const result = calculateMoonMetrics(loadout, difficulty)
    assert.equal(result.checks.find((check) => check.id === checkId).ok, false, label)
  }
})

test('crew can only improve science when its extra supplies and data are managed', () => {
  const withLens = change({
    crew: ['lens'],
    systems: [...SUGGESTED_MOON_LOADOUT.systems, 'food', 'air'],
  })
  const metrics = calculateMoonMetrics(withLens, 'advanced')
  assert.equal(metrics.crewNeedsFood, 10)
  assert.equal(metrics.crewNeedsAir, 10)
  assert.ok(metrics.science > calculateMoonMetrics(SUGGESTED_MOON_LOADOUT).science)
  assert.ok(metrics.dataPerDay > calculateMoonMetrics(SUGGESTED_MOON_LOADOUT).dataPerDay)
})

test('a small overage can be rescued by the documented Lucky roll', () => {
  const loadout = change({
    instruments: [...SUGGESTED_MOON_LOADOUT.instruments, 'radiation', 'compass', 'radar'],
  })
  const result = assessMoonBuild(loadout, 'basic', () => 0)
  assert.ok(result.lucky.length > 0)
  assert.equal(result.checks.find((check) => check.id === 'budget').ok, true)
})

test('orbital event order contains no repeated event', () => {
  const events = createMoonEventOrder(MOON_EVENTS.length, () => 0.4)
  assert.equal(events.length, MOON_EVENTS.length)
  assert.equal(new Set(events.map((event) => event.id)).size, MOON_EVENTS.length)
})

test('every orbital event has a working safe and timeout resolution', () => {
  const safeChoices = {
    debris: ['dodge', true],
    storm: ['off', true],
    fault: ['restart', true],
    shadow: ['save', true],
    heat: ['off', true],
    night: ['save', true],
    misfire: ['timing', true],
  }
  const riskyChoices = {
    debris: 'risk',
    storm: 'risk',
    fault: 'risk',
    shadow: 'send',
    heat: 'risk',
    night: 'risk',
    misfire: 'timing',
  }
  const fullyEquipped = {
    ...SUGGESTED_MOON_LOADOUT,
    systems: [...SUGGESTED_MOON_LOADOUT.systems, 'shield', 'spare'],
  }

  for (const event of MOON_EVENTS) {
    const [choice, timingSuccess] = safeChoices[event.id]
    const safe = resolveMoonEvent(event.id, choice, fullyEquipped, { timingSuccess, random: () => 1 })
    assert.ok(safe.note, `${event.id} safe result has an explanation`)
    const risky = resolveMoonEvent(event.id, riskyChoices[event.id], fullyEquipped, { timingSuccess: false, random: () => 1 })
    assert.ok(
      risky.scienceFactor < 1 || risky.dataLoss > 0 || risky.energyPenalty > 0,
      `${event.id} timeout applies a penalty`,
    )
  }
})

test('Spark may cause a short circuit and Wrench protects the first damage', () => {
  const spark = change({ crew: ['spark'] })
  assert.equal(resolveMoonEvent('storm', 'off', spark, { random: () => 0 }).energyPenalty, 12)

  const wrench = change({ crew: ['wrench'] })
  const protectedResult = resolveMoonEvent('debris', 'risk', wrench, { ignoreDamage: true, random: () => 1 })
  assert.equal(protectedResult.scienceFactor, 1)
  assert.match(protectedResult.note, /Wrench stopped/)
})

test('tool trouble and overheating select an instrument', () => {
  const loadout = SUGGESTED_MOON_LOADOUT
  assert.match(resolveMoonEvent('fault', 'risk', loadout, { random: () => 0 }).note, /Moon Eyes stopped/)
  assert.match(resolveMoonEvent('heat', 'risk', loadout, { random: () => 0 }).note, /Moon Eyes switched off/)
})
