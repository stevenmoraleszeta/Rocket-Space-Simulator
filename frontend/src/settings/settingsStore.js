/**
 * Settings data: defaults, name helpers and persistence (no React here).
 * localStorage is the on-device copy. createSettingsFirestoreAdapter stores the
 * same fields in Firestore once the app injects the SDK.
 */
const STORAGE_KEY = 'space-mission:settings';
export const MAX_NAME_LENGTH = 16;

export const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 0.6,   // 0..1
  ambientVolume: 0.8, // 0..1 (ambience + sound effects)
  playerName: '',
  language: 'en', // 'en' | 'es'. English until the player picks Spanish.
});

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** English unless the saved value is Spanish. */
export function normalizeLanguage(value) {
  return value === 'es' ? 'es' : 'en';
}

/** Trims, collapses spaces and caps the length of a player name. */
export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trimStart().slice(0, MAX_NAME_LENGTH);
}

/** The typed name, or '' when the player has not set one. */
export function engineerName(name) {
  return cleanName(name).trim();
}

/** The name to show in messages; falls back to "Engineer" when empty. */
export function displayName(name, fallback = 'Engineer') {
  return engineerName(name) || fallback;
}

/**
 * Talks to the player by name. The sentence stays as written when no name is set.
 *   sayTo('Sam', 'The pad is ready.') // "Sam, the pad is ready."
 */
export function sayTo(name, text) {
  const who = engineerName(name);
  const sentence = String(text ?? '');
  if (!who || !sentence) return sentence;
  return `${who}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
}

export function normalize(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    musicVolume: clamp01(Number(s.musicVolume)),
    ambientVolume: clamp01(Number(s.ambientVolume)),
    playerName: cleanName(s.playerName),
    language: normalizeLanguage(s.language),
  };
}

/** On-device settings plus the timestamp used to pick the newer copy. Null if nothing is stored. */
export function readLocalSettingsRecord() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      settings: normalize(parsed),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

export function loadSettings() {
  return readLocalSettingsRecord()?.settings ?? { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings, updatedAt = new Date().toISOString()) {
  try {
    const clean = normalize(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...clean, updatedAt }));
  } catch {
    /* no storage available: settings still work for this session */
  }
}

/**
 * Firestore adapter (modular SDK v9+). Stored at settings/{userId}.
 * The SDK functions are injected so this module has no Firebase dependency.
 * @returns {{ load: (userId: string) => Promise<object|null>, save: (userId: string, settings: object) => Promise<void> }}
 */
export function createSettingsFirestoreAdapter({ db, doc, getDoc, setDoc, collection = 'settings' }) {
  return {
    async load(userId) {
      const snap = await getDoc(doc(db, collection, userId));
      return snap.exists() ? snap.data() : null;
    },
    async save(userId, settings) {
      const clean = normalize(settings);
      const updatedAt = typeof settings?.updatedAt === 'string' && settings.updatedAt
        ? settings.updatedAt
        : new Date().toISOString();
      await setDoc(doc(db, collection, userId), { ...clean, updatedAt });
    },
  };
}
