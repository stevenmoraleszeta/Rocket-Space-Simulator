/**
 * STAGE FLOW — pure data and logic, no React.
 *
 * The mission selection module (src/levels) decides WHICH mission is played
 * ('earth' | 'moon' | 'mars'). This file decides the stages played INSIDE each mission.
 *
 * Mapping between the game design levels and the missions:
 *   Mission 'earth' -> Level 0 (Earth surface), Level 2 (build and launch: GameScreen.jsx)
 *   Mission 'moon'  -> Level 2 for now, Level 3 (trip to the Moon) when it exists
 *   Mission 'mars'  -> Level 2 for now, Level 4 (trip to Mars) when it exists
 *
 * Level 1 (preparation) is still being designed, so it is not in any flow yet.
 * Stages with `implemented: false` are declared but not played.
 */

export const STAGE_IDS = Object.freeze({
  EARTH_SURFACE: 'earthSurface',
  PREPARATION: 'preparation',
  BUILD_AND_LAUNCH: 'buildAndLaunch',
  MOON_TRANSIT: 'moonTransit',
  MARS_TRANSIT: 'marsTransit',
})

/** Display data for each stage. */
export const STAGE_INFO = Object.freeze({
  [STAGE_IDS.EARTH_SURFACE]: { id: STAGE_IDS.EARTH_SURFACE, levelNumber: 0, title: 'Earth', implemented: true },
  [STAGE_IDS.PREPARATION]: { id: STAGE_IDS.PREPARATION, levelNumber: 1, title: 'Preparation', implemented: false },
  [STAGE_IDS.BUILD_AND_LAUNCH]: { id: STAGE_IDS.BUILD_AND_LAUNCH, levelNumber: 2, title: 'Build and Launch', implemented: true },
  [STAGE_IDS.MOON_TRANSIT]: { id: STAGE_IDS.MOON_TRANSIT, levelNumber: 3, title: 'Trip to the Moon', implemented: false },
  [STAGE_IDS.MARS_TRANSIT]: { id: STAGE_IDS.MARS_TRANSIT, levelNumber: 4, title: 'Trip to Mars', implemented: false },
})

/** Ordered stages of each mission. The key is the mission id from src/levels/data/missions.js. */
export const MISSION_STAGES = Object.freeze({
  earth: [STAGE_IDS.EARTH_SURFACE, STAGE_IDS.BUILD_AND_LAUNCH],
  moon: [STAGE_IDS.BUILD_AND_LAUNCH],
  mars: [STAGE_IDS.BUILD_AND_LAUNCH],
})

/** First stage of a mission, or null when the mission id is unknown. */
export function getFirstStage(missionId) {
  return MISSION_STAGES[missionId]?.[0] ?? null
}

/** Stage that follows `stageId` in the mission, or null when it is the last one. */
export function getNextStage(missionId, stageId) {
  const stages = MISSION_STAGES[missionId] ?? []
  const index = stages.indexOf(stageId)
  return index >= 0 ? (stages[index + 1] ?? null) : null
}
