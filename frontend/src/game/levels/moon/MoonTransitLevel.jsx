/**
 * MISSION 2 — the coast to the Moon, after the hangar.
 *
 * Same steps as the launch to Earth orbit:
 *   window   pick a real kind of trip (Apollo 11, the south pole, or a solar storm)
 *   aim      hold and drag: the dotted line is the road, the yellow gate is the landing
 *   liftoff  the pad and the climb (LaunchSequence)
 *   flight   the coast plays in a few seconds
 *   result   the score is saved with the other missions
 *
 * The Van Allen belts are drawn and can be tapped. They are not a wall of rocks.
 * A straight trip crosses a thin edge, the way Apollo did.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { StarRating, getMission, useProgress } from '../../../levels'
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../../../audio'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { t } from '../../../i18n/index.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { HudMission } from '../../HudMission.jsx'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { FlightReadout } from '../../FlightReadout.jsx'
import { earliestSupplyEnd, flightReadout, supplyReport } from '../../lifeSupport.js'
import { flightNotes } from '../../flightSummary.js'
import { launchFailure } from '../../launchFailure.js'
import { partCount } from '../../parts.js'
import { MissionCompleteScreen } from '../orbit/MissionCompleteScreen.jsx'
import {
  MOON_BODIES,
  MOON_LANDMARKS,
  MOON_OUTCOMES,
  describeTransit,
  scoreGate,
  shouldExplode,
  simulateTransit,
  supplyFraction,
} from './moonRoute.js'
import { MOON_WINDOWS } from './moonWindows.js'
import { aimFromPointer, createMoonView, drawMoonScene, sampleAt, worldToScreen } from './moonRenderer.js'
import { PixelIcon } from '../../PixelIcon.jsx'
import '../../game.css'
import '../orbit/orbitalLaunch.css'

const PLAY_SECONDS = 9
const TAP_PIXELS = 22

const FIX_HINT = {
  [MOON_OUTCOMES.STORM]: 'Go back to the hangar for a safe room, or pick a path with no storm.',
  [MOON_OUTCOMES.BLACKOUT]: 'Pack a way to call home, or pick a path where Earth stays in view.',
  [MOON_OUTCOMES.OUT_OF_FOOD]: 'This path is longer than the meals. Pack more, or take the 8-day path.',
  [MOON_OUTCOMES.OUT_OF_WATER]: 'This path is longer than the water. Pack more, or take the 8-day path.',
  [MOON_OUTCOMES.OUT_OF_AIR]: 'Go back to the hangar. More people breathe more than the tanks can hold.',
  [MOON_OUTCOMES.SPACE_SICK]: 'Go back to the hangar and pack the medicine kit.',
  [MOON_OUTCOMES.BAD_AIR]: 'Go back to the hangar. The gas the crew breathes out has to be cleaned.',
  [MOON_OUTCOMES.NO_LANDER]: 'Go back to the hangar. The Moon has almost no air, so a rocket has to slow the ship.',
  [MOON_OUTCOMES.NO_PROSPECTOR]: 'Go back to the hangar. Something has to roll into the dark and look for ice.',
  [MOON_OUTCOMES.SHORT]: 'Drag closer to the Moon.',
  [MOON_OUTCOMES.PAST]: 'That aim goes past the Moon. Aim at the yellow gate.',
  [MOON_OUTCOMES.ROCK]: 'Try a road nearer the middle.',
  [MOON_OUTCOMES.OFF_CORRIDOR]: 'Put the path through the yellow gate.',
  [MOON_OUTCOMES.BAD_SPEED]: 'Aim at the gate. Not short of it, and not past the Moon.',
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
    summary: 'Home. The ship leaves from orbit, crosses the thin edge of the radiation belts, and coasts about 384,400 km.',
  },
  {
    id: 'moon',
    name: 'The Moon',
    x: 1,
    y: 0,
    summary: 'About one-fourth as wide as Earth, and about 384,400 km away. It has almost no air, so a parachute cannot land a ship. Dark craters near the south pole hide ice.',
  },
]

export function MoonTransitLevel({ mission, equipped, onBackToHangar, onExit }) {
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
    () => createMoonView(canvasSize.width, canvasSize.height),
    [canvasSize],
  )
  const cruise = MOON_WINDOWS.find((item) => item.id === windowId) ?? null
  const failure = useMemo(() => launchFailure(equipped, mission), [equipped, mission])

  const prediction = useMemo(() => {
    if (!cruise || !aim) return null
    const durationSeconds = cruise.durationDays * 86400
    const report = supplyReport(equipped, {
      ...mission,
      loadout: { ...mission.loadout, durationSeconds },
    })
    const end = earliestSupplyEnd(report)
    return simulateTransit({
      lane: aim.lane,
      power: aim.power,
      corridorHalf: cruise.corridorHalf,
      storm: cruise.storm,
      blackout: cruise.blackout,
      hasShelter: partCount(equipped, 'shelter') > 0,
      hasAntenna: partCount(equipped, 'antenna') > 0,
      hasFilter: partCount(equipped, 'filter') > 0,
      hasLander: partCount(equipped, 'lander') > 0,
      hasProspector: partCount(equipped, 'prospector') > 0,
      hasFuel: partCount(equipped, 'fuel') > 0,
      durationDays: cruise.durationDays,
      foodAt: end?.id === 'outOfFood' ? supplyFraction(end.atSeconds, durationSeconds) : null,
      waterAt: end?.id === 'outOfWater' ? supplyFraction(end.atSeconds, durationSeconds) : null,
      airAt: end?.id === 'outOfAir' ? supplyFraction(end.atSeconds, durationSeconds) : null,
      sickAt: end?.id === 'spaceSick' ? supplyFraction(end.atSeconds, durationSeconds) : null,
    })
  }, [cruise, aim, equipped, mission])

  const summary = prediction ? describeTransit(prediction) : null

  const canvasRef = useRef(null)
  const flightRef = useRef(null)
  const draggingRef = useRef(false)
  const sceneRef = useRef(null)

  const [images] = useState(() => ({
    earth: loadImage(ASSETS.earthPlanet.src),
    moon: loadImage(ASSETS.moonPlanet.src),
    sun: loadImage(ASSETS.sun.src),
    debris: loadImage(ASSETS.commsSatellite.src),
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
    const success = outcome.type === MOON_OUTCOMES.ARRIVED
    const pct = success ? scoreGate(outcome.offset, cruise.corridorHalf) : 0
    let progressOutcome = null
    try {
      progressOutcome = completeMission(mission.id, { pct, success, flight: tripNotes() })
    } catch {
      /* mission locked or unknown: show the result anyway */
    }
    const exploded = shouldExplode(outcome)
    playSfx(success ? SFX.missionComplete : exploded ? SFX.explosion : SFX.lose)
    const durationSeconds = cruise.durationDays * 86400
    setResult({
      outcome,
      success,
      pct,
      stars: progressOutcome?.stars ?? 0,
      unlockedMissionId: progressOutcome?.unlockedMissionId ?? null,
      supplies: flightReadout(equipped, { ...mission, loadout: { ...mission.loadout, durationSeconds } }, durationSeconds),
    })
    setStep('result')
  }, [prediction, cruise, completeMission, mission, equipped, tripNotes])

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
      draw: drawMoonScene,
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
              }, flight.t * durationSeconds, {
                altitudeMeters: pose.x > 0.08 ? 400_000_000 : 50_000,
                speedMetersPerSecond: 0,
              }),
            )
          }
        }
        current.draw(ctx, current.view, {
          step: current.step,
          images: current.images,
          window: current.cruise,
          prediction: current.prediction,
          bodies: MOON_BODIES,
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
    const sunY = cruise?.storm ? -0.1 : -0.24
    const facts = [
      ...MOON_BODIES.map((body) => ({ ...body, x: body.t })),
      ...MOON_LANDMARKS,
      ...PLACES,
      {
        id: 'sun',
        name: 'The Sun',
        x: 0.86,
        y: sunY,
        summary: cruise?.storm
          ? 'In August 1972 the Sun threw a storm of fast particles. No crew was in space. A safe room is how a ship rides one out.'
          : 'On this path the Sun is off to the side. It can still throw a storm on another day. The August 1972 path is the one that meets one.',
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
    setAim({ lane: 0.2, power: 0.55 })
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

  const startCoast = useCallback(() => {
    setLiftingOff(false)
    flightRef.current = { startedAt: performance.now(), endedAt: null }
    setStep('flight')
  }, [])

  const retry = () => {
    flightRef.current = null
    setResult(null)
    setStep('aim')
  }

  const visibleWindows = step === 'window' ? MOON_WINDOWS : MOON_WINDOWS.filter((item) => item.id === windowId)

  const hud = (
    <header className="game__hud orbit-level__hud">
      <button type="button" className="game__back" onClick={onExit}>
        {t('Missions')}
      </button>
      <HudMission title={t(mission.title)} />
      <div className="game__place">{t(mission.place)}</div>
    </header>
  )

  return (
    <div className="game orbit-level" style={{ backgroundImage: `url(${ASSETS.spaceBackground.src})` }}>
      {hud}
      {liftingOff && (
        <div className="orbit-level__liftoff">
          <LaunchSequence equipped={equipped} hud={hud} onDone={startCoast} failure={failure} onFail={failLaunch} />
        </div>
      )}
      {step === 'result' && result?.success && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          lead={t('The rover is in a dark crater, looking for ice.')}
          onContinue={onExit}
          onFlyAgain={retry}
        />
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step === 'aim' ? 'aim' : 'target'}`}
            aria-label={t('The trip from Earth to the Moon, with the radiation belts and a few rocks beside the road')}
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
              aria-label={t(card.name)}
            >
              <button type="button" className="satellite-card__close" aria-label={t('Close')} onClick={() => setCard(null)}>
                <PixelIcon name="close" />
              </button>
              <h3 className="satellite-card__name">{t(card.name)}</h3>
              <p className="satellite-card__summary">{t(card.summary)}</p>
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
                    {t(item.name)}
                    <span className="orbit-site__country">{t(item.detail)}</span>
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
              <h2 className="orbit-panel__title">{t('1. Pick a path')}</h2>
              <p className="orbit-panel__hint">
                {sayTo(playerName, t('Tap a trip. Each one is a real kind of flight to the Moon. The belts stay. The gate, the storm, and the radio change.'))}
              </p>
              {cruise ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{t(cruise.name)}</p>
                  <p><b>{t('{{days}} days', { days: cruise.durationDays })}</b> {t('on the way.')}</p>
                  <p>{t(cruise.why)}</p>
                  <p>{t(cruise.whatFor)}</p>
                </div>
              ) : (
                <p className="orbit-detail">
                  {sayTo(playerName, t('There is no asteroid belt on the way to the Moon. Tap a belt or a rock to read what it is.'))}
                </p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>{t('Hangar')}</button>
                <button type="button" className="ms-btn" disabled={!cruise} onClick={goToAim}>{t('Next')}</button>
              </div>
            </>
          )}

          {step === 'aim' && cruise && aim && (
            <>
              <h2 className="orbit-panel__title">{t('2. Aim at the gate')}</h2>
              <p className="orbit-panel__hint">
                {sayTo(playerName, t('Hold and drag. Up and down picks the road. Let go with the path in the yellow gate. The middle of the road is almost empty.'))}
              </p>
              <dl className="orbit-stats">
                <div><dt>{t('Road')}</dt><dd>{aim.lane >= 0.08 ? t('High') : aim.lane <= -0.08 ? t('Low') : t('Middle')}</dd></div>
                <div><dt>{t('Reach')}</dt><dd>{Math.round(Math.min(1.35, aim.power) * 100)}%</dd></div>
              </dl>
              {summary && <p className={`orbit-prediction is-${summary.tone}`}>{sayTo(playerName, summary.text)}</p>}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={() => { playSfx(SFX.cancel); setStep('window') }}>{t('Back')}</button>
                <button type="button" className="ms-btn" onClick={launch}>{t('Launch')}</button>
              </div>
            </>
          )}

          {step === 'flight' && (
            <>
              <h2 className="orbit-panel__title">{sayTo(playerName, t('On the way to the Moon'))}</h2>
              {telemetry && <FlightReadout rows={telemetry} />}
            </>
          )}

          {step === 'result' && result && (
            <>
              <h2 className="orbit-panel__title">
                {result.success ? sayTo(playerName, t('Ice in the dark')) : sayTo(playerName, t('Not this time'))}
              </h2>
              <p className={`orbit-prediction is-${result.success ? 'good' : 'bad'}`}>
                {sayTo(
                  playerName,
                  result.failure?.message
                    ? t(result.failure.message)
                    : result.success
                      ? t('The crew landed and the rover can look for ice.')
                      : describeTransit({ outcome: result.outcome }).text,
                )}
              </p>
              {result.success && (
                <>
                  <div className="orbit-result__stars"><StarRating stars={result.stars} size={36} /></div>
                  <dl className="orbit-stats">
                    <div><dt>{t('Score')}</dt><dd>{result.pct}%</dd></div>
                    <div><dt>{t('Days')}</dt><dd>{cruise?.durationDays}</dd></div>
                  </dl>
                </>
              )}
              {!result.success && (
                <p className="orbit-panel__hint">
                  {sayTo(playerName, t(result.failure?.hint ?? FIX_HINT[result.outcome.type] ?? 'Try another path.'))}
                </p>
              )}
              {result.unlockedMissionId && (
                <p className="orbit-panel__hint">
                  {sayTo(playerName, t('New mission unlocked: {{title}}!', { title: t(getMission(result.unlockedMissionId)?.title || '') }))}
                </p>
              )}
              <div className="orbit-panel__actions">
                {result.success ? (
                  <button type="button" className="ms-btn" onClick={onExit}>{t('Missions')}</button>
                ) : (
                  <>
                    <button type="button" className="game__back" onClick={onBackToHangar}>{t('Hangar')}</button>
                    <button type="button" className="ms-btn" onClick={retry}>{t('Try again')}</button>
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
