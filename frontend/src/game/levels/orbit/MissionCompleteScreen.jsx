/**
 * Full-screen "Congratulations!" shown when the satellite reaches its orbit.
 *
 * Shows the stars and score, a fun fact that matches how the launch went (LaunchFact.jsx),
 * and the next level that this win unlocked.
 */
import { useEffect, useRef } from 'react'
import { MISSIONS, Planet, StarRating } from '../../../levels'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { LaunchFact } from './LaunchFact.jsx'

function nextMissionAfter(missionId) {
  const index = MISSIONS.findIndex((candidate) => candidate.id === missionId)
  return index >= 0 ? (MISSIONS[index + 1] ?? null) : null
}

export function MissionCompleteScreen({ mission, result, directionDeg, onContinue, onFlyAgain, lead }) {
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
        <p className="mission-complete__kicker">Mission {mission.number} · {mission.title}</p>
        <h2 id="mission-complete-title" className="mission-complete__title">
          {playerName ? sayTo(playerName, 'You did it!') : 'You did it!'}
        </h2>
        <p className="mission-complete__lead">
          {sayTo(playerName, lead ?? 'Your satellite is flying around the Earth.')}
        </p>

        <div className="mission-complete__stars">
          <StarRating stars={result.stars} size={40} />
        </div>

        <dl className="orbit-stats mission-complete__stats">
          <div><dt>Score</dt><dd>{result.pct}%</dd></div>
          {Number.isFinite(result.outcome?.missKm) && (
            <div><dt>Off target</dt><dd>{Math.round(result.outcome.missKm)} km</dd></div>
          )}
          {directionDeg != null && <div><dt>Your direction</dt><dd>{directionDeg}°</dd></div>}
        </dl>

        <LaunchFact result={result} className="mission-complete__fact" />

        {nextMission ? (
          <div className="mission-complete__unlock">
            <Planet planet={nextMission.planet} size={72} />
            <div>
              <p className="mission-complete__unlock-label">Next level unlocked!</p>
              <p className="mission-complete__unlock-name">
                Mission {nextMission.number} · {nextMission.title}
              </p>
            </div>
          </div>
        ) : (
          <p className="mission-complete__unlock-label">
            {playerName ? sayTo(playerName, 'You finished every mission!') : 'You finished every mission!'}
          </p>
        )}

        <div className="mission-complete__actions">
          <button type="button" className="game__back" onClick={onFlyAgain}>Fly again</button>
          <button ref={continueRef} type="button" className="ms-btn" onClick={onContinue}>
            {nextMission ? 'Next mission' : 'Missions'}
          </button>
        </div>
      </div>
    </div>
  )
}
