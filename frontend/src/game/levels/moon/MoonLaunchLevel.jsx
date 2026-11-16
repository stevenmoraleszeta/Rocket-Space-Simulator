/**
 * MISSION 2 — from the hangar to lunar orbit.
 *
 * Steps:
 *   site     the big polar map of Earth (the same map as mission 1): every base sits on its
 *            real latitude and longitude. Pick one and press Accept.
 *   aim      Earth and Moon in space, lit by the real Sun. Tap a day in the Moon strip (each
 *            day shows the Moon as it will look when the ship arrives) and pick the hour:
 *            Earth turns (so the base moves) and the Moon moves on its real orbit.
 *            The cameras need sunlight on the side facing Earth: a bright Moon gives better maps.
 *            Hold and drag like mission 1: the dotted line is the simulated path.
 *            It has to miss satellites and space junk, or the ship (and they) get hurt.
 *   liftoff  the pad and the climb (LaunchSequence), which can fail with a bad rocket
 *   flight   the path plays in a few seconds, on an even clock shown at the top; crashes explode
 *   orbit    a good arrival brakes into lunar orbit; the landing mini-game, then three events
 *   return   one engine burn sends the ship home; the path is flown with real Earth and Moon
 *            gravity (moonTransfer.simulateReturn) and is shown while aiming as "WAY HOME"
 *   result   "You did it!" or "You lose" (the screens from mission 1)
 *
 * Physics in moonTransfer.js, drawing in moonScene.js, events in moonOrbitEvents.js.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '../../../levels'
import { AMBIENCE, MUSIC, SFX, SYNTH, playSfx, playSynth, useSoundtrack } from '../../../audio'
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { formatDate, formatDecimal, formatNumber, t } from '../../../i18n/index.js'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { useUiScale } from '../../../lib/uiScale.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { flightNotes } from '../../flightSummary.js'
import { planScore } from '../../design/missionPlan.js'
import { flightSupplyFailure, launchFailure } from '../../launchFailure.js'
import { partCount } from '../../parts.js'
import { goldRocketImage, isUpgraded } from '../../rendering/upgradedRocket.js'
import { LAUNCH_SITES } from '../orbit/launchSites.js'
import { REAL_SATELLITES } from '../orbit/realSatellites.js'
import { createView as createEarthView, drawOrbitScene, siteScreenPosition } from '../orbit/orbitRenderer.js'
import { SitePin } from '../orbit/SitePin.jsx'
import { TutorialButton, TutorialGuide } from '../../tutorial/TutorialGuide.jsx'
import { useTutorial } from '../../tutorial/tutorialStore.js'
import { PixelIcon } from '../../PixelIcon.jsx'
import { SunRating } from './SunRating.jsx'
import { useLaunchRoute } from '../orbit/useLaunchRoute.js'
import { MissionCompleteScreen } from '../orbit/MissionCompleteScreen.jsx'
import { MissionFailedScreen } from '../orbit/MissionFailedScreen.jsx'
import { MoonLandingStory } from './MoonLandingStory.jsx'
import { MOON_SYNODIC_MONTH_DAYS } from './moonLaunchPlanning.js'
import {
  CAPTURE_KM,
  CAPTURE_KM_WITH_FUEL,
  EARTH_RADIUS_KM,
  DEFAULT_AIM,
  MOON_TRAFFIC,
  TRANSFER_OUTCOMES,
  arrivalAccuracy,
  createMoonTable,
  earthTurnAngle,
  findGoodAim,
  findTrafficHits,
  STAY_SECONDS,
  TYPICAL_TRIP_SECONDS,
  arrivalSense,
  constellationAt,
  getMoonLook,
  lightRating,
  mapLightFactor,
  moonAt,
  sampleIndexAt,
  simulateReturn,
  simulateTransfer,
  trafficAngle,
  siteSpaceAngle,
} from './moonTransfer.js'
import { aimFromPointer, angleBetween, createMoonView, drawMoonScene, trafficAtPoint } from './moonScene.js'
import { MoonDisk, MoonPhaseCard } from './MoonPhaseCard.jsx'
import { MoonEventCard } from './MoonEventCard.jsx'
import { MoonTips } from './MoonTips.jsx'
import { MoonLanding, landingCopy } from './MoonLanding.jsx'
import { tipsTurnedOff } from './moonTipsStorage.js'
import { FunFactToast } from '../../FunFactToast.jsx'
import { choiceBlockedReason, pickOrbitEvents, resolveOrbitEvent } from './moonOrbitEvents.js'
import handPointerUrl from '../../../assets/images/icons/hand_pointer.svg'
import parachuteUrl from '../../../assets/images/items/parachute.svg'
import '../../game.css'
import '../orbit/orbitalLaunch.css'
import './moonMission.css'
import './moonLaunchLevel.css'

/** Screen seconds for each real day of travel, and the limits. */
const PLAY_SECONDS_PER_DAY = 2.2
const playSecondsFor = (seconds, low, high) => Math.min(high, Math.max(low, (seconds / 86400) * PLAY_SECONDS_PER_DAY))
/** Screen seconds for the day spent at the Moon (the landing and the events take longer). */
const ORBIT_PLAY_SECONDS = 30
/** Seconds to watch the splashdown before the result. */
const SPLASH_WATCH_MS = 1600
/** How long things glide to their new place when the day or hour changes. */
const GLIDE_MS = 700
/** Seconds to do a hands-on event action. */
const ACTION_SECONDS = 10
/** Wait after the aim stops changing before the way home is worked out. */
const HOME_PLAN_DELAY_MS = 250

const formatKm = (km) => `${formatNumber(Math.round(km))} km`
const DATE_OPTIONS = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }
const CLOCK_OPTIONS = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
const DEG_PER_DAY_MOON = 360 / 27.321661
const DEG_PER_DAY_SUN = 360 / 365.2422

/** Noon (local time) of the day that holds `ms`. */
function noonOf(ms) {
  const day = new Date(ms)
  day.setHours(12, 0, 0, 0)
  return day
}

/** Fractional sample index at a flight time, for smooth movement on an even clock. */
function fractionalIndex(samples, seconds, endIndex) {
  const index = Math.min(endIndex, sampleIndexAt(samples, seconds))
  if (index >= endIndex) return endIndex
  const a = samples[index].t
  const b = samples[index + 1].t
  return index + Math.min(1, Math.max(0, (seconds - a) / (b - a || 1)))
}

/**
 * Flight clock for the trip out: starts a bit faster than even and ends about 3 times slower,
 * so the arrival at the Moon is easy to follow. 0 → 0 and 1 → 1, always moving forward.
 */
function arrivalEase(progress) {
  return 1.3 * progress + 0.1 * progress ** 2 - 0.4 * progress ** 3
}

/** How fast arrivalEase moves at this point (1 = even speed). */
function arrivalEaseRate(progress) {
  return 1.3 + 0.2 * progress - 1.2 * progress ** 2
}

/** "38K" style numbers for the time speed-up. */
function shortNumber(value) {
  if (value >= 1_000_000) return `${formatDecimal(value / 1_000_000, 1)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return `${Math.round(value)}`
}
/** Real seconds to watch a crash before the "You lose" screen. */
const CRASH_WATCH_MS = 1500
const HOUR_MS = 3_600_000
/** One Moon cycle: day 0 to day 29, then the phases repeat. */
const MAX_DAY = Math.floor(MOON_SYNODIC_MONTH_DAYS)
const CYCLE_HOURS = MAX_DAY * 24 + 23
const DEG = Math.PI / 180

const OUTCOME_TEXT = {
  [TRANSFER_OUTCOMES.ARRIVED]: { tone: 'good', icon: 'check', text: 'The dots reach the Moon. Ready to launch!' },
  [TRANSFER_OUTCOMES.MOON_IMPACT]: { tone: 'bad', icon: 'boom', text: 'Too close: the ship would crash into the Moon. Aim a little to the side.' },
  [TRANSFER_OUTCOMES.EARTH_IMPACT]: { tone: 'bad', icon: 'boom', text: 'The dots fall back into Earth. Drag the other way.' },
  [TRANSFER_OUTCOMES.SHORT]: { tone: 'warn', icon: 'arrowUp', text: 'Not enough power. Drag farther from the base.' },
  [TRANSFER_OUTCOMES.PAST]: { tone: 'warn', icon: 'moon-crescent', text: 'The dots miss the Moon. Change the hour, or drag in another direction.' },
  [TRANSFER_OUTCOMES.TOO_EARLY]: { tone: 'warn', icon: 'fastForward', text: 'Too fast: the ship gets there before day 3, and the Moon is not at the yellow ring yet. Drag closer to the base for less power.' },
  [TRANSFER_OUTCOMES.LOOP]: { tone: 'warn', icon: 'spiral', text: 'The dots swing around Earth. Drag straight out from the base, toward the yellow ring.' },
  [TRANSFER_OUTCOMES.TOO_LATE]: { tone: 'warn', icon: 'rewind', text: 'Too slow: the ship gets there after day 3, and the Moon has already moved on. Drag farther from the base for more power.' },
}

const FAIL_TEXT = {
  [TRANSFER_OUTCOMES.MOON_IMPACT]: {
    reason: 'The ship flew straight into the Moon and crashed.',
    hint: 'Aim so the path passes just beside the Moon, inside the yellow ring.',
  },
  [TRANSFER_OUTCOMES.EARTH_IMPACT]: {
    reason: 'The ship turned back down and fell into Earth.',
    hint: 'Drag along Earth’s spin, not toward the ground.',
  },
  [TRANSFER_OUTCOMES.SHORT]: {
    reason: 'The ship did not have enough speed. It fell back toward Earth before it reached the Moon.',
    hint: 'Drag farther from the base for more power.',
  },
  [TRANSFER_OUTCOMES.PAST]: {
    reason: 'The ship missed the Moon and kept flying into deep space.',
    hint: 'The Moon moves every hour. Change the hour, or turn the aim, until the path meets the yellow ring.',
  },
  [TRANSFER_OUTCOMES.TOO_EARLY]: {
    reason: 'The ship got there too soon. The trip is planned for 3 days, and the ship has to meet the Moon at the yellow ring on day 3, not before.',
    hint: 'Drag a little closer to the base for less power, until the dots meet the Moon on day 3.',
  },
  [TRANSFER_OUTCOMES.TOO_LATE]: {
    reason: 'The ship got there too late. The trip is planned for 3 days, and by then the Moon had already moved on.',
    hint: 'Drag a little farther from the base for more power, until the dots meet the Moon on day 3.',
  },
  [TRANSFER_OUTCOMES.LOOP]: {
    reason: 'The ship swung around Earth instead of heading out to the Moon.',
    hint: 'Drag straight out from the base, toward the yellow ring where the Moon will be on day 3.',
  },
  noLander: {
    reason: 'The ship reached the Moon, but nothing could slow it down. The Moon has almost no air, so it flew right past.',
    hint: 'Go back to the hangar and pack the lunar lander.',
  },
}

/** Not enough food: the rocket comes back down during the climb, before it leaves the air. */
const FOOD_TURN_BACK = {
  sign: 'Mission control: there is not enough food for the trip! Come back down.',
  reason: 'There was not enough food for the trip to the Moon and back. Mission control saw it during the climb and called the rocket back. It came down and landed safely, before it ever left the air.',
}

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

/** Damage the hits did, all together. A heat shield blocks half of what junk does. */
function damageFrom(hits, equipped) {
  const shielded = partCount(equipped, 'shield') > 0
  const total = { scienceFactor: 1, dataLoss: 0, scoreLoss: 0, broken: [] }
  for (const hit of hits) {
    const effect = hit.object.effect ?? {}
    total.scienceFactor *= effect.scienceFactor ?? 1
    const dataLoss = effect.dataLoss ?? 0
    total.dataLoss += hit.object.kind === 'debris' && shielded ? Math.round(dataLoss / 2) : dataLoss
    total.scoreLoss += effect.scoreLoss ?? 0
    if (effect.breaks && partCount(equipped, effect.breaks) > 0) total.broken.push(effect.breaks)
  }
  return total
}

/** One sound for each lunar orbit event when it starts. */
const EVENT_SOUNDS = {
  shadow: SYNTH.static,
  storm: SYNTH.alarm,
  ice: SYNTH.bright,
  air: SYNTH.bubbles,
  rock: SYNTH.zoom,
  misfire: SYNTH.cough,
}

/** Mission 2: pick a base, a day, and a path to the Moon. */
export function MoonLaunchLevel({ mission, equipped, design, launchPlace, onLaunchPlace, onBackToHangar, onExit, onNextMission }) {
  const { completeMission } = useProgress()
  const playerName = engineerName(useSettings().playerName)
  const uiScale = useUiScale()

  const { step, setStep, siteId, setSiteId } = useLaunchRoute(launchPlace, onLaunchPlace)
  // Tips for the current step: open on the first visit of each step unless turned off.
  const [tipsOpen, setTipsOpen] = useState(() => !tipsTurnedOff())
  const [tipsSeen, setTipsSeen] = useState(() => new Set([step]))
  const [helpMessage, setHelpMessage] = useState('')
  const [hasDragged, setHasDragged] = useState(false)
  // Optional Tutorial: only shows what is new here (the launch day, the hour, the junk in the way).
  // It never picks for the player. A flight launched with it on is practice and is not saved.
  const [tutorialOn, setTutorialOn] = useTutorial()
  const [tutorialUsed, setTutorialUsed] = useState({ day: false, hour: false })
  const practiceRef = useRef(false)
  const [leavingMap, setLeavingMap] = useState(false)
  // Calm music for the tips, the flight music everywhere else.
  useSoundtrack(
    tipsOpen
      ? { music: MUSIC.menu, ambient: AMBIENCE.space }
      : step === 'flight' || step === 'orbit' || step === 'return' || step === 'result'
        ? { music: MUSIC.flight, ambient: AMBIENCE.space }
        : { music: MUSIC.flight },
  )
  function openTipsFor(nextStep) {
    if (tipsSeen.has(nextStep) || tipsTurnedOff()) return
    setTipsSeen((seen) => new Set(seen).add(nextStep))
    setTipsOpen(true)
  }
  const [cycleHours, setCycleHours] = useState(0)
  const [aim, setAim] = useState(DEFAULT_AIM)
  const [liftingOff, setLiftingOff] = useState(false)
  const [telemetry, setTelemetry] = useState(null)
  const [seenHits, setSeenHits] = useState(0)
  const [result, setResult] = useState(null)
  // Mission won: the Apollo 11 story plays after the Congratulations screen
  const [moonStory, setMoonStory] = useState(false)
  const [crashWatched, setCrashWatched] = useState(null)
  const [events, setEvents] = useState([])
  const [eventIndex, setEventIndex] = useState(0)
  const [activeEvent, setActiveEvent] = useState(null)
  const [eventLog, setEventLog] = useState([])
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600, pixelRatio: 1 })
  const [hoverId, setHoverId] = useState(null)
  const [homePlan, setHomePlan] = useState(null) // { key, plan }
  const [landing, setLanding] = useState(null) // landing result, once the lander is down

  const site = LAUNCH_SITES.find((candidate) => candidate.id === siteId) ?? null
  const [openedAt] = useState(() => new Date())
  // The calendar starts at the next whole hour after the level opens.
  const anchorMs = Math.ceil(openedAt.getTime() / HOUR_MS) * HOUR_MS
  const date = useMemo(() => new Date(anchorMs + cycleHours * HOUR_MS), [anchorMs, cycleHours])
  const dateLabel = formatDate(date, { dateStyle: 'medium', timeStyle: 'short' })
  const look = useMemo(() => getMoonLook(date), [date])
  const hourOfDay = cycleHours % 24
  // Each day of the Moon cycle, as the Moon will look (at noon) on the day the ship gets there.
  const dayLooks = useMemo(
    () => Array.from({ length: MAX_DAY + 1 }, (_, day) => getMoonLook(noonOf(anchorMs + day * 24 * HOUR_MS + TYPICAL_TRIP_SECONDS * 1000))),
    [anchorMs],
  )
  const earthTurn = earthTurnAngle(date)
  const siteAngle = site ? siteSpaceAngle(site, date) : 0
  const moonTable = useMemo(() => createMoonTable(date), [date])
  const captureKm = partCount(equipped, 'fuel') > 0 ? CAPTURE_KM_WITH_FUEL : CAPTURE_KM
  const hasLander = partCount(equipped, 'lander') > 0

  const prediction = useMemo(() => {
    if (!site) return null
    return simulateTransfer({ siteAngle, aim, moonTable, captureKm })
  }, [site, siteAngle, aim, moonTable, captureKm])
  const hits = useMemo(() => (prediction ? findTrafficHits(prediction.samples, date) : []), [prediction, date])
  const hitIds = useMemo(() => new Set(hits.map((hit) => hit.object.id)), [hits])
  const damage = useMemo(() => damageFrom(hits, equipped), [hits, equipped])
  // The Moon on the day the ship arrives (phases change by the day, so noon of that day):
  // its light decides how good the maps are.
  const arrivalSeconds = prediction?.outcome.type === TRANSFER_OUTCOMES.ARRIVED ? prediction.outcome.t : TYPICAL_TRIP_SECONDS
  const arrivalNoonMs = noonOf(date.getTime() + arrivalSeconds * 1000).getTime()
  const arrivalDate = useMemo(() => new Date(arrivalNoonMs), [arrivalNoonMs])
  const arrivalLook = useMemo(() => getMoonLook(arrivalDate), [arrivalDate])
  const arrivalRating = lightRating(arrivalLook.illumination)
  // Angles that keep growing day after day, so the little diagram always turns forward.
  const daysFromAnchor = (arrivalNoonMs - anchorMs) / 86_400_000
  const moonTurnDeg = DEG_PER_DAY_MOON * daysFromAnchor
    + (angleBetween((DEG_PER_DAY_MOON * daysFromAnchor * Math.PI) / 180, arrivalLook.moonLongitude) * 180) / Math.PI
  const sunTurnDeg = DEG_PER_DAY_SUN * daysFromAnchor
    + (angleBetween((DEG_PER_DAY_SUN * daysFromAnchor * Math.PI) / 180, arrivalLook.sunLongitude) * 180) / Math.PI
  const moonPlace = t('{{km}} km away · in front of {{stars}}', {
    km: formatNumber(Math.round(arrivalLook.distanceKm)),
    stars: t(constellationAt(arrivalLook.moonLongitude)),
  })

  // The way home, worked out with real gravity once the aim stops changing.
  const arrived = prediction?.outcome.type === TRANSFER_OUTCOMES.ARRIVED
  const homeKey = arrived ? `${date.getTime()}|${Math.round(prediction.outcome.t)}|${captureKm}` : ''
  const returnPrediction = homePlan && homePlan.key === homeKey ? homePlan.plan : null
  useEffect(() => {
    if (!arrived || homePlan?.key === homeKey) return undefined
    const timer = setTimeout(() => {
      const plan = simulateReturn({
        moonTable,
        arrivalT: prediction.outcome.t,
        sense: arrivalSense(prediction.samples, moonTable),
        arrival: prediction.samples[prediction.samples.length - 1],
      })
      setHomePlan({ key: homeKey, plan })
    }, HOME_PLAN_DELAY_MS)
    return () => clearTimeout(timer)
  }, [arrived, homeKey, homePlan, moonTable, prediction])
  const hovered = MOON_TRAFFIC.find((object) => object.id === hoverId) ?? null

  const failure = useMemo(() => launchFailure(equipped, mission), [equipped, mission])
  const supplyFailure = useMemo(() => flightSupplyFailure(equipped, mission), [equipped, mission])
  // Short on food: mission control sees it during the climb and calls the rocket back down,
  // before it leaves the air. The trip to the Moon never starts.
  const foodShort = supplyFailure?.id === 'noFood' || supplyFailure?.id === 'outOfFood'
  const liftoffFailure = useMemo(
    () => failure ?? (foodShort ? { ...supplyFailure, at: 'turnBack', message: FOOD_TURN_BACK.sign } : null),
    [failure, foodShort, supplyFailure],
  )

  const view = useMemo(
    () => createMoonView(canvasSize.width / uiScale, canvasSize.height / uiScale),
    [canvasSize, uiScale],
  )
  // Picking the base: mission 1's Earth map, like the Mars mission (orbitRenderer.js).
  const earthView = useMemo(
    () => createEarthView(canvasSize.width / uiScale, canvasSize.height / uiScale),
    [canvasSize, uiScale],
  )

  // ---------------------------------------------------------------- canvas
  const canvasRef = useRef(null)
  const flightRef = useRef(null) // { startedAt, endedAt, endIndex, arrivedAt, returnStartedAt, returnedAt }
  const introRef = useRef(null) // when the Earth–Moon map opened (performance.now)
  const draggingRef = useRef(false)
  const [images] = useState(() => ({
    earth: loadImage(ASSETS.earthPlanet.src),
    moon: loadImage(ASSETS.moonPlanet.src),
    rocket: goldRocketImage(ASSETS.rocketLit.src, isUpgraded(equipped)),
    explosion: loadImage(ASSETS.explosion.src),
    goldSatellite: loadImage(ASSETS.goldSatellite.src),
    commsSatellite: loadImage(ASSETS.commsSatellite.src),
    spaceTelescope: loadImage(ASSETS.spaceTelescope.src),
    hand: loadImage(handPointerUrl),
    parachute: loadImage(parachuteUrl),
  }))

  const finishFlightRef = useRef(null)
  const finishHomeRef = useRef(null)
  const sceneRef = useRef(null)
  useLayoutEffect(() => {
    sceneRef.current = {
      step, view, earthView, images, uiScale, canvasSize,
      launchDate: date, earthTurn, sunLongitude: look.sunLongitude, siteAngle, aim, moonTable,
      prediction, hits, hitIds, traffic: MOON_TRAFFIC, captureKm, hoverId, returnPrediction,
      arrivalSense: prediction && arrived ? arrivalSense(prediction.samples, moonTable) : 1,
      showHandHint: step === 'aim' && !hasDragged && !tipsOpen,
    }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      setCanvasSize({ width, height, pixelRatio })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frameId = 0
    let lastTelemetryAt = 0
    // Smooth moves when the day or hour changes: angles glide from where they were drawn.
    const glide = { key: null, from: null, last: null, startedAt: 0 }
    const draw = (now) => {
      const canvas = canvasRef.current
      const current = sceneRef.current
      if (canvas && current && current.step === 'site') {
        // Same Earth as mission 1 and Mars: the planet, the satellites as dots, the bases on top (HTML).
        const ctx = canvas.getContext('2d')
        const ratio = current.canvasSize.pixelRatio * current.uiScale
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
        drawOrbitScene(ctx, current.earthView, {
          step: 'site',
          orbits: [],
          selectedOrbitId: null,
          arrival: null,
          satellites: REAL_SATELLITES,
          prediction: null,
          aimPoint: null,
          flight: null,
          images: current.images,
          clockSeconds: now / 1000,
        })
      } else if (canvas && current) {
        const ctx = canvas.getContext('2d')
        const ratio = current.canvasSize.pixelRatio * current.uiScale
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

        // ---- glide to the new day or hour
        const moonStart = moonAt(current.moonTable, 0)
        const target = {
          earth: current.earthTurn,
          site: current.siteAngle,
          sun: current.sunLongitude,
          moon: Math.atan2(moonStart.y, moonStart.x),
          traffic: Object.fromEntries(current.traffic.map((object) => [object.id, trafficAngle(object, current.launchDate, 0)])),
        }
        const key = `${current.launchDate.getTime()}|${current.siteAngle.toFixed(4)}`
        if (glide.key !== key) {
          glide.from = glide.last && current.step === 'aim' ? glide.last : null
          glide.key = key
          glide.startedAt = now
        }
        let shift = null
        if (glide.from) {
          const raw = Math.min(1, (now - glide.startedAt) / GLIDE_MS)
          const k = raw * raw * (3 - 2 * raw)
          const left = (name) => angleBetween(target[name], glide.from[name]) * (1 - k)
          shift = {
            earth: left('earth'),
            site: left('site'),
            sun: left('sun'),
            moon: left('moon'),
            traffic: Object.fromEntries(Object.keys(target.traffic).map((id) => [id, angleBetween(target.traffic[id], glide.from.traffic[id] ?? target.traffic[id]) * (1 - k)])),
            fade: 1 - k,
          }
          if (raw >= 1) glide.from = null
        }
        glide.last = shift
          ? {
              earth: target.earth + shift.earth,
              site: target.site + shift.site,
              sun: target.sun + shift.sun,
              moon: target.moon + shift.moon,
              traffic: Object.fromEntries(Object.keys(target.traffic).map((id) => [id, target.traffic[id] + shift.traffic[id]])),
            }
          : target

        // ---- the flight, the stay at the Moon and the trip home, on one clock
        let flight = null
        const clock = flightRef.current
        const samples = current.prediction?.samples
        if (clock && samples) {
          const endIndex = clock.endIndex
          const endT = samples[endIndex].t
          // The ship and the Moon move on the same clock, so they meet. The clock slows down near
          // the end of the trip, so the player can see the ship come up to the Moon and swing round it.
          const progress = Math.min(1, Math.max(0, (now - clock.startedAt) / 1000 / clock.playSeconds))
          let seconds = arrivalEase(progress) * endT
          let position = fractionalIndex(samples, seconds, endIndex)
          let speedUp = (endT / clock.playSeconds) * arrivalEaseRate(progress)
          let phase = 'out'
          const index = Math.floor(position)
          // Each satellite or junk cloud the ship passes: a flash, a shake and a sound.
          const passed = current.hits.filter((hit) => hit.index <= index)
          if (passed.length > (clock.hitsPassed ?? 0)) {
            clock.hitsPassed = passed.length
            clock.lastHitAt = now
            playSynth(passed[passed.length - 1].object.kind === 'debris' ? SYNTH.crackle : SYNTH.clang)
          }
          if (progress >= 1 && !clock.endedAt) {
            clock.endedAt = now
            position = endIndex
            finishFlightRef.current?.()
          }
          // In lunar orbit, a day passes while the crew lands and maps.
          if (clock.arrivedAt) {
            phase = 'orbit'
            seconds = endT + STAY_SECONDS * Math.min(1, (now - clock.arrivedAt) / 1000 / ORBIT_PLAY_SECONDS)
            speedUp = STAY_SECONDS / ORBIT_PLAY_SECONDS
          }
          // The trip home.
          let returnPosition = 0
          let secondsSinceSplash = 0
          const home = current.returnPrediction?.samples
          if (clock.returnStartedAt && home) {
            phase = 'home'
            const homeEnd = home.length - 1
            const homeSpan = home[homeEnd].t - home[0].t
            const homeProgress = Math.min(1, Math.max(0, (now - clock.returnStartedAt) / 1000 / clock.returnPlaySeconds))
            seconds = home[0].t + homeProgress * homeSpan
            returnPosition = fractionalIndex(home, seconds, homeEnd)
            speedUp = homeSpan / clock.returnPlaySeconds
            if (homeProgress >= 1 && !clock.returnedAt) {
              clock.returnedAt = now
              playSynth(SYNTH.bubbles)
              setTimeout(() => finishHomeRef.current?.(), SPLASH_WATCH_MS)
            }
            secondsSinceSplash = clock.returnedAt ? (now - clock.returnedAt) / 1000 : 0
          }
          flight = {
            seconds,
            position,
            returnPosition,
            secondsSinceSplash,
            secondsSinceEnd: clock.endedAt ? (now - clock.endedAt) / 1000 : 0,
            orbiting: phase === 'orbit',
            home: phase === 'home',
            secondsSinceArrival: clock.arrivedAt ? (now - clock.arrivedAt) / 1000 : 99,
            hitFlash: clock.lastHitAt ? (now - clock.lastHitAt) / 1000 : 99,
          }
          if (now - lastTelemetryAt > 120 && !(phase === 'out' && clock.endedAt && !clock.arrivedAt)) {
            lastTelemetryAt = now
            const point = phase === 'home'
              ? home[Math.min(home.length - 1, Math.floor(returnPosition))]
              : samples[Math.min(endIndex, Math.floor(position))]
            const moon = moonAt(current.moonTable, point.t)
            setTelemetry({
              phase,
              seconds,
              speedUp,
              progress: phase === 'home' ? returnPosition / Math.max(1, home.length - 1) : progress,
              day: seconds / 86400,
              earthKm: Math.hypot(point.x, point.y) - EARTH_RADIUS_KM,
              moonKm: Math.hypot(point.x - moon.x, point.y - moon.y),
            })
            if (phase === 'out') setSeenHits(passed.length)
          }
        }
        const introSeconds = introRef.current ? (now - introRef.current) / 1000 : 99
        drawMoonScene(ctx, current.view, { ...current, glide: shift, flight, introSeconds, clockSeconds: now / 1000 })
      }
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // ---------------------------------------------------------------- input
  const pointerPosition = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    return { x: (event.clientX - box.left) / uiScale, y: (event.clientY - box.top) / uiScale }
  }
  const aimAt = (point) => {
    const next = aimFromPointer(view, siteAngle, point)
    if (next) setAim(next)
  }
  const objectAt = (point) => trafficAtPoint(view, MOON_TRAFFIC, date, point)
  const handlePointerDown = (event) => {
    if (step !== 'aim' || !site) return
    // On a touch screen, tapping a satellite or junk cloud tells what it is.
    if (event.pointerType !== 'mouse') {
      const object = objectAt(pointerPosition(event))
      if (object) {
        setHoverId(object.id)
        return
      }
    }
    setHoverId(null)
    draggingRef.current = true
    setHasDragged(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    aimAt(pointerPosition(event))
  }
  const handlePointerMove = (event) => {
    if (step !== 'aim') return
    if (draggingRef.current) {
      aimAt(pointerPosition(event))
      return
    }
    if (event.pointerType === 'mouse') {
      const id = objectAt(pointerPosition(event))?.id ?? null
      if (id !== hoverId) setHoverId(id)
    }
  }
  const handlePointerUp = () => {
    draggingRef.current = false
  }


  // ---------------------------------------------------------------- results
  const recordResult = useCallback((pct, success) => {
    if (practiceRef.current) return null
    try {
      return completeMission(mission.id, {
        pct,
        success,
        flight: flightNotes(equipped, { site: site ? `${site.name}, ${site.country}` : '', window: dateLabel }),
      })
    } catch {
      /* mission locked or unknown: show the result anyway */
      return null
    }
  }, [completeMission, mission.id, equipped, site, dateLabel])

  const fail = useCallback((type, reason, hint, extra = {}) => {
    recordResult(0, false)
    playSfx(extra.exploded ? SFX.explosion : SFX.lose)
    setResult({ outcome: { type }, success: false, pct: 0, stars: 0, reason, hint, ...extra, practice: practiceRef.current })
    setStep('result')
  }, [recordResult])

  const failLaunch = useCallback(() => {
    setLiftingOff(false)
    if (failure) fail(failure.id, failure.message, failure.hint)
    else fail(supplyFailure.id, FOOD_TURN_BACK.reason, supplyFailure.hint)
  }, [fail, failure, supplyFailure])

  /**
   * One burn home from the Moon, after the stay (seconds) there: the normal day in lunar
   * orbit, or 0 when the crew turns straight back (no food).
   */
  function flyHome(stay) {
    // The way home: worked out while aiming (after a full stay), or now.
    let plan = stay === STAY_SECONDS ? returnPrediction : null
    if (!plan) {
      plan = simulateReturn({
        moonTable,
        arrivalT: prediction.outcome.t,
        sense: arrivalSense(prediction.samples, moonTable),
        stay,
        arrival: prediction.samples[prediction.samples.length - 1],
      })
      setHomePlan({ key: homeKey, plan })
    }
    if (!plan) {
      finishHomeRef.current?.()
      return
    }
    playSynth(SYNTH.whoosh)
    const homeSamples = plan.samples
    flightRef.current.returnStartedAt = performance.now()
    flightRef.current.returnPlaySeconds = playSecondsFor(homeSamples[homeSamples.length - 1].t - homeSamples[0].t, 6, 11)
    setStep('return')
  }

  const finishFlight = () => {
    const outcome = prediction.outcome
    const arrivedAt = outcome.t
    if (supplyFailure && !foodShort && supplyFailure.atSeconds <= arrivedAt) {
      fail(supplyFailure.id, supplyFailure.message, supplyFailure.hint)
      return
    }
    if (outcome.type === TRANSFER_OUTCOMES.ARRIVED && hasLander) {
      flightRef.current.arrived = true
      flightRef.current.arrivedAt = performance.now()
      playSynth(SYNTH.arrive)
      setLanding(null)
      setEvents(pickOrbitEvents())
      setEventIndex(0)
      setEventLog([])
      setActiveEvent(null)
      setStep('orbit')
      openTipsFor('orbit')
      return
    }
    const key = outcome.type === TRANSFER_OUTCOMES.ARRIVED ? 'noLander' : outcome.type
    const crashed = outcome.type === TRANSFER_OUTCOMES.MOON_IMPACT || outcome.type === TRANSFER_OUTCOMES.EARTH_IMPACT
    fail(key, FAIL_TEXT[key].reason, FAIL_TEXT[key].hint, { exploded: crashed })
  }
  useLayoutEffect(() => {
    finishFlightRef.current = finishFlight
  })

  // A crash on the map is shown for a moment before the "You lose" screen.
  useEffect(() => {
    if (!result?.exploded) return undefined
    const timer = setTimeout(() => setCrashWatched(result), CRASH_WATCH_MS)
    return () => clearTimeout(timer)
  }, [result])
  const failScreenReady = Boolean(result && !result.success && (!result.exploded || crashWatched === result))

  // ---------------------------------------------------------------- lunar orbit events
  const eventImpact = useMemo(() => [...(landing ? [landing] : []), ...eventLog].reduce(
    (total, entry) => ({ scienceFactor: total.scienceFactor * entry.scienceFactor, dataLoss: total.dataLoss + entry.dataLoss }),
    { scienceFactor: 1, dataLoss: 0 },
  ), [eventLog, landing])

  useEffect(() => {
    if (step !== 'orbit' || !landing || activeEvent || tipsOpen) return undefined
    if (eventIndex >= events.length) return undefined
    const timer = setTimeout(() => {
      const event = events[eventIndex]
      playSynth(EVENT_SOUNDS[event.id] ?? SYNTH.warning)
      setActiveEvent({ event, deadline: Date.now() + event.seconds * 1000, total: event.seconds, secondsLeft: event.seconds, resolvedText: '', acting: null })
    }, 1400)
    return () => clearTimeout(timer)
  }, [step, landing, activeEvent, eventIndex, events, tipsOpen])

  const activeEventRef = useRef(null)
  useLayoutEffect(() => {
    activeEventRef.current = activeEvent
  }, [activeEvent])

  const chooseEvent = useCallback((choiceId, outcome = {}) => {
    const current = activeEventRef.current
    if (!current || current.resolvedText) return
    const effect = resolveOrbitEvent(current.event, choiceId, outcome)
    const resolved = { ...current, resolvedText: effect.note }
    activeEventRef.current = resolved
    setActiveEvent(resolved)
    setEventLog((log) => [...log, { id: current.event.id, name: current.event.name, ...effect }])
    if (effect.scienceFactor > 1) playSynth(SYNTH.sparkle)
    else playSfx(effect.scienceFactor < 1 || effect.dataLoss > 0 ? SFX.cancel : SFX.confirm)
  }, [])

  // Questions have no clock: the player takes all the time they need. Only a hands-on action
  // (tap fast, turn the dial) runs against the clock, and running out counts as a miss.
  useEffect(() => {
    if (!activeEvent || activeEvent.resolvedText || !activeEvent.acting) return undefined
    const timer = setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((activeEvent.deadline - Date.now()) / 1000))
      if (secondsLeft === 0) {
        chooseEvent(activeEvent.acting, { actionSuccess: false })
      } else if (secondsLeft !== activeEvent.secondsLeft) {
        setActiveEvent((current) => (current ? { ...current, secondsLeft } : current))
      }
    }, 200)
    return () => clearInterval(timer)
  }, [activeEvent, chooseEvent])

  // A hands-on choice: fresh time on the clock to do it.
  const actEvent = useCallback((choiceId) => {
    setActiveEvent((current) => (current
      ? { ...current, acting: choiceId, deadline: Date.now() + ACTION_SECONDS * 1000, total: ACTION_SECONDS, secondsLeft: ACTION_SECONDS }
      : current))
  }, [])

  const finishLanding = (outcome) => {
    playSfx(SFX.confirm)
    setLanding({ id: 'landing', name: outcome.title, note: outcome.note, scienceFactor: outcome.scienceFactor, dataLoss: outcome.dataLoss })
  }

  // All events done: fly home.
  const finishOrbit = () => {
    // Food, water or air that runs out during the stay at the Moon still ends the mission.
    if (supplyFailure && supplyFailure.atSeconds <= mission.loadout.durationSeconds) {
      fail(supplyFailure.id, supplyFailure.message, supplyFailure.hint)
      return
    }
    flyHome(STAY_SECONDS)
  }


  // Splashdown: score the maps.
  const finishHome = () => {
    const accuracy = arrivalAccuracy(prediction.outcome, captureKm)
    const light = mapLightFactor(arrivalLook.illumination)
    const scienceFactor = damage.scienceFactor * eventImpact.scienceFactor * light
    const dataLoss = Math.min(100, damage.dataLoss + eventImpact.dataLoss)
    const flown = Math.max(0, Math.min(100, Math.round(100 * accuracy * scienceFactor * (1 - dataLoss / 100) - damage.scoreLoss)))
    const passed = flown >= mission.passPct
    const pct = passed && design ? planScore(design) : flown
    const success = pct >= mission.passPct
    const progress = recordResult(pct, success)
    playSfx(success ? SFX.missionComplete : SFX.lose)
    const dark = arrivalRating.level === 1
    const tripDays = flightRef.current?.returnedAt && returnPrediction
      ? returnPrediction.samples[returnPrediction.samples.length - 1].t / 86400
      : null
    setResult({
      outcome: { type: success ? TRANSFER_OUTCOMES.ARRIVED : 'moonLowScience' },
      success,
      pct,
      stars: progress?.stars ?? 0,
      practice: practiceRef.current,
      tripDays,
      reason: success
        ? ''
        : dark
          ? t('The crew came home, but the maps scored {{pct}}%. The mission needs {{need}}%. The Moon was only {{lit}}% lit, so the cameras saw mostly shadow.', {
            pct,
            need: mission.passPct,
            lit: Math.round(arrivalLook.illumination * 100),
          })
          : t('The crew came home, but the maps scored {{pct}}%. The mission needs {{need}}%.', {
            pct,
            need: mission.passPct,
          }),
      hint: success
        ? ''
        : dark
          ? 'Pick a day with a bright Moon in the Moon strip, so the cameras have sunlight.'
          : 'Fly around satellites and junk, pass close to the Moon, and pack parts for the surprises.',
    })
    setStep('result')
  }
  useLayoutEffect(() => {
    finishHomeRef.current = finishHome
  })

  const continueEvent = () => {
    setActiveEvent(null)
    const next = eventIndex + 1
    setEventIndex(next)
    if (next >= events.length) finishOrbit()
  }

  // ---------------------------------------------------------------- steps
  const selectSite = (id) => {
    playSynth(SYNTH.pop)
    setSiteId(id)
  }
  const acceptSite = () => {
    if (!site || leavingMap) return
    playSfx(SFX.confirm)
    setAim(DEFAULT_AIM)
    setHelpMessage('')
    // The globe shrinks away into space, then the Earth–Moon map fades in.
    setLeavingMap(true)
    setTimeout(() => {
      setLeavingMap(false)
      setHoverId(null)
      introRef.current = performance.now()
      playSynth(SYNTH.zoom)
      setStep('aim')
      openTipsFor('aim')
    }, 450)
  }

  const helpAim = () => {
    const found = findGoodAim({ siteAngle, moonTable, captureKm, launchDate: date })
    if (!found) {
      playSfx(SFX.error)
      setHelpMessage('No path reaches the Moon at this hour. Try another hour or day.')
      return
    }
    playSynth(SYNTH.sparkle)
    setAim(found.aim)
    setHasDragged(true)
    setHelpMessage(found.hits ? 'This is the best path at this hour, but it still hits something. Try another hour.' : 'Here is a good path. You can still drag it.')
  }
  const launch = () => {
    practiceRef.current = tutorialOn
    playSfx(SFX.liftoff)
    flightRef.current = null
    setTelemetry(null)
    setSeenHits(0)
    setResult(null)
    setLiftingOff(true)
  }
  const startFlight = useCallback(() => {
    setLiftingOff(false)
    const samples = sceneRef.current.prediction?.samples ?? []
    const endIndex = Math.max(1, samples.length - 1)
    flightRef.current = {
      startedAt: performance.now(),
      endedAt: null,
      endIndex,
      playSeconds: playSecondsFor(samples[endIndex]?.t ?? 86400, 5, 12),
    }
    setStep('flight')
  }, [])
  const retry = () => {
    setMoonStory(false)
    flightRef.current = null
    setLanding(null)
    setResult(null)
    setCrashWatched(null)
    setActiveEvent(null)
    setEvents([])
    setStep('aim')
  }
  const goBack = () => {
    playSfx(SFX.cancel)
    setStep('site')
  }
  const launchDay = Math.floor(cycleHours / 24)
  const launchClock = formatDate(date, { hour: 'numeric', minute: '2-digit' })
  const shiftHours = (hours) => {
    setTutorialUsed((used) => (used.hour ? used : { ...used, hour: true }))
    playSynth(SYNTH.tick)
    setHelpMessage('')
    setCycleHours((value) => Math.min(CYCLE_HOURS, Math.max(0, value + hours)))
  }
  const pickDay = (day) => {
    if (day === launchDay) return
    setTutorialUsed((used) => (used.day ? used : { ...used, day: true }))
    playSynth(SYNTH.tick)
    setHelpMessage('')
    setCycleHours(Math.min(CYCLE_HOURS, Math.max(0, day * 24 + hourOfDay)))
  }
  const launchDayLabel = formatDate(date, DATE_OPTIONS)

  const hud = (
    <header className="game__hud orbit-level__hud">
      <div className="game__corner">
        <button type="button" className="game__back" onClick={onExit}>{t('Missions')}</button>
        {(step === 'site' || step === 'aim') && <TutorialButton on={tutorialOn} onToggle={setTutorialOn} />}
      </div>
      <div className="game__mission">
        <h1>{t(mission.title)}</h1>
      </div>
      <div className="game__place">{t(mission.place)}</div>
    </header>
  )

  const summary = prediction ? OUTCOME_TEXT[prediction.outcome.type] : null
  // Tutorial (aim only): slide the day strip, then tap the hour, then look at the junk check.
  let tutorial = null
  if (tutorialOn && step === 'aim' && site && !tipsOpen && !liftingOff) {
    if (!tutorialUsed.day) tutorial = { slide: { target: '.moon-days__slider' } }
    else if (!tutorialUsed.hour) tutorial = { target: "[data-tutorial='moon-hour']" }
    else tutorial = { target: '.moon-hazards__warn, .moon-hazards__clear', hand: false }
  }
  const brokenParts = damage.broken
  const blockedReason = (choice) => choiceBlockedReason(choice, equipped, brokenParts)

  return (
    <div className="game orbit-level moon-level" style={{ backgroundImage: `url(${ASSETS.spaceBackground.src})` }}>
      {hud}
      {liftingOff && (
        <div className="orbit-level__liftoff">
          <LaunchSequence equipped={equipped} hud={hud} onDone={startFlight} failure={liftoffFailure} onFail={failLaunch} />
        </div>
      )}
      {tutorial && <TutorialGuide target={tutorial.target ?? null} slide={tutorial.slide ?? null} hand={tutorial.hand ?? true} />}
      {step === 'result' && result?.success && !moonStory && (
        <MissionCompleteScreen
          mission={mission}
          result={result}
          design={design}
          lead={result.tripDays
            ? t('Your crew mapped the Moon and came home after {{days}} days.', { days: formatDecimal(result.tripDays, 1) })
            : t('Your crew mapped the Moon and came home.')}
          onContinue={result.practice ? onExit : () => setMoonStory(true)}
          continueLabel={result.practice ? t('Missions') : t('Continue')}
          onFlyAgain={retry}
          practice={result.practice}
          onFlyForReal={() => {
            setTutorialOn(false)
            retry()
          }}
        />
      )}
      {moonStory && <MoonLandingStory onDone={onExit} />}
      {step === 'result' && failScreenReady && (
        <MissionFailedScreen
          mission={mission}
          result={result}
          reason={t(result.reason)}
          hint={result.hint}
          onHangar={onBackToHangar}
          onRetry={retry}
        />
      )}
      {step === 'orbit' && !landing && !tipsOpen && <MoonLanding onDone={finishLanding} />}
      {activeEvent && step === 'orbit' && (
        <MoonEventCard activeEvent={activeEvent} blockedReason={blockedReason} onChoose={chooseEvent} onAct={actEvent} onContinue={continueEvent} />
      )}

      <div className="orbit-level__body">
        <div className="orbit-stage">
          {tipsOpen && (step === 'site' || step === 'aim' || step === 'orbit') && (
            <MoonTips step={step} onClose={() => setTipsOpen(false)} />
          )}
          {(step === 'site' || step === 'aim' || step === 'orbit') && !tipsOpen && (
            <button type="button" className="moon-tips-open" onClick={() => setTipsOpen(true)} aria-label={t('Show tips')}>?</button>
          )}
          <FunFactToast paused={!(step === 'aim' || step === 'flight' || step === 'return') || tipsOpen || liftingOff} />
          {telemetry && (step === 'flight' || step === 'orbit' || step === 'return') && (
            <div className="moon-clock" aria-live="off">
              <span className="moon-clock__face" aria-hidden="true"><PixelIcon name="clock" /></span>
              <span>
                <b>{formatDate(new Date(date.getTime() + telemetry.seconds * 1000), CLOCK_OPTIONS)}</b>
                <small>{t('Day {{day}} of the mission · time ×{{times}} faster (1 s = {{hours}} h)', {
                  day: formatDecimal(telemetry.seconds / 86400, 1),
                  times: shortNumber(telemetry.speedUp),
                  hours: formatDecimal(telemetry.speedUp / 3600, 1),
                })}</small>
              </span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`orbit-canvas orbit-canvas--${step}${leavingMap ? ' is-leaving' : ''}`}
            aria-label={step === 'site' ? t('Earth seen from above the North Pole') : t('Earth and Moon in space, with satellites, space junk and the predicted path')}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {/* Launch bases on the Earth, like mission 1 and Mars: tap one to choose it. */}
          {step === 'site' && (
            <div className={`orbit-sites${leavingMap ? ' is-leaving' : ''}`}>
              {LAUNCH_SITES.map((candidate) => {
                const position = siteScreenPosition(earthView, candidate)
                const side = position.x >= earthView.centerX ? 'right' : 'left'
                const selected = candidate.id === siteId
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`orbit-site orbit-site--${side}${selected ? ' is-selected' : ''}`}
                    style={{ left: position.x * uiScale, top: position.y * uiScale }}
                    aria-pressed={selected}
                    onClick={() => selectSite(candidate.id)}
                  >
                    <SitePin selected={selected} />
                    <span className="orbit-site__name">
                      {t(candidate.name)}
                      <span className="orbit-site__country">{t(candidate.country)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {step !== 'site' && (
            <>
              <MoonPhaseCard
                look={arrivalLook}
                rating={arrivalRating}
                dateLabel={formatDate(arrivalDate, DATE_OPTIONS)}
                moonTurnDeg={moonTurnDeg}
                sunTurnDeg={sunTurnDeg}
                place={moonPlace}
              />
              {step === 'aim' && !tipsOpen && (
                <div className={`moon-spot${hovered ? ' is-on' : ''}`} aria-live="polite">
                  {hovered ? (
                    <>
                      <span className="moon-spot__icon" aria-hidden="true"><PixelIcon name={hovered.kind === 'debris' ? 'junk' : 'satellite'} /></span>
                      <span>
                        <b>{t(hovered.shortName)}</b> · {t(hovered.type)}
                        <small>{t(hovered.summary)}</small>
                      </span>
                    </>
                  ) : (
                    <span className="moon-spot__legend">
                      <span><i className="moon-spot__sat" aria-hidden="true"><PixelIcon name="satellite" /></i> {t('Satellite')}</span>
                      <span><i className="moon-spot__junk" aria-hidden="true"><PixelIcon name="junk" /></i> {t('Space junk')}</span>
                      <small>{t('Point at one to see what it is')}</small>
                    </span>
                  )}
                </div>
              )}
              <p className="orbit-note">{t('Simulation · distances squeezed to fit')}</p>
            </>
          )}
        </div>

        <aside className="orbit-panel" aria-live="polite">
          {step === 'site' && (
            <>
              <h2 className="orbit-panel__title">{t('1. Pick a launch base')}</h2>
              {site ? (
                <div className="orbit-detail">
                  <p className="orbit-detail__name">{t(site.name)}, {t(site.country)}</p>
                  <p><b>{t('Spaceport:')}</b> {t(site.spaceport)}</p>
                  <p><b>{t('Why here?')}</b> {t(site.why)}</p>
                </div>
              ) : (
                <p className="orbit-panel__hint">{sayTo(playerName, t('Tap a launch base on the Earth. The rocket leaves from that city.'))}</p>
              )}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={onBackToHangar}>{t('Hangar')}</button>
                <button type="button" className="ms-btn" disabled={!site} onClick={acceptSite}>{t('Next')}</button>
              </div>
            </>
          )}

          {step === 'aim' && site && (
            <>
              <h2 className="orbit-panel__title">{t('2. Aim at the Moon')}</h2>
              <ol className="moon-steps">
                <li>{t('Pick a bright Moon')}</li>
                <li>{t('Drag from your base')}</li>
                <li>{t('Launch')}</li>
              </ol>
              <div className="moon-days">
                <p className="moon-days__title">
                  <b>{t('Launch day')}</b> · {launchDayLabel}
                </p>
                <div className="moon-days__row">
                  <button type="button" className="moon-days__step" onClick={() => pickDay(launchDay - 1)} disabled={launchDay === 0} aria-label={t('One day earlier')}>◀</button>
                  <div className="moon-days__track">
                    <div className="moon-days__moons" aria-hidden="true">
                      {dayLooks.map((dayLook, day) => (
                        <span key={day} className={`moon-day is-${lightRating(dayLook.illumination).tone}${day === launchDay ? ' is-on' : ''}`}>
                          <MoonDisk look={dayLook} />
                        </span>
                      ))}
                    </div>
                    <input
                      type="range"
                      className="moon-days__slider"
                      min="0"
                      max={MAX_DAY}
                      step="1"
                      value={launchDay}
                      onChange={(event) => pickDay(Number(event.target.value))}
                      aria-label={t('Launch day')}
                      aria-valuetext={t('Day {{day}}, {{date}}', { day: launchDay + 1, date: launchDayLabel })}
                    />
                  </div>
                  <button type="button" className="moon-days__step" onClick={() => pickDay(launchDay + 1)} disabled={launchDay === MAX_DAY} aria-label={t('One day later')}>▶</button>
                </div>
                <p className="moon-days__hint">{t('Each little Moon is how it looks the day you arrive. Slide to a bright one.')}</p>
                <p className={`moon-light is-${arrivalRating.tone}`}>
                  <SunRating level={arrivalRating.level} />
                  {t('{{label}} for the cameras · {{percent}}% lit', { label: t(arrivalRating.label), percent: Math.round(arrivalLook.illumination * 100) })}
                </p>
              </div>
              <div className="moon-picker" role="group" aria-label={t('Launch hour')}>
                <button type="button" onClick={() => shiftHours(-1)} disabled={cycleHours === 0} aria-label={t('One hour earlier')}>◀</button>
                <p><span className="moon-picker__icon" aria-hidden="true"><PixelIcon name="clock" /></span> {launchClock}<small>{t('Earth turns')}</small></p>
                <button type="button" data-tutorial="moon-hour" onClick={() => shiftHours(1)} disabled={cycleHours === CYCLE_HOURS} aria-label={t('One hour later')}>▶</button>
              </div>
              {summary && <p className={`orbit-prediction is-${summary.tone}`}><PixelIcon name={summary.icon} /> {sayTo(playerName, t(summary.text))}</p>}
              {prediction?.outcome.type === TRANSFER_OUTCOMES.ARRIVED && !hasLander && (
                <p className="orbit-prediction is-warn">{t('No lunar lander packed: nothing can slow the ship at the Moon.')}</p>
              )}
              {hits.length > 0 ? (
                <div className="moon-hazards__warn">
                  <b><PixelIcon name="warning" /> {t('The dots hit: {{names}}', { names: hits.map((hit) => t(hit.object.shortName)).join(', ') })}</b>
                  <span>{t('Both ships get hurt. Try another hour.')}</span>
                </div>
              ) : (
                prediction && <p className="moon-hazards__clear"><PixelIcon name="check" /> {t('No satellites or junk in the way.')}</p>
              )}
              <button type="button" className="moon-help" onClick={helpAim}><PixelIcon name="sparkle" /> {t('Help me aim')}</button>
              {helpMessage && <p className="moon-help__note">{t(helpMessage)}</p>}
              <div className="orbit-panel__actions">
                <button type="button" className="game__back" onClick={goBack}>{t('Back')}</button>
                <button type="button" className="ms-btn" onClick={launch}>{t('Launch')}</button>
              </div>
            </>
          )}

          {step === 'flight' && (
            <>
              <h2 className="orbit-panel__title">{sayTo(playerName, t('On the way!'))}</h2>
              <div className="moon-trip" aria-hidden="true">
                <span className="moon-trip__end"><PixelIcon name="earth" /></span>
                <span className="moon-trip__track">
                  <span className="moon-trip__fill" style={{ width: `${(telemetry?.progress ?? 0) * 100}%` }} />
                  <span className="moon-trip__ship" style={{ left: `${(telemetry?.progress ?? 0) * 100}%` }}><PixelIcon name="rocket" /></span>
                </span>
                <span className="moon-trip__end"><PixelIcon name="moon" /></span>
              </div>
              {telemetry && (
                <dl className="orbit-stats">
                  <div><dt>{t('Day')}</dt><dd>{formatDecimal(telemetry.day, 1)}</dd></div>
                  <div><dt>{t('From Earth')}</dt><dd>{formatKm(Math.max(0, telemetry.earthKm))}</dd></div>
                  <div><dt>{t('To the Moon')}</dt><dd>{formatKm(telemetry.moonKm)}</dd></div>
                </dl>
              )}
              {hits.slice(0, seenHits).map((hit) => (
                <p key={hit.object.id} className="orbit-prediction is-bad"><PixelIcon name="boom" /> {t(hit.object.shortName)}: {t(hit.object.damage)}</p>
              ))}
            </>
          )}

          {step === 'return' && (
            <>
              <h2 className="orbit-panel__title">{sayTo(playerName, t('Coming home!'))}</h2>
              <div className="moon-trip" aria-hidden="true">
                <span className="moon-trip__end"><PixelIcon name="moon" /></span>
                <span className="moon-trip__track">
                  <span className="moon-trip__fill is-home" style={{ width: `${(telemetry?.phase === 'home' ? telemetry.progress : 0) * 100}%` }} />
                  <span className="moon-trip__ship is-home" style={{ left: `${(telemetry?.phase === 'home' ? telemetry.progress : 0) * 100}%` }}><PixelIcon name="rocket" /></span>
                </span>
                <span className="moon-trip__end"><PixelIcon name="earth" /></span>
              </div>
              <p className="orbit-panel__hint">{t('One engine burn behind the Moon, then gravity does the rest: the Moon flings the ship out and Earth pulls it home.')}</p>
              {returnPrediction && (
                <p className="orbit-detail"><PixelIcon name="fire" /> {t(
                  returnPrediction.perigeeAltitudeKm > 20 && returnPrediction.perigeeAltitudeKm < 70
                    ? 'Burn: {{speed}} m/s · lowest point {{km}} km up, inside the safe corridor.'
                    : 'Burn: {{speed}} m/s · lowest point {{km}} km up.',
                  { speed: (returnPrediction.burn * 1000).toFixed(0), km: Math.round(returnPrediction.perigeeAltitudeKm) },
                )}</p>
              )}
              <p className="orbit-detail"><PixelIcon name="shield" /> {t('The heat shield keeps the crew safe when the ship hits the air at about 40,000 km/h.')}</p>
            </>
          )}

          {(step === 'orbit' || (step === 'result' && result?.success)) && (
            <>
              <h2 className="orbit-panel__title">{sayTo(playerName, t('Mapping the Moon'))}</h2>
              <p className="orbit-panel__hint">{t('The lander slowed the ship into orbit. Watch for surprises.')}</p>
              <p className={`moon-light is-${arrivalRating.tone}`}>
                <SunRating level={arrivalRating.level} />
                {t('{{phase}}: {{label}} for the cameras', { phase: t(arrivalLook.name), label: t(arrivalRating.label).toLowerCase() })}
              </p>
              {hits.length > 0 && (
                <p className="orbit-detail">{t('Damage from the trip: {{names}}.', { names: hits.map((hit) => t(hit.object.shortName)).join(', ') })}</p>
              )}
              <ul className="moon-hazards">
                {landing && (
                  <li className="moon-hazards__item">
                    <b><PixelIcon name="lander" /> {landingCopy(landing).title}</b>
                    <span>{landingCopy(landing).note}</span>
                  </li>
                )}
                {eventLog.map((entry) => (
                  <li key={entry.id} className="moon-hazards__item"><b>{t(entry.name)}</b><span>{t(entry.note)}</span></li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
