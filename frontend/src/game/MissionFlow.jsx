/**
 * Plays the stages of one mission in order (see stages.js).
 *
 *   Level 2  GameScreen          hangar: fit the rocket parts
 *   Level 2  OrbitalLaunchLevel  choose a site, aim at the hardest orbit, launch (mission 1)
 *   Level 3  MoonLaunchLevel     pick a base, the day and the aim, fly to the Moon, map it (mission 2)
 *   Level 4  MarsLaunchLevel     aim at exactly 135.55°, launch, cruise past debris to Mars (mission 3)
 *
 * Which of those screens is open comes from the URL (appRoute.js), so a refresh
 * stays on the same tab. Launch in the hangar hands the rocket to the next
 * implemented stage. That stage plays the liftoff animation (LaunchSequence.jsx)
 * when the rocket really leaves.
 */
import { useCallback, useMemo } from 'react'
import { packFromLoadout } from '../lib/appRoute.js'
import { GameScreen } from './GameScreen.jsx'
import { EMPTY_LOADOUT } from './parts.js'
import { OrbitalLaunchLevel } from './levels/orbit/OrbitalLaunchLevel.jsx'
import { MoonLaunchLevel } from './levels/moon/MoonLaunchLevel.jsx'
import { MarsLaunchLevel } from './levels/marsLaunch/MarsLaunchLevel.jsx'
import { STAGE_IDS, STAGE_INFO, getNextStage } from './stages.js'

/**
 * Loadout entries that are not parts but still travel with the rocket: the gold rocket
 * upgrade (lifeSupport.js, loadout.upgrade). Without it here a failed flight sent the player
 * back to the hangar with the upgrade switched off.
 */
const EXTRA_LOADOUT_IDS = ['upgrade']

function loadoutFromPack(pack) {
  const loadout = { ...EMPTY_LOADOUT }
  if (!pack) return loadout
  for (const [id, count] of Object.entries(pack)) {
    if (id in loadout || EXTRA_LOADOUT_IDS.includes(id)) loadout[id] = count
  }
  return loadout
}

export function MissionFlow({ mission, route, onRoute, onExit, onNextMission }) {
  const equipped = useMemo(() => loadoutFromPack(route.pack), [route.pack])
  const launchStageId = getNextStage(mission.id, STAGE_IDS.BUILD_AND_LAUNCH)
  const launchReady = Boolean(launchStageId && STAGE_INFO[launchStageId]?.implemented)

  const onPack = useCallback((loadout) => {
    onRoute((current) => {
      if (current.missionId !== mission.id || current.screen !== 'hangar') return current
      return { ...current, pack: packFromLoadout(loadout) }
    }, 'replace')
  }, [mission.id, onRoute])

  const onLaunchPlace = useCallback((place) => {
    onRoute((current) => {
      if (current.missionId !== mission.id || current.screen !== 'launch') return current
      if (current.step === place.step && (current.siteId ?? null) === (place.siteId ?? null)) return current
      return { ...current, step: place.step, siteId: place.siteId ?? null }
    }, 'replace')
  }, [mission.id, onRoute])

  const backToHangar = useCallback(() => {
    onRoute((current) => ({ ...current, screen: 'hangar', step: null, siteId: null }), 'push')
  }, [onRoute])

  if (route.screen === 'launch' && launchReady) {
    const shared = {
      mission,
      stageInfo: STAGE_INFO[launchStageId],
      equipped,
      launchPlace: { step: route.step, siteId: route.siteId },
      onLaunchPlace,
      onBackToHangar: backToHangar,
      onExit,
    }
    if (launchStageId === STAGE_IDS.ORBITAL_LAUNCH) return <OrbitalLaunchLevel {...shared} />
    if (launchStageId === STAGE_IDS.MOON_TRANSIT) {
      return <MoonLaunchLevel {...shared} onNextMission={onNextMission} />
    }
    if (launchStageId === STAGE_IDS.MARS_TRANSIT) return <MarsLaunchLevel {...shared} />
  }

  // Hangar. Missions with a playable stage after it receive the rocket through onLaunch;
  // the others keep the hangar's own flight phase.
  const startLaunch = (builtLoadout) => {
    onRoute((current) => ({
      ...current,
      screen: 'launch',
      step: 'site',
      siteId: null,
      pack: packFromLoadout(builtLoadout),
    }), 'push')
  }
  return (
    <GameScreen
      mission={mission}
      onExit={onExit}
      initialEquipped={route.pack ? equipped : undefined}
      onEquippedChange={onPack}
      onLaunch={launchReady ? startLaunch : undefined}
    />
  )
}
