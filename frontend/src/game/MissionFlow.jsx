/**
 * Plays the stages of one mission in order (see stages.js).
 *
 *   Level 0  EarthSurfaceLevel  arrival at the launch base and briefing
 *   Level 2  GameScreen         hangar: fit the rocket parts, then launch
 */
import { useState } from 'react'
import { GameScreen } from './GameScreen.jsx'
import { EarthSurfaceLevel } from './levels/earth/EarthSurfaceLevel.jsx'
import { STAGE_IDS, STAGE_INFO, getFirstStage, getNextStage } from './stages.js'

export function MissionFlow({ mission, onExit }) {
  const [stageId, setStageId] = useState(() => getFirstStage(mission.id))

  const goToNextStage = () => {
    const nextStageId = getNextStage(mission.id, stageId)
    if (nextStageId) setStageId(nextStageId)
  }

  if (stageId === STAGE_IDS.EARTH_SURFACE) {
    return (
      <EarthSurfaceLevel
        mission={mission}
        stageInfo={STAGE_INFO[stageId]}
        onContinue={goToNextStage}
        onExit={onExit}
      />
    )
  }

  // BUILD_AND_LAUNCH, and any stage without its own screen yet, uses the hangar.
  return <GameScreen mission={mission} onExit={onExit} />
}
