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
import { formatDecimal, t } from '../../../i18n/index.js'
import { SYNTH, playSynth } from '../../../audio'
import { PixelIcon } from '../../PixelIcon.jsx'
import { LunarLander } from './LunarLander.jsx'
import { MoonTips } from './MoonTips.jsx'
import { tipsTurnedOff } from './moonTipsStorage.js'

const GRAVITY = 1.62
const THRUST = 4.2
const START_HEIGHT = 120
const START_SPEED = -7
const FUEL_SECONDS = 16
const SOFT_SPEED = 2.5
const HARD_SPEED = 5

export function landingCopy(outcome) {
  if (!outcome) return { title: t('Land the lunar lander'), note: '' }
  if (outcome.id === 'auto') {
    return { title: t('The computer landed it'), note: t('Autopilot landed the lander. A safe, slow touchdown.') }
  }
  const speed = outcome.speed != null ? formatDecimal(outcome.speed, 1) : formatDecimal(0, 1)
  if (outcome.id === 'soft') {
    return { title: t('Soft landing!'), note: t('Touchdown at {{speed}} m/s. Perfect! The crew plants the flag. Science +5%.', { speed }) }
  }
  if (outcome.id === 'hard') {
    return { title: t('Bumpy landing'), note: t('Touchdown at {{speed}} m/s. A leg bent, but the crew is fine. Science −8%.', { speed }) }
  }
  return { title: t('Crash landing!'), note: t('Hit the ground at {{speed}} m/s. The crew escaped with the top half of the lander, but tools broke. Science −20%.', { speed }) }
}
function landingOutcome(speed, auto = false) {
  if (auto) return { id: 'auto', speed: 0, title: 'The computer landed it', note: 'Autopilot landed the lander. A safe, slow touchdown.', scienceFactor: 1, dataLoss: 0 }
  if (speed <= SOFT_SPEED) return { id: 'soft', speed, title: 'Soft landing!', note: `Touchdown at ${speed.toFixed(1)} m/s. Perfect! The crew plants the flag. Science +5%.`, scienceFactor: 1.05, dataLoss: 0 }
  if (speed <= HARD_SPEED) return { id: 'hard', speed, title: 'Bumpy landing', note: `Touchdown at ${speed.toFixed(1)} m/s. A leg bent, but the crew is fine. Science −8%.`, scienceFactor: 0.92, dataLoss: 0 }
  return { id: 'crash', speed, title: 'Crash landing!', note: `Hit the ground at ${speed.toFixed(1)} m/s. The crew escaped with the top half of the lander, but tools broke. Science −20%.`, scienceFactor: 0.8, dataLoss: 10 }
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
  // The landing tutorial opens first (unless the player turned the tips off); it holds the game
  const [tipsOpen, setTipsOpen] = useState(() => !tipsTurnedOff())
  const tipsRef = useRef(tipsOpen)
  useEffect(() => {
    tipsRef.current = tipsOpen
  }, [tipsOpen])

  const press = useCallback((on) => {
    if (on && tipsRef.current) return
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
  const top = 4 + (1 - state.height / START_HEIGHT) * 48

  return (
    <div className="moon-event-shade">
      <section className="moon-landing moon-panel" role="dialog" aria-modal="true" aria-labelledby="moon-landing-title">
        <p className="moon-kicker">{t('Landing')}</p>
        {!tipsOpen && !outcome && (
          <button type="button" className="moon-tips-open moon-landing__tips" onClick={() => { press(false); setTipsOpen(true) }} aria-label={t('Show tips')}>?</button>
        )}
        <h2 id="moon-landing-title">{landingCopy(outcome).title}</h2>
        <div
          className={`moon-landing__scene is-${outcome?.id ?? phase}`}
          onPointerDown={(event) => { event.preventDefault(); if (!auto && phase !== 'landed') press(true) }}
          onPointerUp={() => press(false)}
          onPointerLeave={() => press(false)}
        >
          <span className="moon-landing__earth" aria-hidden="true"><PixelIcon name="earth" /></span>
          <span className="moon-landing__pad" aria-hidden="true" />
          <div className="moon-landing__lander" style={{ top: `${top}%` }} aria-hidden="true">
            <LunarLander firing={state.firing} />
          </div>
          {phase === 'landed' && outcome?.id !== 'crash' && <span className="moon-landing__flag" aria-hidden="true"><PixelIcon name="flag" /></span>}
          {phase === 'landed' && <span className="moon-landing__dust" aria-hidden="true" />}
          {phase === 'landed' && outcome?.id === 'crash' && <span className="moon-landing__boom" aria-hidden="true"><PixelIcon name="boom" /></span>}
          <span className="moon-landing__ground" aria-hidden="true" />
        </div>

        <dl className="moon-landing__gauges">
          <div><dt>{t('Height')}</dt><dd>{state.height.toFixed(0)} m</dd></div>
          <div className={`is-${tone}`}><dt>{t('Falling')}</dt><dd>{formatDecimal(Math.max(0, falling), 1)} m/s</dd></div>
          <div>
            <dt>{t('Fuel')}</dt>
            <dd><span className="moon-landing__fuel"><span style={{ width: `${(state.fuel / FUEL_SECONDS) * 100}%` }} /></span></dd>
          </div>
        </dl>

        {outcome ? (
          <>
            <p className="moon-event__result" aria-live="polite">{landingCopy(outcome).note}</p>
            <div className="moon-landing__actions moon-landing__actions--done">
              <button type="button" className="moon-button" onClick={tryAgain}>{t('↺ Try again')}</button>
              <button type="button" className="moon-button moon-button--primary" onClick={() => onDone(outcome)}>{t('Start mapping')}</button>
            </div>
          </>
        ) : (
          <>
            <p className="moon-landing__how">{t('Hold the engine button to slow down. Touch the ground slower than {{speed}} m/s (green).', { speed: formatDecimal(SOFT_SPEED, 1) })}</p>
            <div className="moon-landing__actions">
              <button
                type="button"
                className={`moon-button moon-button--primary moon-landing__fire${state.firing ? ' is-on' : ''}`}
                disabled={auto}
                onPointerDown={(event) => { event.preventDefault(); press(true) }}
                onPointerUp={() => press(false)}
                onPointerLeave={() => press(false)}
              >
                <PixelIcon name="fire" /> {t('Hold to fire engine')}
              </button>
              <button type="button" className="moon-button" disabled={auto || phase !== 'ready'} onClick={useAutopilot}>{t('Autopilot')}</button>
            </div>
          </>
        )}
      </section>
      {tipsOpen && <MoonTips step="landing" onClose={() => setTipsOpen(false)} />}
    </div>
  )
}
