/**
 * One saved trip. Repeats stay in the log; the best score still lives on the mission.
 *
 * Part ids and pick keys must match the Firestore rules for progress/{uid}/flights.
 *
 * @typedef {Object} FlightLog
 * @property {string} id
 * @property {string} missionId
 * @property {string} at
 * @property {boolean} success
 * @property {number} pct
 * @property {number} stars
 * @property {Object<string, number>} packed
 * @property {Object<string, string>} picks
 */

export const FLIGHT_LIMIT = 48;

export const PART_IDS = Object.freeze([
  'shield',
  'boosters',
  'fuel',
  'food',
  'water',
  'medicine',
  'veggie',
  'astronaut',
  'garden',
  'scrubber',
  'shelter',
  'parachute',
  'rover',
  'antenna',
]);

export const PICK_KEYS = Object.freeze(['site', 'orbit', 'window', 'craft', 'place']);

const PART_SET = new Set(PART_IDS);
const MISSION_IDS = new Set(['earth', 'moon', 'mars']);

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

/** Short id safe to use as a Firestore document id. */
export function newFlightId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(12);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let id = '';
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return id;
}

export function sanitizePacked(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const packed = {};
  for (const [id, count] of Object.entries(raw)) {
    if (!PART_SET.has(id)) continue;
    const n = clampInt(count, 0, 8);
    if (n > 0) packed[id] = n;
  }
  return packed;
}

export function sanitizePicks(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const picks = {};
  for (const key of PICK_KEYS) {
    const value = raw[key];
    if (typeof value !== 'string') continue;
    const text = value.trim().slice(0, 48);
    if (text) picks[key] = text;
  }
  return picks;
}

export function sanitizeFlight(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !/^[a-z0-9]{8,28}$/.test(raw.id)) return null;
  if (!MISSION_IDS.has(raw.missionId)) return null;
  if (typeof raw.at !== 'string' || raw.at.length === 0 || raw.at.length > 40) return null;
  if (Number.isNaN(Date.parse(raw.at))) return null;
  return {
    id: raw.id,
    missionId: raw.missionId,
    at: raw.at,
    success: !!raw.success,
    pct: clampInt(raw.pct, 0, 100),
    stars: clampInt(raw.stars, 0, 3),
    packed: sanitizePacked(raw.packed),
    picks: sanitizePicks(raw.picks),
  };
}

/** Newest first, duplicates dropped, capped. */
export function normalizeFlights(raw) {
  if (!Array.isArray(raw)) return [];
  const byId = new Map();
  for (const item of raw) {
    const flight = sanitizeFlight(item);
    if (flight) byId.set(flight.id, flight);
  }
  return [...byId.values()]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1))
    .slice(0, FLIGHT_LIMIT);
}

export function mergeFlights(a, b) {
  return normalizeFlights([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
}

export function appendFlight(flights, flight) {
  return normalizeFlights([flight, ...(Array.isArray(flights) ? flights : [])]);
}
