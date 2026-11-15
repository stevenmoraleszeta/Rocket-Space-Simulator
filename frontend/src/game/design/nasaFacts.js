/**
 * NASA facts shown at the end of a flight.
 * The picture comes from the public Image and Video Library.
 * The Moon line uses JPL Horizons when the browser can reach it, and the game's
 * own Moon orbit when it cannot.
 */
import { getMoonPosition } from '../levels/moon/moonLaunchPlanning.js'

const IMAGE_API = 'https://images-api.nasa.gov/search'

export async function findNasaPhoto(query) {
  try {
    const response = await fetch(`${IMAGE_API}?q=${encodeURIComponent(query)}&media_type=image`)
    if (!response.ok) return null
    const data = await response.json()
    const item = data.collection?.items?.find((entry) => entry.links?.[0]?.href && entry.data?.[0])
    if (!item) return null
    return {
      title: item.data[0].title,
      href: item.links[0].href,
    }
  } catch {
    return null
  }
}

function formatKm(km) {
  return `${Math.round(km).toLocaleString('en-US')} km`
}

/** A number in the Horizons table that looks like the Moon's distance in kilometers. */
function horizonsRangeKm(text) {
  const match = text.match(/\b(3[5-9]\d{4}|4[0-4]\d{4})(?:\.\d+)?\b/)
  return match ? Number(match[1]) : null
}

export async function moonDistanceLine(date = new Date()) {
  const localKm = getMoonPosition(date).distanceKm
  const start = date.toISOString().slice(0, 10)
  const stopDate = new Date(date)
  stopDate.setUTCDate(stopDate.getUTCDate() + 1)
  const stop = stopDate.toISOString().slice(0, 10)
  try {
    const params = new URLSearchParams({
      format: 'json',
      COMMAND: "'301'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500@399'",
      START_TIME: `'${start}'`,
      STOP_TIME: `'${stop}'`,
      STEP_SIZE: "'1 d'",
      QUANTITIES: "'20'",
    })
    const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`)
    if (!response.ok) throw new Error('horizons')
    const data = await response.json()
    const found = horizonsRangeKm(String(data.result ?? ''))
    if (found) return `NASA Horizons says the Moon is about ${formatKm(found)} away today.`
  } catch {
    /* The flight still explains the distance from the orbit the game already uses. */
  }
  return `Today the Moon is about ${formatKm(localKm)} away. That number comes from the real Moon orbit.`
}

/** Distance for the mission report. The screen translates the sentence. */
export async function moonDistanceFact(date = new Date()) {
  const localKm = getMoonPosition(date).distanceKm
  const start = date.toISOString().slice(0, 10)
  const stopDate = new Date(date)
  stopDate.setUTCDate(stopDate.getUTCDate() + 1)
  const stop = stopDate.toISOString().slice(0, 10)
  try {
    const params = new URLSearchParams({
      format: 'json',
      COMMAND: "'301'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500@399'",
      START_TIME: `'${start}'`,
      STOP_TIME: `'${stop}'`,
      STEP_SIZE: "'1 d'",
      QUANTITIES: "'20'",
    })
    const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`)
    if (!response.ok) throw new Error('horizons')
    const data = await response.json()
    const found = horizonsRangeKm(String(data.result ?? ''))
    if (found) return { km: found, fromNasa: true }
  } catch {
    /* The flight still explains the distance from the orbit the game already uses. */
  }
  return { km: localKm, fromNasa: false }
}
