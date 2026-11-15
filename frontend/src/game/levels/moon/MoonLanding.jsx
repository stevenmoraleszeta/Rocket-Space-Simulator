/**
 * Landing mini-game: bring the lunar lander down softly.
 *
 * Real numbers, slowed for play: Moon gravity is 1.62 m/s² (one sixth of Earth's), the
 * engine pushes up with 4 m/s², and fuel is short, like Apollo 11, which landed with about
 * 45 seconds of fuel left. Below 2.5 m/s the legs take the touch softly.
 * Hold the button (or Space, or the scene) to fire the engine. "Autopilot" lands for you.
 * After touchdown, "Try again" starts the landing over with a full tank.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { SYNTH, playSynth } from '../../../audio'

const GRAVITY = 1.62
const THRUST = 4.2
const START_HEIGHT = 120
const START_SPEED = -7
const FUEL_SECONDS = 16
const SOFT_SPEED = 2.5
const HARD_SPEED = 5

/** How the touchdown went, and what it does to the mission. */
function landingOutcome(speed, auto = false) {
  if (auto) return { id: 'auto', title: 'The computer landed it', note: 'Autopilot landed the lander. A safe, slow touchdown.', scienceFactor: 1, dataLoss: 0 }
  if (speed <= SOFT_SPEED) return { id: 'soft', title: 'Soft landing!', note: `Touchdown at ${speed.toFixed(1)} m/s. Perfect! The crew plants the flag. Science +5%.`, scienceFactor: 1.05, dataLoss: 0 }
  if (speed <= HARD_SPEED) return { id: 'hard', title: 'Bumpy landing', note: `Touchdown at ${speed.toFixed(1)} m/s. A leg bent, but the crew is fine. Science −8%.`, scienceFactor: 0.92, dataLoss: 0 }
  return { id: 'crash', title: 'Crash landing!', note: `Hit the ground at ${speed.toFixed(1)} m/s. The crew escaped with the top half of the lander, but tools broke. Science −20%.`, scienceFactor: 0.8, dataLoss: 10 }
}

/** One physics step (seconds), so the autopilot and the player share the same rules. */
function step(state, dt, burning) {
  const firing = burning && state.fuel > 0
  const accel = (firing ? THRUST : 0) - GRAVITY
  const speed = state.speed + accel * dt
  return {
    height: Math.max(0, state.height + ((state.speed + speed) / 2) * dt),
    speed,
    fuel: Math.max(0, state.fuel - (firing ? dt : 0)),
    firing,
  }
}

/** Simple autopilot: fire whenever falling faster than a safe speed for this height. */
function autopilotBurn(state) {
  const safe = Math.max(1.2, Math.sqrt(2 * (THRUST - GRAVITY) * 0.75 * state.height))
  return -state.speed > safe
}

const START_STATE = Object.freeze({ height: START_HEIGHT, speed: START_SPEED, fuel: FUEL_SECONDS, firing: false })

export function MoonLanding({ onDone }) {
  const [state, setState] = useState(START_STATE)
  const [phase, setPhase] = useState('ready') // ready | flying | landed
  const [auto, setAuto] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const burnRef = useRef(false)
  const stateRef = useRef(state)
  const autoRef = useRef(false)

  const press = useCallback((on) => {
    burnRef.current = on
    if (on) setPhase((value) => (value === 'ready' ? 'flying' : value))
  }, [])

  useEffect(() => {
    const down = (event) => {
      if (event.code === 'Space') {
        event.preventDefault()
        press(true)
      }
    }
    const up = (event) => {
      if (event.code === 'Space') press(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [press])

  useEffect(() => {
    if (phase !== 'flying') return undefined
    let frame = 0
    let last = performance.now()
    let lastHum = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const current = stateRef.current
      const burning = autoRef.current ? autopilotBurn(current) : burnRef.current
      const next = step(current, dt, burning)
      if (next.firing && now - lastHum > 180) {
        lastHum = now
        playSynth(SYNTH.tick)
      }
      if (next.height <= 0) {
        const landed = { ...next, height: 0, firing: false }
        stateRef.current = landed
        setState(landed)
        const result = landingOutcome(Math.abs(next.speed), autoRef.current)
        setOutcome(result)
        setPhase('landed')
        playSynth(result.id === 'crash' ? SYNTH.crackle : result.id === 'hard' ? SYNTH.clang : SYNTH.arrive)
        return
      }
      stateRef.current = next
      setState(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  /** Back to the top with a full tank, to try the landing again. */
  const tryAgain = () => {
    burnRef.current = false
    autoRef.current = false
    stateRef.current = START_STATE
    setState(START_STATE)
    setAuto(false)
    setOutcome(null)
    setPhase('ready')
    playSynth(SYNTH.whoosh)
  }

  const useAutopilot = () => {
    autoRef.current = true
    setAuto(true)
    setPhase('flying')
  }

  const falling = -state.speed
  const tone = falling <= SOFT_SPEED ? 'good' : falling <= HARD_SPEED ? 'warn' : 'bad'
  // Lander top (% of the scene): its feet touch the pad at height 0.
  const top = 4 + (1 - state.height / START_HEIGHT) * 52

  return (
    <div className="moon-event-shade">
      <section className="moon-landing moon-panel" role="dialog" aria-modal="true" aria-labelledby="moon-landing-title">
        <p className="moon-kicker">Landing</p>
        <h2 id="moon-landing-title">{outcome ? outcome.title : 'Land the lunar lander'}</h2>
        <div
          className={`moon-landing__scene is-${outcome?.id ?? phase}`}
          onPointerDown={(event) => { event.preventDefault(); if (!auto && phase !== 'landed') press(true) }}
          onPointerUp={() => press(false)}
          onPointerLeave={() => press(false)}
        >
          <span className="moon-landing__earth" aria-hidden="true">🌍</span>
          <span className="moon-landing__pad" aria-hidden="true" />
          <div className="moon-landing__lander" style={{ top: `${top}%` }} aria-hidden="true">
            <svg viewBox="0 0 24 24" shapeRendering="crispEdges">
              <rect x="7" y="3" width="10" height="7" fill="#d9dbe4" />
              <rect x="9" y="5" width="3" height="3" fill="#4fc3ff" />
              <rect x="5" y="10" width="14" height="5" fill="#ffd23f" />
              <rect x="4" y="15" width="2" height="6" fill="#9aa6c8" />
              <rect x="18" y="15" width="2" height="6" fill="#9aa6c8" />
              <rect x="2" y="20" width="5" height="1" fill="#9aa6c8" />
              <rect x="17" y="20" width="5" height="1" fill="#9aa6c8" />
              {state.firing && <rect className="moon-landing__flame" x="10" y="15" width="4" height="7" fill="#ffb347" />}
            </svg>
          </div>
          {phase === 'landed' && outcome?.id !== 'crash' && <span className="moon-landing__flag" aria-hidden="true">🚩</span>}
          {phase === 'landed' && <span className="moon-landing__dust" aria-hidden="true" />}
          {phase === 'landed' && outcome?.id === 'crash' && <span className="moon-landing__boom" aria-hidden="true">💥</span>}
          <span className="moon-landing__ground" aria-hidden="true" />
        </div>

        <dl className="moon-landing__gauges">
          <div><dt>Height</dt><dd>{state.height.toFixed(0)} m</dd></div>
          <div className={`is-${tone}`}><dt>Falling</dt><dd>{Math.max(0, falling).toFixed(1)} m/s</dd></div>
          <div>
            <dt>Fuel</dt>
            <dd><span className="moon-landing__fuel"><span style={{ width: `${(state.fuel / FUEL_SECONDS) * 100}%` }} /></span></dd>
          </div>
        </dl>

        {outcome ? (
          <>
            <p className="moon-event__result" aria-live="polite">{outcome.note}</p>
            <div className="moon-landing__actions moon-landing__actions--done">
              <button type="button" className="moon-button" onClick={tryAgain}>↺ Try again</button>
              <button type="button" className="moon-button moon-button--primary" onClick={() => onDone(outcome)}>Start mapping</button>
            </div>
          </>
        ) : (
          <>
            <p className="moon-landing__how">Hold the engine button to slow down. Touch the ground slower than <b>{SOFT_SPEED} m/s</b> (green).</p>
            <div className="moon-landing__actions">
              <button
                type="button"
                className={`moon-button moon-button--primary moon-landing__fire${state.firing ? ' is-on' : ''}`}
                disabled={auto}
                onPointerDown={(event) => { event.preventDefault(); press(true) }}
                onPointerUp={() => press(false)}
                onPointerLeave={() => press(false)}
              >
                🔥 Hold to fire engine
              </button>
              <button type="button" className="moon-button" disabled={auto || phase !== 'ready'} onClick={useAutopilot}>🤖 Autopilot</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
