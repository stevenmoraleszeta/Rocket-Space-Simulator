import test from 'node:test'
import assert from 'node:assert/strict'
import { MOON_ORBIT_EVENTS, choiceBlockedReason, pickOrbitEvents, resolveOrbitEvent } from './moonOrbitEvents.js'

const event = (id) => MOON_ORBIT_EVENTS.find((item) => item.id === id)

test('every event has a risky way out, or is a timing event', () => {
  for (const item of MOON_ORBIT_EVENTS) {
    assert.ok(item.timing || item.choices.some((choice) => choice.risky), item.id)
  }
})

test('picks two different events', () => {
  const picked = pickOrbitEvents(2, () => 0)
  assert.equal(picked.length, 2)
  assert.notEqual(picked[0].id, picked[1].id)
})

test('a choice needs its part packed and not broken on the way', () => {
  const dish = event('shadow').choices.find((choice) => choice.part === 'antenna')
  assert.equal(choiceBlockedReason(dish, { antenna: 0 }), 'Not packed in the hangar.')
  assert.equal(choiceBlockedReason(dish, { antenna: 1 }), '')
  assert.equal(choiceBlockedReason(dish, { antenna: 1 }, ['antenna']), 'Broken on the way here.')
})

test('the ice rover adds science and a missed engine burn removes it', () => {
  assert.ok(resolveOrbitEvent(event('ice'), 'rover').scienceFactor > 1)
  assert.ok(resolveOrbitEvent(event('misfire'), 'timing', { timingSuccess: false }).scienceFactor < 1)
  assert.equal(resolveOrbitEvent(event('misfire'), 'timing', { timingSuccess: true }).scienceFactor, 1)
})

test('keeping the radio on behind the Moon loses data', () => {
  assert.ok(resolveOrbitEvent(event('shadow'), 'risk').dataLoss > 0)
})

test('a hands-on choice done badly still beats the risky choice', () => {
  const missed = resolveOrbitEvent(event('storm'), 'shelter', { actionSuccess: false })
  const risky = resolveOrbitEvent(event('storm'), 'risk')
  assert.ok(missed.scienceFactor < 1 && missed.scienceFactor > risky.scienceFactor)
  assert.equal(resolveOrbitEvent(event('storm'), 'shelter').scienceFactor, 1)
})

test('three events per visit', () => {
  assert.equal(pickOrbitEvents().length, 3)
})
