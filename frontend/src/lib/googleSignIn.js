/**
 * Google's own sign-in button. It asks for the account on this page, so a
 * passkey or password can finish. A Firebase popup cannot.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

let scriptPromise = null
let initialized = false
const listeners = new Set()

export function googleClientConfigured() {
  return Boolean(CLIENT_ID)
}

function emit(response) {
  for (const listener of [...listeners]) listener(response)
}

/** Fired when Google returns an ID token. The listener stays up if the panel closes. */
export function onGoogleCredential(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function loadGoogleSignIn() {
  if (!CLIENT_ID) {
    const error = new Error('Google sign-in is not ready.')
    error.code = 'auth/unavailable'
    return Promise.reject(error)
  }
  if (initialized && globalThis.google?.accounts?.id) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null
        const error = new Error('We could not reach Google.')
        error.code = 'auth/network-request-failed'
        reject(error)
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise.then(() => {
    if (initialized) return
    const google = globalThis.google
    if (!google?.accounts?.id) {
      const error = new Error('Google sign-in is not ready.')
      error.code = 'auth/unavailable'
      throw error
    }
    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => emit(response),
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      itp_support: true,
      use_fedcm_for_prompt: true,
    })
    initialized = true
  })
}

/** Draws Google's button into `element`. Call after `loadGoogleSignIn`. */
export function renderGoogleButton(element) {
  const google = globalThis.google
  if (!google?.accounts?.id || !element) return
  element.replaceChildren()
  const measured = Math.floor(element.getBoundingClientRect().width)
  const width = Math.max(200, Math.min(320, measured || 280))
  google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width,
  })
}
