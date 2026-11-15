/**
 * MISSION 3 — LAUNCH TO MARS, after the hangar. Same mechanics as mission 1 (OrbitalLaunchLevel):
 *
 *   aim      hold and drag from Earth: the direction is the launch angle, the distance the power.
 *            The dotted line shows the real path. Only exactly 135.55° meets Mars (marsLaunchRoute.js).
 *   liftoff  the pad and the climb (LaunchSequence); missing parts blow up or stop the launch
 *   flight   the cruise around the Sun plays in a few seconds; Mars, Earth and the hazards move
 *   result   "You did it!" or "You lose" with the reason, saved with the other missions
 *
 * Space debris and satellites drift across the road. Tap one to see what it is.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '../../../levels'
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../../../audio'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { flightSupplyFailure, launchFailure } from '../../launchFailure.js'
import { flightNotes } from '../../flightSummary.js'
import { MissionCompleteScreen } from '../orbit/MissionCompleteScreen.jsx'
import { MissionFailedScreen } from '../orbit/MissionFailedScreen.jsx'
import {
  IDEAL_TRIP_DAYS,
  MARS_DEG_PER_DAY,
  MARS_EXPLODING,
  MARS_HAZARDS,
  MARS_OUTCOMES,
  TARGET_ANGLE_DEG,
  hazardPosition,
  scoreMarsArrival,
  simulateMarsTrip,
} from './marsLaunchRoute.js'
import { aimFromPointer, createMarsView, drawMarsScene, pathColor, toScreen } from './marsLaunchRenderer.js'
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
/** Angle mistakes up to this still count as "the right angle" when explaining a miss. */
const ANGLE_OK_DEG = 0.2

const FIRST_AIM = { angleDeg: 120, power: 0.55 }

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
      return Math.abs(trip.angleErrorDeg) <= ANGLE_OK_DEG
        ? { tone: 'warn', text: 'Good angle, but with this power Mars is not there when you arrive.' }
        : { tone: 'warn', text: `At ${formatAngle(aim.angleDeg)} Mars has moved away. Aim at exactly ${TARGET_ANGLE_DEG}°.` }
  }
}

/** Why the trip failed, for the "You lose" screen. */
function failureReason(result) {
  const { outcome } = result
  if (result.failure) return result.failure.message
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
  switch (result.outcome.type) {
    case MARS_OUTCOMES.HAZARD:
      return `Watch the red danger zones. The right path at exactly ${TARGET_ANGLE_DEG}° slips between them.`
    case MARS_OUTCOMES.SHORT:
      return 'Drag farther from Earth to give the rocket more power.'
    default:
      return result.angleRight ? 'Change the power: drag a little closer or farther from Earth.' : `Aim at exactly ${TARGET_ANGLE_DEG}°. Use the arrow keys to fine-tune.`
  }
}

export function MarsLaunchLevel({ mission, stageInfo, equipped, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)

  const [step, setStep] = useState('aim')
  const [aim, setAim] = useState(FIRST_AIM)
  const [result, setResult] = useState(null)
  const [telemetryDay, setTelemetryDay] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600, pixelRatio: 1 })
  const [liftingOff, setLiftingOff] = useState(false)
  const [hazardCard, setHazardCard] = useState(null) // { hazard, x, y }
  const [blastSeen, setBlastSeen] = useState(false)

  useSoundtrack(step === 'flight' || step === 'result' ? { music: MUSIC.flight, ambient: AMBIENCE.space } : { music: MUSIC.flight })

  const canvasRef = useRef(null)
  const draggingRef = useRef(false)
  const flightRef = useRef(null) // { startedAt, endDay, endedAt }
  const sceneRef = useRef(null)
  const [images] = useState(() => ({
    earth: loadImage(ASSETS.earthPlanet.src),
    mars: loadImage(ASSETS.marsPlanet.src),
    sun: loadImage(ASSETS.sun.src),
    rocket: loadImage(ASSETS.rocketUpperStage.src),
    explosion: loadImage(ASSETS.explosion.src),
    satellite: loadImage(ASSETS.commsSatellite.src),
  }))

  const view = useMemo(() => createMarsView(canvasSize.width, canvasSize.height), [canvasSize])
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
    const pct = success ? scoreMarsArrival(outcome, trip.angleErrorDeg) : 0
    let progress = null
    try {
      progress = completeMission(mission.id, { pct, success, flight: flightNotes(equipped, { orbit: formatAngle(aim.angleDeg) }) })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    const exploded = MARS_EXPLODING.includes(outcome.type) && !failure
    playSfx(success ? SFX.missionComplete : exploded ? SFX.explosion : SFX.lose)
    setResult({
      outcome: failure ? { ...outcome, type: failure.id } : outcome,
      success,
      pct,
      stars: progress?.stars ?? 0,
      unlockedMissionId: progress?.unlockedMissionId ?? null,
      aimDeg: aim.angleDeg,
      directionDeg: aim.angleDeg.toFixed(2),
      angleRight: Math.abs(trip.angleErrorDeg) <= ANGLE_OK_DEG,
      failure,
      exploded,
    })
    setStep('result')
  }, [aim, trip, completeMission, mission.id, equipped])

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
    flightRef.current = { startedAt: performance.now(), endDay, endedAt: null }
    setTelemetryDay(0)
    setStep('flight')
  }, [anyFailure, finish, supplyFailureDay, trip])

  const finishCruise = useCallback(() => {
    const ranOut = supplyFailureDay != null && supplyFailureDay < trip.outcome.day
    finish(ranOut ? { ...trip.outcome, day: supplyFailureDay } : trip.outcome, ranOut ? supplyFailure : null)
  }, [finish, supplyFailure, supplyFailureDay, trip])

  // ------------------------------------------------------------ drawing loop
  useLayoutEffect(() => {
    sceneRef.current = { step, view, trip, aim, images, canvasSize, finishCruise }
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
        ctx.setTransform(current.canvasSize.pixelRatio, 0, 0, current.canvasSize.pixelRatio, 0, 0)
        let flight = null
        const clock = flightRef.current
        if (clock && (current.step === 'flight' || current.step === 'result')) {
          const progress = Math.min(1, (now - clock.startedAt) / 1000 / FLIGHT_PLAYBACK_SECONDS)
          const day = progress * clock.endDay
          if (progress >= 1 && !clock.endedAt) {
            clock.endedAt = now
            current.finishCruise()
          }
          flight = { day, secondsSinceEnd: clock.endedAt ? (now - clock.endedAt) / 1000 : 0 }
          if (now - lastReadout > 120) {
            lastReadout = now
            setTelemetryDay(day)
          }
        }
        drawMarsScene(ctx, current.view, {
          step: current.step,
          trip: current.trip,
          aim: current.aim,
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

  const aimAt = (point) => {
    const next = aimFromPointer(view, point.x, point.y)
    if (next) setAim(next)
  }

  const handlePointerDown = (event) => {
    const point = pointerPosition(event)
    const tapped = hazardAt(point)
    if (tapped) {
      playSfx(SFX.select)
      setHazardCard({ hazard: tapped.hazard, x: tapped.screen.x, y: tapped.screen.y })
      return
    }
    setHazardCard(null)
    if (step !== 'aim') return
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    aimAt(point)
  }

  const handlePointerMove = (event) => {
    if (draggingRef.current && step === 'aim') {
      aimAt(pointerPosition(event))
      return
    }
    event.currentTarget.style.cursor = hazardAt(pointerPosition(event)) ? 'pointer' : ''
  }

  const handlePointerUp = () => {
    draggingRef.current = false
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
      setAim((current) => ({
        angleDeg: turn ? Math.round(((current.angleDeg + turn * KEY_ANGLE_STEP_DEG * big + 360) % 360) * 100) / 100 : current.angleDeg,
        power: push ? Math.min(1, Math.max(0.2, current.power + push * KEY_POWER_STEP * big)) : current.power,
      }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, liftingOff])

  // ------------------------------------------------------------ steps
  const launch = () => {
    playSfx(SFX.liftoff)
    setHazardCard(null)
    setResult(null)
    setBlastSeen(false)
    setLiftingOff(true)
  }

  const retry = () => {
    flightRef.current = null
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
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
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
          {step === 'aim' && (
            <>
              <h2 className="orbit-panel__title">Aim at Mars</h2>
              <p className="orbit-panel__hint">
                Hold the click on the map and move: the direction from Earth is your launch angle, farther away is more
                power. Mars moves, so only <b>exactly {TARGET_ANGLE_DEG}°</b> meets it. Arrow keys fine-tune (Shift: faster).
              </p>
              <dl className="orbit-stats">
                <div><dt>Your angle</dt><dd>{formatAngle(aim.angleDeg)}</dd></div>
                <div><dt>Target</dt><dd>{TARGET_ANGLE_DEG}°</dd></div>
                <div><dt>Power</dt><dd>{Math.round(aim.power * 100)}%</dd></div>
              </dl>
              <p className={`orbit-prediction is-${prediction.tone}`} style={{ borderColor: pathColor(trip.outcome) }}>
                {sayTo(playerName, prediction.text)}
              </p>
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>Hangar</button>
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
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
