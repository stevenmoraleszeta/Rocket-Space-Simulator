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
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { flightSupplyFailure, launchFailure } from '../../launchFailure.js'
import { flightNotes } from '../../flightSummary.js'
import { MissionCompleteScreen } from '../orbit/MissionCompleteScreen.jsx'
import { MissionFailedScreen } from '../orbit/MissionFailedScreen.jsx'
import { LAUNCH_SITES } from '../orbit/launchSites.js'
import { REAL_SATELLITES } from '../orbit/realSatellites.js'
import { createView as createEarthView, drawOrbitScene, siteScreenPosition } from '../orbit/orbitRenderer.js'
import { useUiScale } from '../../../lib/uiScale.js'
import {
  ANGLE_WINDOW,
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
import { createMarsView, drawMarsScene, pathColor, toScreen } from './marsLaunchRenderer.js'
import {
  CHOICE,
  FACT_EVERY_MS,
  MILD_LIMIT,
  MILD_PENALTY,
  SPACE_FACTS,
  tripEncounters,
} from './marsEncounters.js'
import './marsLaunch.css'
import '../../game.css'
import '../orbit/orbitalLaunch.css'

/** The whole cruise plays in this many real seconds. */
const FLIGHT_PLAYBACK_SECONDS = 7
/** After a crash, watch the blast this long before the "You lose" screen. */
const EXPLOSION_WATCH_MS = 1500
/** Arrow keys move the aim this much (with Shift: ten times more). */
const KEY_ANGLE_STEP_DEG = 0.01
const KEY_POWER_STEP = 0.01
/** A tap this close to a hazard opens its card. */
const HAZARD_TAP_PIXELS = 20
/** The aim is inside the allowed window (134°–138°). */
const angleInWindow = (deg) => deg >= ANGLE_WINDOW.min && deg <= ANGLE_WINDOW.max
const WINDOW_TEXT = `between ${ANGLE_WINDOW.min}° and ${ANGLE_WINDOW.max}°`

const FIRST_AIM = { angleDeg: 125, power: 0.6 }
/** The two aiming sliders. */
const ANGLE_SLIDER = { min: 120, max: 150, step: 0.05 }
const POWER_SLIDER = { min: 0.4, max: 1, step: 0.01 }
/** Outcome when a crew choice blows up the ship. */
const DECISION_CRASH = 'marsDecision'
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

const formatAngle = (deg) => `${deg.toFixed(2)}°`

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
      return { tone: 'good', text: `Great aim! In ${Math.round(outcome.day)} days you meet Mars.` }
    case MARS_OUTCOMES.HAZARD:
      return { tone: 'bad', text: `Careful! It crashes into ${outcome.hazard.name}.` }
    case MARS_OUTCOMES.SHORT:
      return { tone: 'warn', text: 'Not enough power: it never reaches Mars’s orbit.' }
    default:
      return angleInWindow(aim.angleDeg)
        ? { tone: 'warn', text: 'Good angle, but with this power Mars is not there when you arrive.' }
        : { tone: 'warn', text: `At ${formatAngle(aim.angleDeg)} Mars has moved away. Aim ${WINDOW_TEXT} (best: ${TARGET_ANGLE_DEG}°).` }
  }
}

/** Why the trip failed, for the "You lose" screen. */
function failureReason(result) {
  const { outcome } = result
  if (result.failure) return result.failure.message
  if (outcome.type === DECISION_CRASH) {
    return outcome.tooManyMild
      ? `${outcome.choice.explain} That was the second risky choice, and the ship broke apart.`
      : outcome.choice.explain
  }
  switch (outcome.type) {
    case MARS_OUTCOMES.HAZARD:
      return `The rocket crashed into ${outcome.hazard.name}.`
    case MARS_OUTCOMES.SHORT:
      return 'Not enough power: the rocket never reached Mars’s orbit and kept going around the Sun.'
    default:
      if (result.angleRight) {
        return `Your angle was right, but with that power you reached Mars’s orbit when Mars was ${Math.round(outcome.marsOffsetDays)} days away.`
      }
      return `You aimed at ${formatAngle(result.aimDeg)}. Mars moves about ${MARS_DEG_PER_DAY.toFixed(2)}° per day around the Sun: with that angle, when you got to its orbit Mars was no longer there. It was ${Math.round(outcome.marsOffsetDays)} days away.`
  }
}

function failureHint(result) {
  if (result.failure) return result.failure.hint
  if (result.outcome.type === DECISION_CRASH) {
    return 'On the way, pick what real crews do: move away safely and listen to mission control.'
  }
  switch (result.outcome.type) {
    case MARS_OUTCOMES.HAZARD:
      return `Watch the red danger zones. Aimed ${WINDOW_TEXT} with the right power, the path slips between them.`
    case MARS_OUTCOMES.SHORT:
      return 'Drag farther from Earth to give the rocket more power.'
    default:
      return result.angleRight
        ? 'Change the power: drag a little closer or farther from the base.'
        : `Aim ${WINDOW_TEXT} (best: ${TARGET_ANGLE_DEG}°). Use the arrow keys to fine-tune.`
  }
}

export function MarsLaunchLevel({ mission, stageInfo, equipped, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)

  const [step, setStep] = useState('site')
  const [siteId, setSiteId] = useState(null)
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
  const [images] = useState(() => ({
    // Picking the base uses mission 1's Earth; the Sun map uses the menu's Earth.
    earth: loadImage(ASSETS.earthPlanet.src),
    menuEarth: loadImage(SPRITES.planets.earth.src),
    mars: loadImage(ASSETS.marsPlanet.src),
    sun: loadImage(ASSETS.sun.src),
    rocket: loadImage(ASSETS.rocketUpperStage.src),
    explosion: loadImage(ASSETS.explosion.src),
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
  const anyFailure = useMemo(() => launchFailure(equipped, mission), [equipped, mission])
  // No boosters ('climb'): the liftoff plays, but the rocket cannot speed up enough to leave Earth.
  const sequenceFailure = anyFailure?.at === 'climb' ? null : anyFailure
  const supplyFailure = useMemo(() => flightSupplyFailure(equipped, mission), [equipped, mission])
  /** Trip day when food, water or air runs out (the mission's supplies are planned for its own length). */
  const supplyFailureDay = supplyFailure
    ? (supplyFailure.returnsHome ? 0.3 : supplyFailure.atSeconds / mission.loadout.durationSeconds) * IDEAL_TRIP_DAYS
    : null

  const finish = useCallback((outcome, failure = null) => {
    const success = outcome.type === MARS_OUTCOMES.REACHED && !failure
    const mild = mildRef.current
    const pct = success ? Math.max(0, scoreMarsArrival(outcome, trip.angleErrorDeg) - mild * MILD_PENALTY) : 0
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
    const exploded = (MARS_EXPLODING.includes(outcome.type) || outcome.type === DECISION_CRASH) && !failure
    playSfx(success ? SFX.missionComplete : exploded ? SFX.explosion : SFX.lose)
    setResult({
      outcome: failure ? { ...outcome, type: failure.id } : outcome,
      success,
      pct,
      stars: progress?.stars ?? 0,
      unlockedMissionId: progress?.unlockedMissionId ?? null,
      aimDeg: aim.angleDeg,
      directionDeg: aim.angleDeg.toFixed(2),
      angleRight: angleInWindow(aim.angleDeg),
      failure,
      exploded,
      mildMistakes: mild,
    })
    setStep('result')
  }, [aim, trip, completeMission, mission.id, equipped, site])

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
      nextEncounter: 0,
    }
    mildRef.current = 0
    setMildMistakes(0)
    setEncounter(null)
    setTelemetryDay(0)
    setStep('flight')
  }, [anyFailure, finish, supplyFailureDay, trip])

  const finishCruise = useCallback(() => {
    const ranOut = supplyFailureDay != null && supplyFailureDay < trip.outcome.day
    finish(ranOut ? { ...trip.outcome, day: supplyFailureDay } : trip.outcome, ranOut ? supplyFailure : null)
  }, [finish, supplyFailure, supplyFailureDay, trip])

  /** The trip reached a close pass: stop and ask the crew. */
  const openEncounter = useCallback((pass) => {
    playSfx(SFX.select)
    setEncounter({ ...pass, picked: null })
  }, [])

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
    sceneRef.current = { step, view, earthView, uiScale, trip, aim, site, images, canvasSize, finishCruise, openEncounter }
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
    setMildMistakes(0)
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
        Missions
      </button>
      <div className="game__mission">
        <div className="game__num">Level {stageInfo.levelNumber} · {stageInfo.title}</div>
        <h1>{mission.title}</h1>
      </div>
      <div className="game__place">{mission.place}</div>
    </header>
  )

  return (
    <div className="game orbit-level" style={{ backgroundImage: `url(${ASSETS.spaceBackground.src})` }}>
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
      {step === 'result' && result?.success && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          directionDeg={result.directionDeg}
          lead={`Your rocket reached Mars after ${Math.round(result.outcome.day)} days!`}
          onContinue={onExit}
          onFlyAgain={retry}
        />
      )}
      {showFailScreen && (
        <MissionFailedScreen
          mission={mission}
          result={result}
          reason={sayTo(playerName, failureReason(result))}
          hint={failureHint(result)}
          onHangar={onBackToHangar}
          onRetry={result.failure ? undefined : retry}
        />
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step === 'aim' ? 'aim' : step}`}
            aria-label="The Sun, Earth and Mars from above, with space debris, satellites and the predicted path"
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
                    <span className="orbit-site__dot" />
                    <span className="orbit-site__name">
                      {candidate.name}
                      <span className="orbit-site__country">{candidate.country}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {encounter && (
            <div className="mars-encounter" role="dialog" aria-modal="true" aria-labelledby="mars-encounter-question">
              <p className="mars-encounter__kicker">⚠️ Day {Math.round(encounter.day)} · {encounter.hazard.name}</p>
              {!encounter.picked ? (
                <>
                  <h3 id="mars-encounter-question" className="mars-encounter__question">{encounter.situation.question}</h3>
                  <div className="mars-encounter__choices">
                    {encounter.situation.choices.map((choice) => (
                      <button key={choice.text} type="button" className="mars-encounter__choice" onClick={() => chooseOption(choice)}>
                        {choice.text}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 id="mars-encounter-question" className={`mars-encounter__result is-${encounter.picked.kind}`}>
                    {encounter.picked.kind === CHOICE.GOOD ? '✅ Good choice!' : `⚠️ Risky! −${MILD_PENALTY} points`}
                  </h3>
                  <p className="mars-encounter__explain">{encounter.picked.explain}</p>
                  <button type="button" className="ms-btn" onClick={continueTrip}>Keep flying</button>
                </>
              )}
            </div>
          )}
          <aside className={`mars-fact mars-fact--${FACT_CORNERS[fact.corner]}`} aria-live="polite" key={fact.index}>
            <p className="mars-fact__label">🪐 Space fact</p>
            <p className="mars-fact__text">{SPACE_FACTS[fact.index]}</p>
          </aside>
          {hazardCard && (
            <div
              className={`satellite-card${hazardCard.y < 150 ? ' is-below' : ''}`}
              style={{ left: Math.min(Math.max(hazardCard.x, 130), canvasSize.width - 130), top: hazardCard.y }}
              role="dialog"
              aria-label={hazardCard.hazard.name}
            >
              <button type="button" className="satellite-card__close" aria-label="Close" onClick={() => setHazardCard(null)}>
                ✕
              </button>
              <h3 className="satellite-card__name">{hazardCard.hazard.name}</h3>
              <p className="satellite-card__kind">
                {hazardCard.hazard.kind === 'debris' ? 'Space debris: old rocket stage' : 'Satellite'} · {hazardCard.hazard.radiusAu} AU from the Sun
              </p>
              <p className="satellite-card__summary">{hazardCard.hazard.summary}</p>
            </div>
          )}
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'site' && (
            <>
              <h2 className="orbit-panel__title">1. Pick a launch base</h2>
              {site ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{site.name}, {site.country}</p>
                  <p><b>Spaceport:</b> {site.spaceport}</p>
                  <p><b>Why here?</b> {site.why}</p>
                </div>
              ) : (
                <p className="orbit-panel__hint">Tap a launch base on the Earth. The rocket leaves from that city.</p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>Hangar</button>
                <button type="button" className="ms-btn" disabled={!site} onClick={goToAim}>Next</button>
              </div>
            </>
          )}
          {step === 'aim' && (
            <>
              <h2 className="orbit-panel__title">2. Aim at Mars from {site?.name}</h2>
              <p className="orbit-panel__hint">
                Move the two sliders. Mars moves, so aim <b>{WINDOW_TEXT}</b> (best: {TARGET_ANGLE_DEG}°). The dotted
                line turns green when it meets Mars.
              </p>
              <div className="mars-slider">
                <label htmlFor="mars-angle">Angle <b>{formatAngle(aim.angleDeg)}</b></label>
                <div className="mars-slider__row">
                  <button type="button" className="mars-slider__step" aria-label="Less angle" onClick={() => setAim(clampAim(aim.angleDeg - ANGLE_SLIDER.step, aim.power))}>−</button>
                  <input
                    id="mars-angle"
                    type="range"
                    min={ANGLE_SLIDER.min}
                    max={ANGLE_SLIDER.max}
                    step={ANGLE_SLIDER.step}
                    value={aim.angleDeg}
                    onChange={(event) => setAim(clampAim(Number(event.target.value), aim.power))}
                  />
                  <button type="button" className="mars-slider__step" aria-label="More angle" onClick={() => setAim(clampAim(aim.angleDeg + ANGLE_SLIDER.step, aim.power))}>+</button>
                </div>
                <p className="mars-slider__scale"><span>{ANGLE_SLIDER.min}°</span><span>{ANGLE_WINDOW.min}°–{ANGLE_WINDOW.max}°</span><span>{ANGLE_SLIDER.max}°</span></p>
              </div>
              <div className="mars-slider">
                <label htmlFor="mars-power">Power <b>{Math.round(aim.power * 100)}%</b></label>
                <div className="mars-slider__row">
                  <button type="button" className="mars-slider__step" aria-label="Less power" onClick={() => setAim(clampAim(aim.angleDeg, aim.power - POWER_SLIDER.step))}>−</button>
                  <input
                    id="mars-power"
                    type="range"
                    min={POWER_SLIDER.min}
                    max={POWER_SLIDER.max}
                    step={POWER_SLIDER.step}
                    value={aim.power}
                    onChange={(event) => setAim(clampAim(aim.angleDeg, Number(event.target.value)))}
                  />
                  <button type="button" className="mars-slider__step" aria-label="More power" onClick={() => setAim(clampAim(aim.angleDeg, aim.power + POWER_SLIDER.step))}>+</button>
                </div>
              </div>
              <p className={`orbit-prediction is-${prediction.tone}`} style={{ borderColor: pathColor(trip.outcome) }}>
                {sayTo(playerName, prediction.text)}
              </p>
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={backToSites}>Back</button>
                <button type="button" className="ms-btn" onClick={launch} disabled={liftingOff}>Launch 🚀</button>
              </div>
            </>
          )}
          {step !== 'aim' && (
            <>
              <h2 className="orbit-panel__title">{step === 'flight' ? 'On the way to Mars' : 'Trip over'}</h2>
              <dl className="orbit-stats">
                <div><dt>Day</dt><dd>{Math.round(telemetryDay)}</dd></div>
                <div><dt>Your angle</dt><dd>{formatAngle(aim.angleDeg)}</dd></div>
                <div><dt>Power</dt><dd>{Math.round(aim.power * 100)}%</dd></div>
                <div><dt>Risky choices</dt><dd>{mildMistakes} / {MILD_LIMIT}</dd></div>
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
