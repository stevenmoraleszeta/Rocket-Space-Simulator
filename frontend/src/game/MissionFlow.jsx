/**
 * Plays the stages of one mission in order (see stages.js).
 *
 *   Level 2  GameScreen          hangar: fit the rocket parts
 *   Level 2  OrbitalLaunchLevel  choose site and orbit, aim, launch (mission 1)
 */
import { useState } from 'react'
import { GameScreen } from './GameScreen.jsx'
import { OrbitalLaunchLevel } from './levels/orbit/OrbitalLaunchLevel.jsx'
import { MISSION_STAGES, STAGE_IDS, STAGE_INFO, getFirstStage } from './stages.js'

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

  // Hangar. Missions with a launch stage after it receive the rocket through onLaunch;
  // the others keep the hangar's own flight phase.
  const hasLaunchStage = MISSION_STAGES[mission.id]?.includes(STAGE_IDS.ORBITAL_LAUNCH)
  const handleLaunch = (builtLoadout) => {
    setEquipped(builtLoadout)
    setStageId(STAGE_IDS.ORBITAL_LAUNCH)
  }
  return (
    <GameScreen
      mission={mission}
      onExit={onExit}
      initialEquipped={equipped ?? undefined}
      onLaunch={hasLaunchStage ? handleLaunch : undefined}
    />
  )
}
