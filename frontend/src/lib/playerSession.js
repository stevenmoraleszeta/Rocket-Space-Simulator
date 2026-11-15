import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithRedirect,
} from 'firebase/auth'
import { auth, firebaseReady } from './firebase.js'

const AUTH_TIMEOUT_MS = 8000

let anonymousSignIn = null

function ensureAnonymousUser() {
  if (!anonymousSignIn) {
    anonymousSignIn = signInAnonymously(auth).catch((error) => {
      anonymousSignIn = null
      throw error
    })
  }
  return anonymousSignIn
}

function isGoogleUser(user) {
  return Boolean(user?.providerData?.some((provider) => provider.providerId === 'google.com'))
}

function sessionFromUser(user) {
  if (!user) return { uid: 'guest', ready: true, remote: false, google: false }
  return { uid: user.uid, ready: true, remote: true, google: isGoogleUser(user) }
}

function googleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

function credentialFrom(error) {
  const alreadyUsed = error?.code === 'auth/credential-already-in-use' || error?.code === 'auth/email-already-in-use'
  return alreadyUsed ? GoogleAuthProvider.credentialFromError(error) : null
}

/**
 * Sends the whole page to Google. A popup cannot finish a passkey or phone
 * check, which is what was stopping sign-in. An anonymous session is linked
 * first so the stars saved under that uid stay with the player.
 */
export async function signInWithGoogle() {
  if (!firebaseReady || !auth) {
    const error = new Error('Google sign-in is not ready.')
    error.code = 'auth/unavailable'
    throw error
  }

  const current = auth.currentUser
  if (current?.isAnonymous) {
    await linkWithRedirect(current, googleProvider())
    return
  }
  await signInWithRedirect(auth, googleProvider())
}

let redirectResult = null

/** Reads the Google sign-in that just returned to this page. One call per visit. */
export function consumeGoogleRedirect() {
  if (!firebaseReady || !auth) return Promise.resolve('')
  if (!redirectResult) {
    redirectResult = getRedirectResult(auth).then(() => '').catch(async (error) => {
      const credential = credentialFrom(error)
      if (credential) {
        try {
          await signInWithCredential(auth, credential)
          return ''
        } catch (signInError) {
          console.warn('Google sign-in failed after the account was already in use.', signInError)
          return googleSignInMessage(signInError)
        }
      }
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/redirect-cancelled-by-user') {
        return ''
      }
      console.warn('Google sign-in failed.', error)
      return googleSignInMessage(error)
    })
  }
  return redirectResult
}

/** Short message a child can read after Google sign-in fails. */
export function googleSignInMessage(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google window closed. You can try again.'
    case 'auth/popup-blocked':
      return 'The Google window did not open. Try again.'
    case 'auth/network-request-failed':
      return 'We could not reach Google. Check the internet and try again.'
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
    case 'auth/unavailable':
      return 'Google sign-in is not ready on this computer yet.'
    case 'auth/unauthorized-domain':
      return 'Open the game from localhost. This address cannot use Google.'
    case 'auth/web-storage-unsupported':
      return 'This browser is blocking Google. Try Chrome.'
    case 'auth/redirect-cancelled-by-user':
      return 'The Google page closed. You can try again.'
    default:
      return 'Google sign-in did not work. Try again.'
  }
}

/**
 * One anonymous Firebase user per browser. The uid is the document id for
 * progress and settings. If Firebase is not configured, or sign-in fails,
 * the session stays on this device (uid "guest").
 * `google` is true after the player signs in with Google.
 */
export function usePlayerSession() {
  const [session, setSession] = useState(() => (
    firebaseReady && auth
      ? { uid: 'guest', ready: false, remote: false, google: false }
      : { uid: 'guest', ready: true, remote: false, google: false }
  ))
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!firebaseReady || !auth) return undefined

    let active = true
    let ready = false
    const publish = (next) => {
      if (!active) return
      ready = true
      setSession(next)
    }

    consumeGoogleRedirect().then((message) => {
      if (active && message) setAuthError(message)
    })

    const timer = setTimeout(() => {
      if (ready) return
      console.warn('Firebase auth timed out. Player data stays on this device for this visit.')
      publish({ uid: 'guest', ready: true, remote: false, google: false })
    }, AUTH_TIMEOUT_MS)

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timer)
        publish(sessionFromUser(user))
        return
      }
      if (ready) {
        publish(sessionFromUser(null))
        return
      }
      ensureAnonymousUser().catch((error) => {
        console.warn('Anonymous sign-in failed. Player data stays on this device.', error)
        clearTimeout(timer)
        publish({ uid: 'guest', ready: true, remote: false, google: false })
      })
    })

    return () => {
      active = false
      clearTimeout(timer)
      unsub()
    }
  }, [])

  return { ...session, authError }
}
