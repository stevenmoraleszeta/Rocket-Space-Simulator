/**
 * MISSION 3 — the cruise to Mars, after the hangar.
 *
 * Same steps as the launch to Earth orbit:
 *   window   pick a real kind of trip (clear, dust storm, or Sun in the way)
 *   aim      hold and drag: the dotted line is the road, the yellow gate is the landing
 *   liftoff  the pad and the climb (LaunchSequence)
 *   flight   the cruise plays in a few seconds
 *   result   the score is saved with the other missions
 *
 * The belt is drawn past Mars on purpose. A real Earth–Mars cruise does not cross it.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { StarRating, getMission, useProgress } from '../../../levels'
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../../../audio'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { HudMission } from '../../HudMission.jsx'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { FlightReadout } from '../../FlightReadout.jsx'
import { earliestSupplyEnd, flightReadout, supplyReport } from '../../lifeSupport.js'
import { flightNotes } from '../../flightSummary.js'
import { launchFailure } from '../../launchFailure.js'
import { partCount } from '../../parts.js'
import { MissionCompleteScreen } from '../orbit/MissionCompleteScreen.jsx'
import { MissionFailedScreen } from '../orbit/MissionFailedScreen.jsx'
import {
  CRUISE_BODIES,
  MARS_OUTCOMES,
  EXPLODING,
  describeCruise,
  scoreGate,
  simulateCruise,
  supplyFraction,
} from './marsRoute.js'
import { MARS_WINDOWS } from './marsWindows.js'
import { aimFromPointer, createMarsView, drawMarsScene, sampleAt, worldToScreen } from './marsRenderer.js'
import '../../game.css'
import '../orbit/orbitalLaunch.css'

const PLAY_SECONDS = 9
const TAP_PIXELS = 22

/** How far along the cruise a crew with no food loses control (0..1). */
const NO_FOOD_CRUISE_FRACTION = 0.3

const FIX_HINT = {
  [MARS_OUTCOMES.STORM]: 'Go back to the hangar. The crew needs a safe room when the Sun storms.',
  [MARS_OUTCOMES.BLACKOUT]: 'Pack a way to call home, or pick a path where the Sun is not in the way.',
  [MARS_OUTCOMES.NO_FOOD]: 'Go back to the hangar and pack food. A crew with nothing to eat cannot fly the ship.',
  [MARS_OUTCOMES.OUT_OF_FOOD]: 'This path is longer than the meals. Pack more, or take the shorter path.',
  [MARS_OUTCOMES.OUT_OF_WATER]: 'Go back to the hangar. Months of drinking have to be cleaned, not only bottled.',
  [MARS_OUTCOMES.SPACE_SICK]: 'Go back to the hangar. A flight this long can make someone sick.',
  [MARS_OUTCOMES.OUT_OF_AIR]: 'Go back to the hangar. Months of breathing have to be cleaned.',
  [MARS_OUTCOMES.NO_PARACHUTE]: 'Go back to the hangar. The air at Mars is too thin to slow the ship by itself.',
  [MARS_OUTCOMES.NO_ROVER]: 'Go back to the hangar. Something has to roll out and look at the rocks.',
  [MARS_OUTCOMES.SHORT]: 'Drag closer to Mars.',
  [MARS_OUTCOMES.PAST]: 'That aim goes past Mars, into the belt. Aim at the yellow gate.',
  [MARS_OUTCOMES.ROCK]: 'Try a road nearer the middle.',
  [MARS_OUTCOMES.OFF_CORRIDOR]: 'Put the path through the yellow gate.',
  [MARS_OUTCOMES.BAD_SPEED]: 'Aim at the gate. Not short of it, and not past Mars.',
}

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

function playbackT(realSeconds, endT) {
  const span = Math.min(PLAY_SECONDS, Math.max(4.5, endT * 7))
  if (realSeconds <= span) return (realSeconds / span) * endT
  return endT
}

const PLACES = [
  {
    id: 'earth',
    name: 'Earth',
    x: 0,
    y: 0,
    summary: 'Home. Every Mars trip starts in orbit here, then leaves for the long cruise.',
  },
  {
    id: 'mars',
    name: 'Mars',
    x: 1,
    y: 0,
    summary: 'About half as wide as Earth, and about 1.5 times as far from the Sun. The air is mostly carbon dioxide and only about 1% as thick as Earth’s.',
  },
  {
    id: 'belt',
    name: 'Asteroid belt',
    x: 1.24,
    y: 0,
    summary: 'The main belt starts past Mars, out near 2.2 times Earth’s distance from the Sun. A trip to Mars does not cross it. Too much power flies you into it.',
  },
]

export function MarsTransitLevel({ mission, stageInfo, equipped, onBackToHangar, onExit }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)
  const [step, setStep] = useState('window')
  useSoundtrack(
    step === 'flight' || step === 'result'
      ? { music: MUSIC.flight, ambient: AMBIENCE.space }
      : { music: MUSIC.flight },
  )
  const [windowId, setWindowId] = useState(null)
  const [aim, setAim] = useState(null)
  const [aimPoint, setAimPoint] = useState(null)
  const [result, setResult] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600, pixelRatio: 1 })
  const [card, setCard] = useState(null)

  const view = useMemo(
    () => createMarsView(canvasSize.width, canvasSize.height),
    [canvasSize],
  )
  const cruise = MARS_WINDOWS.find((item) => item.id === windowId) ?? null
  const failure = useMemo(() => launchFailure(equipped, mission), [equipped, mission])

  const prediction = useMemo(() => {
    if (!cruise || !aim) return null
    const durationSeconds = cruise.durationDays * 86400
    const report = supplyReport(equipped, {
      ...mission,
      loadout: { ...mission.loadout, durationSeconds },
    })
    // No food at all: the ship still flies, then loses control in space (NO_FOOD).
    // The other stores are timed as usual, so an earlier problem still comes first.
    const noFood = report.foodKg <= 0
    const end = earliestSupplyEnd(noFood ? { ...report, foodSeconds: Infinity } : report)
    return simulateCruise({
      lane: aim.lane,
      power: aim.power,
      corridorHalf: cruise.corridorHalf,
      conjunction: cruise.conjunction,
      hasShelter: partCount(equipped, 'shelter') > 0,
      hasAntenna: partCount(equipped, 'antenna') > 0,
      hasParachute: partCount(equipped, 'parachute') > 0,
      hasRover: partCount(equipped, 'rover') > 0,
      foodAt: end?.id === 'outOfFood' ? supplyFraction(end.atSeconds, durationSeconds) : null,
      noFoodAt: noFood ? NO_FOOD_CRUISE_FRACTION : null,
      waterAt: end?.id === 'outOfWater' ? supplyFraction(end.atSeconds, durationSeconds) : null,
      airAt: end?.id === 'outOfAir' ? supplyFraction(end.atSeconds, durationSeconds) : null,
      sickAt: end?.id === 'spaceSick' ? supplyFraction(end.atSeconds, durationSeconds) : null,
    })
  }, [cruise, aim, equipped, mission])

  const summary = prediction ? describeCruise(prediction) : null

  const canvasRef = useRef(null)
  const flightRef = useRef(null)
  const draggingRef = useRef(false)
  const sceneRef = useRef(null)

  const [images] = useState(() => ({
    earth: loadImage(ASSETS.earthPlanet.src),
    mars: loadImage(ASSETS.marsPlanet.src),
    sun: loadImage(ASSETS.sun.src),
    phobos: loadImage(ASSETS.phobos.src),
    deimos: loadImage(ASSETS.deimos.src),
    asteroid: loadImage(ASSETS.asteroid.src),
    rocket: loadImage(ASSETS.rocketUpperStage.src),
    explosion: loadImage(ASSETS.explosion.src),
  }))

  const [liftingOff, setLiftingOff] = useState(false)

  const tripNotes = useCallback(() => flightNotes(equipped, {
    window: cruise ? `${cruise.name} · ${cruise.detail}` : '',
  }), [equipped, cruise])

  const failLaunch = useCallback(() => {
    try {
      completeMission(mission.id, { pct: 0, success: false, flight: tripNotes() })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    playSfx(SFX.lose)
    setLiftingOff(false)
    setResult({
      outcome: { type: failure.id },
      success: false,
      pct: 0,
      stars: 0,
      failure,
    })
    setStep('result')
  }, [completeMission, mission.id, failure, tripNotes])

  const finishFlight = useCallback(() => {
    if (!prediction || !cruise) return
    const outcome = prediction.outcome
    const success = outcome.type === MARS_OUTCOMES.ARRIVED
    const pct = success ? scoreGate(outcome.offset, cruise.corridorHalf) : 0
    let progressOutcome = null
    try {
      progressOutcome = completeMission(mission.id, { pct, success, flight: tripNotes() })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    const exploded = EXPLODING.has(outcome.type)
    playSfx(success ? SFX.missionComplete : exploded ? SFX.explosion : SFX.lose)
    const durationSeconds = cruise.durationDays * 86400
    setResult({
      outcome,
      success,
      pct,
      stars: progressOutcome?.stars ?? 0,
      unlockedMissionId: progressOutcome?.unlockedMissionId ?? null,
      exploded,
      supplies: flightReadout(equipped, { ...mission, loadout: { ...mission.loadout, durationSeconds } }, durationSeconds),
    })
    setStep('result')
  }, [prediction, cruise, completeMission, mission, equipped, tripNotes])

  // After a blast on the map, wait a moment so the player sees it before the "You lose" screen.
  const [blastWatched, setBlastWatched] = useState(null) // the result whose blast was seen
  useEffect(() => {
    if (!result?.exploded || result.success) return undefined
    const timer = setTimeout(() => setBlastWatched(result), 1500)
    return () => clearTimeout(timer)
  }, [result])
  const failScreenReady = Boolean(result && !result.success && (!result.exploded || blastWatched === result))

  useLayoutEffect(() => {
    sceneRef.current = {
      step,
      view,
      cruise,
      prediction,
      images,
      finishFlight,
      canvasSize,
      equipped,
      mission,
      aimPoint,
    }
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
    let lastTelemetryAt = 0
    const draw = (now) => {
      const canvas = canvasRef.current
      const current = sceneRef.current
      if (canvas && current) {
        const ctx = canvas.getContext('2d')
        const ratio = current.canvasSize.pixelRatio
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
        let flight = null
        const clock = flightRef.current
        if (clock && current.prediction) {
          const realSeconds = (now - clock.startedAt) / 1000
          const endT = current.prediction.outcome.t
          const t = playbackT(realSeconds, endT)
          if (t >= endT && !clock.endedAt) {
            clock.endedAt = now
            current.finishFlight()
          }
          flight = {
            t: Math.min(t, endT),
            done: Boolean(clock.endedAt),
            sinceEnd: clock.endedAt ? (now - clock.endedAt) / 1000 : 0,
          }
          if (!clock.endedAt && now - lastTelemetryAt > 120 && current.cruise) {
            lastTelemetryAt = now
            const durationSeconds = current.cruise.durationDays * 86400
            const pose = sampleAt(current.prediction.samples, flight.t)
            setTelemetry(
              flightReadout(current.equipped, {
                ...current.mission,
                loadout: { ...current.mission.loadout, durationSeconds },
              }, flight.t * durationSeconds, { altitudeMeters: pose.x > 0.15 ? 200_000_000 : 80_000, speedMetersPerSecond: 0 }),
            )
          }
        }
        drawMarsScene(ctx, current.view, {
          step: current.step,
          images: current.images,
          window: current.cruise,
          prediction: current.prediction,
          bodies: CRUISE_BODIES,
          flight,
          aimPoint: current.step === 'aim' ? current.aimPoint : null,
        })
      }
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [])

  const pointerPosition = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  const tappedFact = (point) => {
    const sunY = cruise?.conjunction ? -0.3 : -0.48
    const facts = [
      ...CRUISE_BODIES.map((body) => ({ ...body, x: body.t })),
      ...PLACES,
      {
        id: 'sun',
        name: 'The Sun',
        x: 0.48,
        y: sunY,
        summary: cruise?.conjunction
          ? 'Right now the Sun sits between Earth and Mars. Radios get noisy for about two weeks. The ship has to fly a plan it already has.'
          : 'The Sun is off to the side on this path, so Earth can still talk to the ship. A storm of fast particles can still burst out of it.',
      },
    ]
    let closest = null
    for (const fact of facts) {
      const spot = worldToScreen(view, fact.x, fact.y)
      const gap = Math.hypot(point.x - spot.x, point.y - spot.y)
      if (gap < TAP_PIXELS && (!closest || gap < closest.gap)) closest = { fact, gap, spot }
    }
    return closest
  }

  const handlePointerDown = (event) => {
    const point = pointerPosition(event)
    const tapped = tappedFact(point)
    if (tapped) {
      playSfx(SFX.select)
      setCard({ ...tapped.fact, x: tapped.spot.x, y: tapped.spot.y })
      return
    }
    setCard(null)
    if (step === 'aim' && cruise) {
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      const next = aimFromPointer(view, point)
      setAim(next)
      setAimPoint(point)
    }
  }

  const handlePointerMove = (event) => {
    if (!draggingRef.current || step !== 'aim') return
    const point = pointerPosition(event)
    setAim(aimFromPointer(view, point))
    setAimPoint(point)
  }

  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const pickWindow = (id) => {
    playSfx(SFX.select)
    setWindowId(id)
    setAim(null)
    setAimPoint(null)
    setCard(null)
  }

  const goToAim = () => {
    if (!cruise) return
    playSfx(SFX.confirm)
    setAim({ lane: 0.22, power: 0.55 })
    setAimPoint(null)
    setStep('aim')
  }

  const launch = () => {
    playSfx(SFX.liftoff)
    setTelemetry(null)
    setResult(null)
    setCard(null)
    setLiftingOff(true)
  }

  const startCruise = useCallback(() => {
    setLiftingOff(false)
    flightRef.current = { startedAt: performance.now(), endedAt: null }
    setStep('flight')
  }, [])

  const retry = () => {
    flightRef.current = null
    setResult(null)
    setStep('aim')
  }

  const visibleWindows = step === 'window' ? MARS_WINDOWS : MARS_WINDOWS.filter((item) => item.id === windowId)

  const hud = (
    <header className="game__hud orbit-level__hud">
      <button type="button" className="game__back" onClick={onExit}>
        Missions
      </button>
      <HudMission kicker={`Level ${stageInfo.levelNumber} · ${stageInfo.title}`} title={mission.title} />
      <div className="game__place">{mission.place}</div>
    </header>
  )

  return (
    <div className="game orbit-level" style={{ backgroundImage: `url(${ASSETS.spaceBackground.src})` }}>
      {hud}
      {liftingOff && (
        <div className="orbit-level__liftoff">
          <LaunchSequence equipped={equipped} hud={hud} onDone={startCruise} failure={failure} onFail={failLaunch} />
        </div>
      )}
      {step === 'result' && result?.success && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          lead="The rover is on Mars, looking at the red rocks."
          onContinue={onExit}
          onFlyAgain={retry}
        />
      )}
      {step === 'result' && result && !result.success && failScreenReady && (
        <MissionFailedScreen
          mission={mission}
          result={result}
          reason={sayTo(playerName, result.failure?.message ?? describeCruise({ outcome: result.outcome }).text)}
          hint={sayTo(playerName, result.failure?.hint ?? FIX_HINT[result.outcome.type] ?? 'Try another path.')}
          onHangar={onBackToHangar}
          onRetry={retry}
        />
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step === 'aim' ? 'aim' : 'target'}`}
            aria-label="The trip from Earth to Mars, with the rocks on the way and the asteroid belt past Mars"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {card && (
            <div
              className={`satellite-card${card.y < 150 ? ' is-below' : ''}`}
              style={{
                left: Math.min(Math.max(card.x, 130), Math.max(130, canvasSize.width - 130)),
                top: card.y,
              }}
              role="dialog"
              aria-label={card.name}
            >
              <button type="button" className="satellite-card__close" aria-label="Close" onClick={() => setCard(null)}>
                ✕
              </button>
              <h3 className="satellite-card__name">{card.name}</h3>
              <p className="satellite-card__summary">{card.summary}</p>
            </div>
          )}
          <div className="orbit-sites">
            {visibleWindows.map((item) => {
              const position = worldToScreen(view, item.x, item.y)
              const selected = item.id === windowId
              const className = `orbit-site${selected ? ' is-selected' : ''}`
              const style = { left: position.x, top: position.y }
              const label = (
                <>
                  <span className="orbit-site__dot" />
                  <span className="orbit-site__name">
                    {item.name}
                    <span className="orbit-site__country">{item.detail}</span>
                  </span>
                </>
              )
              if (step !== 'window') {
                return (
                  <span key={item.id} className={className} style={style}>
                    {label}
                  </span>
                )
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  className={className}
                  style={style}
                  aria-pressed={selected}
                  onClick={() => pickWindow(item.id)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'window' && (
            <>
              <h2 className="orbit-panel__title">1. Pick a path</h2>
              <p className="orbit-panel__hint">
                {sayTo(playerName, 'Tap a trip. Each one is a real kind of flight to Mars. The rocks stay. The gate and the radio change.')}
              </p>
              {cruise ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{cruise.name}</p>
                  <p><b>{cruise.durationDays} days</b> on the way.</p>
                  <p>{cruise.why}</p>
                  <p>{cruise.whatFor}</p>
                </div>
              ) : (
                <p className="orbit-detail">
                  {sayTo(playerName, 'The big asteroid belt is past Mars. Tap a rock to read what it is.')}
                </p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>Hangar</button>
                <button type="button" className="ms-btn" disabled={!cruise} onClick={goToAim}>Next</button>
              </div>
            </>
          )}

          {step === 'aim' && cruise && aim && (
            <>
              <h2 className="orbit-panel__title">2. Aim at the gate</h2>
              <p className="orbit-panel__hint">
                {sayTo(playerName, 'Hold and drag. Up and down picks the road. Let go with the path in the yellow gate, not in the belt.')}
              </p>
              <dl className="orbit-stats">
                <div><dt>Road</dt><dd>{aim.lane >= 0.08 ? 'High' : aim.lane <= -0.08 ? 'Low' : 'Middle'}</dd></div>
                <div><dt>Reach</dt><dd>{Math.round(Math.min(1.35, aim.power) * 100)}%</dd></div>
              </dl>
              {summary && <p className={`orbit-prediction is-${summary.tone}`}>{sayTo(playerName, summary.text)}</p>}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={() => { playSfx(SFX.cancel); setStep('window') }}>Back</button>
                <button type="button" className="ms-btn" onClick={launch}>Launch</button>
              </div>
            </>
          )}

          {step === 'flight' && (
            <>
              <h2 className="orbit-panel__title">{playerName ? sayTo(playerName, 'On the way to Mars') : 'On the way to Mars'}</h2>
              {telemetry && <FlightReadout rows={telemetry} />}
            </>
          )}

          {/* A failed mission is told on the "You lose" screen (MissionFailedScreen), not here. */}
          {step === 'result' && result?.success && (
            <>
              <h2 className="orbit-panel__title">
                {result.success ? sayTo(playerName, 'The rover is down') : sayTo(playerName, 'Not this time')}
              </h2>
              <p className={`orbit-prediction is-${result.success ? 'good' : 'bad'}`}>
                {sayTo(
                  playerName,
                  result.failure?.message
                    ?? (result.success
                      ? 'The crew landed and the rover can look at the red rocks.'
                      : describeCruise({ outcome: result.outcome }).text),
                )}
              </p>
              {result.success && (
                <>
                  <div className="orbit-result__stars"><StarRating stars={result.stars} size={36} /></div>
                  <dl className="orbit-stats">
                    <div><dt>Score</dt><dd>{result.pct}%</dd></div>
                    <div><dt>Days</dt><dd>{cruise?.durationDays}</dd></div>
                  </dl>
                </>
              )}
              {!result.success && (
                <p className="orbit-panel__hint">
                  {sayTo(playerName, result.failure?.hint ?? FIX_HINT[result.outcome.type] ?? 'Try another path.')}
                </p>
              )}
              {result.unlockedMissionId && (
                <p className="orbit-panel__hint">
                  {sayTo(playerName, `New mission unlocked: ${getMission(result.unlockedMissionId)?.title}!`)}
                </p>
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
