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
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { rotationBoostForInclination } from '../../physics/orbitalMechanics.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { LAUNCH_SITES } from './launchSites.js'
import { OUTCOMES, arrivalPosition, degreesToRadians, simulateLaunch } from './launchSimulation.js'
import { buildLaunchVehicle } from './launchVehicle.js'
import { aimFromPointer, initialAim, siteAngleOf } from './orbitAiming.js'
import {
  createView,
  drawOrbitScene,
  flightPoseAt,
  siteScreenPosition,
} from './orbitRenderer.js'
import {
  SUGGESTED_ARRIVAL_OFFSET_DEG,
  checkTargetFromSite,
  hardestOrbit,
  rateSiteForMission,
  scoreOrbitInsertion,
} from './orbitTargets.js'
import { REAL_SATELLITES } from './realSatellites.js'
import '../../game.css'
import './orbitalLaunch.css'

/** Real seconds the climb and the coast take on screen, at most. Any flight lasts a few seconds. */
const MAX_ASCENT_PLAYBACK_SECONDS = 4
const MAX_COAST_PLAYBACK_SECONDS = 7
/** Simulated seconds per real second for the satellite circling after a success. */
const ORBIT_PLAYBACK_WARP = 150

const OUTCOME_MESSAGES = {
  [OUTCOMES.ORBIT_REACHED]: 'Satellite in orbit!',
  [OUTCOMES.EARTH_IMPACT]: 'The rocket fell back and crashed into the Earth.',
  [OUTCOMES.LOST_IN_SPACE]: 'Too much power: the rocket flew far above the orbit and got lost in space.',
  [OUTCOMES.MISSED_TARGET]: 'The rocket did not reach the arrival point.',
  [OUTCOMES.NO_LIFTOFF]: 'The rocket is too heavy for its engines and cannot lift off.',
}

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

const formatKm = (meters) => `${Math.round(meters / 1000).toLocaleString('en-US')} km`
const formatKmPerSecond = (metersPerSecond) => `${(metersPerSecond / 1000).toFixed(1)} km/s`
const radiansToDegrees = (radians) => Math.round((radians * 180) / Math.PI)

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

/** One-line explanation of what the dotted line predicts. */
function describePrediction(prediction) {
  const { outcome, closestTargetKm, bestInsertion } = prediction
  switch (outcome.type) {
    case OUTCOMES.ORBIT_REACHED:
      return { tone: 'good', text: 'Great aim! The satellite reaches its orbit.' }
    case OUTCOMES.SATELLITE_COLLISION:
      return { tone: 'bad', text: `Careful! It crashes into ${outcome.satelliteName}.` }
    case OUTCOMES.EARTH_IMPACT:
      return { tone: 'bad', text: 'Not enough: it falls back and crashes into the Earth. Aim flatter or give more power.' }
    case OUTCOMES.NO_LIFTOFF:
      return { tone: 'bad', text: 'Too heavy: the engines cannot lift the rocket.' }
    case OUTCOMES.LOST_IN_SPACE:
      return { tone: 'warn', text: 'Too much power: it flies far above the orbit.' }
    default:
      if (bestInsertion) {
        return { tone: 'warn', text: 'It passes the arrival point too fast or too slow to stay there. Change the power.' }
      }
      return { tone: 'warn', text: `It misses the arrival point by ${Math.round(closestTargetKm).toLocaleString('en-US')} km.` }
  }
}

export function OrbitalLaunchLevel({ mission, stageInfo, equipped, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const vehicle = useMemo(() => buildLaunchVehicle(equipped), [equipped])

  const [step, setStep] = useState('site')
  // Same tracks as the hangar flight: intense music, plus the space ambience once the rocket flies.
  useSoundtrack(step === 'flight' || step === 'result' ? { music: MUSIC.flight, ambient: AMBIENCE.space } : { music: MUSIC.flight })
  const [siteId, setSiteId] = useState(null)
  const [arrivalAngle, setArrivalAngle] = useState(null)
  const [aim, setAim] = useState(null)
  const [aimPoint, setAimPoint] = useState(null)
  const [result, setResult] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600, pixelRatio: 1 })

  const view = useMemo(() => createView(canvasSize.width, canvasSize.height), [canvasSize])
  const site = LAUNCH_SITES.find((candidate) => candidate.id === siteId) ?? null
  // First level: no orbit choice. The satellite always aims for the hardest arrival orbit.
  const orbit = useMemo(() => hardestOrbit(), [])
  const siteCheck = site ? checkTargetFromSite(site, orbit) : null
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
  const [images] = useState(() => ({
    earth: loadImage(ASSETS.earthPlanet.src),
    rocketLit: loadImage(ASSETS.rocketLit.src),
    rocketOff: loadImage(ASSETS.rocketIdle.src),
    rocketUpperStage: loadImage(ASSETS.rocketUpperStage.src),
    explosion: loadImage(ASSETS.explosion.src),
    goldSatellite: loadImage(ASSETS.goldSatellite.src),
    commsSatellite: loadImage(ASSETS.commsSatellite.src),
    spaceTelescope: loadImage(ASSETS.spaceTelescope.src),
  }))

  const finishFlight = () => {
    const outcome = prediction.outcome
    const success = outcome.type === OUTCOMES.ORBIT_REACHED
    const pct = success ? scoreOrbitInsertion(orbit, outcome.missKm) : 0
    let progressOutcome = null
    try {
      progressOutcome = completeMission(mission.id, { pct, success })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    const crashed = outcome.type === OUTCOMES.EARTH_IMPACT || outcome.type === OUTCOMES.SATELLITE_COLLISION
    playSfx(success ? SFX.missionComplete : crashed ? SFX.explosion : SFX.lose)
    setResult({ outcome, success, pct, stars: progressOutcome?.stars ?? 0, unlockedMissionId: progressOutcome?.unlockedMissionId ?? null })
    setStep('result')
  }

  // The draw loop is created once and reads the latest state through this ref.
  const sceneRef = useRef(null)
  useLayoutEffect(() => {
    sceneRef.current = { step, view, orbitId: orbit.id, orbitsForSite, arrival, aimPoint, prediction, images, finishFlight, canvasSize }
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
        const ratio = current.canvasSize.pixelRatio
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

        let flight = null
        const flightClock = flightRef.current
        if (flightClock && current.prediction) {
          const realSeconds = (now - flightClock.startedAt) / 1000
          const simTime = playbackSimTime(realSeconds, current.prediction)
          const endTime = current.prediction.outcome.t
          if (simTime >= endTime && !flightClock.endedAt) {
            flightClock.endedAt = now
            current.finishFlight()
          }
          flight = { simTime, realSecondsSinceEnd: flightClock.endedAt ? (now - flightClock.endedAt) / 1000 : 0 }
          if (simTime < endTime && now - lastTelemetryAt > 120) {
            lastTelemetryAt = now
            const pose = flightPoseAt(current.prediction.samples, simTime)
            const later = flightPoseAt(current.prediction.samples, simTime + 1)
            setTelemetry({
              timeSeconds: simTime,
              altitudeMeters: Math.hypot(pose.x, pose.y) - EARTH_RADIUS_METERS,
              speed: Math.hypot(later.x - pose.x, later.y - pose.y),
              burning: pose.burning,
            })
          }
        }

        drawOrbitScene(ctx, current.view, {
          step: current.step,
          orbits: current.orbitsForSite,
          selectedOrbitId: current.orbitId,
          arrival: current.arrival,
          satellites: REAL_SATELLITES,
          prediction: current.prediction,
          aimPoint: current.aimPoint,
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

  // ---------------------------------------------------------------- input
  const pointerPosition = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  const selectSite = (id) => {
    playSfx(SFX.select)
    setSiteId(id)
    setArrivalAngle(null)
    setAim(null)
    setAimPoint(null)
  }

  const aimAt = (point) => {
    const nextAim = aimFromPointer(site, siteScreenPosition(view, site), point.x, point.y, view.aimMaxPixels)
    if (nextAim) {
      setAim(nextAim)
      setAimPoint(point)
    }
  }

  const handlePointerDown = (event) => {
    if (step === 'aim' && site) {
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      aimAt(pointerPosition(event))
    }
  }

  const handlePointerMove = (event) => {
    if (draggingRef.current && step === 'aim' && site) aimAt(pointerPosition(event))
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
  const [liftingOff, setLiftingOff] = useState(false)
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
          <LaunchSequence equipped={equipped} hud={hud} onDone={startOrbitFlight} />
        </div>
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step}`}
            aria-label="Earth seen from space with launch bases, satellites and the predicted path"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {/* Launch bases: real buttons on top of the planet, big enough to tap and read. */}
          <div className="orbit-sites">
            {visibleSites.map((candidate) => {
              const position = siteScreenPosition(view, candidate)
              const side = position.x >= view.centerX ? 'right' : 'left'
              const selected = candidate.id === siteId
              const className = `orbit-site orbit-site--${side}${selected ? ' is-selected' : ''}`
              const style = { left: position.x, top: position.y }
              if (step !== 'site') {
                return (
                  <span key={candidate.id} className={className} style={style}>
                    <span className="orbit-site__dot" />
                    <span className="orbit-site__name">{candidate.name}</span>
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
                  onClick={() => selectSite(candidate.id)}
                >
                  <span className="orbit-site__dot" />
                  <span className="orbit-site__name">{candidate.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'site' && (
            <>
              <h2 className="orbit-panel__title">1. Choose a launch base</h2>
              <p className="orbit-panel__hint">
                Tap a base on the Earth. This level flies to the hardest orbit: {orbit.altitudeKm} km, {orbit.name}.
              </p>
              {site ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{site.name}, {site.country}</p>
                  <p className={`orbit-badge orbit-badge--${siteRating.level}`}>{siteRating.label}</p>
                  <p><b>Why here?</b> {site.why}</p>
                  <p><b>What for?</b> {site.whatFor}</p>
                  {siteCheck && !siteCheck.ok && <p>{siteCheck.reason}</p>}
                </div>
              ) : (
                <p className="orbit-detail">Pick a base that can reach a steep polar orbit. Your satellite will take pictures of the Earth.</p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>Hangar</button>
                <button type="button" className="ms-btn" disabled={!site || !siteCheck?.ok} onClick={goToAim}>Next</button>
              </div>
            </>
          )}

          {step === 'aim' && site && orbit && aim && (
            <>
              <h2 className="orbit-panel__title">2. Aim and launch</h2>
              <p className="orbit-panel__hint">
                Hold the click and move. The dots show the real path. Farther from the base = more power.
              </p>
              <dl className="orbit-stats">
                <div><dt>Direction</dt><dd>{radiansToDegrees(aim.tiltRadians)}°</dd></div>
                <div><dt>Power</dt><dd>{Math.round(aim.power * 100)}%</dd></div>
              </dl>
              {predictionSummary && <p className={`orbit-prediction is-${predictionSummary.tone}`}>{predictionSummary.text}</p>}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={() => goBack('site')}>Back</button>
                <button type="button" className="ms-btn" onClick={launch}>Launch 🚀</button>
              </div>
            </>
          )}

          {step === 'flight' && (
            <>
              <h2 className="orbit-panel__title">Liftoff!</h2>
              {telemetry && (
                <dl className="orbit-stats">
                  <div><dt>Altitude</dt><dd>{formatKm(Math.max(0, telemetry.altitudeMeters))}</dd></div>
                  <div><dt>Speed</dt><dd>{formatKmPerSecond(telemetry.speed)}</dd></div>
                  <div><dt>Flight time</dt><dd>{Math.floor(telemetry.timeSeconds / 60)} min</dd></div>
                  <div><dt>Engine</dt><dd>{telemetry.burning ? 'On' : 'Off'}</dd></div>
                </dl>
              )}
            </>
          )}

          {step === 'result' && result && (
            <>
              <h2 className="orbit-panel__title">{result.success ? 'Mission complete!' : 'Mission failed'}</h2>
              <p className={`orbit-prediction is-${result.success ? 'good' : 'bad'}`}>
                {result.outcome.type === OUTCOMES.SATELLITE_COLLISION
                  ? `Crash! The rocket hit ${result.outcome.satelliteName}.`
                  : OUTCOME_MESSAGES[result.outcome.type]}
              </p>
              {result.success && (
                <>
                  <div className="orbit-result__stars"><StarRating stars={result.stars} size={36} /></div>
                  <dl className="orbit-stats">
                    <div><dt>Score</dt><dd>{result.pct}%</dd></div>
                    <div><dt>Off target</dt><dd>{Math.round(result.outcome.missKm)} km</dd></div>
                  </dl>
                  {result.unlockedMissionId && <p className="orbit-panel__hint">New mission unlocked: {getMission(result.unlockedMissionId)?.title}!</p>}
                </>
              )}
              {result.outcome.type === OUTCOMES.NO_LIFTOFF && (
                <p className="orbit-panel__hint">Go back to the hangar: add boosters or carry less.</p>
              )}
              <div className="orbit-panel__actions">
                {result.success ? (
                  <button type="button" className="ms-btn" onClick={onExit}>Missions</button>
                ) : (
                  <>
                    <button type="button" className="game__back" onClick={onBackToHangar}>Hangar</button>
                    <button type="button" className="ms-btn" onClick={retry}>Try again</button>
                  </>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
