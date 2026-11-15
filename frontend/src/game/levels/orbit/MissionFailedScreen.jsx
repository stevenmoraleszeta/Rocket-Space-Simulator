/**
 * Full-screen "You lose" shown when a mission fails: on the pad, in the climb, in orbit,
 * or during the trip. The partner of MissionCompleteScreen.
 *
 * Shows why the mission failed, what to change, and a trivia fact about that exact failure
 * (LaunchFact.jsx picks it from result.outcome.type).
 *
 * result   { outcome: { type }, success: false } — the same shape the orbit level uses
 * reason   sentence that says what went wrong
 * hint     what to change in the hangar (optional)
 * onRetry  "Try again" (optional); onHangar "Hangar" (optional)
 */
import { useEffect, useRef } from 'react'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { LaunchFact } from './LaunchFact.jsx'
import './orbitalLaunch.css'

export function MissionFailedScreen({ mission, result, reason, hint, onRetry, onHangar }) {
  const playerName = engineerName(useSettings().playerName)
  const primaryRef = useRef(null)

  useEffect(() => {
    primaryRef.current?.focus()
  }, [])

  return (
    <div className="mission-complete mission-failed" role="dialog" aria-modal="true" aria-labelledby="mission-failed-title">
      <div className="mission-complete__card mission-failed__card">
        <p className="mission-complete__kicker">Mission {mission.number} · {mission.title}</p>
        <h2 id="mission-failed-title" className="mission-complete__title mission-failed__title">
          {playerName ? sayTo(playerName, 'You lose') : 'You lose'}
        </h2>

        <section className="mission-failed__why">
          <p className="mission-failed__label">What happened</p>
          <p className="mission-failed__reason">{reason}</p>
          {hint && <p className="mission-failed__hint">{hint}</p>}
        </section>

        <LaunchFact result={result} label="Trivia" className="mission-complete__fact" />

        <div className="mission-complete__actions">
          {onHangar ? (
            <button ref={onRetry ? undefined : primaryRef} type="button" className="game__back" onClick={onHangar}>
              Hangar
            </button>
          ) : (
            <span />
          )}
          {onRetry && (
            <button ref={primaryRef} type="button" className="ms-btn" onClick={onRetry}>Try again</button>
          )}
        </div>
      </div>
    </div>
  )
}
