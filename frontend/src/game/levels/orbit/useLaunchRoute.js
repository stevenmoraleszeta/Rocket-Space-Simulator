/**
 * Launch base and aim tab, shared by the three launch screens.
 * The tab is reported upward so the URL can restore it after a refresh.
 * A flight, an orbit, or a result returns to the aim tab: that screen still has the base.
 */
import { useEffect, useState } from 'react'
import { LAUNCH_SITES } from './launchSites.js'

const AIM_STEPS = new Set(['aim', 'flight', 'result', 'orbit', 'return'])

export function useLaunchRoute(launchPlace, onLaunchPlace) {
  const siteKnown = launchPlace?.siteId && LAUNCH_SITES.some((site) => site.id === launchPlace.siteId)
    ? launchPlace.siteId
    : null
  const [siteId, setSiteId] = useState(siteKnown)
  const [step, setStep] = useState(launchPlace?.step === 'aim' && siteKnown ? 'aim' : 'site')

  useEffect(() => {
    if (!onLaunchPlace) return
    onLaunchPlace({
      step: siteId && AIM_STEPS.has(step) ? 'aim' : 'site',
      siteId: siteId ?? null,
    })
  }, [step, siteId, onLaunchPlace])

  return { step, setStep, siteId, setSiteId }
}
