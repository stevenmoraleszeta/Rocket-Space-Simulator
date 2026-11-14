/**
 * Settings data: defaults, name helpers and localStorage persistence (no React here).
 */
const STORAGE_KEY = 'space-mission:settings';
export const MAX_NAME_LENGTH = 16;

export const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 0.6,   // 0..1
  ambientVolume: 0.8, // 0..1 (ambience + sound effects)
  playerName: '',
});

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Trims, collapses spaces and caps the length of a player name. */
export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trimStart().slice(0, MAX_NAME_LENGTH);
}

/** The name to show in messages; falls back to a friendly default when empty. */
export function displayName(name, fallback = 'Astronaut') {
  const n = cleanName(name).trim();
  return n || fallback;
}

export function normalize(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    musicVolume: clamp01(Number(s.musicVolume)),
    ambientVolume: clamp01(Number(s.ambientVolume)),
    playerName: cleanName(s.playerName),
  };
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS }; // private mode, blocked storage, broken JSON…
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* no storage available: settings still work for this session */
  }
}
