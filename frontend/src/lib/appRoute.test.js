import assert from 'node:assert/strict'
import test from 'node:test'
import { buildHash, menuRoute, packFromLoadout, parseHash, routesEqual } from './appRoute.js'

test('an empty hash is the mission menu', () => {
  assert.deepEqual(parseHash(''), menuRoute())
  assert.deepEqual(parseHash('#/'), menuRoute())
  assert.equal(buildHash(menuRoute()), '#/')
})

test('a mission hash opens that mission on the hangar or launch tab', () => {
  assert.deepEqual(parseHash('#/moon/hangar'), {
    missionId: 'moon', screen: 'hangar', step: null, siteId: null, pack: null,
  })
  assert.deepEqual(parseHash('#/earth/launch/aim?site=kennedy&pack=food.2,boosters.1'), {
    missionId: 'earth',
    screen: 'launch',
    step: 'aim',
    siteId: 'kennedy',
    pack: { food: 2, boosters: 1 },
  })
})

test('aim without a launch base falls back to the base tab', () => {
  const route = parseHash('#/mars/launch/aim')
  assert.equal(route.step, 'site')
  assert.equal(route.siteId, null)
})

test('unknown missions and junk query values are dropped', () => {
  assert.equal(parseHash('#/pluto/hangar').screen, 'menu')
  const route = parseHash('#/earth/hangar?pack=food.2,nope,shield.0,antenna.x')
  assert.deepEqual(route.pack, { food: 2 })
})

test('building a hash round-trips and ignores part order', () => {
  const route = parseHash('#/earth/launch/site?site=kourou&pack=water.1,food.3')
  assert.deepEqual(parseHash(buildHash(route)), route)
  assert.equal(routesEqual(
    { ...route, pack: { food: 3, water: 1 } },
    route,
  ), true)
})

test('a loadout keeps only fitted parts', () => {
  assert.deepEqual(packFromLoadout({ food: 0, water: 2, antenna: 1.5 }), { water: 2 })
  assert.equal(packFromLoadout({ food: 0 }), null)
})
