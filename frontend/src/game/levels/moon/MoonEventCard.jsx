import { useEffect, useRef, useState } from 'react'
import { MOON_SYSTEMS } from './moonMissionData.js'

function disabledReason(choice, loadout, fuelLeft) {
  const { systems } = loadout
  if (choice.system && !systems.includes(choice.system)) {
    const system = MOON_SYSTEMS.find((item) => item.id === choice.system)
    return `Add ${system?.name ?? 'this system'} before launch.`
  }
  if (choice.fuel && fuelLeft < choice.fuel) return 'Not enough fuel left.'
  return ''
}

export function MoonEventCard({ activeEvent, loadout, fuelLeft, onChoose, onContinue }) {
  const [pulse, setPulse] = useState(0)
  const [holding, setHolding] = useState(false)
  const pulseRef = useRef(0)

  useEffect(() => {
    if (activeEvent.event.id !== 'misfire' || activeEvent.resolvedText) return undefined
    let frameId
    const animate = () => {
      const progress = (performance.now() % 1600) / 16
      pulseRef.current = progress
      setPulse(progress)
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [activeEvent.event.id, activeEvent.resolvedText])

  function releaseTiming() {
    if (!holding) return
    setHolding(false)
    onChoose('timing', pulseRef.current >= 45 && pulseRef.current <= 65)
  }

  return (
    <div className="moon-event-shade">
      <section className="moon-event moon-panel" role="dialog" aria-modal="true" aria-labelledby="moon-event-title">
        <p className="moon-kicker">SPACE EVENT · {activeEvent.secondsLeft}s</p>
        <h2 id="moon-event-title"><span aria-hidden="true">{activeEvent.event.icon}</span> {activeEvent.event.name}</h2>
        {activeEvent.resolvedText ? (
          <>
            <p className="moon-event__result" aria-live="polite">{activeEvent.resolvedText}</p>
            <button type="button" className="moon-button moon-button--primary" onClick={onContinue}>Continue orbit</button>
          </>
        ) : (
          <>
            <p>Choose quickly. No choice means the risky option.</p>
            {activeEvent.event.id === 'misfire' ? (
              <div className="moon-timing">
                <p>Hold the button. Release in the green zone.</p>
                <div className="moon-timing__track" aria-label="Timing bar, green area is safe">
                  <span className="moon-timing__safe" />
                  <span className="moon-timing__needle" style={{ left: `${pulse}%` }} />
                </div>
                <button
                  type="button"
                  className={`moon-button moon-timing__button${holding ? ' is-holding' : ''}`}
                  aria-pressed={holding}
                  onPointerDown={(event) => { event.preventDefault(); setHolding(true) }}
                  onPointerUp={releaseTiming}
                  onPointerCancel={releaseTiming}
                  onKeyDown={(event) => {
                    if ((event.key === ' ' || event.key === 'Enter') && !holding) {
                      event.preventDefault()
                      setHolding(true)
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault()
                      releaseTiming()
                    }
                  }}
                >
                  {holding ? 'Release now!' : 'Hold to catch the green'}
                </button>
              </div>
            ) : (
              <div className="moon-event__choices">
                {activeEvent.event.choices.map((choice) => {
                  const reason = disabledReason(choice, loadout, fuelLeft)
                  return (
                    <button
                      type="button"
                      key={choice.id}
                      className={`moon-button${choice.risky ? ' moon-button--risky' : ''}`}
                      disabled={Boolean(reason)}
                      title={reason}
                      onClick={() => onChoose(choice.id, true)}
                    >
                      {choice.risky ? '⚠️ ' : '✨ '}{choice.label}
                      {reason && <small>{reason}</small>}
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
