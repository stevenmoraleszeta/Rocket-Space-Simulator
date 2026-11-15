import test from 'node:test'
import assert from 'node:assert/strict'
import { launchVelocity, MOON_VIEW, simulateMoonFlight } from './moonPhysics.js'

const start = {
  x: MOON_VIEW.launch.x * MOON_VIEW.width,
  y: MOON_VIEW.launch.y * MOON_VIEW.height,
}

test('dragging back from Earth points the probe toward the Moon', () => {
  const velocity = launchVelocity(start, { x: start.x, y: start.y + 120 })
  assert.ok(velocity.y < 0)
  assert.equal(velocity.x, 0)
})

test('a medium-rocket aim can enter the lunar capture zone', () => {
  const velocity = launchVelocity(start, { x: start.x, y: start.y + 120 })
  const result = simulateMoonFlight(velocity)
  assert.equal(result.outcome, 'orbit')
  assert.ok(result.elapsed < 2)
})

test('a weak sideways launch can miss the Moon', () => {
  const result = simulateMoonFlight({ x: 1.1, y: 0.02 })
  assert.notEqual(result.outcome, 'orbit')
})

test('a short drag does not launch', () => {
  assert.equal(launchVelocity(start, { x: start.x, y: start.y + 5 }), null)
})
