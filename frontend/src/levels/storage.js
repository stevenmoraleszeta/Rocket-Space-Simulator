/**
 * PROGRESS STORAGE
 * The level system does not care where progress is stored: it receives an "adapter"
 * with two async functions, load(userId) and save(userId, progress).
 *
 * - localStorageAdapter: on-device copy, also the fallback when Firebase is unavailable.
 * - memoryAdapter: for tests.
 * - createFirestoreAdapter: Firestore copy. It does not import Firebase here;
 *   the SDK functions are injected so this module has no Firebase dependency.
 *
 * @typedef {Object} ProgressStorage
 * @property {(userId: string) => Promise<object|null>} load
 * @property {(userId: string, progress: object) => Promise<void>} save
 */

const KEY = (userId) => `space-mission:progress:${userId || 'guest'}`;

/** @type {ProgressStorage} */
export const localStorageAdapter = {
  async load(userId) {
    try {
      const raw = window.localStorage.getItem(KEY(userId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // private mode, blocked storage, broken JSON…
    }
  },
  async save(userId, progress) {
    try {
      window.localStorage.setItem(KEY(userId), JSON.stringify(progress));
    } catch {
      /* no storage available: the game keeps working, it just does not save */
    }
  },
};

/** @returns {ProgressStorage} */
export function memoryAdapter(initial = {}) {
  const db = new Map(Object.entries(initial));
  return {
    async load(userId) { return db.has(userId) ? structuredClone(db.get(userId)) : null; },
    async save(userId, progress) { db.set(userId, structuredClone(progress)); },
    _db: db,
  };
}

/**
 * Firestore adapter (modular SDK v9+). Usage:
 *
 *   import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
 *   const storage = createFirestoreAdapter({ db: getFirestore(app), doc, getDoc, setDoc });
 *
 * Stored at: progress/{userId}
 * @returns {ProgressStorage}
 */
export function createFirestoreAdapter({ db, doc, getDoc, setDoc, collection = 'progress' }) {
  return {
    async load(userId) {
      const snap = await getDoc(doc(db, collection, userId));
      return snap.exists() ? snap.data() : null;
    },
    async save(userId, progress) {
      const updatedAt = typeof progress?.updatedAt === 'string' && progress.updatedAt
        ? progress.updatedAt
        : new Date().toISOString();
      await setDoc(doc(db, collection, userId), { ...progress, updatedAt });
    },
  };
}
