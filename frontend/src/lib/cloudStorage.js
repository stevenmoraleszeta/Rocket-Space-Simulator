import { doc, getDoc, setDoc } from 'firebase/firestore'
import { MISSIONS } from '../levels/data/missions.js'
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
  return { version: left.version, missions }
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

  async function upload(userId, progress) {
    const stamped = progressStamp(progress)
    await localStorageAdapter.save(userId, stamped)
    await remote.save(userId, stamped)
    return stamped
  }

  return {
    async load(userId) {
      const localData = await readLocalProgress(userId)
      let remoteData = null
      try {
        remoteData = await remote.load(userId)
      } catch (error) {
        console.warn('Could not load progress from Firestore. Using the copy on this device.', error)
        return localData
      }

      if (!remoteData) {
        if (!localData) return null
        try {
          return await upload(userId, localData)
        } catch (error) {
          console.warn('Could not save progress to Firestore. Kept the copy on this device.', error)
          return localData
        }
      }

      const merged = localData ? mergeProgress(localData, remoteData) : remoteData
      if (missionSnapshot(merged) === missionSnapshot(remoteData)) {
        if (!localData || missionSnapshot(localData) !== missionSnapshot(remoteData)) {
          await localStorageAdapter.save(userId, progressStamp(remoteData))
        }
        return remoteData
      }
      try {
        return await upload(userId, merged)
      } catch (error) {
        console.warn('Could not save progress to Firestore. Kept the copy on this device.', error)
        return merged
      }
    },

    async save(userId, progress) {
      const immediate = progressStamp(progress)
      await localStorageAdapter.save(userId, immediate)
      let merged = immediate
      try {
        const remoteData = await remote.load(userId)
        if (remoteData) merged = progressStamp(mergeProgress(immediate, remoteData))
      } catch (error) {
        console.warn('Could not read cloud progress before saving.', error)
      }
      try {
        await remote.save(userId, merged)
        if (missionSnapshot(merged) !== missionSnapshot(immediate)) {
          await localStorageAdapter.save(userId, merged)
        }
        return merged
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
