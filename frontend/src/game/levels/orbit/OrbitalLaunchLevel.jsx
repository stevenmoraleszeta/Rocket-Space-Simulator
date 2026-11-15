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
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { EARTH_RADIUS_METERS } from '../../physics/constants.js'
import { rotationBoostForInclination } from '../../physics/orbitalMechanics.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { FlightReadout } from '../../FlightReadout.jsx'
import { flightReadout } from '../../lifeSupport.js'
import { flightNotes } from '../../flightSummary.js'
import { LAUNCH_FAILURES, flightSupplyFailure, launchFailure } from '../../launchFailure.js'
import { LAUNCH_SITES } from './launchSites.js'
import { LaunchFact } from './LaunchFact.jsx'
import { MissionCompleteScreen } from './MissionCompleteScreen.jsx'
import { EXPLODING_OUTCOMES, OUTCOMES, arrivalPosition, degreesToRadians, satellitePositionAt, simulateLaunch } from './launchSimulation.js'
import { buildLaunchVehicle } from './launchVehicle.js'
import { aimFromPointer, initialAim, siteAngleOf } from './orbitAiming.js'
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
import '../../game.css'
import './orbitalLaunch.css'

/** Real seconds the climb and the coast take on screen, at most. Any flight lasts a few seconds. */
const MAX_ASCENT_PLAYBACK_SECONDS = 4
const MAX_COAST_PLAYBACK_SECONDS = 7
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

const formatKm = (meters) => `${Math.round(meters / 1000).toLocaleString('en-US')} km`
const formatKmPerSecond = (metersPerSecond) => `${(metersPerSecond / 1000).toFixed(1)} km/s`
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

/** One-line explanation of what the dotted line predicts. */
function describePrediction(prediction) {
  const { outcome, closestTargetKm, bestInsertion } = prediction
  switch (outcome.type) {
    case OUTCOMES.ORBIT_REACHED:
      return { tone: 'good', text: 'Great aim! The satellite reaches its path around Earth.' }
    case OUTCOMES.SATELLITE_COLLISION:
      return { tone: 'bad', text: `Careful! The rocket hits ${outcome.satelliteName}.` }
    case OUTCOMES.EARTH_IMPACT:
      return { tone: 'bad', text: 'Not enough. It falls back and hits the Earth. Aim flatter or add power.' }
    case OUTCOMES.NO_LIFTOFF:
      return { tone: 'bad', text: 'Too heavy. The engines cannot lift the rocket.' }
    case OUTCOMES.LOST_IN_SPACE:
      return { tone: 'bad', text: 'Too much power. It flies way past the path and blows up.' }
    default:
      if (bestInsertion) {
        return { tone: 'warn', text: 'It reaches the spot too fast or too slow to stay. Change the power.' }
      }
      return { tone: 'warn', text: `It misses the spot by ${Math.round(closestTargetKm).toLocaleString('en-US')} km.` }
  }
}

/** How close (screen pixels) a tap must land to a satellite to open its card. */
const SATELLITE_TAP_PIXELS = 18

export function OrbitalLaunchLevel({ mission, stageInfo, equipped, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)
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
  // Simulated time the satellites are drawn at (moves only during the flight), for tapping them.
  const simTimeRef = useRef(0)
  const [satelliteInfo, setSatelliteInfo] = useState(null) // { satellite, x, y }
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
  const failure = useMemo(() => launchFailure(equipped, mission), [equipped, mission])
  const supplyFailure = useMemo(() => flightSupplyFailure(equipped, mission), [equipped, mission])
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
      supply = supplyFailure
    }
    const success = outcome.type === OUTCOMES.ORBIT_REACHED
    const pct = success ? scoreOrbitInsertion(orbit, outcome.missKm) : 0
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
    const crashed = EXPLODING_OUTCOMES.includes(outcome.type)
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
      supplies: flightReadout(equipped, mission, mission.loadout.durationSeconds, {
        altitudeMeters: orbit.altitudeKm * 1000,
        speedMetersPerSecond: 0,
      }),
    })
    setStep('result')
  }

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
      blewUp: Boolean(result?.failure),
      equipped,
      mission,
      supplyFailure,
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
        const ratio = current.canvasSize.pixelRatio
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

        let flight = null
        const flightClock = flightRef.current
        if (flightClock && current.prediction) {
          const realSeconds = (now - flightClock.startedAt) / 1000
          const simTime = playbackSimTime(realSeconds, current.prediction)
          const supplyAt = current.supplyFailure?.atSeconds
          const trajectoryEnd = current.prediction.outcome.t
          const endTime = supplyAt != null && supplyAt < trajectoryEnd ? supplyAt : trajectoryEnd
          if (simTime >= endTime && !flightClock.endedAt) {
            flightClock.endedAt = now
            current.finishFlight()
          }
          flight = { simTime, realSecondsSinceEnd: flightClock.endedAt ? (now - flightClock.endedAt) / 1000 : 0 }
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
    // Hand cursor over a satellite, so players know they can tap it.
    event.currentTarget.style.cursor = satelliteAt(pointerPosition(event)) ? 'pointer' : ''
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
          <LaunchSequence equipped={equipped} hud={hud} onDone={startOrbitFlight} failure={failure} onFail={failLaunch} />
        </div>
      )}
      {step === 'result' && result?.success && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          directionDeg={result.directionDeg}
          onContinue={onExit}
          onFlyAgain={retry}
        />
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
          <p className="orbit-note">This is a simulation, not a real flight.</p>
          {satelliteInfo && (
            <div
              className={`satellite-card${satelliteInfo.y < 150 ? ' is-below' : ''}`}
              style={{
                left: Math.min(Math.max(satelliteInfo.x, 130), canvasSize.width - 130),
                top: satelliteInfo.y,
              }}
              role="dialog"
              aria-label={satelliteInfo.satellite.shortName}
            >
              <button type="button" className="satellite-card__close" aria-label="Close" onClick={() => setSatelliteInfo(null)}>
                ✕
              </button>
              <h3 className="satellite-card__name">{satelliteInfo.satellite.shortName}</h3>
              <p className="satellite-card__kind">
                <span
                  className="satellite-card__dot"
                  style={{ background: SATELLITE_KIND_COLORS[satelliteInfo.satellite.kind] }}
                  aria-hidden="true"
                />
                {satelliteInfo.satellite.kind} · {satelliteInfo.satellite.altitudeKm} km
              </p>
              <p className="satellite-card__summary">{satelliteInfo.satellite.summary}</p>
            </div>
          )}
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
                    <span className="orbit-site__name">
                    {candidate.name}
                    <span className="orbit-site__country">{candidate.country}</span>
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
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'site' && (
            <>
              <h2 className="orbit-panel__title">1. Pick a launch base</h2>
              <p className="orbit-panel__hint">
                {sayTo(playerName, `Tap a base on the Earth. This trip goes ${orbit.altitudeKm} km up, on the path called ${orbit.name}.`)}
              </p>
              {site ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{site.name}, {site.country}</p>
                  <p><b>Spaceport:</b> {site.spaceport}</p>
                  <p className={`orbit-badge orbit-badge--${siteRating.level}`}>{siteRating.label}</p>
                  <p><b>Why here?</b> {site.why}</p>
                  <p><b>What for?</b> {site.whatFor}</p>
                  {siteCheck && !siteCheck.ok && <p>{siteCheck.reason}</p>}
                </div>
              ) : (
                <p className="orbit-detail">{sayTo(playerName, 'Pick a base that can fly over the top and bottom of the Earth. Your satellite will take pictures.')}</p>
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
                {sayTo(playerName, 'Hold and drag. The dots show the path. Farther from the base means more power.')}
              </p>
              <dl className="orbit-stats">
                <div><dt>Direction</dt><dd>{radiansToDegrees(aim.tiltRadians)}°</dd></div>
                <div><dt>Power</dt><dd>{Math.round(aim.power * 100)}%</dd></div>
              </dl>
              {predictionSummary && <p className={`orbit-prediction is-${predictionSummary.tone}`}>{sayTo(playerName, predictionSummary.text)}</p>}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={() => goBack('site')}>Back</button>
                <button type="button" className="ms-btn" onClick={launch}>Launch</button>
              </div>
            </>
          )}

          {step === 'flight' && (
            <>
              <h2 className="orbit-panel__title">{playerName ? sayTo(playerName, 'Liftoff!') : 'Liftoff!'}</h2>
              {telemetry && (
                <FlightReadout
                  rows={[
                    { id: 'alt', label: 'Altitude', value: formatKm(Math.max(0, telemetry.altitudeMeters)) },
                    { id: 'speed', label: 'Speed', value: formatKmPerSecond(telemetry.speed) },
                    { id: 'engine', label: 'Engine', value: telemetry.burning ? 'On' : 'Off' },
                    ...telemetry.rows,
                  ]}
                />
              )}
            </>
          )}

          {step === 'result' && result && (
            <>
              <h2 className="orbit-panel__title">
                {result.success ? sayTo(playerName, 'Mission complete!') : sayTo(playerName, 'Not this time')}
              </h2>
              <p className={`orbit-prediction is-${result.success ? 'good' : 'bad'}`}>
                {sayTo(
                  playerName,
                  result.outcome.type === OUTCOMES.SATELLITE_COLLISION
                    ? `The rocket hit ${result.outcome.satelliteName}.`
                    : OUTCOME_MESSAGES[result.outcome.type],
                )}
              </p>
              {result.success && (
                <>
                  <div className="orbit-result__stars"><StarRating stars={result.stars} size={36} /></div>
                  <dl className="orbit-stats">
                    <div><dt>Score</dt><dd>{result.pct}%</dd></div>
                    <div><dt>Off target</dt><dd>{Math.round(result.outcome.missKm)} km</dd></div>
                  </dl>
                  {result.supplies && (
                    <FlightReadout
                      rows={result.supplies.filter((row) => ['time', 'cabin', 'food', 'air', 'power'].includes(row.id))}
                    />
                  )}
                  {result.unlockedMissionId && (
                    <p className="orbit-panel__hint">
                      {sayTo(playerName, `New mission unlocked: ${getMission(result.unlockedMissionId)?.title}!`)}
                    </p>
                  )}
                </>
              )}
              {result.failure && <p className="orbit-panel__hint">{sayTo(playerName, result.failure.hint)}</p>}
              {result.outcome.type === OUTCOMES.NO_LIFTOFF && (
                <p className="orbit-panel__hint">{sayTo(playerName, 'Go back to the hangar. Add boosters or carry less.')}</p>
              )}
              {!result.success && <LaunchFact result={result} />}
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
