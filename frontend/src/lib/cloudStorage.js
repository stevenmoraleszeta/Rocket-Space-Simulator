import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { MISSIONS } from '../levels/data/missions.js'
import { mergeFlights, normalizeFlights } from '../levels/flights.js'
import { normalizeProgress } from '../levels/progression.js'
import { createFirestoreAdapter, localStorageAdapter } from '../levels/storage.js'
import {
  createSettingsFirestoreAdapter,
  readLocalSettingsRecord,
  saveSettings,
} from '../settings/settingsStore.js'
import { db, firebaseReady } from './firebase.js'

function timeOf(updatedAt) {
  const t = Date.parse(updatedAt || '')
  return Number.isFinite(t) ? t : 0
}

/** Keeps the best record of each mission from either copy. */
export function mergeProgress(a, b) {
  const left = normalizeProgress(a)
  const right = normalizeProgress(b)
  const ids = new Set([...Object.keys(left.missions), ...Object.keys(right.missions)])
  const missions = {}
  for (const id of ids) {
    const x = left.missions[id]
    const y = right.missions[id]
    if (!x || !y) {
      missions[id] = x || y
      continue
    }
    missions[id] = {
      completed: x.completed || y.completed,
      stars: Math.max(x.stars, y.stars),
      bestPct: Math.max(x.bestPct, y.bestPct),
      attempts: Math.max(x.attempts, y.attempts),
    }
  }
  return { version: left.version, missions, flights: mergeFlights(left.flights, right.flights) }
}

function missionSnapshot(progress) {
  const clean = normalizeProgress(progress)
  return JSON.stringify(Object.keys(clean.missions).sort().map((id) => [id, clean.missions[id]]))
}

const MISSION_IDS = new Set(MISSIONS.map((mission) => mission.id))

function progressStamp(progress) {
  const clean = normalizeProgress(progress)
  const missions = {}
  for (const [id, record] of Object.entries(clean.missions)) {
    if (MISSION_IDS.has(id)) missions[id] = record
  }
  const updatedAt = typeof progress?.updatedAt === 'string' && progress.updatedAt
    ? progress.updatedAt
    : new Date().toISOString()
  return { version: clean.version, missions, updatedAt }
}

/** Progress document plus the flight log. The log is not stored inside the progress document. */
function localRecord(progress) {
  const clean = normalizeProgress(progress)
  return { ...progressStamp(clean), flights: clean.flights }
}

async function readLocalProgress(userId) {
  const own = await localStorageAdapter.load(userId)
  if (userId === 'guest') return own
  const guest = await localStorageAdapter.load('guest')
  if (!own) return guest
  if (!guest) return own
  return mergeProgress(own, guest)
}

/**
 * Progress storage that writes Firestore and keeps a local copy.
 * Returns null when Firebase is not configured, so the caller can use localStorage.
 */
export function createCloudProgressStorage() {
  if (!firebaseReady || !db) return null
  const remote = createFirestoreAdapter({ db, doc, getDoc, setDoc })

  async function readRemoteFlights(userId) {
    const snap = await getDocs(collection(db, 'progress', userId, 'flights'))
    return snap.docs.map((item) => ({ id: item.id, ...item.data() }))
  }

  async function writeMissingFlights(userId, flights, already) {
    const known = new Set((already || []).map((flight) => flight.id))
    const pending = normalizeFlights(flights).filter((flight) => !known.has(flight.id))
    await Promise.all(pending.map(async (flight) => {
      const { id, ...data } = flight
      try {
        await setDoc(doc(db, 'progress', userId, 'flights', id), data)
      } catch (error) {
        console.warn('Could not save a flight log.', error)
      }
    }))
  }

  async function publish(userId, progress, remoteFlights) {
    const record = localRecord(progress)
    const flights = mergeFlights(record.flights, remoteFlights)
    const saved = { ...progressStamp(record), flights }
    await remote.save(userId, progressStamp(record))
    await writeMissingFlights(userId, flights, remoteFlights)
    await localStorageAdapter.save(userId, saved)
    return saved
  }

  return {
    async load(userId) {
      const localData = await readLocalProgress(userId)
      let remoteData = null
      let remoteFlights = []
      try {
        remoteData = await remote.load(userId)
        remoteFlights = await readRemoteFlights(userId)
      } catch (error) {
        console.warn('Could not load progress from Firestore. Using the copy on this device.', error)
        return localData
      }

      const flights = mergeFlights(localData?.flights, remoteFlights)
      if (!remoteData) {
        if (!localData && flights.length === 0) return null
        const base = localData || { version: 1, missions: {}, flights }
        try {
          return await publish(userId, { ...base, flights }, [])
        } catch (error) {
          console.warn('Could not save progress to Firestore. Kept the copy on this device.', error)
          const kept = localRecord({ ...base, flights })
          await localStorageAdapter.save(userId, kept)
          return kept
        }
      }

      const merged = mergeProgress(localData || { version: 1, missions: {} }, remoteData)
      const withFlights = { ...progressStamp(merged), flights }
      const remoteIds = new Set(normalizeFlights(remoteFlights).map((flight) => flight.id))
      const flightsSynced = flights.length === remoteIds.size && flights.every((flight) => remoteIds.has(flight.id))
      if (missionSnapshot(merged) === missionSnapshot(remoteData) && flightsSynced) {
        await localStorageAdapter.save(userId, withFlights)
        return withFlights
      }
      try {
        return await publish(userId, withFlights, remoteFlights)
      } catch (error) {
        console.warn('Could not save progress to Firestore. Kept the copy on this device.', error)
        await localStorageAdapter.save(userId, withFlights)
        return withFlights
      }
    },

    /**
     * Start over: empty progress here and in Firestore. save() keeps the best of both copies,
     * so it would bring the old stars back; this overwrites them instead. The guest copy on this
     * device is emptied too (load merges it in). Flight logs in Firestore cannot be deleted
     * (firestore.rules), so the cloud history stays.
     */
    async reset(userId) {
      const empty = localRecord({ version: 1, missions: {}, flights: [] })
      await localStorageAdapter.save(userId, empty)
      if (userId !== 'guest') await localStorageAdapter.save('guest', empty)
      await remote.save(userId, progressStamp(empty))
      return empty
    },

    async save(userId, progress) {
      const immediate = localRecord(progress)
      await localStorageAdapter.save(userId, immediate)
      let remoteData = null
      let remoteFlights = []
      try {
        remoteData = await remote.load(userId)
        remoteFlights = await readRemoteFlights(userId)
      } catch (error) {
        console.warn('Could not read cloud progress before saving.', error)
      }
      const merged = remoteData ? mergeProgress(immediate, remoteData) : immediate
      const flights = mergeFlights(immediate.flights, remoteFlights)
      try {
        return await publish(userId, { ...merged, flights }, remoteFlights)
      } catch (error) {
        console.warn('Could not save progress to Firestore. Kept the copy on this device.', error)
        throw error
      }
    },
  }
}

/**
 * Settings storage that writes Firestore and keeps a local copy.
 * Returns null when Firebase is not configured.
 */
export function createCloudSettingsStorage() {
  if (!firebaseReady || !db) return null
  const remote = createSettingsFirestoreAdapter({ db, doc, getDoc, setDoc })

  async function upload(userId, settings, updatedAt) {
    saveSettings(settings, updatedAt)
    await remote.save(userId, { ...settings, updatedAt })
  }

  return {
    async load(userId) {
      const local = readLocalSettingsRecord()
      let remoteData = null
      try {
        remoteData = await remote.load(userId)
      } catch (error) {
        console.warn('Could not load settings from Firestore. Using the copy on this device.', error)
        return local?.settings ?? null
      }

      if (!remoteData) {
        if (!local) return null
        const updatedAt = local.updatedAt || new Date().toISOString()
        try {
          await upload(userId, local.settings, updatedAt)
        } catch (error) {
          console.warn('Could not save settings to Firestore. Kept the copy on this device.', error)
        }
        return local.settings
      }

      if (local && timeOf(local.updatedAt) > timeOf(remoteData.updatedAt)) {
        try {
          await upload(userId, local.settings, local.updatedAt)
        } catch (error) {
          console.warn('Could not save settings to Firestore. Kept the copy on this device.', error)
        }
        return local.settings
      }

      saveSettings(remoteData, remoteData.updatedAt || new Date().toISOString())
      return remoteData
    },

    async save(userId, settings) {
      const updatedAt = new Date().toISOString()
      try {
        await upload(userId, settings, updatedAt)
      } catch (error) {
        console.warn('Could not save settings to Firestore. Kept the copy on this device.', error)
        throw error
      }
    },
  }
}
