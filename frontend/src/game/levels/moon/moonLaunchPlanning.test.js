import test from 'node:test'
import assert from 'node:assert/strict'
import { LAUNCH_SITES } from '../orbit/launchSites.js'
import {
  MOON_ORBIT_ECCENTRICITY,
  MOON_SYNODIC_MONTH_DAYS,
  MOON_TRANSFER_DAYS,
  createMoonFlightView,
  getLaunchSitePosition,
  getLunarPhase,
  getMoonPosition,
  getMoonTransferPlan,
} from './moonLaunchPlanning.js'

const cape = LAUNCH_SITES.find((site) => site.id === 'kennedy')
const lompoc = LAUNCH_SITES.find((site) => site.id === 'lompoc')
const launchDate = new Date('2026-06-18T16:00:00Z')

test('Moon transfer uses a Kepler half-ellipse with a multi-day flight time', () => {
  assert.ok(MOON_TRANSFER_DAYS > 4 && MOON_TRANSFER_DAYS < 6)

  const plan = getMoonTransferPlan(cape, launchDate)
  const departureRadius = Math.hypot(plan.trajectory[0].x, plan.trajectory[0].y)
  const arrivalRadius = Math.hypot(plan.trajectory.at(-1).x, plan.trajectory.at(-1).y)

  assert.ok(Math.abs(departureRadius - 6571) < 1)
  assert.ok(Math.abs(arrivalRadius - 384400) < 1)
  assert.equal(plan.trajectory.length, 97)
  assert.equal(plan.traffic.length, 5)
  assert.ok(Number.isFinite(plan.closestApproachKm))
})

test('launch date moves the Moon and rotates the selected base with Earth', () => {
  const nextDay = new Date(launchDate.getTime() + 86400000)
  const moonAtLaunch = getMoonPosition(launchDate)
  const moonNextDay = getMoonPosition(nextDay)
  const capeAtLaunch = getLaunchSitePosition(cape, launchDate)
  const capeNextDay = getLaunchSitePosition(cape, nextDay)
  const lompocAtLaunch = getLaunchSitePosition(lompoc, launchDate)

  assert.notEqual(moonAtLaunch.longitude, moonNextDay.longitude)
  assert.notEqual(capeAtLaunch.angle, capeNextDay.angle)
  assert.notEqual(capeAtLaunch.angle, lompocAtLaunch.angle)
})

test('flight scene places the launch point and Moon from the selected site and date', () => {
  const capeView = createMoonFlightView(cape, launchDate)
  const lompocView = createMoonFlightView(lompoc, launchDate)
  const nextDayView = createMoonFlightView(cape, new Date(launchDate.getTime() + 86400000))

  assert.notDeepEqual(capeView.launch, lompocView.launch)
  assert.notDeepEqual(capeView.moon, nextDayView.moon)
})

test('the Moon distance changes across its elliptical orbit', () => {
  const distances = Array.from({ length: 30 }, (_, day) => (
    getMoonPosition(new Date(launchDate.getTime() + day * 86400000)).distanceKm
  ))
  const perigeeKm = Math.min(...distances)
  const apogeeKm = Math.max(...distances)

  assert.equal(MOON_ORBIT_ECCENTRICITY, 0.0549)
  assert.ok(perigeeKm < 370000)
  assert.ok(apogeeKm > 400000)
  assert.ok(apogeeKm - perigeeKm > 35000)
})

test('lunar phase advances through the synodic month', () => {
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 14, 24))
  const phaseAtStart = getLunarPhase(knownNewMoon)
  const phaseAtQuarter = getLunarPhase(new Date(knownNewMoon.getTime() + (MOON_SYNODIC_MONTH_DAYS / 4) * 86400000))
  const phaseAtHalf = getLunarPhase(new Date(knownNewMoon.getTime() + (MOON_SYNODIC_MONTH_DAYS / 2) * 86400000))

  assert.equal(phaseAtStart.name, 'New Moon')
  assert.equal(phaseAtQuarter.name, 'First quarter')
  assert.equal(phaseAtHalf.name, 'Full Moon')
  assert.ok(phaseAtHalf.illumination > 0.99)
})

test('launch date slider has safe and unsafe windows within one lunar cycle', () => {
  const cycleStart = new Date('2026-11-15T08:00:00Z')
  const windows = Array.from({ length: Math.ceil(MOON_SYNODIC_MONTH_DAYS * 4) }, (_, index) => {
    const date = new Date(cycleStart.getTime() + index * 6 * 3600000)
    return getMoonTransferPlan(cape, date)
  })

  assert.ok(windows.some((plan) => plan.safeWindow))
  assert.ok(windows.some((plan) => !plan.safeWindow))
})
