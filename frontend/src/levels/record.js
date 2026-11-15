/**
 * Titles, mission history, and the numbers on the stats screen.
 * Pure data: no React. Add a rank here when a new title should exist.
 */
import { MISSIONS } from './data/missions.js';
import * as P from './progression.js';

/** Three titles, earned with stars. The first one comes after a single star. */
export const RANKS = Object.freeze([
  {
    id: 'cadet',
    minStars: 1,
    name: 'Star Cadet',
    cheer: 'Your first star. The crew is proud of you.',
  },
  {
    id: 'pilot',
    minStars: 4,
    name: 'Orbit Pilot',
    cheer: 'Four stars. You know how to fly.',
  },
  {
    id: 'commander',
    minStars: 7,
    name: 'Star Commander',
    cheer: 'Seven stars. The crew cheers for you.',
  },
]);

function article(name) {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

/** The title the player holds, and the next one they can reach. */
export function rankFor(stars) {
  const earned = RANKS.filter((rank) => stars >= rank.minStars);
  const current = earned.length ? earned[earned.length - 1] : null;
  const next = RANKS.find((rank) => rank.minStars > stars) || null;
  const starsToNext = next ? next.minStars - stars : 0;
  return { current, next, starsToNext };
}

/** "2 more stars and you become an Orbit Pilot." */
export function nextRankLine(stars) {
  const { next, starsToNext } = rankFor(stars);
  if (!next) return 'This is the top title. Every star still shines.';
  const starsWord = starsToNext === 1 ? '1 more star' : `${starsToNext} more stars`;
  return `${starsWord} and you become ${article(next.name)} ${next.name}.`;
}

export function historyRows(progress, missions = MISSIONS) {
  return missions.map((mission, index) => {
    const entry = progress.missions?.[mission.id];
    return {
      id: mission.id,
      number: mission.number,
      title: mission.title,
      place: mission.place,
      planet: mission.planet,
      state: P.getMissionState(progress, mission.id, missions),
      stars: entry?.stars || 0,
      bestPct: entry?.bestPct || 0,
      attempts: entry?.attempts || 0,
      completed: Boolean(entry?.completed),
      previousNumber: index > 0 ? missions[index - 1].number : null,
    };
  });
}

/** Saved trips that have a packing list, newest first. */
export function flightCards(progress, missions = MISSIONS) {
  const flights = Array.isArray(progress?.flights) ? progress.flights : [];
  return flights
    .map((flight) => ({ ...flight, mission: missions.find((item) => item.id === flight.missionId) || null }))
    .filter((card) => card.mission);
}

/** Attempts saved before each trip kept its own packing list. */
export function unloggedAttempts(progress, missions = MISSIONS) {
  const flights = Array.isArray(progress?.flights) ? progress.flights : [];
  return historyRows(progress, missions).reduce((sum, row) => {
    const logged = flights.filter((flight) => flight.missionId === row.id).length;
    return sum + Math.max(0, row.attempts - logged);
  }, 0);
}

export function statSheet(progress, missions = MISSIONS) {
  const rows = historyRows(progress, missions);
  const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const completed = rows.filter((row) => row.completed).length;
  const bestPct = rows.reduce((best, row) => Math.max(best, row.bestPct), 0);
  const stars = P.totalStars(progress);
  return {
    stars,
    maxStars: P.maxStars(missions),
    completed,
    missionCount: missions.length,
    attempts,
    bestPct,
    hasScore: bestPct > 0,
    rank: rankFor(stars),
    rows,
  };
}
