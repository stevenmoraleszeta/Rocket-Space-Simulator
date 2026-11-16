/**
 * Full-screen "Congratulations!" shown when the satellite reaches its orbit.
 *
 * Shows the stars and score, a fun fact that matches how the launch went (LaunchFact.jsx),
 * and the next level that this win unlocked.
 */
import { useEffect, useRef } from 'react'
import { MISSIONS, Planet, StarRating } from '../../../levels'
import { t } from '../../../i18n/index.js'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { MissionReport } from '../../design/MissionReport.jsx'
import { LaunchFact } from './LaunchFact.jsx'
import { PixelHand } from '../../tutorial/TutorialGuide.jsx'

function nextMissionAfter(missionId) {
  const index = MISSIONS.findIndex((candidate) => candidate.id === missionId)
  return index >= 0 ? (MISSIONS[index + 1] ?? null) : null
}

export function MissionCompleteScreen({ mission, result, directionDeg, onContinue, onFlyAgain, lead, design, continueLabel, practice = false, onFlyForReal }) {
  const playerName = engineerName(useSettings().playerName)
  const nextMission = nextMissionAfter(mission.id)
  const continueRef = useRef(null)

  useEffect(() => {
    continueRef.current?.focus()
  }, [])

  return (
    <div className="mission-complete" role="dialog" aria-modal="true" aria-labelledby="mission-complete-title">
      <div className="mission-complete__confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ '--i': index }} />
        ))}
      </div>

      <div className="mission-complete__card">
        <p className="mission-complete__kicker">{t('Mission {{number}} · {{place}}', { number: mission.number, place: t(mission.title) })}</p>
        <h2 id="mission-complete-title" className="mission-complete__title">
          {playerName ? sayTo(playerName, t('You did it!')) : t('You did it!')}
        </h2>
        <p className="mission-complete__lead">
          {sayTo(playerName, lead ?? t('Your satellite is flying around the Earth.'))}
        </p>

        {!practice && (
          <div className="mission-complete__stars">
            <StarRating stars={result.stars} size={40} />
          </div>
        )}

        <dl className="orbit-stats mission-complete__stats">
          <div><dt>{t('Score')}</dt><dd>{result.pct}%</dd></div>
          {!design && Number.isFinite(result.outcome?.missKm) && (
            <div><dt>{t('Off target')}</dt><dd>{Math.round(result.outcome.missKm)} km</dd></div>
          )}
          {!design && directionDeg != null && <div><dt>{t('Your direction')}</dt><dd>{directionDeg}°</dd></div>}
        </dl>

        <MissionReport design={design} success={result.success} />

        <LaunchFact result={result} className="mission-complete__fact" />

        {practice ? (
          // Flown with the Tutorial: practice only. The next mission opens after a flight without it.
          <div className="mission-complete__unlock mission-complete__practice">
            <PixelHand className="mission-complete__practice-hand" />
            <div>
              <p className="mission-complete__unlock-label">{t('Practice flight')}</p>
              <p className="mission-complete__unlock-name">{t('Fly without the Tutorial to unlock the next mission.')}</p>
            </div>
          </div>
        ) : nextMission ? (
          <div className="mission-complete__unlock">
            <Planet planet={nextMission.planet} size={72} />
            <div>
              <p className="mission-complete__unlock-label">{t('Next level unlocked!')}</p>
              <p className="mission-complete__unlock-name">
                {t('Mission {{number}} · {{place}}', { number: nextMission.number, place: t(nextMission.title) })}
              </p>
            </div>
          </div>
        ) : (
          <p className="mission-complete__unlock-label">
            {playerName ? sayTo(playerName, t('You finished every mission!')) : t('You finished every mission!')}
          </p>
        )}

        <div className="mission-complete__actions">
          {practice ? (
            <>
              <button type="button" className="game__back" onClick={onContinue}>{continueLabel ?? t('Missions')}</button>
              <button ref={continueRef} type="button" className="ms-btn" onClick={onFlyForReal ?? onFlyAgain}>
                {t('Fly without the Tutorial')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="game__back" onClick={onFlyAgain}>{t('Fly again')}</button>
              <button ref={continueRef} type="button" className="ms-btn" onClick={onContinue}>
                {continueLabel ?? (nextMission ? t('Next mission') : t('Missions'))}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
