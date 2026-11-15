import { useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { SYNTH, playSynth } from '../../../audio'
import { PixelMoon } from './PixelMoon.jsx'
import sunUrl from '../../../assets/images/planets/sun_animated.svg'
import asteroidUrl from '../../../assets/images/asteroids/asteroid.gif'
import rocketUrl from '../../../assets/images/rockets/rocket_32x32.png'
import iceUrl from '../../../assets/images/icons/ice_block.svg'
import bubblesUrl from '../../../assets/images/icons/bubbles.svg'
import warningUrl from '../../../assets/images/icons/warning.svg'
import gamepadUrl from '../../../assets/images/icons/gamepad.svg'
import sparkleUrl from '../../../assets/images/icons/sparkle.svg'
import handUrl from '../../../assets/images/icons/hand_pointer.svg'
import lockUrl from '../../../assets/images/items/lock.svg'
import { PixelIcon } from '../../PixelIcon.jsx'

/** Pixel sprite for each event (moonOrbitEvents.js id). The radio blackout shows a thin Moon. */
const EVENT_SPRITES = {
  storm: sunUrl,
  ice: iceUrl,
  air: bubblesUrl,
  rock: asteroidUrl,
  misfire: rocketUrl,
}
const BLACKOUT_MOON = { illumination: 0.3, waxing: false }

function EventSprite({ id }) {
  if (id === 'shadow') return <PixelMoon look={BLACKOUT_MOON} className="moon-event__sprite" />
  const src = EVENT_SPRITES[id]
  return src ? <img className="moon-event__sprite" src={src} alt="" draggable="false" /> : null
}

/** Small pixel icon at the start of a button label, in place of an emoji. */
function ButtonIcon({ src }) {
  return <img className="moon-button__icon" src={src} alt="" draggable="false" />
}

/** Tap fast: a big button and a bar that fills. */
function TapAction({ action, onDone }) {
  const [taps, setTaps] = useState(0)
  const goal = action.goal ?? 6
  const tap = () => {
    const next = taps + 1
    setTaps(next)
    playSynth(SYNTH.tick)
    if (next >= goal) onDone(true)
  }
  return (
    <div className="moon-action">
      <p>{t(action.label)}</p>
      <div className="moon-action__bar" aria-hidden="true"><span style={{ width: `${(taps / goal) * 100}%` }} /></div>
      <button type="button" className="moon-button moon-button--primary moon-action__tap" onClick={tap} autoFocus>
        <ButtonIcon src={handUrl} />{t('Tap! {{taps}} / {{goal}}', { taps, goal })}
      </button>
    </div>
  )
}

/** Aim: drag the dial into the green zone and lock it. The zone is somewhere new each time. */
function AimAction({ action, onDone }) {
  const [zone] = useState(() => 15 + Math.floor(Math.random() * 55))
  const [value, setValue] = useState(() => (zone > 50 ? 8 : 92))
  const inside = value >= zone && value <= zone + 16
  return (
    <div className="moon-action">
      <p>{t(action.label)}</p>
      <div className="moon-action__dial">
        <span className="moon-action__zone" style={{ left: `${zone}%`, width: '16%' }} aria-hidden="true" />
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          aria-label={t('Turn the dial')}
          onChange={(event) => {
            setValue(Number(event.target.value))
            playSynth(SYNTH.tick)
          }}
          autoFocus
        />
        <span className={`moon-action__pointer${inside ? ' is-in' : ''}`} style={{ left: `${value}%` }} aria-hidden="true">▲</span>
      </div>
      <button type="button" className={`moon-button moon-button--primary${inside ? ' is-ready' : ''}`} onClick={() => onDone(inside)}>
        <ButtonIcon src={lockUrl} />{t('Lock it')} {inside ? <PixelIcon name="check" /> : null}
      </button>
    </div>
  )
}

/**
 * Pop-up for one lunar orbit event (moonOrbitEvents.js).
 * blockedReason(choice) says why a choice cannot be picked, or '' when it can.
 * onAct(choiceId) starts a hands-on action (the parent gives it more time);
 * onChoose(choiceId, { timingSuccess, actionSuccess }) ends the event.
 */
export function MoonEventCard({ activeEvent, blockedReason, onChoose, onAct, onContinue }) {
  const [pulse, setPulse] = useState(0)
  const [holding, setHolding] = useState(false)
  const pulseRef = useRef(0)
  const { event, acting, resolvedText } = activeEvent
  const actingChoice = acting ? event.choices.find((choice) => choice.id === acting) : null

  useEffect(() => {
    if (!event.timing || resolvedText) return undefined
    let frameId
    const animate = () => {
      const progress = (performance.now() % 2400) / 24
      pulseRef.current = progress
      setPulse(progress)
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [event.timing, resolvedText])

  function releaseTiming() {
    if (!holding) return
    setHolding(false)
    onChoose('timing', { timingSuccess: pulseRef.current >= 42 && pulseRef.current <= 66 })
  }

  const pick = (choice) => {
    if (choice.action) {
      playSynth(SYNTH.whoosh)
      onAct(choice.id)
    } else {
      onChoose(choice.id, {})
    }
  }

  return (
    <div className="moon-event-shade">
      <section className="moon-event moon-panel" role="dialog" aria-modal="true" aria-labelledby="moon-event-title">
        <p className="moon-kicker">{t('SPACE EVENT')}</p>
        {!resolvedText && (
          <div className="moon-event__clock" aria-label={t('{{seconds}} seconds left', { seconds: activeEvent.secondsLeft })}>
            <span key={activeEvent.deadline} style={{ animationDuration: `${activeEvent.total}s` }} />
            <b>{activeEvent.secondsLeft}s</b>
          </div>
        )}
        <div className={`moon-event__art is-${event.id}`} aria-hidden="true">
          <span className="moon-event__icon"><EventSprite id={event.id} /></span>
          <span className="moon-event__fx" />
        </div>
        <h2 id="moon-event-title">{t(event.name)}</h2>
        {resolvedText ? (
          <>
            <p className="moon-event__result" aria-live="polite">{t(resolvedText)}</p>
            <button type="button" className="moon-button moon-button--primary" onClick={onContinue}>{t('Continue')}</button>
          </>
        ) : actingChoice ? (
          actingChoice.action.kind === 'tap' ? (
            <TapAction action={actingChoice.action} onDone={(ok) => onChoose(actingChoice.id, { actionSuccess: ok })} />
          ) : (
            <AimAction action={actingChoice.action} onDone={(ok) => onChoose(actingChoice.id, { actionSuccess: ok })} />
          )
        ) : (
          <>
            <p>{t(event.text)}</p>
            <p className="moon-event__note">{t('Think, then choose. If the clock runs out, the risky thing happens.')}</p>
            {event.timing ? (
              <div className="moon-timing">
                <p>{t('Hold the button. Release in the green zone.')}</p>
                <div className="moon-timing__track" aria-label={t('Timing bar, green area is safe')}>
                  <span className="moon-timing__safe" />
                  <span className="moon-timing__needle" style={{ left: `${pulse}%` }} />
                </div>
                <button
                  type="button"
                  className={`moon-button moon-timing__button${holding ? ' is-holding' : ''}`}
                  aria-pressed={holding}
                  onPointerDown={(pointer) => { pointer.preventDefault(); setHolding(true) }}
                  onPointerUp={releaseTiming}
                  onPointerCancel={releaseTiming}
                  onKeyDown={(key) => {
                    if ((key.key === ' ' || key.key === 'Enter') && !holding) {
                      key.preventDefault()
                      setHolding(true)
                    }
                  }}
                  onKeyUp={(key) => {
                    if (key.key === ' ' || key.key === 'Enter') {
                      key.preventDefault()
                      releaseTiming()
                    }
                  }}
                >
                  {holding ? t('Release now!') : t('Hold to catch the green')}
                </button>
              </div>
            ) : (
              <div className="moon-event__choices">
                {event.choices.map((choice) => {
                  const reason = blockedReason(choice)
                  return (
                    <button
                      type="button"
                      key={choice.id}
                      className={`moon-button${choice.risky ? ' moon-button--risky' : ''}`}
                      disabled={Boolean(reason)}
                      title={reason ? t(reason) : undefined}
                      onClick={() => pick(choice)}
                    >
                      <ButtonIcon src={choice.risky ? warningUrl : choice.action ? gamepadUrl : sparkleUrl} />{t(choice.label)}
                      {reason && <small>{t(reason)}</small>}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
