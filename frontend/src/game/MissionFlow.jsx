/**
 * Plays the stages of one mission in order (see stages.js).
 *
 *   Level 2  GameScreen          hangar: fit the rocket parts
 *   Level 2  OrbitalLaunchLevel  choose a site, aim at the hardest orbit, launch (mission 1)
 *   Level 3  MoonLaunchLevel     pick a base, the day and the aim, fly to the Moon, map it (mission 2)
 *   Level 4  MarsLaunchLevel    aim at exactly 135.55°, launch, cruise past debris to Mars (mission 3)
 *
 * Launch in the hangar hands the rocket to the next implemented stage of the mission (stages.js).
 * That stage plays the liftoff animation (LaunchSequence.jsx) when the rocket really leaves.
 */
import { useState } from 'react'
import { GameScreen } from './GameScreen.jsx'
import { OrbitalLaunchLevel } from './levels/orbit/OrbitalLaunchLevel.jsx'
import { MoonLaunchLevel } from './levels/moon/MoonLaunchLevel.jsx'
import { MarsLaunchLevel } from './levels/marsLaunch/MarsLaunchLevel.jsx'
import { STAGE_IDS, STAGE_INFO, getFirstStage, getNextStage } from './stages.js'

export function MissionFlow({ mission, onExit, onNextMission }) {
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

  if (stageId === STAGE_IDS.MOON_TRANSIT && equipped) {
    return (
      <MoonLaunchLevel
        mission={mission}
        stageInfo={STAGE_INFO[stageId]}
        equipped={equipped}
        onBackToHangar={() => setStageId(STAGE_IDS.BUILD_AND_LAUNCH)}
        onExit={onExit}
        onNextMission={onNextMission}
      />
    )
  }

  if (stageId === STAGE_IDS.MARS_TRANSIT && equipped) {
    return (
      <MarsLaunchLevel
        mission={mission}
        stageInfo={STAGE_INFO[stageId]}
        equipped={equipped}
        onBackToHangar={() => setStageId(STAGE_IDS.BUILD_AND_LAUNCH)}
        onExit={onExit}
      />
    )
  }

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
