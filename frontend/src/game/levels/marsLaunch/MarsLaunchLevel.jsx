/**
 * MISSION 3 — LAUNCH TO MARS, after the hangar. Same mechanics as mission 1 (OrbitalLaunchLevel):
 *
 *   site     pick the launch base on the Earth, exactly like mission 1 (same map, same buttons)
 *   aim      two sliders: the launch angle and the power. The dotted line shows the real path,
 *            leaving from the base. 135.55° is the best angle; 134°–138° still meets Mars.
 *            On the way, close passes stop the trip and the crew picks what to do
 *            (marsEncounters.js): a bad choice blows up the ship, a mild one costs points and the
 *            second mild one blows it up too. A space fact shows in a corner every 20 seconds.
 *   liftoff  the pad and the climb (LaunchSequence); missing parts blow up or stop the launch
 *   flight   the cruise around the Sun plays in a few seconds; Mars, Earth and the hazards move
 *   result   "You did it!" or "You lose" with the reason, saved with the other missions
 *
 * Space debris and satellites drift across the road. Tap one to see what it is.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SPRITES, useProgress } from '../../../levels'
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../../../audio'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { formatDecimal, t } from '../../../i18n/index.js'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { LAUNCH_FAILURES, launchFailure } from '../../launchFailure.js'
import { earliestSupplyEnd, supplyReport } from '../../lifeSupport.js'
import { forgivenFailures, marsSupplyFacts } from './marsSupplies.js'
import { PARTS, partCount, partMax } from '../../parts.js'
import { flightNotes } from '../../flightSummary.js'
import { MissionCompleteScreen } from '../orbit/MissionCompleteScreen.jsx'
import { MissionFailedScreen } from '../orbit/MissionFailedScreen.jsx'
import { LAUNCH_SITES } from '../orbit/launchSites.js'
import { useLaunchRoute } from '../orbit/useLaunchRoute.js'
import { REAL_SATELLITES } from '../orbit/realSatellites.js'
import { createView as createEarthView, drawOrbitScene, siteScreenPosition } from '../orbit/orbitRenderer.js'
import { useUiScale } from '../../../lib/uiScale.js'
import {
  ANGLE_WINDOW,
  GRAZE_PENALTY,
  IDEAL_TRIP_DAYS,
  MARS_DEG_PER_DAY,
  MARS_EXPLODING,
  MARS_HAZARDS,
  MARS_OUTCOMES,
  TARGET_ANGLE_DEG,
  hazardPosition,
  scoreMarsArrival,
  simulateMarsTrip,
  tripPointAt,
} from './marsLaunchRoute.js'
import { SUN_PIXELS, createMarsView, drawMarsScene, pathColor, toScreen } from './marsLaunchRenderer.js'
import {
  CHOICE,
  FACT_EVERY_MS,
  MILD_LIMIT,
  MILD_PENALTY,
  SPACE_FACTS,
  tripEncounters,
} from './marsEncounters.js'
import './marsLaunch.css'
import iceAsteroid from '../../../assets/images/asteroids/ice_asteroid.svg'
import animatedSun from '../../../assets/images/planets/sun_animated.svg'
import { PixelSky } from './PixelSky.jsx'
import { MarsLanding } from './MarsLanding.jsx'
import { AsteroidShower } from './AsteroidShower.jsx'
import { HIT_PENALTY as SHOWER_HIT_PENALTY } from './asteroidShower.js'
import { SitePin } from '../orbit/SitePin.jsx'
import '../../game.css'
import '../orbit/orbitalLaunch.css'
import { PixelIcon } from '../../PixelIcon.jsx'

/** How many food and water packs the hangar allows (parts.js). */
const PACK_MAXIMA = Object.fromEntries(
  ['food', 'water'].map((id) => [id, partMax(PARTS.find((part) => part.id === id) ?? {})]),
)

/** The whole cruise plays in this many real seconds. */
const FLIGHT_PLAYBACK_SECONDS = 4.5
/** After a crash, watch the blast this long before the "You lose" screen. */
const EXPLOSION_WATCH_MS = 1500
/** Arrow keys move the aim this much (with Shift: ten times more). */
const KEY_ANGLE_STEP_DEG = 0.01
const KEY_POWER_STEP = 0.01
/** A tap this close to a hazard opens its card. */
const HAZARD_TAP_PIXELS = 20
/** The aim is inside the allowed window (134°–138°). */
const angleInWindow = (deg) => deg >= ANGLE_WINDOW.min && deg <= ANGLE_WINDOW.max

const FIRST_AIM = { angleDeg: 125, power: 0.6 }
/** The two aiming sliders. */
const ANGLE_SLIDER = { min: 120, max: 150, step: 0.05 }
const POWER_SLIDER = { min: 0.4, max: 1, step: 0.01 }
/** Outcome when a crew choice blows up the ship. */
const DECISION_CRASH = 'marsDecision'
/** Outcome when the asteroid shower breaks every shield. */
const SHOWER_CRASH = 'marsShower'
/** Corners where the space facts take turns. */
const FACT_CORNERS = ['top-left', 'bottom-left']
const randomFactIndex = (avoid) => {
  let next = Math.floor(Math.random() * SPACE_FACTS.length)
  if (next === avoid) next = (next + 1) % SPACE_FACTS.length
  return next
}
const clampAim = (angleDeg, power) => ({
  angleDeg: Math.round(Math.min(ANGLE_SLIDER.max, Math.max(ANGLE_SLIDER.min, angleDeg)) * 100) / 100,
  power: Math.round(Math.min(POWER_SLIDER.max, Math.max(POWER_SLIDER.min, power)) * 100) / 100,
})

const formatAngle = (deg) => `${formatDecimal(deg, 2)}°`

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

/** One line under the readout: what the dotted line predicts. */
function describeTrip(trip, aim) {
  const { outcome } = trip
  switch (outcome.type) {
    case MARS_OUTCOMES.REACHED:
      if (trip.grazes?.length) {
        return { tone: 'warn', text: t('You meet Mars, but the rocket grazes {{name}}: −{{points}} points.', { name: t(trip.grazes[0].hazard.name), points: GRAZE_PENALTY }) }
      }
      return { tone: 'good', text: t('Great aim! In {{days}} days you meet Mars.', { days: Math.round(outcome.day) }) }
    case MARS_OUTCOMES.SHORT:
      return { tone: 'warn', text: t('Not enough power: it never reaches Mars’s orbit.') }
    default:
      return angleInWindow(aim.angleDeg)
        ? { tone: 'warn', text: t('Good angle, but with this power Mars is not there when you arrive.') }
        : { tone: 'warn', text: t('At {{angle}} Mars has moved away. Aim between {{min}}° and {{max}}° (best: {{best}}°).', {
          angle: formatAngle(aim.angleDeg),
          min: ANGLE_WINDOW.min,
          max: ANGLE_WINDOW.max,
          best: TARGET_ANGLE_DEG,
        }) }
  }
}

/** Why the trip failed, for the "You lose" screen. */
function failureReason(result) {
  const { outcome } = result
  if (result.failure) return t(result.failure.message)
  if (outcome.type === SHOWER_CRASH) return t('Too many asteroids hit the ship and it broke apart.')
  if (outcome.type === DECISION_CRASH) {
    return outcome.tooManyMild
      ? t('{{explain}} That was the second risky choice, and the ship broke apart.', { explain: t(outcome.choice.explain) })
      : t(outcome.choice.explain)
  }
  switch (outcome.type) {
    case MARS_OUTCOMES.HAZARD:
      return t('The rocket crashed into {{name}}.', { name: t(outcome.hazard.name) })
    case MARS_OUTCOMES.SHORT:
      return t('Not enough power: the rocket never reached Mars’s orbit and kept going around the Sun.')
    default:
      if (result.angleRight) {
        return t('Your angle was right, but with that power you reached Mars’s orbit when Mars was {{days}} days away.', {
          days: Math.round(outcome.marsOffsetDays),
        })
      }
      return t('You aimed at {{angle}}. Mars moves about {{rate}}° per day around the Sun: with that angle, when you got to its orbit Mars was no longer there. It was {{days}} days away.', {
        angle: formatAngle(result.aimDeg),
        rate: formatDecimal(MARS_DEG_PER_DAY, 2),
        days: Math.round(outcome.marsOffsetDays),
      })
  }
}

function failureHint(result) {
  if (result.failure) return result.failure.hint
  if (result.outcome.type === SHOWER_CRASH) return t('In the asteroid shower, keep moving and watch where each rock will fall.')
  if (result.outcome.type === DECISION_CRASH) {
    return 'On the way, pick what real crews do: move away safely and listen to mission control.'
  }
  switch (result.outcome.type) {
    case MARS_OUTCOMES.HAZARD:
      return t('Watch the blinking lights. Aimed between {{min}}° and {{max}}° with the right power, the path slips between them.', {
        min: ANGLE_WINDOW.min,
        max: ANGLE_WINDOW.max,
      })
    case MARS_OUTCOMES.SHORT:
      return 'Drag farther from Earth to give the rocket more power.'
    default:
      return result.angleRight
        ? 'Change the power: drag a little closer or farther from the base.'
        : t('Aim between {{min}}° and {{max}}° (best: {{best}}°). Use the arrow keys to fine-tune.', {
          min: ANGLE_WINDOW.min,
          max: ANGLE_WINDOW.max,
          best: TARGET_ANGLE_DEG,
        })
  }
}

export function MarsLaunchLevel({ mission, equipped, launchPlace, onLaunchPlace, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)

  const { step, setStep, siteId, setSiteId } = useLaunchRoute(launchPlace, onLaunchPlace)
  const site = LAUNCH_SITES.find((candidate) => candidate.id === siteId) ?? null
  const [aim, setAim] = useState(FIRST_AIM)
  const [result, setResult] = useState(null)
  const [telemetryDay, setTelemetryDay] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600, pixelRatio: 1 })
  const [liftingOff, setLiftingOff] = useState(false)
  const [hazardCard, setHazardCard] = useState(null) // { hazard, x, y }
  const [blastSeen, setBlastSeen] = useState(false)
  // Close pass waiting for a choice: { day, hazard, situation, picked }
  const [encounter, setEncounter] = useState(null)
  const [mildMistakes, setMildMistakes] = useState(0)
  const mildRef = useRef(0)
  // Grazes of satellites or debris on the way: each one warns and costs points.
  const grazeRef = useRef(0)
  const [grazeCount, setGrazeCount] = useState(0)
  const [grazeToast, setGrazeToast] = useState(null) // { name, key }
  // The asteroid shower mini-game, and how many rocks hit the ship in it.
  const [shower, setShower] = useState(null) // the encounter that started it
  const showerHitsRef = useRef(0)
  const [showerHits, setShowerHits] = useState(0)
  // Space fact in a corner, a new one every 20 seconds.
  const [fact, setFact] = useState(() => ({ index: randomFactIndex(-1), corner: 0 }))
  useEffect(() => {
    const timer = setInterval(() => {
      setFact((current) => ({ index: randomFactIndex(current.index), corner: (current.corner + 1) % FACT_CORNERS.length }))
    }, FACT_EVERY_MS)
    return () => clearInterval(timer)
  }, [])

  useSoundtrack(step === 'flight' || step === 'result' ? { music: MUSIC.flight, ambient: AMBIENCE.space } : { music: MUSIC.flight })

  const canvasRef = useRef(null)
  const flightRef = useRef(null) // { startedAt, endDay, endedAt }
  const sceneRef = useRef(null)
  const tapHintRef = useRef(null) // { startedAt, hazardIndex } of the tapping hand hint
  const [images] = useState(() => ({
    // Picking the base uses mission 1's Earth; the Sun map uses the menu's Earth.
    earth: loadImage(ASSETS.earthPlanet.src),
    menuEarth: loadImage(SPRITES.planets.earth.src),
    mars: loadImage(SPRITES.planets.mars.src),
    rocket: loadImage(ASSETS.rocketUpperStage.src),
    explosion: loadImage(ASSETS.explosion.src),
    asteroid: loadImage(ASSETS.asteroid.src),
    iceAsteroid: loadImage(iceAsteroid),
    satellite: loadImage(ASSETS.commsSatellite.src),
  }))

  const view = useMemo(() => createMarsView(canvasSize.width, canvasSize.height), [canvasSize])
  // Picking the base: mission 1's Earth map, in its design pixels (scaled by the UI factor).
  const uiScale = useUiScale()
  const earthView = useMemo(
    () => createEarthView(canvasSize.width / uiScale, canvasSize.height / uiScale),
    [canvasSize, uiScale],
  )
  const trip = useMemo(() => simulateMarsTrip(aim.angleDeg, aim.power), [aim])

  // ------------------------------------------------------------ missing parts and supplies
  // A well packed crew does not fail some troubles on this trip (marsSupplies.js):
  // air scrubber or filter -> air, boosters -> push, food bar over half -> food, all water -> water.
  const report = useMemo(() => supplyReport(equipped, mission), [equipped, mission])
  const forgiven = useMemo(
    () => forgivenFailures(marsSupplyFacts(equipped, PACK_MAXIMA, report.foodKg, report.foodNeedKg)),
    [equipped, report],
  )
  const anyFailure = useMemo(() => {
    const failure = launchFailure(equipped, mission)
    if (!failure || !forgiven.has(failure.id)) return failure
    // The checks that come after air and boosters in launchFailure.js
    if (failure.id === 'noAir' && !forgiven.has('noBoosters') && partCount(equipped, 'boosters') <= 0) {
      return LAUNCH_FAILURES.noBoosters
    }
    if (partCount(equipped, 'shield') <= 0 || report.heat < report.limits.heat) return LAUNCH_FAILURES.noShield
    return null
  }, [equipped, mission, forgiven, report])
  // No boosters ('climb'): the liftoff plays, but the rocket cannot speed up enough to leave Earth.
  const sequenceFailure = anyFailure?.at === 'climb' ? null : anyFailure
  const supplyFailure = useMemo(() => {
    if (anyFailure || report.crew <= 0) return null
    if (report.foodKg <= 0 && !forgiven.has('noFood')) {
      return { ...LAUNCH_FAILURES.noFood, atSeconds: report.durationSeconds * 0.3 }
    }
    const end = earliestSupplyEnd({
      ...report,
      foodSeconds: forgiven.has('outOfFood') ? Infinity : report.foodSeconds,
      waterSeconds: forgiven.has('outOfWater') ? Infinity : report.waterSeconds,
      airSeconds: forgiven.has('outOfAir') ? Infinity : report.airSeconds,
    })
    return end ? { ...LAUNCH_FAILURES[end.id], atSeconds: end.atSeconds } : null
  }, [anyFailure, report, forgiven])
  /** Trip day when food, water or air runs out (the mission's supplies are planned for its own length). */
  const supplyFailureDay = supplyFailure
    ? (supplyFailure.returnsHome ? 0.3 : supplyFailure.atSeconds / mission.loadout.durationSeconds) * IDEAL_TRIP_DAYS
    : null

  const finish = useCallback((outcome, failure = null) => {
    const success = outcome.type === MARS_OUTCOMES.REACHED && !failure
    const mild = mildRef.current
    const grazed = grazeRef.current
    const penalty = mild * MILD_PENALTY + grazed * GRAZE_PENALTY + showerHitsRef.current * SHOWER_HIT_PENALTY
    const pct = success ? Math.max(0, scoreMarsArrival(outcome, trip.angleErrorDeg) - penalty) : 0
    let progress = null
    try {
      progress = completeMission(mission.id, {
        pct,
        success,
        flight: flightNotes(equipped, { site: site ? `${site.name}, ${site.country}` : '', orbit: formatAngle(aim.angleDeg) }),
      })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    const exploded = (MARS_EXPLODING.includes(outcome.type) || outcome.type === DECISION_CRASH || outcome.type === SHOWER_CRASH) && !failure
    playSfx(success ? SFX.missionComplete : exploded ? SFX.explosion : SFX.lose)
    setResult({
      outcome: failure ? { ...outcome, type: failure.id } : outcome,
      success,
      pct,
      stars: progress?.stars ?? 0,
      unlockedMissionId: progress?.unlockedMissionId ?? null,
      aimDeg: aim.angleDeg,
      directionDeg: formatDecimal(aim.angleDeg, 2),
      angleRight: angleInWindow(aim.angleDeg),
      failure,
      exploded,
      mildMistakes: mild,
      grazes: grazed,
      asteroidHits: showerHitsRef.current,
    })
    // Reaching Mars first plays the landing of the recon dome (MarsLanding.jsx), then the result.
    setStep(success ? 'landing' : 'result')
  }, [aim, trip, completeMission, mission.id, equipped, site, setStep])

  const failLaunch = useCallback(() => {
    setLiftingOff(false)
    finish({ type: anyFailure.id, day: 0 }, anyFailure)
  }, [finish, anyFailure])

  const startCruise = useCallback(() => {
    setLiftingOff(false)
    if (anyFailure?.at === 'climb') {
      finish({ type: anyFailure.id, day: 0 }, anyFailure)
      return
    }
    const endDay = supplyFailureDay != null ? Math.min(trip.outcome.day, supplyFailureDay) : trip.outcome.day
    flightRef.current = {
      day: 0,
      last: performance.now(),
      endDay,
      endedAt: null,
      paused: false,
      crash: null,
      encounters: tripEncounters(trip).filter((pass) => pass.day < endDay),
      grazes: (trip.grazes ?? []).filter((graze) => graze.day < endDay),
      nextGraze: 0,
      nextEncounter: 0,
    }
    mildRef.current = 0
    grazeRef.current = 0
    showerHitsRef.current = 0
    setMildMistakes(0)
    setGrazeCount(0)
    setShowerHits(0)
    setShower(null)
    setGrazeToast(null)
    setEncounter(null)
    setTelemetryDay(0)
    setStep('flight')
  }, [anyFailure, finish, supplyFailureDay, trip, setStep])

  const finishCruise = useCallback(() => {
    const ranOut = supplyFailureDay != null && supplyFailureDay < trip.outcome.day
    finish(ranOut ? { ...trip.outcome, day: supplyFailureDay } : trip.outcome, ranOut ? supplyFailure : null)
  }, [finish, supplyFailure, supplyFailureDay, trip])

  /** The rocket grazed a satellite or debris: warn, and count it for the score. */
  const onGraze = useCallback((graze) => {
    grazeRef.current += 1
    setGrazeCount(grazeRef.current)
    playSfx(SFX.cancel)
    setGrazeToast({ name: graze.hazard.name, key: `${graze.hazard.id}-${graze.day}` })
  }, [])
  useEffect(() => {
    if (!grazeToast) return undefined
    const timer = setTimeout(() => setGrazeToast(null), 2400)
    return () => clearTimeout(timer)
  }, [grazeToast])

  /** The trip reached a close pass: stop and ask the crew. */
  const openEncounter = useCallback((pass) => {
    playSfx(SFX.select)
    // The rocky runaway asteroid comes as a whole shower: a dodging game instead of a card.
    if (pass.shower) setShower(pass)
    else setEncounter({ ...pass, picked: null })
  }, [])

  /** The shower is over: go on with the trip, or the ship broke apart. */
  const endShower = useCallback(({ survived, hits }) => {
    const clock = flightRef.current
    showerHitsRef.current += hits
    setShowerHits(showerHitsRef.current)
    const pass = shower
    setShower(null)
    if (!clock || !pass) return
    if (!survived) {
      const point = tripPointAt(trip.samples, pass.day)
      clock.crash = { day: pass.day, x: point.x, y: point.y }
      clock.endedAt = performance.now()
      finish({ type: SHOWER_CRASH, day: pass.day, x: point.x, y: point.y })
      return
    }
    clock.nextEncounter += 1
    clock.paused = false
    clock.last = performance.now()
  }, [shower, trip, finish])

  /** The crew picked an answer. A bad one, or the second mild one, blows up the ship here. */
  const chooseOption = (choice) => {
    const clock = flightRef.current
    if (!clock || !encounter || encounter.picked) return
    const tooManyMild = choice.kind === CHOICE.MILD && mildRef.current + 1 >= MILD_LIMIT
    if (choice.kind === CHOICE.MILD) {
      mildRef.current += 1
      setMildMistakes(mildRef.current)
    }
    if (choice.kind === CHOICE.BAD || tooManyMild) {
      const point = tripPointAt(trip.samples, encounter.day)
      clock.crash = { day: encounter.day, x: point.x, y: point.y }
      clock.endedAt = performance.now()
      setEncounter(null)
      finish({ type: DECISION_CRASH, day: encounter.day, x: point.x, y: point.y, choice, hazard: encounter.hazard, tooManyMild })
      return
    }
    playSfx(choice.kind === CHOICE.GOOD ? SFX.confirm : SFX.cancel)
    setEncounter({ ...encounter, picked: choice })
  }

  /** After reading what happened, the trip goes on. */
  const continueTrip = () => {
    const clock = flightRef.current
    if (!clock) return
    clock.nextEncounter += 1
    clock.paused = false
    clock.last = performance.now()
    setEncounter(null)
  }

  // ------------------------------------------------------------ drawing loop
  useLayoutEffect(() => {
    sceneRef.current = { step, view, earthView, uiScale, trip, aim, site, images, canvasSize, finishCruise, openEncounter, onGraze }
  })

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
    let lastReadout = 0
    const draw = (now) => {
      const canvas = canvasRef.current
      const current = sceneRef.current
      if (canvas && current) {
        const ctx = canvas.getContext('2d')
        if (current.step === 'site') {
          // Same Earth as mission 1: the planet, the satellites as dots, the bases on top (HTML).
          const ratio = current.canvasSize.pixelRatio * current.uiScale
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
          drawOrbitScene(ctx, current.earthView, {
            step: 'site',
            orbits: [],
            selectedOrbitId: null,
            arrival: null,
            satellites: REAL_SATELLITES,
            prediction: null,
            aimPoint: null,
            flight: null,
            images: current.images,
            clockSeconds: now / 1000,
          })
          frameId = requestAnimationFrame(draw)
          return
        }
        ctx.setTransform(current.canvasSize.pixelRatio, 0, 0, current.canvasSize.pixelRatio, 0, 0)
        let flight = null
        const clock = flightRef.current
        if (clock && (current.step === 'flight' || current.step === 'result')) {
          // The trip clock runs unless the crew is deciding; it stops at each close pass.
          if (!clock.paused && !clock.endedAt) {
            clock.day += ((now - clock.last) / 1000) * (clock.endDay / FLIGHT_PLAYBACK_SECONDS)
            // Grazing a satellite or debris: no crash, a warning and points off.
            const graze = clock.grazes[clock.nextGraze]
            if (graze && clock.day >= graze.day) {
              clock.nextGraze += 1
              current.onGraze(graze)
            }
            const pass = clock.encounters[clock.nextEncounter]
            if (pass && clock.day >= pass.day) {
              clock.day = pass.day
              clock.paused = true
              current.openEncounter(pass)
            } else if (clock.day >= clock.endDay) {
              clock.day = clock.endDay
              clock.endedAt = now
              current.finishCruise()
            }
          }
          clock.last = now
          const day = clock.crash ? clock.crash.day : clock.day
          flight = { day, secondsSinceEnd: clock.endedAt ? (now - clock.endedAt) / 1000 : 0, crash: clock.crash }
          if (now - lastReadout > 120) {
            lastReadout = now
            setTelemetryDay(day)
          }
        }
        drawMarsScene(ctx, current.view, {
          step: current.step,
          trip: current.trip,
          aim: current.aim,
          site: current.site,
          sites: LAUNCH_SITES,
          flight,
          images: current.images,
          clockSeconds: now / 1000,
          tapHint: tapHintRef.current,
          asteroids: clock ? clock.encounters.filter((pass) => pass.asteroid) : [],
        })
      }
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // After a crash, let the player see the blast before the "You lose" screen.
  useEffect(() => {
    if (!result?.exploded) return undefined
    const timer = setTimeout(() => setBlastSeen(true), EXPLOSION_WATCH_MS)
    return () => clearTimeout(timer)
  }, [result])

  // ------------------------------------------------------------ input
  const pointerPosition = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  const hazardAt = (point) => {
    const day = step === 'aim' ? 0 : telemetryDay
    let closest = null
    for (const hazard of MARS_HAZARDS) {
      const world = hazardPosition(hazard, day)
      const screen = toScreen(view, world.x, world.y)
      const gap = Math.hypot(point.x - screen.x, point.y - screen.y)
      if (gap < HAZARD_TAP_PIXELS && (!closest || gap < closest.gap)) closest = { hazard, gap, screen }
    }
    return closest
  }

  const handlePointerDown = (event) => {
    // Picking the base: the map shows mission 1's Earth, the bases are their own buttons.
    if (step === 'site') return
    const point = pointerPosition(event)
    const tapped = hazardAt(point)
    if (tapped) {
      playSfx(SFX.select)
      setHazardCard({ hazard: tapped.hazard, x: tapped.screen.x, y: tapped.screen.y })
      return
    }
    setHazardCard(null)
  }

  const handlePointerMove = (event) => {
    event.currentTarget.style.cursor = step !== 'site' && hazardAt(pointerPosition(event)) ? 'pointer' : ''
  }

  // Arrow keys fine-tune the aim: left/right turn by 0.01° (Shift: 0.1°), up/down change power.
  useEffect(() => {
    if (step !== 'aim' || liftingOff) return undefined
    const onKey = (event) => {
      const big = event.shiftKey ? 10 : 1
      const turn = { ArrowLeft: 1, ArrowRight: -1 }[event.key]
      const push = { ArrowUp: 1, ArrowDown: -1 }[event.key]
      if (!turn && !push) return
      event.preventDefault()
      setAim((current) => clampAim(
        current.angleDeg + (turn ?? 0) * KEY_ANGLE_STEP_DEG * big,
        current.power + (push ?? 0) * KEY_POWER_STEP * big,
      ))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, liftingOff])

  // ------------------------------------------------------------ steps
  const selectSite = (id) => {
    playSfx(SFX.select)
    setSiteId(id)
  }
  const goToAim = () => {
    if (!site) return
    playSfx(SFX.confirm)
    // A pixel hand taps the third light (James Webb) for 3 seconds, to show the lights can be tapped.
    tapHintRef.current = { startedAt: performance.now() / 1000, hazardIndex: 2 }
    setStep('aim')
  }
  const backToSites = () => {
    playSfx(SFX.cancel)
    setStep('site')
  }

  const launch = () => {
    playSfx(SFX.liftoff)
    setHazardCard(null)
    setResult(null)
    setBlastSeen(false)
    setLiftingOff(true)
  }

  const retry = () => {
    flightRef.current = null
    mildRef.current = 0
    grazeRef.current = 0
    showerHitsRef.current = 0
    setMildMistakes(0)
    setGrazeCount(0)
    setShowerHits(0)
    setShower(null)
    setEncounter(null)
    setResult(null)
    setBlastSeen(false)
    setStep('aim')
  }

  const prediction = describeTrip(trip, aim)
  const showFailScreen = step === 'result' && result && !result.success && (!result.exploded || blastSeen)

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
    <div className="game orbit-level mars-level">
      <div className="mars-sky" aria-hidden="true"><PixelSky /></div>
      {hud}
      {liftingOff && (
        <div className="orbit-level__liftoff">
          <LaunchSequence
            equipped={equipped}
            hud={hud}
            onDone={startCruise}
            failure={sequenceFailure}
            onFail={failLaunch}
          />
        </div>
      )}
      {shower && <AsteroidShower onEnd={endShower} />}
      {step === 'landing' && <MarsLanding onDone={() => setStep('result')} />}
      {step === 'result' && result?.success && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          directionDeg={result.directionDeg}
          lead={t('Your rocket reached Mars after {{days}} days!', { days: Math.round(result.outcome.day) })}
          onContinue={onExit}
          onFlyAgain={retry}
        />
      )}
      {showFailScreen && (
        <MissionFailedScreen
          mission={mission}
          result={result}
          reason={failureReason(result)}
          hint={failureHint(result)}
          onHangar={onBackToHangar}
          onRetry={result.failure ? undefined : retry}
        />
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          {/* Deykell's animated Sun (floats, glow pulses, rays twinkle) at the middle of the map, under the canvas. */}
          {step !== 'site' && (
            <img
              className="mars-sun"
              src={animatedSun}
              alt=""
              aria-hidden="true"
              style={{ left: view.centerX, top: view.centerY, width: SUN_PIXELS, height: SUN_PIXELS }}
            />
          )}
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step === 'aim' ? 'aim' : step}`}
            aria-label={t('The Sun, Earth and Mars from above, with space debris, satellites and the predicted path')}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
          />
          {/* Launch bases on the Earth, like mission 1: tap one to choose it. After the canvas, so they sit on top. */}
          {step === 'site' && (
            <div className="orbit-sites">
              {LAUNCH_SITES.map((candidate) => {
                const position = siteScreenPosition(earthView, candidate)
                const side = position.x >= earthView.centerX ? 'right' : 'left'
                const selected = candidate.id === siteId
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`orbit-site orbit-site--${side}${selected ? ' is-selected' : ''}`}
                    style={{ left: position.x * uiScale, top: position.y * uiScale }}
                    aria-pressed={selected}
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
          )}
          {grazeToast && (
            <div className="mars-graze" role="status" key={grazeToast.key}>
              <PixelIcon name="warning" /> {t('Grazed {{name}}! −{{points}} points', { name: t(grazeToast.name), points: GRAZE_PENALTY })}
            </div>
          )}
          {encounter && (
            <div className="mars-encounter" role="dialog" aria-modal="true" aria-labelledby="mars-encounter-question">
              {encounter.hazard.icy && (
                <img className="mars-encounter__sprite" src={iceAsteroid} alt="" aria-hidden="true" draggable="false" />
              )}
              <p className="mars-encounter__kicker"><PixelIcon name="warning" /> {t('Day {{day}} · {{name}}', { day: Math.round(encounter.day), name: t(encounter.hazard.name) })}</p>
              {!encounter.picked ? (
                <>
                  <h3 id="mars-encounter-question" className="mars-encounter__question">{t(encounter.situation.question, { name: t(encounter.hazard.name) })}</h3>
                  {encounter.situation.story && <p className="mars-encounter__story">{t(encounter.situation.story)}</p>}
                  <div className="mars-encounter__choices">
                    {encounter.situation.choices.map((choice) => (
                      <button key={choice.text} type="button" className="mars-encounter__choice" onClick={() => chooseOption(choice)}>
                        {t(choice.text)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 id="mars-encounter-question" className={`mars-encounter__result is-${encounter.picked.kind}`}>
                    {encounter.picked.kind === CHOICE.GOOD
                      ? <><PixelIcon name="check" /> {t('Good choice!')}</>
                      : <><PixelIcon name="warning" /> {t('Risky! −{{points}} points', { points: MILD_PENALTY })}</>}
                  </h3>
                  <p className="mars-encounter__explain">{t(encounter.picked.explain)}</p>
                  {encounter.situation.story && <p className="mars-encounter__story">{t(encounter.situation.story)}</p>}
                  <button type="button" className="ms-btn" onClick={continueTrip}>{t('Keep flying')}</button>
                </>
              )}
            </div>
          )}
          <aside className={`mars-fact mars-fact--${FACT_CORNERS[fact.corner]}`} aria-live="polite" key={fact.index}>
            <p className="mars-fact__label"><PixelIcon name="ringedPlanet" /> {t('Space fact')}</p>
            <p className="mars-fact__text">{t(SPACE_FACTS[fact.index])}</p>
          </aside>
          {hazardCard && (
            <div
              className={`satellite-card${hazardCard.y < 150 ? ' is-below' : ''}`}
              style={{ left: Math.min(Math.max(hazardCard.x, 130), canvasSize.width - 130), top: hazardCard.y }}
              role="dialog"
              aria-label={t(hazardCard.hazard.name)}
            >
              <button type="button" className="satellite-card__close" aria-label={t('Close')} onClick={() => setHazardCard(null)}>
                <PixelIcon name="close" />
              </button>
              <h3 className="satellite-card__name">{t(hazardCard.hazard.name)}</h3>
              <p className="satellite-card__kind">
                {t('{{kind}} · {{au}} AU from the Sun', {
                  kind: hazardCard.hazard.kind === 'debris' ? t('Space debris: old rocket stage') : t('Satellite'),
                  au: hazardCard.hazard.radiusAu,
                })}
              </p>
              <p className="satellite-card__summary">{t(hazardCard.hazard.summary)}</p>
            </div>
          )}
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'site' && (
            <>
              <h2 className="orbit-panel__title">{t('1. Pick a launch base')}</h2>
              {site ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{t(site.name)}, {t(site.country)}</p>
                  <p><b>{t('Spaceport:')}</b> {t(site.spaceport)}</p>
                  <p><b>{t('Why here?')}</b> {t(site.why)}</p>
                </div>
              ) : (
                <p className="orbit-panel__hint">{t('Tap a launch base on the Earth. The rocket leaves from that city.')}</p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>{t('Hangar')}</button>
                <button type="button" className="ms-btn" disabled={!site} onClick={goToAim}>{t('Next')}</button>
              </div>
            </>
          )}
          {step === 'aim' && (
            <>
              <h2 className="orbit-panel__title">{t('2. Aim at Mars from {{name}}', { name: t(site?.name || '') })}</h2>
              <p className="orbit-panel__hint">
                {t('Move the two sliders. Mars moves, so aim between {{min}}° and {{max}}° (best: {{best}}°). The dotted line turns green when it meets Mars.', {
                  min: ANGLE_WINDOW.min,
                  max: ANGLE_WINDOW.max,
                  best: TARGET_ANGLE_DEG,
                })}
              </p>
              <div className="mars-slider">
                <label htmlFor="mars-angle">{t('Angle')} <b>{formatAngle(aim.angleDeg)}</b></label>
                <div className="mars-slider__row">
                  <button type="button" className="mars-slider__step" aria-label={t('Less angle')} onClick={() => setAim(clampAim(aim.angleDeg - ANGLE_SLIDER.step, aim.power))}>−</button>
                  <input
                    id="mars-angle"
                    type="range"
                    min={ANGLE_SLIDER.min}
                    max={ANGLE_SLIDER.max}
                    step={ANGLE_SLIDER.step}
                    value={aim.angleDeg}
                    onChange={(event) => setAim(clampAim(Number(event.target.value), aim.power))}
                  />
                  <button type="button" className="mars-slider__step" aria-label={t('More angle')} onClick={() => setAim(clampAim(aim.angleDeg + ANGLE_SLIDER.step, aim.power))}>+</button>
                </div>
                <p className="mars-slider__scale"><span>{ANGLE_SLIDER.min}°</span><span>{ANGLE_WINDOW.min}°–{ANGLE_WINDOW.max}°</span><span>{ANGLE_SLIDER.max}°</span></p>
              </div>
              <div className="mars-slider">
                <label htmlFor="mars-power">{t('Power')} <b>{Math.round(aim.power * 100)}%</b></label>
                <div className="mars-slider__row">
                  <button type="button" className="mars-slider__step" aria-label={t('Less power')} onClick={() => setAim(clampAim(aim.angleDeg, aim.power - POWER_SLIDER.step))}>−</button>
                  <input
                    id="mars-power"
                    type="range"
                    min={POWER_SLIDER.min}
                    max={POWER_SLIDER.max}
                    step={POWER_SLIDER.step}
                    value={aim.power}
                    onChange={(event) => setAim(clampAim(aim.angleDeg, Number(event.target.value)))}
                  />
                  <button type="button" className="mars-slider__step" aria-label={t('More power')} onClick={() => setAim(clampAim(aim.angleDeg, aim.power + POWER_SLIDER.step))}>+</button>
                </div>
              </div>
              <p className={`orbit-prediction is-${prediction.tone}`} style={{ borderColor: pathColor(trip.outcome) }}>
                {sayTo(playerName, prediction.text)}
              </p>
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={backToSites}>{t('Back')}</button>
                <button type="button" className="ms-btn" onClick={launch} disabled={liftingOff}>{t('Launch')} <PixelIcon name="rocket" /></button>
              </div>
            </>
          )}
          {step !== 'aim' && (
            <>
              <h2 className="orbit-panel__title">{step === 'flight' ? t('On the way to Mars') : t('Trip over')}</h2>
              <dl className="orbit-stats">
                <div><dt>{t('Day')}</dt><dd>{Math.round(telemetryDay)}</dd></div>
                <div><dt>{t('Your angle')}</dt><dd>{formatAngle(aim.angleDeg)}</dd></div>
                <div><dt>{t('Power')}</dt><dd>{Math.round(aim.power * 100)}%</dd></div>
                <div><dt>{t('Risky choices')}</dt><dd>{mildMistakes} / {MILD_LIMIT}</dd></div>
                <div><dt>{t('Grazes')}</dt><dd>{grazeCount}</dd></div>
                <div><dt>{t('Asteroid hits')}</dt><dd>{showerHits}</dd></div>
              </dl>
              {mildMistakes > 0 && (
                <p className="orbit-panel__hint">Each risky choice costs {MILD_PENALTY} points. One more and the ship breaks apart.</p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
