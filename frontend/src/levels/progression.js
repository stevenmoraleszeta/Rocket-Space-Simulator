/**
 * PROGRESSION ENGINE — pure logic, no React and no storage.
 * Every function is pure: it takes the progress and returns data or a NEW progress object
 * (it never mutates its input).
 *
 * @typedef {Object} MissionProgress
 * @property {boolean} completed   completed at least once
 * @property {number}  stars       best stars (0–3)
 * @property {number}  bestPct     best score (0–100)
 * @property {number}  attempts
 *
 * @typedef {Object} Progress
 * @property {number} version
 * @property {Object<string, MissionProgress>} missions
 * @property {import('./flights.js').FlightLog[]} flights  every attempt, newest first
 *
 * @typedef {Object} MissionResult  what gameplay reports when a mission ends
 * @property {number}  pct          score achieved (0–100)
 * @property {boolean} success      the mission did not fail (rocket arrived, probe survived)
 * @property {{ packed?: Object<string, number>, picks?: Object<string, string> }} [flight]
 */
import { MISSIONS } from './data/missions.js';
import { appendFlight, newFlightId, normalizeFlights, sanitizePacked, sanitizePicks } from './flights.js';

export const PROGRESS_VERSION = 1;
/** Minimum score for 2 and 3 stars (1 star = the mission's passPct). */
export const STAR_THRESHOLDS = { two: 80, three: 95 };

/** @returns {Progress} */
export function createEmptyProgress() {
  return { version: PROGRESS_VERSION, missions: {}, flights: [] };
}

/** Accepts old or incomplete data (e.g. from a database) and returns a valid Progress. */
export function normalizeProgress(raw) {
  const out = createEmptyProgress();
  if (!raw || typeof raw !== 'object') return out;
  out.flights = normalizeFlights(raw.flights);
  if (typeof raw.missions !== 'object' || !raw.missions) return out;
  for (const [id, mp] of Object.entries(raw.missions)) {
    if (!mp || typeof mp !== 'object') continue;
    out.missions[id] = {
      completed: !!mp.completed,
      stars: clampInt(mp.stars, 0, 3),
      bestPct: clampInt(mp.bestPct, 0, 100),
      attempts: clampInt(mp.attempts, 0, Infinity),
    };
  }
  return out;
}

// ------------------------------------------------------------------ Queries

export const getMission = (id, missions = MISSIONS) => missions.find((m) => m.id === id) || null;
const indexOf = (id, missions) => missions.findIndex((m) => m.id === id);
export const getNextMission = (id, missions = MISSIONS) => missions[indexOf(id, missions) + 1] || null;
const mp = (progress, id) => progress.missions[id] || null;

/** The mission can be played. */
export function isUnlocked(progress, id, missions = MISSIONS) {
  const i = indexOf(id, missions);
  if (i < 0) return false;
  if (id === 'moon') return true;
  return i === 0 || !!mp(progress, missions[i - 1].id)?.completed;
}

/** The first unlocked mission that has not been completed yet (null if all are done). */
export function getCurrentMission(progress, missions = MISSIONS) {
  return missions.find((m) => isUnlocked(progress, m.id, missions) && !mp(progress, m.id)?.completed) || null;
}

/** @returns {'locked'|'current'|'completed'} */
export function getMissionState(progress, id, missions = MISSIONS) {
  if (!isUnlocked(progress, id, missions)) return 'locked';
  return mp(progress, id)?.completed ? 'completed' : 'current';
}

export const getStars = (progress, id) => mp(progress, id)?.stars || 0;
export const totalStars = (progress) => Object.values(progress.missions).reduce((a, m) => a + (m.stars || 0), 0);
export const maxStars = (missions = MISSIONS) => missions.length * 3;
export const allCompleted = (progress, missions = MISSIONS) => missions.every((m) => mp(progress, m.id)?.completed);

// ------------------------------------------------------------------ Results

/** Stars for one attempt (0 = mission not completed). */
export function calcStars(mission, result) {
  if (!result.success || result.pct < mission.passPct) return 0;
  return result.pct >= STAR_THRESHOLDS.three ? 3 : result.pct >= STAR_THRESHOLDS.two ? 2 : 1;
}

/**
 * Records the result of an attempt.
 * @returns {{ progress: Progress, outcome: { missionId, completed, stars, pct, newBest, unlockedMissionId } }}
 */
export function applyResult(progress, missionId, result, missions = MISSIONS) {
  const mission = getMission(missionId, missions);
  if (!mission) throw new Error(`Unknown mission: ${missionId}`);
  if (!isUnlocked(progress, missionId, missions)) throw new Error(`Mission ${missionId} is locked`);

  const pct = clampInt(result.pct, 0, 100);
  const stars = calcStars(mission, { ...result, pct });
  const completed = stars > 0;
  const prev = mp(progress, missionId) || { completed: false, stars: 0, bestPct: 0, attempts: 0 };
  const next = getNextMission(missionId, missions);

  const flight = {
    id: newFlightId(),
    missionId,
    at: new Date().toISOString(),
    success: !!result.success,
    pct,
    stars,
    packed: sanitizePacked(result.flight?.packed),
    picks: sanitizePicks(result.flight?.picks),
  };

  return {
    progress: {
      ...progress,
      missions: {
        ...progress.missions,
        [missionId]: {
          completed: prev.completed || completed,
          stars: Math.max(prev.stars, stars),
          bestPct: Math.max(prev.bestPct, pct),
          attempts: prev.attempts + 1,
        },
      },
      flights: appendFlight(progress.flights, flight),
    },
    outcome: {
      missionId,
      completed,
      stars,
      pct,
      newBest: stars > prev.stars,
      unlockedMissionId: completed && !prev.completed && next && !isUnlocked(progress, next.id, missions)
        ? next.id
        : null,
    },
  };
}

// ------------------------------------------------------------------ Data validation

/** Checks that mission data is well formed. Returns a list of errors (empty = OK). */
export function validateMissions(missions = MISSIONS) {
  const errors = [];
  const ids = new Set();
  missions.forEach((m, i) => {
    if (!m.id) errors.push(`Mission #${i} has no id`);
    if (ids.has(m.id)) errors.push(`Duplicate id: ${m.id}`);
    ids.add(m.id);
    if (!['earth', 'moon', 'mars'].includes(m.planet)) errors.push(`${m.id}: unknown planet "${m.planet}"`);
    if (!(m.passPct > 0 && m.passPct <= 100)) errors.push(`${m.id}: invalid passPct`);
    if (!m.title || !m.goal || !m.intro) errors.push(`${m.id}: missing title, goal, or intro`);
    if (!Array.isArray(m.story) || m.story.length === 0 || m.story.some((line) => typeof line !== 'string' || !line.trim())) {
      errors.push(`${m.id}: story must be short lines`);
    }
    if (!Array.isArray(m.hints) || m.hints.length === 0 || m.hints.some((line) => typeof line !== 'string' || !line.trim())) {
      errors.push(`${m.id}: hints must be short clues`);
    }
  });
  return errors;
}

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}
