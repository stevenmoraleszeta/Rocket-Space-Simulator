/** English unless the shared link asks for Spanish. */
function askedForSpanish(query) {
  return new URLSearchParams(query).get('lang') === 'es'
}

export function readProjectLanguage() {
  if (typeof window === 'undefined') return 'en'
  if (askedForSpanish(window.location.search)) return 'es'
  const hashQuery = window.location.hash.split('?')[1] || ''
  return askedForSpanish(hashQuery) ? 'es' : 'en'
}

/**
 * True on /project or #/project, so judges can open this page without
 * entering the game. A trailing slash still counts.
 */
export function isProjectLocation() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/project') return true
  const hash = window.location.hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '')
  return hash === '/project'
}
