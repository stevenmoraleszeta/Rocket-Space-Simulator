/**
 * STAGE FLOW — pure data and logic, no React.
 *
 * The mission selection module (src/levels) decides WHICH mission is played
 * ('earth' | 'moon' | 'mars'). This file decides the stages played INSIDE each mission.
 *
 * Mapping between the game design levels and the missions:
 *   Mission 'earth' -> Level 2 (build: GameScreen.jsx, then launch to orbit:
 *                      levels/orbit/OrbitalLaunchLevel.jsx)
 *   Mission 'moon'  -> Level 2 (hangar), then Level 3: base, launch day, aim and the trip to the Moon
 *                      (levels/moon/MoonLaunchLevel.jsx)
 *   Mission 'mars'  -> Level 2, then Level 4 (trip to Mars: levels/mars/MarsTransitLevel.jsx)
 *
 * Level 1 (preparation) is still being designed, so it is not in any flow yet.
 * Stages with `implemented: false` are declared but not played.
 */

export const STAGE_IDS = Object.freeze({
  PREPARATION: 'preparation',
  BUILD_AND_LAUNCH: 'buildAndLaunch',
  ORBITAL_LAUNCH: 'orbitalLaunch',
  MOON_TRANSIT: 'moonTransit',
  MARS_TRANSIT: 'marsTransit',
})

/** Display data for each stage. */
export const STAGE_INFO = Object.freeze({
  [STAGE_IDS.PREPARATION]: { id: STAGE_IDS.PREPARATION, levelNumber: 1, title: 'Preparation', implemented: false },
  [STAGE_IDS.BUILD_AND_LAUNCH]: { id: STAGE_IDS.BUILD_AND_LAUNCH, levelNumber: 2, title: 'Build and Launch', implemented: true },
  [STAGE_IDS.ORBITAL_LAUNCH]: { id: STAGE_IDS.ORBITAL_LAUNCH, levelNumber: 2, title: 'Launch to Orbit', implemented: true },
  [STAGE_IDS.MOON_TRANSIT]: { id: STAGE_IDS.MOON_TRANSIT, levelNumber: 3, title: 'Trip to the Moon', implemented: true },
  [STAGE_IDS.MARS_TRANSIT]: { id: STAGE_IDS.MARS_TRANSIT, levelNumber: 4, title: 'Trip to Mars', implemented: true },
})

/** Ordered stages of each mission. The key is the mission id from src/levels/data/missions.js. */
export const MISSION_STAGES = Object.freeze({
  earth: [STAGE_IDS.BUILD_AND_LAUNCH, STAGE_IDS.ORBITAL_LAUNCH],
  moon: [STAGE_IDS.BUILD_AND_LAUNCH, STAGE_IDS.MOON_TRANSIT],
  mars: [STAGE_IDS.BUILD_AND_LAUNCH, STAGE_IDS.MARS_TRANSIT],
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
