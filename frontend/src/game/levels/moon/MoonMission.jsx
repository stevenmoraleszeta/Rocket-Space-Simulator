import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '../../../levels/ProgressContext.jsx'
import { LaunchSequence } from '../../LaunchSequence.jsx'
import { MoonEventCard } from './MoonEventCard.jsx'
import { MoonHangar } from './MoonHangar.jsx'
import { MoonLaunchSetup } from './MoonLaunchSetup.jsx'
import { MoonMissionReport } from './MoonMissionReport.jsx'
import {
  assessMoonBuild,
  calculateMoonMetrics,
  createMoonEventOrder,
  MOON_DIFFICULTIES,
  resolveMoonEvent,
  SUGGESTED_MOON_LOADOUT,
} from './moonMissionData.js'
import './moonMission.css'

const BEST_SCORE_KEY = 'space-mission:moon-mapper:best-score'
const ORBIT_SECONDS = 18
const LAUNCH_FACTS = [
  'The Moon is about 384,400 km from Earth.',
  'LRO launched on June 18, 2009, with seven science tools.',
  'Some lunar craters near the south pole never get sunlight.',
  'LRO maps safe places for future Moon explorers.',
]

const STARTING_IMPACT = { scienceFactor: 1, dataLoss: 0, energyPenalty: 0, fuelPenalty: 0 }

function loadSavedBestScore() {
  try {
    const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY))
    return { score: Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 0, error: false }
  } catch (error) {
    console.error('Could not read the Moon Mapper best score.', error)
    return { score: 0, error: true }
  }
}

export function MoonMission({ mission, onExit, onNextMission }) {
  const { completeMission } = useProgress()
  const [phase, setPhase] = useState('briefing')
  const difficulty = 'intermediate'
  const [loadout, setLoadout] = useState(() => ({
    rocket: SUGGESTED_MOON_LOADOUT.rocket,
    instruments: [...SUGGESTED_MOON_LOADOUT.instruments],
    systems: [...SUGGESTED_MOON_LOADOUT.systems],
    crew: [],
  }))
  const [assessment, setAssessment] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(ORBIT_SECONDS)
  const [eventOrder, setEventOrder] = useState([])
  const [eventIndex, setEventIndex] = useState(0)
  const [activeEvent, setActiveEvent] = useState(null)
  const [eventImpact, setEventImpact] = useState(STARTING_IMPACT)
  const [eventLog, setEventLog] = useState([])
  const [attemptsLeft, setAttemptsLeft] = useState(MOON_DIFFICULTIES.intermediate.attempts)
  const [eventFuelLeft, setEventFuelLeft] = useState(0)
  const [report, setReport] = useState(null)
  const [launchContext, setLaunchContext] = useState(null)
  const [savedBest] = useState(loadSavedBestScore)
  const [bestScore, setBestScore] = useState(savedBest.score)
  const [storageError, setStorageError] = useState(savedBest.error)
  const [largeText, setLargeText] = useState(false)
  const [muted, setMuted] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [factIndex, setFactIndex] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(1)
  const [energyMessage, setEnergyMessage] = useState('')
  const metrics = useMemo(() => calculateMoonMetrics(loadout, difficulty), [loadout, difficulty])
  const metricsRef = useRef(metrics)
  const assessmentRef = useRef(assessment)
  const eventImpactRef = useRef(eventImpact)
  const eventLogRef = useRef(eventLog)
  const activeEventRef = useRef(activeEvent)
  const remainingSecondsRef = useRef(ORBIT_SECONDS)
  const eventOrderRef = useRef(eventOrder)
  const eventIndexRef = useRef(eventIndex)
  const eventFuelRef = useRef(eventFuelLeft)
  const attemptsLeftRef = useRef(attemptsLeft)
  const launchFinishedRef = useRef(false)
  const audioContextRef = useRef(null)
  const resolvePendingRef = useRef(false)

  useEffect(() => {
    return () => {
      const context = audioContextRef.current
      if (context && context.state !== 'closed') context.close().catch((error) => console.error('Could not close the Moon mission audio context.', error))
    }
  }, [])

  useLayoutEffect(() => {
    metricsRef.current = metrics
    assessmentRef.current = assessment
    eventImpactRef.current = eventImpact
    eventLogRef.current = eventLog
    activeEventRef.current = activeEvent
    eventOrderRef.current = eventOrder
    eventIndexRef.current = eventIndex
    eventFuelRef.current = eventFuelLeft
    attemptsLeftRef.current = attemptsLeft
  }, [activeEvent, assessment, attemptsLeft, eventFuelLeft, eventImpact, eventIndex, eventLog, eventOrder, metrics])

  useEffect(() => {
    if (phase !== 'launching') return undefined
    const timer = window.setInterval(() => setFactIndex((index) => (index + 1) % LAUNCH_FACTS.length), 2800)
    return () => window.clearInterval(timer)
  }, [phase])

  const playTone = useCallback((kind = 'tap') => {
    if (muted) return
    try {
      const Context = window.AudioContext
      if (!Context) {
        setAudioError(true)
        return
      }
      const context = audioContextRef.current ?? new Context()
      audioContextRef.current = context
      if (context.state === 'suspended') context.resume().catch((error) => {
        console.error('Could not start Moon mission sound.', error)
        setAudioError(true)
      })
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const frequency = kind === 'success' ? 660 : kind === 'fail' ? 180 : kind === 'launch' ? 440 : 520
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(frequency, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(frequency * (kind === 'fail' ? 0.6 : 1.4), context.currentTime + 0.12)
      gain.gain.setValueAtTime(0.045, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.17)
    } catch (error) {
      console.error('Could not play Moon mission sound.', error)
      setAudioError(true)
    }
  }, [muted])

  const saveBest = useCallback((score) => {
    const best = Math.max(bestScore, score)
    setBestScore(best)
    try {
      window.localStorage.setItem(BEST_SCORE_KEY, String(best))
    } catch (error) {
      console.error('Could not save the Moon Mapper best score.', error)
      setStorageError(true)
    }
  }, [bestScore])

  const finishMission = useCallback(({ arrived, reason = '' }) => {
    if (launchFinishedRef.current) return
    launchFinishedRef.current = true
    const currentMetrics = metricsRef.current
    const currentAssessment = assessmentRef.current ?? assessMoonBuild(loadout, difficulty)
    const impact = eventImpactRef.current
    const dataLostPercent = Math.min(100, currentMetrics.dataLostPercent + impact.dataLoss)
    const energyLeft = currentMetrics.energySupply - currentMetrics.energyUse - impact.energyPenalty
    const finalChecks = currentAssessment.checks.map((check) => {
      if (check.id === 'energy') {
        const ok = check.ok && energyLeft >= 0
        return { ...check, ok, detail: ok ? `Energy left: ${energyLeft} power.` : `Energy ran short by ${Math.max(0, -energyLeft)} power.` }
      }
      if (check.id === 'data') {
        const ok = check.ok && dataLostPercent <= 20
        return { ...check, ok, detail: `${dataLostPercent}% data lost; up to 20% is safe.` }
      }
      if (check.id === 'fuel') {
        const fuelReady = phase === 'orbit' ? eventFuelRef.current >= 0 : currentMetrics.fuel >= 45
        const ok = check.ok && fuelReady
        return { ...check, ok, detail: ok ? 'Fuel covered all three engine checks.' : 'Not enough fuel for travel and lunar braking.' }
      }
      return check
    })
    if (!arrived) finalChecks.push({
      id: 'orbit',
      label: 'Lunar orbit',
      ok: false,
      detail: reason || 'The probe did not reach the Moon’s capture zone.',
    })

    const science = Math.max(0, Math.round(currentMetrics.science * impact.scienceFactor * (1 - dataLostPercent / 100)))
    const score = Math.max(0, Math.min(100, Math.round((science / 50) * 100)))
    const success = arrived && finalChecks.every((check) => check.ok) && score >= mission.passPct
    const failed = finalChecks.find((check) => !check.ok)
    const finalReason = !arrived
      ? reason || 'The probe did not reach lunar orbit.'
      : failed?.detail ?? (score < mission.passPct ? 'The robot needs more science tools.' : '')
    const finalReport = {
      success,
      science,
      scienceTarget: 50,
      score,
      dataLostPercent,
      budgetLeft: currentMetrics.difficulty.budget === Infinity
        ? Infinity
        : currentMetrics.difficulty.budget - currentMetrics.cost,
      eventsHandled: eventLogRef.current.length,
      attemptsLeft: attemptsLeftRef.current,
      checks: finalChecks,
      events: eventLogRef.current,
      reason: finalReason,
      why: success
        ? 'The rocket made all three burns, kept its tools safe, and sent the Moon map to Earth.'
        : finalReason,
    }
    try {
      completeMission(mission.id, { pct: score, success })
    } catch (error) {
      console.error('Could not record Moon Mapper mission progress.', error)
      setStorageError(true)
    }
    saveBest(score)
    setReport(finalReport)
    setPhase('report')
    playTone(success ? 'success' : 'fail')
  }, [completeMission, difficulty, loadout, mission.id, mission.passPct, phase, playTone, saveBest])

  const startOrbit = useCallback((fuelAtOrbit) => {
    launchFinishedRef.current = false
    const order = createMoonEventOrder(MOON_DIFFICULTIES[difficulty].events)
    remainingSecondsRef.current = ORBIT_SECONDS
    eventOrderRef.current = order
    eventIndexRef.current = 0
    eventFuelRef.current = Math.max(0, fuelAtOrbit)
    setRemainingSeconds(ORBIT_SECONDS)
    setEventOrder(order)
    setEventIndex(0)
    setEventFuelLeft(eventFuelRef.current)
    setActiveEvent(null)
    activeEventRef.current = null
    resolvePendingRef.current = false
    setEventImpact(STARTING_IMPACT)
    eventImpactRef.current = STARTING_IMPACT
    setEventLog([])
    eventLogRef.current = []
    setCurrentMonth(1)
    setPhase('orbit')
    playTone('success')
  }, [difficulty, playTone])

  const startFlight = useCallback(() => {
    const currentAssessment = assessmentRef.current
    if (!currentAssessment?.success) {
      const cause = currentAssessment?.checks.find((check) => !check.ok)?.detail ?? 'The spacecraft is not ready.'
      finishMission({ arrived: false, reason: cause })
      return
    }
    startOrbit(metricsRef.current.fuel)
  }, [finishMission, startOrbit])

  const onAttemptsOver = useCallback((reason) => {
    attemptsLeftRef.current = 0
    setAttemptsLeft(0)
    finishMission({ arrived: false, reason: `${reason} No attempts remain.` })
  }, [finishMission])

  const updateAttempts = useCallback((nextAttempts) => {
    attemptsLeftRef.current = nextAttempts
    setAttemptsLeft(nextAttempts)
  }, [])

  function startLaunch() {
    const result = assessMoonBuild(loadout, difficulty)
    assessmentRef.current = result
    setAssessment(result)
    attemptsLeftRef.current = MOON_DIFFICULTIES[difficulty].attempts
    setAttemptsLeft(MOON_DIFFICULTIES[difficulty].attempts)
    setEventImpact(STARTING_IMPACT)
    eventImpactRef.current = STARTING_IMPACT
    setEventLog([])
    eventLogRef.current = []
    launchFinishedRef.current = false
    setLaunchContext(null)
    setPhase('setup')
  }

  function beginMissionLaunch(context) {
    setLaunchContext(context)
    playTone('launch')
    setPhase('launching')
  }

  function openBuild() {
    launchFinishedRef.current = false
    setAssessment(null)
    setReport(null)
    setPhase('build')
  }

  const beginOrbitEvent = useCallback((event, remaining) => {
    if (activeEventRef.current) return
    const next = { event, deadline: Date.now() + event.seconds * 1000, secondsLeft: event.seconds, resolvedText: '' }
    activeEventRef.current = next
    resolvePendingRef.current = false
    setActiveEvent(next)
    setCurrentMonth(Math.min(3, Math.floor((ORBIT_SECONDS - remaining) / 6) + 1))
    playTone('tap')
  }, [playTone])

  const chooseEvent = useCallback((choiceId, timingSuccess = true) => {
    const pending = activeEventRef.current
    if (!pending || pending.resolvedText || resolvePendingRef.current) return
    resolvePendingRef.current = true
    const wrenchProtects = loadout.crew.includes('wrench') && eventLogRef.current.length === 0
    const result = resolveMoonEvent(pending.event.id, choiceId, loadout, {
      timingSuccess,
      ignoreDamage: wrenchProtects,
      random: Math.random,
    })
    const nextImpact = {
      scienceFactor: eventImpactRef.current.scienceFactor * result.scienceFactor,
      dataLoss: Math.min(100, eventImpactRef.current.dataLoss + result.dataLoss),
      energyPenalty: eventImpactRef.current.energyPenalty + result.energyPenalty,
      fuelPenalty: eventImpactRef.current.fuelPenalty + result.fuelPenalty,
    }
    eventImpactRef.current = nextImpact
    setEventImpact(nextImpact)
    eventFuelRef.current = Math.max(0, eventFuelRef.current - result.fuelPenalty)
    setEventFuelLeft(eventFuelRef.current)
    setEnergyMessage(nextImpact.energyPenalty > 0 ? `Energy penalty: ${nextImpact.energyPenalty} power.` : '')
    const entry = { id: pending.event.id, name: pending.event.name, note: result.note }
    const nextLog = [...eventLogRef.current, entry]
    eventLogRef.current = nextLog
    setEventLog(nextLog)
    const nextEvent = { ...pending, resolvedText: result.note }
    activeEventRef.current = nextEvent
    setActiveEvent(nextEvent)
    playTone(timingSuccess ? 'success' : 'fail')
  }, [loadout, playTone])

  useEffect(() => {
    if (phase !== 'orbit') return undefined
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, remainingSecondsRef.current - 1)
      remainingSecondsRef.current = remaining
      setRemainingSeconds(remaining)

      const order = eventOrderRef.current
      const index = eventIndexRef.current
      if (!activeEventRef.current && index < order.length) {
        const eventAt = Math.ceil(ORBIT_SECONDS - ((index + 1) * ORBIT_SECONDS) / (order.length + 1))
        if (remaining <= eventAt) beginOrbitEvent(order[index], remaining)
      }
      if (remaining === 0 && index >= order.length && !activeEventRef.current) {
        finishMission({ arrived: true })
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [beginOrbitEvent, finishMission, phase])

  const activeEventDeadline = activeEvent?.deadline
  const activeEventId = activeEvent?.event.id
  const activeEventResolvedText = activeEvent?.resolvedText
  useEffect(() => {
    if (phase !== 'orbit' || !activeEventDeadline || activeEventResolvedText) return undefined
    const timer = window.setInterval(() => {
      const current = activeEventRef.current
      if (!current) return
      const secondsLeft = Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000))
      if (secondsLeft !== current.secondsLeft) {
        const next = { ...current, secondsLeft }
        activeEventRef.current = next
        setActiveEvent(next)
      }
      if (secondsLeft === 0 && !resolvePendingRef.current) {
        const riskyChoice = current.event.choices.find((choice) => choice.risky)?.id ?? current.event.choices[0].id
        chooseEvent(riskyChoice, false)
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [activeEventDeadline, activeEventId, activeEventResolvedText, chooseEvent, phase])

  const continueEvent = useCallback(() => {
    activeEventRef.current = null
    resolvePendingRef.current = false
    setActiveEvent(null)
    const nextIndex = eventIndexRef.current + 1
    eventIndexRef.current = nextIndex
    setEventIndex(nextIndex)
  }, [])

  const animationLoadout = {
    shield: loadout.systems.includes('radiator') ? 1 : 0,
    boosters: loadout.rocket === 'heavy' || loadout.systems.includes('fuel') ? 1 : 0,
    food: loadout.systems.includes('food') ? 1 : 0,
    astronaut: loadout.crew.length,
  }
  const hud = (
    <header className="game__hud moon-launch__hud">
      <button type="button" className="game__back" onClick={onExit}>Missions</button>
      <div className="game__mission"><div className="game__num">MISSION 2</div><h1>{mission.title}</h1></div>
      <div className="game__place">Lunar orbit</div>
    </header>
  )

  return (
    <div className={`moon-shell${largeText ? ' is-large' : ''}`}>
      {phase !== 'briefing' && phase !== 'build' && phase !== 'setup' && phase !== 'launching' && phase !== 'report' && (
        <nav className="moon-tools" aria-label="Accessibility and sound">
          <button type="button" aria-pressed={largeText} onClick={() => setLargeText((value) => !value)}>A+ Text</button>
          <button type="button" aria-pressed={muted} onClick={() => setMuted((value) => !value)}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
        </nav>
      )}
      {audioError && <p className="moon-audio-note" role="status">WebAudio is not available in this browser.</p>}
      {phase !== 'launching' && phase !== 'report' && phase !== 'briefing' && phase !== 'build' && phase !== 'setup' && (
        <button type="button" className="moon-top-back" onClick={onExit}>← Missions</button>
      )}
      {(phase === 'briefing' || phase === 'build') && (
        <MoonHangar
          mission={mission}
          difficulty={difficulty}
          loadout={loadout}
          metrics={metrics}
          onLoadoutChange={setLoadout}
          onLaunch={startLaunch}
          onExit={onExit}
          largeText={largeText}
          muted={muted}
          onToggleLargeText={() => setLargeText((value) => !value)}
          onToggleSound={() => setMuted((value) => !value)}
          briefingOpen={phase === 'briefing'}
          onContinue={() => setPhase('build')}
        />
      )}
      {phase === 'setup' && (
        <MoonLaunchSetup
          onBack={() => setPhase('build')}
          onExit={onExit}
          onLaunch={beginMissionLaunch}
          largeText={largeText}
          muted={muted}
          onToggleLargeText={() => setLargeText((value) => !value)}
          onToggleSound={() => setMuted((value) => !value)}
        />
      )}
      {phase === 'launching' && (
        <div className="moon-launch">
          <LaunchSequence equipped={animationLoadout} hud={hud} onDone={startFlight} />
          <div className="moon-loading-fact" role="status" aria-live="polite">
            <span>✨ Loading lunar map</span>
            <b>{LAUNCH_FACTS[factIndex]}</b>
          </div>
        </div>
      )}
      {phase === 'orbit' && (
        <main className="moon-page moon-orbit">
          <header className="moon-page__heading">
            <p className="moon-kicker">MISSION 2 · LUNAR ORBIT</p>
            <h1>Mapping the Moon</h1>
            <p>Month {currentMonth} · {remainingSeconds} seconds left · {eventIndex} / {eventOrder.length} events</p>
            {energyMessage && <p className="moon-alert" aria-live="polite">{energyMessage}</p>}
          </header>
          <div className="moon-orbit__scene" aria-label={`Moon orbit month ${currentMonth}`}>
            <div className="moon-orbit__earth" aria-hidden="true">🌍</div>
            <div className="moon-orbit__path" aria-hidden="true" />
            <div className="moon-orbit__moon" aria-hidden="true">🌕</div>
            <span className="moon-orbit__probe" aria-hidden="true">🛰️</span>
            <p>Scanning craters · sending maps to Earth</p>
          </div>
          <section className="moon-panel moon-orbit__status">
            <h2>Science data</h2>
            <p>🔬 {metrics.science.toFixed(0)} science points · 💾 {metrics.dataLostPercent + eventImpact.dataLoss}% data lost · 📡 {metrics.commsPerDay}/day</p>
            <p>🛡️ Each event needs a quick choice. The timer keeps counting.</p>
            <ul>{eventLog.map((event, index) => <li key={`${event.id}-${index}`}><b>{event.name}:</b> {event.note}</li>)}</ul>
          </section>
          {activeEvent && (
            <MoonEventCard
              activeEvent={activeEvent}
              loadout={loadout}
              fuelLeft={eventFuelLeft}
              onChoose={chooseEvent}
              onContinue={continueEvent}
            />
          )}
        </main>
      )}
      {phase === 'report' && report && (
        <MoonMissionReport
          report={report}
          bestScore={bestScore}
          storageError={storageError}
          onRedesign={openBuild}
          onNext={onNextMission}
          onExit={onExit}
        />
      )}
    </div>
  )
}
