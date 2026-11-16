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
import { t } from '../../../i18n/index.js'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { LaunchFact } from './LaunchFact.jsx'
import { failureLook } from './failureLooks.js'
import './orbitalLaunch.css'
import { PixelIcon } from '../../PixelIcon.jsx'

export function MissionFailedScreen({ mission, result, reason, hint, onRetry, onHangar }) {
  const playerName = engineerName(useSettings().playerName)
  const primaryRef = useRef(null)
  // Picture, headline and color for this exact failure (failureLooks.js)
  const look = failureLook(result)

  useEffect(() => {
    primaryRef.current?.focus()
  }, [])

  return (
    <div className={`mission-complete mission-failed is-${look.tone}`} role="dialog" aria-modal="true" aria-labelledby="mission-failed-title">
      <div className="mission-complete__card mission-failed__card">
        <p className="mission-complete__kicker">{t(mission.title)}</p>
        <div className={`mission-failed__art is-${look.motion}`} aria-hidden="true">
          <span><PixelIcon name={look.art} className="mission-failed__sprite" /></span>
        </div>
        <p className="mission-failed__lose">{playerName ? sayTo(playerName, t('You lose')) : t('You lose')}</p>
        <h2 id="mission-failed-title" className="mission-complete__title mission-failed__title">
          {t(look.title)}
        </h2>

        <section className="mission-failed__why">
          {/* Only what to change; the headline above already says what went wrong. */}
          {hint
            ? <p className="mission-failed__hint">{t(hint)}</p>
            : <p className="mission-failed__reason">{t(reason)}</p>}
        </section>

        <LaunchFact result={result} mission={mission} label={t('Trivia')} className="mission-complete__fact" />

        <div className="mission-complete__actions">
          {onHangar ? (
            <button ref={onRetry ? undefined : primaryRef} type="button" className="game__back" onClick={onHangar}>
              {t('Hangar')}
            </button>
          ) : (
            <span />
          )}
          {onRetry && (
            <button ref={primaryRef} type="button" className="ms-btn" onClick={onRetry}>{t('Try again')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
