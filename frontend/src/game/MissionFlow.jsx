/**
 * Plays the stages of one mission in order (see stages.js).
 *
 *   Level 2  GameScreen          hangar: fit the rocket parts
 *   Level 2  OrbitalLaunchLevel  choose a site, aim at the hardest orbit, launch (mission 1)
 *   Level 4  MarsTransitLevel   choose a window, aim at Mars, cruise (mission 3)
 *
 * Launch in the hangar hands the rocket to the next implemented stage of the mission (stages.js).
 * That stage plays the liftoff animation (LaunchSequence.jsx) when the rocket really leaves.
 * A new stage, like the trip in space of mission 2, is added there and rendered below.
 */
import { useState } from 'react'
import { GameScreen } from './GameScreen.jsx'
import { OrbitalLaunchLevel } from './levels/orbit/OrbitalLaunchLevel.jsx'
import { MarsTransitLevel } from './levels/mars/MarsTransitLevel.jsx'
import { STAGE_IDS, STAGE_INFO, getFirstStage, getNextStage } from './stages.js'

export function MissionFlow({ mission, onExit }) {
  const [stageId, setStageId] = useState(() => getFirstStage(mission.id))
  // Rocket built in the hangar, handed to the launch stage.
  const [equipped, setEquipped] = useState(null)

  if (stageId === STAGE_IDS.ORBITAL_LAUNCH && equipped) {
    return (
      <OrbitalLaunchLevel
        mission={mission}
        stageInfo={STAGE_INFO[stageId]}
        equipped={equipped}
        onBackToHangar={() => setStageId(STAGE_IDS.BUILD_AND_LAUNCH)}
        onExit={onExit}
      />
    )
  }

  if (stageId === STAGE_IDS.MARS_TRANSIT && equipped) {
    return (
      <MarsTransitLevel
        mission={mission}
        stageInfo={STAGE_INFO[stageId]}
        equipped={equipped}
        onBackToHangar={() => setStageId(STAGE_IDS.BUILD_AND_LAUNCH)}
        onExit={onExit}
      />
    )
  }

  // Mission 2 (Moon): render its space stage here once STAGE_INFO marks it implemented.

  // Hangar. Missions with a playable stage after it receive the rocket through onLaunch;
  // the others keep the hangar's own flight phase.
  const nextStageId = getNextStage(mission.id, STAGE_IDS.BUILD_AND_LAUNCH)
  const hasNextStage = Boolean(nextStageId && STAGE_INFO[nextStageId]?.implemented)
  const handleLaunch = (builtLoadout) => {
    setEquipped(builtLoadout)
    setStageId(nextStageId)
  }
  return (
    <GameScreen
      mission={mission}
      onExit={onExit}
      initialEquipped={equipped ?? undefined}
      onLaunch={hasNextStage ? handleLaunch : undefined}
    />
  )
}
