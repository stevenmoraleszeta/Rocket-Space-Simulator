/**
 * LEVEL 2 (second part) — LAUNCH TO ORBIT, after the hangar of mission 1.
 *
 * Steps:
 *   site    tap a real launch base on the planet; each one explains why and what for.
 *           The arrival orbit is fixed: the hardest one (see hardestOrbit).
 *   aim     hold the click and move: the dotted line (the real simulated path) follows.
 *           Direction from the base = where the rocket tilts, distance = power.
 *   liftoff the launch pad liftoff and the climb through the atmosphere (LaunchSequence)
 *   flight  the same simulation plays out in a few seconds; crashes explode
 *   result  the score is reported to the mission progress (src/levels)
 *
 * Physics lives in physics/ and launchSimulation.js, drawing in orbitRenderer.js.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { StarRating, getMission, useProgress } from '../../../levels'
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../../../audio'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { formatDecimal, formatNumber, t } from '../../../i18n/index.js'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { rotationBoostForInclination } from '../../physics/orbitalMechanics.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { partCount } from '../../parts.js'
import { FlightReadout } from '../../FlightReadout.jsx'
import { flightReadout } from '../../lifeSupport.js'
import { flightNotes } from '../../flightSummary.js'
import { planScore, pathById } from '../../design/missionPlan.js'
import { LAUNCH_FAILURES, flightSupplyFailure, launchFailure } from '../../launchFailure.js'
import { LAUNCH_SITES } from './launchSites.js'
import { useLaunchRoute } from './useLaunchRoute.js'
import { MissionCompleteScreen } from './MissionCompleteScreen.jsx'
import { MissionFailedScreen } from './MissionFailedScreen.jsx'
import { EXPLODING_OUTCOMES, OUTCOMES, arrivalPosition, degreesToRadians, satellitePositionAt, simulateLaunch } from './launchSimulation.js'
import { buildLaunchVehicle } from './launchVehicle.js'
import { aimArmPoint, aimFromPointer, findGoodLaunchAim, initialAim, siteAngleOf } from './orbitAiming.js'
import {
  createView,
  drawOrbitScene,
  flightPoseAt,
  siteScreenPosition,
  worldToScreen,
} from './orbitRenderer.js'
import {
  SUGGESTED_ARRIVAL_OFFSET_DEG,
  checkTargetFromSite,
  hardestOrbit,
  rateSiteForMission,
  scoreOrbitInsertion,
} from './orbitTargets.js'
import { REAL_SATELLITES, SATELLITE_KIND_COLORS } from './realSatellites.js'
import { useUiScale } from '../../../lib/uiScale.js'
import { SitePin } from './SitePin.jsx'
import { FirstOrbitStory } from './FirstOrbitStory.jsx'
import { PixelIcon } from '../../PixelIcon.jsx'
import '../../game.css'
import './orbitalLaunch.css'

/** Real seconds the climb and the coast take on screen, at most. Any flight lasts a few seconds. */
const MAX_ASCENT_PLAYBACK_SECONDS = 4
const MAX_COAST_PLAYBACK_SECONDS = 7
/** Real seconds a rocket called home (no food on board) takes to come down and land. */
const RETURN_HOME_SECONDS = 4.5
/** Real seconds a rocket without boosters takes to fall back and hit the Earth. */
const FALL_BACK_SECONDS = 3
/** Real seconds to watch an explosion on the map before the "You lose" screen. */
const EXPLOSION_WATCH_MS = 1500

/** Simulated seconds per real second for the satellite circling after a success. */
const ORBIT_PLAYBACK_WARP = 150

const OUTCOME_MESSAGES = {
  [OUTCOMES.ORBIT_REACHED]: 'The satellite is flying around Earth!',
  [OUTCOMES.EARTH_IMPACT]: 'The rocket fell back down and hit the Earth.',
  [OUTCOMES.LOST_IN_SPACE]: 'Too much power. The rocket flew past the path and blew up.',
  [OUTCOMES.MISSED_TARGET]: 'The rocket missed the spot it needed to reach.',
  [OUTCOMES.NO_LIFTOFF]: 'The rocket is too heavy. The engines cannot lift it.',
  // Loadout failures: pad, climb, or food and oxygen running out (launchFailure.js)
  ...Object.fromEntries(Object.values(LAUNCH_FAILURES).map((item) => [item.id, item.message])),
}

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

const formatKm = (meters) => `${formatNumber(Math.round(meters / 1000))} km`
const formatKmPerSecond = (metersPerSecond) => `${formatDecimal(metersPerSecond / 1000, 1)} km/s`
const radiansToDegrees = (radians) => Math.round((radians * 180) / Math.PI)

function craftShort(satelliteName) {
  if (!satelliteName) return ''
  const found = REAL_SATELLITES.find((item) => item.name === satelliteName)
  return found?.shortName || ''
}

/**
 * Maps real seconds since Launch to simulated seconds, so every flight lasts a few seconds:
 * the climb plays in up to MAX_ASCENT_PLAYBACK_SECONDS and the coast in up to MAX_COAST_PLAYBACK_SECONDS.
 */
function playbackSimTime(realSeconds, prediction) {
  const burnout = prediction.burnoutTime
  const end = prediction.outcome.t
  const ascentReal = Math.min(MAX_ASCENT_PLAYBACK_SECONDS, Math.max(1.5, burnout / 40))
  const coastReal = Math.min(MAX_COAST_PLAYBACK_SECONDS, Math.max(1, (end - burnout) / 120))
  if (realSeconds <= ascentReal) return (realSeconds / ascentReal) * burnout
  if (realSeconds <= ascentReal + coastReal) return burnout + ((realSeconds - ascentReal) / coastReal) * (end - burnout)
  return end + (realSeconds - ascentReal - coastReal) * ORBIT_PLAYBACK_WARP
}

function siteBlockText(check, site) {
  if (!check || check.ok) return ''
  if (check.reason.startsWith('From ')) {
    const latitude = Math.abs(site.latitudeDeg)
    return t('From {{latitude}}° latitude, an orbit cannot be tilted less than {{latitude}}°.', { latitude })
  }
  return t(check.reason)
}
function describePrediction(prediction) {
  const { outcome, closestTargetKm, bestInsertion } = prediction
  switch (outcome.type) {
    case OUTCOMES.ORBIT_REACHED:
      return { tone: 'good', text: t('Great aim! The satellite reaches its path around Earth.') }
    case OUTCOMES.SATELLITE_COLLISION:
      return { tone: 'bad', text: t('Careful! The rocket hits {{name}}.', { name: t(outcome.satelliteName) }) }
    case OUTCOMES.EARTH_IMPACT:
      return { tone: 'bad', text: t('Not enough. It falls back and hits the Earth. Aim flatter or add power.') }
    case OUTCOMES.NO_LIFTOFF:
      return { tone: 'bad', text: t('Too heavy. The engines cannot lift the rocket.') }
    case OUTCOMES.LOST_IN_SPACE:
      return { tone: 'bad', text: t('Too much power. It flies way past the path and blows up.') }
    default:
      if (bestInsertion) {
        return { tone: 'warn', text: t('It reaches the spot too fast or too slow to stay. Change the power.') }
      }
      return { tone: 'warn', text: t('It misses the spot by {{km}} km.', { km: formatNumber(Math.round(closestTargetKm)) }) }
  }
}

/** How close (screen pixels) a tap must land to a satellite to open its card. */
const SATELLITE_TAP_PIXELS = 18

export function OrbitalLaunchLevel({ mission, equipped, design, launchPlace, onLaunchPlace, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)
  // No boosters: the dotted path still shows the planned flight (as if they were there).
  // The rocket then fails on the way up (see climbFailure below).
  const vehicle = useMemo(
    () => buildLaunchVehicle(partCount(equipped, 'boosters') > 0 ? equipped : { ...equipped, boosters: 1 }),
    [equipped],
  )

  const { step, setStep, siteId, setSiteId } = useLaunchRoute(launchPlace, onLaunchPlace)
  // Same tracks as the hangar flight: intense music, plus the space ambience once the rocket flies.
  useSoundtrack(step === 'flight' || step === 'result' ? { music: MUSIC.flight, ambient: AMBIENCE.space } : { music: MUSIC.flight })
  const [arrivalAngle, setArrivalAngle] = useState(null)
  const [aim, setAim] = useState(null)
  const [aimPoint, setAimPoint] = useState(null)
  // "Help me aim": '' until pressed, then 'found' or 'none'
  const [aimHelp, setAimHelp] = useState('')
  const [result, setResult] = useState(null)
  // Mission 1 won: the first-orbit story plays after the Congratulations screen
  const [firstOrbitStory, setFirstOrbitStory] = useState(false)
  const [telemetry, setTelemetry] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600, pixelRatio: 1 })

  // The scene is drawn in design pixels: the canvas box divided by the UI scale,
  // so labels, satellites and lines grow and shrink with the window like the rest of the UI.
  const uiScale = useUiScale()
  const view = useMemo(
    () => createView(canvasSize.width / uiScale, canvasSize.height / uiScale),
    [canvasSize, uiScale],
  )
  const site = LAUNCH_SITES.find((candidate) => candidate.id === siteId) ?? null
  // The road chosen in the design cards. Without one, the first flight uses the hardest orbit.
  const orbit = useMemo(() => {
    if (design?.pathId) return ORBIT_TARGETS.find((target) => target.id === design.pathId) ?? hardestOrbit()
    return hardestOrbit()
  }, [design])
  const siteCheck = site ? checkTargetFromSite(site, orbit) : null
  // A refresh on the aim tab has the base, but the drag handle is built when Next is pressed.
  useEffect(() => {
    if (step !== 'aim' || aim || !site) return
    const angle = siteAngleOf(site) + degreesToRadians(SUGGESTED_ARRIVAL_OFFSET_DEG)
    setArrivalAngle(angle)
    setAim(initialAim(site, arrivalPosition(orbit.altitudeKm, angle)))
  }, [step, aim, site, orbit])
  const rotationBoost = rotationBoostForInclination(orbit.inclinationDeg)
  const arrival = useMemo(
    () => (orbit && arrivalAngle !== null ? arrivalPosition(orbit.altitudeKm, arrivalAngle) : null),
    [orbit, arrivalAngle],
  )

  const orbitsForSite = useMemo(
    () => [{ ...orbit, available: true, reason: '' }],
    [orbit],
  )

  // The dotted line: the full flight simulated with the current aim.
  const prediction = useMemo(() => {
    if (!site || !arrival || !aim) return null
    return simulateLaunch({
      siteAngleRadians: siteAngleOf(site),
      rotationBoost,
      arrival,
      vehicle,
      aimTiltRadians: aim.tiltRadians,
      ascentDeltaV: aim.power * vehicle.totalDeltaV,
      satellites: REAL_SATELLITES,
    })
  }, [site, arrival, aim, rotationBoost, vehicle])

  // ---------------------------------------------------------------- canvas
  const canvasRef = useRef(null)
  const flightRef = useRef(null) // { startedAt, endedAt }
  const draggingRef = useRef(false)
  // Simulated time the satellites are drawn at (moves only during the flight), for tapping them.
  const simTimeRef = useRef(0)
  const [satelliteInfo, setSatelliteInfo] = useState(null) // tapped card: { satellite, x, y }
  const [hoveredSatellite, setHoveredSatellite] = useState(null) // card under the cursor: { satellite, x, y }
  // The hovered card wins; a tapped card (touch screens) stays until it is closed.
  const shownSatellite = hoveredSatellite ?? satelliteInfo
  const [images] = useState(() => ({
    earth: loadImage(ASSETS.earthPlanet.src),
    rocketLit: loadImage(ASSETS.rocketLit.src),
    rocketOff: loadImage(ASSETS.rocketIdle.src),
    rocketUpperStage: loadImage(ASSETS.rocketUpperStage.src),
    explosion: loadImage(ASSETS.explosion.src),
    goldSatellite: loadImage(ASSETS.goldSatellite.src),
    commsSatellite: loadImage(ASSETS.commsSatellite.src),
    spaceTelescope: loadImage(ASSETS.spaceTelescope.src),
    arrivalTarget: loadImage(ASSETS.arrivalTarget.src),
  }))

  // Launch: first the pad liftoff and the climb (LaunchSequence), then the orbit flight.
  const [liftingOff, setLiftingOff] = useState(false)
  // A rocket without boosters or heat shield blows up during the launch sequence.
  const anyFailure = useMemo(() => launchFailure(equipped, mission), [equipped, mission])
  // A climb failure (no boosters) is not shown in the liftoff scene here: on this map the rocket
  // climbs, loses height before orbit and crashes into the Earth.
  const failure = anyFailure?.at === 'climb' ? null : anyFailure
  const tripSupplyFailure = useMemo(() => flightSupplyFailure(equipped, mission), [equipped, mission])
  // A failure that calls the crew home (no food) happens in space, halfway through the coast
  // after the engines stop, even on a perfect path.
  const supplyFailure = useMemo(() => {
    if (anyFailure?.at === 'climb' && prediction) {
      // Almost at the orbit: high up, late on the way to the arrival point
      const burnout = prediction.burnoutTime
      const end = prediction.outcome.t
      return { ...anyFailure, fallsBack: true, atSeconds: end > burnout ? burnout + (end - burnout) * 0.75 : end * 0.85 }
    }
    if (!tripSupplyFailure?.returnsHome || !prediction) return tripSupplyFailure
    const burnout = prediction.burnoutTime
    const end = prediction.outcome.t
    return { ...tripSupplyFailure, atSeconds: end > burnout ? burnout + (end - burnout) * 0.5 : end }
  }, [anyFailure, tripSupplyFailure, prediction])
  const tripNotes = useCallback((extra = {}) => flightNotes(equipped, {
    site: site ? `${site.name}, ${site.country}` : '',
    orbit: orbit?.name || '',
    ...extra,
  }), [equipped, site, orbit])

  const failLaunch = useCallback(() => {
    try {
      completeMission(mission.id, { pct: 0, success: false, flight: tripNotes() })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    playSfx(SFX.lose)
    setLiftingOff(false)
    setResult({ outcome: { type: failure.id }, success: false, pct: 0, stars: 0, unlockedMissionId: null, failure })
    setStep('result')
  }, [completeMission, mission.id, failure, tripNotes])

  const finishFlight = () => {
    let outcome = prediction.outcome
    let supply = null
    // Reaching the point is not enough: food and oxygen have to last the whole loop.
    if (
      supplyFailure &&
      (supplyFailure.atSeconds <= outcome.t ||
        (outcome.type === OUTCOMES.ORBIT_REACHED && supplyFailure.atSeconds < mission.loadout.durationSeconds))
    ) {
      outcome = { type: supplyFailure.id, t: supplyFailure.atSeconds }
      if (supplyFailure.returnsHome || supplyFailure.fallsBack) {
        // Where it turned back or started to fall: its place on the path at that moment.
        const pose = flightPoseAt(prediction.samples, supplyFailure.atSeconds)
        outcome = { ...outcome, x: pose.x, y: pose.y, returnedHome: Boolean(supplyFailure.returnsHome), crashed: Boolean(supplyFailure.fallsBack) }
      }
      supply = supplyFailure
    }
    const success = outcome.type === OUTCOMES.ORBIT_REACHED
    const flown = success ? scoreOrbitInsertion(orbit, outcome.missKm) : 0
    const pct = success && design ? planScore(design) : flown
    const craft = craftShort(outcome.satelliteName)
    let progressOutcome = null
    try {
      progressOutcome = completeMission(mission.id, {
        pct,
        success,
        flight: tripNotes(craft ? { craft } : {}),
      })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    const crashed = EXPLODING_OUTCOMES.includes(outcome.type) || Boolean(outcome.crashed)
    playSfx(success ? SFX.missionComplete : crashed ? SFX.explosion : SFX.lose)
    setResult({
      outcome,
      success,
      pct,
      stars: progressOutcome?.stars ?? 0,
      unlockedMissionId: progressOutcome?.unlockedMissionId ?? null,
      directionDeg: aim ? radiansToDegrees(aim.tiltRadians) : null,
      // It got close to the arrival point, but too fast or too slow to stay in orbit there.
      reachedArrival: Boolean(prediction.bestInsertion),
      failure: supply,
      exploded: crashed,
      // Let the player see the landed rocket for a moment before the "You lose" screen.
      landed: Boolean(outcome.returnedHome),
      supplies: flightReadout(equipped, mission, mission.loadout.durationSeconds, {
        altitudeMeters: orbit.altitudeKm * 1000,
        speedMetersPerSecond: 0,
      }),
    })
    setStep('result')
  }

  // After a blast on the map, wait a moment so the player sees it before the "You lose" screen.
  const [blastWatched, setBlastWatched] = useState(null) // the result whose blast was seen
  useEffect(() => {
    if (!(result?.exploded || result?.landed) || result.success) return undefined
    const timer = setTimeout(() => setBlastWatched(result), EXPLOSION_WATCH_MS)
    return () => clearTimeout(timer)
  }, [result])
  const failScreenReady = Boolean(
    result && !result.success && ((!result.exploded && !result.landed) || blastWatched === result),
  )

  // The draw loop is created once and reads the latest state through this ref.
  const sceneRef = useRef(null)
  useLayoutEffect(() => {
    sceneRef.current = {
      step,
      view,
      orbitId: orbit.id,
      orbitsForSite,
      arrival,
      aimPoint,
      prediction,
      images,
      finishFlight,
      canvasSize,
      uiScale,
      // Only a launch stopped on the ground or in the liftoff scene never flew on the map.
      // Failures timed on the trip (atSeconds) did fly, so their path, fall and blast stay drawn.
      blewUp: Boolean(result?.failure) && result.failure.atSeconds == null,
      equipped,
      mission,
      supplyFailure,
      highlightSatelliteId: shownSatellite?.satellite.id ?? null,
    }
  })

  // Resize the canvas to its box (sharp on high-DPI screens).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      setCanvasSize({ width, height, pixelRatio })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frameId = 0
    let lastTelemetryAt = 0
    const draw = (now) => {
      const canvas = canvasRef.current
      const current = sceneRef.current
      if (canvas && current) {
        const ctx = canvas.getContext('2d')
        const ratio = current.canvasSize.pixelRatio * current.uiScale
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

        let flight = null
        const flightClock = flightRef.current
        if (flightClock && current.prediction) {
          const realSeconds = (now - flightClock.startedAt) / 1000
          const simTime = playbackSimTime(realSeconds, current.prediction)
          const supplyAt = current.supplyFailure?.atSeconds
          const trajectoryEnd = current.prediction.outcome.t
          const endTime = supplyAt != null && supplyAt < trajectoryEnd ? supplyAt : trajectoryEnd
          // Called home (no food): the rocket turns back, comes down and lands upright.
          const fallsBack = Boolean(current.supplyFailure?.fallsBack)
          const goesHome = (Boolean(current.supplyFailure?.returnsHome) || fallsBack) && endTime === supplyAt
          let shownTime = simTime
          let returnSeconds = null
          if (goesHome && simTime >= endTime) {
            if (!flightClock.returnStartedAt) flightClock.returnStartedAt = now
            shownTime = endTime
            returnSeconds = (now - flightClock.returnStartedAt) / 1000
          }
          const leaveSeconds = fallsBack ? FALL_BACK_SECONDS : RETURN_HOME_SECONDS
          const done = !goesHome || (returnSeconds != null && returnSeconds >= leaveSeconds)
          if (simTime >= endTime && done && !flightClock.endedAt) {
            flightClock.endedAt = now
            current.finishFlight()
          }
          flight = {
            simTime: shownTime,
            realSecondsSinceEnd: flightClock.endedAt ? (now - flightClock.endedAt) / 1000 : 0,
            returnHome: goesHome
              ? {
                  t: endTime,
                  progress: returnSeconds == null ? 0 : Math.min(1, returnSeconds / leaveSeconds),
                  landed: Boolean(flightClock.endedAt),
                  crash: fallsBack,
                }
              : null,
          }
          if (simTime < endTime && now - lastTelemetryAt > 120) {
            lastTelemetryAt = now
            const pose = flightPoseAt(current.prediction.samples, simTime)
            const later = flightPoseAt(current.prediction.samples, simTime + 1)
            const altitudeMeters = Math.hypot(pose.x, pose.y) - EARTH_RADIUS_METERS
            const speed = Math.hypot(later.x - pose.x, later.y - pose.y)
            setTelemetry({
              altitudeMeters,
              speed,
              burning: pose.burning,
              rows: flightReadout(current.equipped, current.mission, simTime, {
                altitudeMeters,
                speedMetersPerSecond: speed,
              }),
            })
          }
        }

        simTimeRef.current = flight?.simTime ?? 0
        drawOrbitScene(ctx, current.view, {
          step: current.step,
          orbits: current.orbitsForSite,
          selectedOrbitId: current.orbitId,
          arrival: current.arrival,
          satellites: REAL_SATELLITES,
          // A rocket that blew up at launch never flew: no path or rocket on the map.
          prediction: current.blewUp ? null : current.prediction,
          aimPoint: current.aimPoint,
          flight,
          images: current.images,
          clockSeconds: now / 1000,
          highlightSatelliteId: current.highlightSatelliteId,
        })
      }
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // ---------------------------------------------------------------- input
  const pointerPosition = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    return { x: (event.clientX - box.left) / uiScale, y: (event.clientY - box.top) / uiScale }
  }

  const selectSite = (id) => {
    playSfx(SFX.select)
    setSiteId(id)
    setArrivalAngle(null)
    setAim(null)
    setAimPoint(null)
  }

  const aimAt = (point) => {
    const nextAim = aimFromPointer(site, siteScreenPosition(view, site, true), point.x, point.y, view.aimMaxPixels)
    if (nextAim) {
      setAimHelp('')
      setAim({ tiltRadians: nextAim.tiltRadians, power: nextAim.power })
      // The crosshair sits where the arm points (limited and in clicks), with the arm from the base
      setAimPoint({ ...nextAim.point, base: nextAim.base })
    }
  }

  /** Satellite under a screen point (within a finger's reach), or null. */
  const satelliteAt = (point) => {
    let closest = null
    for (const satellite of REAL_SATELLITES) {
      const world = satellitePositionAt(satellite, simTimeRef.current)
      const screen = worldToScreen(view, world.x, world.y)
      const gap = Math.hypot(point.x - screen.x, point.y - screen.y)
      if (gap < SATELLITE_TAP_PIXELS && (!closest || gap < closest.gap)) closest = { satellite, gap, screen }
    }
    return closest
  }

  const handlePointerDown = (event) => {
    const point = pointerPosition(event)
    const tapped = satelliteAt(point)
    if (tapped) {
      playSfx(SFX.select)
      setSatelliteInfo({ satellite: tapped.satellite, x: tapped.screen.x, y: tapped.screen.y })
      return
    }
    setSatelliteInfo(null)
    if (step === 'aim' && site) {
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      aimAt(pointerPosition(event))
    }
  }

  const handlePointerMove = (event) => {
    if (draggingRef.current && step === 'aim' && site) {
      aimAt(pointerPosition(event))
      return
    }
    // Hovering a satellite shows it and its card; the hand cursor says it can be tapped too.
    const hovered = satelliteAt(pointerPosition(event))
    event.currentTarget.style.cursor = hovered ? 'pointer' : ''
    if (event.pointerType !== 'mouse') return
    setHoveredSatellite((previous) => {
      if (!hovered) return null
      if (previous?.satellite.id === hovered.satellite.id) return previous
      return { satellite: hovered.satellite, x: hovered.screen.x, y: hovered.screen.y }
    })
  }

  const handlePointerLeave = () => {
    setHoveredSatellite(null)
  }

  const handlePointerUp = () => {
    draggingRef.current = false
  }

  // ---------------------------------------------------------------- steps
  const goToAim = () => {
    if (!site || !siteCheck?.ok) return
    const angle = siteAngleOf(site) + degreesToRadians(SUGGESTED_ARRIVAL_OFFSET_DEG)
    const nextArrival = arrivalPosition(orbit.altitudeKm, angle)
    playSfx(SFX.confirm)
    setArrivalAngle(angle)
    setAim(initialAim(site, nextArrival))
    setAimPoint(null)
    setStep('aim')
  }
  // Launch: first the pad liftoff and the climb (LaunchSequence), then the orbit flight on the canvas.
  /** "Help me aim" (like the Moon mission): moves the arm to an aim that reaches the orbit. */
  const helpAim = () => {
    if (!site || !arrival || aimHelp === 'busy') return
    // Show "Looking…" first; the search runs right after, so the button never seems stuck
    setAimHelp('busy')
    setTimeout(() => findAim(), 30)
  }
  const findAim = () => {
    const found = findGoodLaunchAim({ site, arrival, vehicle, rotationBoost, satellites: REAL_SATELLITES })
    if (!found) {
      playSfx(SFX.cancel)
      setAimHelp('none')
      return
    }
    playSfx(SFX.confirm)
    setAim(found)
    setAimPoint(aimArmPoint(site, siteScreenPosition(view, site, true), found, view.aimMaxPixels))
    setAimHelp('found')
  }

  const launch = () => {
    playSfx(SFX.liftoff)
    setTelemetry(null)
    setResult(null)
    setLiftingOff(true)
  }
  const startOrbitFlight = useCallback(() => {
    setLiftingOff(false)
    flightRef.current = { startedAt: performance.now(), endedAt: null }
    setStep('flight')
  }, [])
  const retry = () => {
    flightRef.current = null
    setFirstOrbitStory(false)
    setResult(null)
    setStep('aim')
  }
  const goBack = (previousStep) => {
    playSfx(SFX.cancel)
    setStep(previousStep)
  }

  const siteRating = site ? rateSiteForMission(site) : null
  const predictionSummary = prediction ? describePrediction(prediction) : null
  const visibleSites = step === 'site' ? LAUNCH_SITES : LAUNCH_SITES.filter((candidate) => candidate.id === siteId)

  const hud = (
    <header className="game__hud orbit-level__hud">
      <button type="button" className="game__back" onClick={onExit}>
        {t('Missions')}
      </button>
      <div className="game__mission">
        <h1>{t(mission.title)}</h1>
      </div>
      <div className="game__place">{t(mission.place)}</div>
    </header>
  )

  return (
    <div className="game orbit-level" style={{ backgroundImage: `url(${ASSETS.spaceBackground.src})` }}>
      {hud}
      {liftingOff && (
        <div className="orbit-level__liftoff">
          <LaunchSequence equipped={equipped} hud={hud} onDone={startOrbitFlight} failure={failure} onFail={failLaunch} />
        </div>
      )}
      {step === 'result' && result?.success && !firstOrbitStory && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          design={design}
          directionDeg={design ? null : result.directionDeg}
          onContinue={mission.id === 'earth' ? () => setFirstOrbitStory(true) : onExit}
          continueLabel={mission.id === 'earth' ? t('Continue') : undefined}
          onFlyAgain={retry}
        />
      )}
      {step === 'result' && result?.success && firstOrbitStory && <FirstOrbitStory onDone={onExit} />}
      {step === 'result' && result && !result.success && failScreenReady && (
        <MissionFailedScreen
          mission={mission}
          result={result}
          reason={
            result.outcome.type === OUTCOMES.SATELLITE_COLLISION
              ? t('The rocket hit {{name}}.', { name: t(result.outcome.satelliteName) })
              : t(OUTCOME_MESSAGES[result.outcome.type] || '')
          }
          hint={
            result.failure?.hint ??
            (result.outcome.type === OUTCOMES.NO_LIFTOFF ? 'Go back to the hangar. Add boosters or carry less.' : null)
          }
          onHangar={onBackToHangar}
          onRetry={retry}
        />
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step}`}
            aria-label={t('Earth seen from space with launch bases, satellites and the predicted path')}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          />
          <p className="orbit-note">{t('This is a simulation, not a real flight.')}</p>
          {shownSatellite && (
            <div
              className={`satellite-card${shownSatellite.y < 150 ? ' is-below' : ''}${hoveredSatellite ? ' is-hover' : ''}`}
              style={{
                left: Math.min(Math.max(shownSatellite.x, 130), canvasSize.width - 130),
                top: shownSatellite.y,
              }}
              role={hoveredSatellite ? 'tooltip' : 'dialog'}
              aria-label={t(shownSatellite.satellite.shortName)}
            >
              {!hoveredSatellite && (
                <button type="button" className="satellite-card__close" aria-label={t('Close')} onClick={() => setSatelliteInfo(null)}>
                  <PixelIcon name="close" />
                </button>
              )}
              <h3 className="satellite-card__name">{t(shownSatellite.satellite.shortName)}</h3>
              <p className="satellite-card__kind">
                <span
                  className="satellite-card__dot"
                  style={{ background: SATELLITE_KIND_COLORS[shownSatellite.satellite.kind] }}
                  aria-hidden="true"
                />
                {t(shownSatellite.satellite.kind)} · {shownSatellite.satellite.altitudeKm} km
              </p>
              <p className="satellite-card__summary">{t(shownSatellite.satellite.summary)}</p>
            </div>
          )}
          {/* Launch bases: real buttons on top of the planet, big enough to tap and read. */}
          <div className="orbit-sites">
            {visibleSites.map((candidate) => {
              // Picking: the base sits on its real place on the map. After that it moves to the rim,
              // where the rocket leaves in the ring view.
              const position = siteScreenPosition(view, candidate, step !== 'site')
              const side = position.x >= view.centerX ? 'right' : 'left'
              const selected = candidate.id === siteId
              const siteOk = checkTargetFromSite(candidate, orbit).ok
              const className = `orbit-site orbit-site--${side}${selected ? ' is-selected' : ''}`
              const style = { left: position.x * uiScale, top: position.y * uiScale }
              if (step !== 'site') {
                return (
                  <span key={candidate.id} className={className} style={style}>
                    <SitePin selected={selected} />
                    <span className="orbit-site__name">
                    {t(candidate.name)}
                    <span className="orbit-site__country">{t(candidate.country)}</span>
                  </span>
                  </span>
                )
              }
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={className}
                  style={style}
                  aria-pressed={selected}
                  disabled={!siteOk}
                  title={siteOk ? t(candidate.name) : siteBlockText(checkTargetFromSite(candidate, orbit), candidate)}
                  onClick={() => selectSite(candidate.id)}
                >
                  <SitePin selected={selected} />
                  <span className="orbit-site__name">
                    {t(candidate.name)}
                    <span className="orbit-site__country">{t(candidate.country)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'site' && (
            <>
              <h2 className="orbit-panel__title">{t('1. Pick a launch base')}</h2>
              <p className="orbit-panel__hint">
                {/* The name greets the player once, in the line under this hint, not twice. */}
                {(() => {
                  const hint = design
                    ? t('Tap a base that can fly your road, the {{name}}. Dim bases cannot.', { name: t(pathById(design.jobId, design.pathId)?.name ?? orbit.name) })
                    : t('Tap a base on the Earth. This trip goes {{km}} km up, on the path called {{name}}.', { km: orbit.altitudeKm, name: t(orbit.name) })
                  return site ? sayTo(playerName, hint) : hint
                })()}
              </p>
              {site ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{t(site.name)}, {t(site.country)}</p>
                  <p><b>{t('Spaceport:')}</b> {t(site.spaceport)}</p>
                  <p className={`orbit-badge orbit-badge--${siteRating.level}`}>{t(siteRating.label)}</p>
                  <p><b>{t('Why here?')}</b> {t(site.why)}</p>
                  <p><b>{t('What for?')}</b> {t(site.whatFor)}</p>
                  {siteCheck && !siteCheck.ok && <p>{siteBlockText(siteCheck, site)}</p>}
                </div>
              ) : (
                <p className="orbit-detail">{sayTo(playerName, t('Pick a base that can fly over the top and bottom of the Earth. Your satellite will take pictures.'))}</p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>{t('Hangar')}</button>
                <button type="button" className="ms-btn" disabled={!site || !siteCheck?.ok} onClick={goToAim}>{t('Next')}</button>
              </div>
            </>
          )}

          {step === 'aim' && site && orbit && aim && (
            <>
              <h2 className="orbit-panel__title">{t('2. Aim and launch')}</h2>
              <p className="orbit-panel__hint">
                {sayTo(playerName, design
                  ? t('Your road is already drawn. Press Launch. Drag the dots only if you want to try a different aim.')
                  : t('Hold and drag. The dots show the path. Farther from the base means more power.'))}
              </p>
              {!design && (
                <dl className="orbit-stats">
                  <div><dt>{t('Direction')}</dt><dd>{radiansToDegrees(aim.tiltRadians)}°</dd></div>
                  <div><dt>{t('Power')}</dt><dd>{Math.round(aim.power * 100)}%</dd></div>
                </dl>
              )}
              {predictionSummary && <p className={`orbit-prediction is-${predictionSummary.tone}`}>{sayTo(playerName, predictionSummary.text)}</p>}
              {!design && (
                <button type="button" className="game__back orbit-help" onClick={helpAim} disabled={aimHelp === 'busy'}>
                  {aimHelp === 'busy' ? t('Looking for a path…') : t('Help me aim')}
                </button>
              )}
              {aimHelp === 'found' && <p className="orbit-panel__hint">{t('The arm is set on a path that reaches the orbit. Press Launch!')}</p>}
              {aimHelp === 'none' && <p className="orbit-panel__hint">{t('No aim reaches this orbit from this base. Go back and try another base.')}</p>}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={() => goBack('site')}>{t('Back')}</button>
                <button type="button" className="ms-btn" onClick={launch}>{t('Launch')}</button>
              </div>
            </>
          )}

          {step === 'flight' && (
            <>
              <h2 className="orbit-panel__title">{playerName ? sayTo(playerName, t('Liftoff!')) : t('Liftoff!')}</h2>
              {telemetry && (
                <FlightReadout
                  rows={[
                    { id: 'alt', label: 'Altitude', value: formatKm(Math.max(0, telemetry.altitudeMeters)) },
                    { id: 'speed', label: 'Speed', value: formatKmPerSecond(telemetry.speed) },
                    { id: 'engine', label: 'Engine', value: telemetry.burning ? t('On') : t('Off') },
                    ...telemetry.rows,
                  ]}
                />
              )}
            </>
          )}

          {/* A failed mission is told on the "You lose" screen (MissionFailedScreen), not here. */}
          {step === 'result' && result?.success && (
            <>
              <h2 className="orbit-panel__title">{sayTo(playerName, t('Mission complete!'))}</h2>
              <p className="orbit-prediction is-good">{t(OUTCOME_MESSAGES[result.outcome.type] || '')}</p>
              <div className="orbit-result__stars"><StarRating stars={result.stars} size={36} /></div>
              <dl className="orbit-stats">
                <div><dt>{t('Score')}</dt><dd>{result.pct}%</dd></div>
                <div><dt>{t('Off target')}</dt><dd>{Math.round(result.outcome.missKm)} km</dd></div>
              </dl>
              {result.supplies && (
                <FlightReadout
                  rows={result.supplies.filter((row) => ['time', 'cabin', 'food', 'air', 'power'].includes(row.id))}
                />
              )}
              {result.unlockedMissionId && (
                <p className="orbit-panel__hint">
                  {t('New mission unlocked: {{title}}!', { title: t(getMission(result.unlockedMissionId)?.title || '') })}
                </p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="ms-btn" onClick={onExit}>{t('Missions')}</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
