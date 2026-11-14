import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (useEmulators ? 'demo-api-key' : ''),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (useEmulators ? 'localhost' : ''),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (useEmulators ? 'rocket-space-simulator' : ''),
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (useEmulators ? 'rocket-space-simulator.appspot.com' : ''),
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (useEmulators ? '000000000000' : ''),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (useEmulators ? '1:000000000000:web:demo' : ''),
}

export const firebaseReady = Boolean(firebaseConfig.projectId && (useEmulators || firebaseConfig.apiKey))

export const app = firebaseReady ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

if (app && useEmulators && !globalThis.__FIREBASE_EMULATORS__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  globalThis.__FIREBASE_EMULATORS__ = true
}
