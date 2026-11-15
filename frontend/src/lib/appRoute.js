/**
 * The open screen lives in the URL hash, so a refresh keeps the same mission and tab.
 *
 *   #/                              mission menu
 *   #/earth/hangar?pack=food.2      hangar, with the parts already fitted
 *   #/earth/launch/site?site=kennedy&pack=food.2
 *   #/earth/launch/aim?site=kennedy&pack=food.2
 *
 * A flight in progress is stored as the aim tab: the launch animation cannot be rebuilt,
 * and aim is the screen that still has the chosen base and the rocket.
 */

const MISSION_IDS = new Set(['earth', 'moon', 'mars'])

export function menuRoute() {
  return { missionId: null, screen: 'menu', step: null, siteId: null, pack: null }
}

export function missionRoute(missionId) {
  return { missionId, screen: 'hangar', step: null, siteId: null, pack: null }
}

export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '')
  if (!raw || raw === '/') return menuRoute()
  const qIndex = raw.indexOf('?')
  const path = (qIndex >= 0 ? raw.slice(0, qIndex) : raw).replace(/^\/+|\/+$/g, '')
  const query = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : '')
  const [missionId, screen, step] = path.split('/')
  if (!MISSION_IDS.has(missionId)) return menuRoute()
  const pack = parsePack(query.get('pack'))
  if (screen === 'launch') {
    const siteId = sanitizeId(query.get('site'))
    return {
      missionId,
      screen: 'launch',
      step: step === 'aim' && siteId ? 'aim' : 'site',
      siteId,
      pack,
    }
  }
  return { missionId, screen: 'hangar', step: null, siteId: null, pack }
}

export function buildHash(route) {
  if (!route?.missionId || route.screen === 'menu') return '#/'
  const screen = route.screen === 'launch' ? 'launch' : 'hangar'
  let path = `#/${route.missionId}/${screen}`
  if (screen === 'launch') path += `/${route.step === 'aim' ? 'aim' : 'site'}`
  const params = new URLSearchParams()
  if (screen === 'launch' && route.siteId) params.set('site', route.siteId)
  const pack = packQuery(route.pack)
  if (pack) params.set('pack', pack)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/** Counts above zero, keyed by part id. Empty loadouts become null. */
export function packFromLoadout(loadout) {
  if (!loadout) return null
  const pack = {}
  for (const [id, count] of Object.entries(loadout)) {
    if (!/^[a-z]{1,24}$/.test(id)) continue
    const n = Number(count)
    if (!Number.isInteger(n) || n < 1 || n > 99) continue
    pack[id] = n
  }
  return Object.keys(pack).length ? pack : null
}

export function routesEqual(a, b) {
  if (!a || !b) return false
  return a.missionId === b.missionId
    && a.screen === b.screen
    && a.step === b.step
    && (a.siteId ?? null) === (b.siteId ?? null)
    && packQuery(a.pack) === packQuery(b.pack)
}

export function readAppRoute() {
  if (typeof window === 'undefined') return menuRoute()
  return parseHash(window.location.hash)
}

/** Push or replace the hash. No history event is fired; the caller updates its own state. */
export function writeAppRoute(route, mode = 'push') {
  if (typeof window === 'undefined') return
  const next = buildHash(route)
  const current = window.location.hash || '#/'
  if (current === next) return
  const url = `${window.location.pathname}${window.location.search}${next}`
  if (mode === 'replace') window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
}

function sanitizeId(value) {
  return value && /^[a-z0-9-]{1,40}$/.test(value) ? value : null
}

function parsePack(value) {
  if (!value) return null
  const pack = {}
  for (const piece of value.split(',')) {
    const match = /^([a-z]{1,24})\.(\d{1,2})$/.exec(piece)
    if (!match) continue
    const n = Number(match[2])
    if (n < 1 || n > 99) continue
    pack[match[1]] = n
  }
  return Object.keys(pack).length ? pack : null
}

function packQuery(pack) {
  if (!pack) return ''
  return Object.keys(pack).sort().map((id) => `${id}.${pack[id]}`).join(',')
}
