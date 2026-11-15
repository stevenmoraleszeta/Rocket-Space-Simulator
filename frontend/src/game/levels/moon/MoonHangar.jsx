import { useState } from 'react'
import { Meters } from '../../GameScreen.jsx'
import { PadClouds } from '../../PadClouds.jsx'
import { PadFlag } from '../../PadFlag.jsx'
import { PadCrew } from '../../PadCrew.jsx'
import { LaunchTower } from '../../LaunchTower.jsx'
import { Rocket } from '../../Rocket.jsx'
import { MOON_CATEGORIES, MOON_CREW, MOON_DIFFICULTIES, MOON_INSTRUMENTS, MOON_ROCKETS, MOON_SYSTEMS } from './moonMissionData.js'
import { MoonBriefing } from './MoonBriefing.jsx'
import launchPad from '../../../assets/images/backgrounds/launch_pad.svg'
import launchBase from '../../../assets/images/rockets/launch_base.png'

const formatNumber = (value) => Number.isInteger(value) ? String(value) : value.toFixed(1)

function moonMeters(metrics) {
  const maxBudget = metrics.difficulty.budget === Infinity ? 119 : metrics.difficulty.budget
  const remaining = metrics.difficulty.budget === Infinity ? Infinity : metrics.difficulty.budget - metrics.cost
  const dataOK = metrics.dataLostPercent <= 20
  const room = (id, label, icon, current, max, text, good, tooltip) => ({
    id,
    label,
    icon,
    current: Math.max(0, Math.min(current, max)),
    max,
    text,
    fill: Math.max(0, Math.min(100, (current / max) * 100)),
    tone: good ? 'ok' : 'over',
    bar: true,
    tooltip,
  })

  const bars = [
    room('budget', 'Budget', '💰', Math.max(0, remaining), maxBudget, remaining === Infinity ? 'No limit' : remaining < 0 ? `${formatNumber(-remaining)} cr over` : `${formatNumber(remaining)} cr left`, remaining >= 0, 'Budget: credits left to build your ship.'),
    room('mass', 'Mass', '⚖️', metrics.mass, metrics.rocket.capacity, `${formatNumber(metrics.mass)} / ${metrics.rocket.capacity} kg`, metrics.mass <= metrics.rocket.capacity, 'Mass: a heavy ship is harder for a rocket to lift.'),
    room('energy', 'Energy', '⚡', metrics.energySupply, Math.max(metrics.energyUse, 1), `${formatNumber(metrics.energySupply)} / ${formatNumber(metrics.energyUse)} power`, metrics.energySupply >= metrics.energyUse && metrics.systems.some((item) => item.id === 'battery'), 'Energy: solar panels make power; a battery saves it in shadow.'),
    room('heat', 'Heat', '🌡️', metrics.rawHeat, metrics.maxHeat, `${formatNumber(metrics.rawHeat)} / ${metrics.maxHeat}`, metrics.rawHeat <= metrics.maxHeat, 'Heat: if the ship gets too hot, tools can fail.'),
    room('thrust', 'Thrust', '🚀', metrics.thrust, 42, `${formatNumber(metrics.thrust)} / 42 push`, metrics.thrust >= 42, 'Thrust: the push needed to leave Earth, travel, and brake.'),
    room('data', 'Data', '💾', 100 - metrics.dataLostPercent, 100, `${formatNumber(metrics.dataPerDay)} /day · ${metrics.dataLostPercent}% lost`, dataOK, 'Data: science pictures and readings made each day.'),
    room('comms', 'Comms', '📡', metrics.commsPerDay, Math.max(metrics.dataPerDay, 1), `${formatNumber(metrics.commsPerDay)} / ${formatNumber(metrics.dataPerDay)} per day`, metrics.commsPerDay >= metrics.dataPerDay * 0.8, 'Comms: how much data the radio can send each day.'),
  ]

  if (metrics.crew.length) {
    bars.push(room('food', 'Food', '🥫', metrics.food, metrics.crewNeedsFood, `${metrics.food} / ${metrics.crewNeedsFood}`, metrics.food >= metrics.crewNeedsFood, 'Food: crew members need meals for the trip.'))
    bars.push(room('air', 'Air', '🫧', metrics.air, metrics.crewNeedsAir, `${metrics.air} / ${metrics.crewNeedsAir}`, metrics.air >= metrics.crewNeedsAir, 'Air: crew members need air to breathe.'))
  }
  return bars
}

function itemStats(item, category) {
  const stats = [`${item.mass} kg`]
  if (category === 'instruments') stats.push(`⚡${item.energy}`, `💾${item.data}/day`)
  if (category === 'rocket') stats.push(`${item.capacity} kg lift`, `🚀${item.thrust}`)
  if (category === 'crew') stats.push(item.risk)
  if (category === 'systems') {
    if (item.energySupply) stats.push(`⚡+${item.energySupply}`)
    if (item.energyUse) stats.push(`⚡−${item.energyUse}`)
    if (item.comms) stats.push(`📡${item.comms}/day`)
    if (item.storage) stats.push(`💾+${item.storage}`)
    if (item.thrust) stats.push(`🚀+${item.thrust}`)
    if (item.fuel) stats.push(`⛽+${item.fuel}`)
    if (item.heat) stats.push(`🌡️${item.heat}`)
    if (item.food) stats.push(`🥫${item.food}`)
    if (item.air) stats.push(`🫧${item.air}`)
  }
  if (item.cost) stats.push(`💰${item.cost}`)
  return stats.join(' · ')
}

function partReason(item, selected, difficulty, crew) {
  if (item.id === 'small') return item.reason
  if (item.id === 'food' || item.id === 'air') {
    if (!crew.length && !selected) return 'Only needed when a crew member flies.'
    if (item.id === 'food' && crew.length && !crew.includes('spark') && !crew.includes('wrench') && !crew.includes('lens') && !crew.includes('cloud')) return 'Choose a crew member first.'
  }
  if (!difficulty.crew && ['spark', 'wrench', 'lens', 'cloud'].includes(item.id)) return 'Crew is not available in Medium.'
  return ''
}

function OptionButton({ item, selected, disabled, reason, onClick, stats }) {
  const description = item.tip ?? (item.lunar ? 'Can reach the Moon.' : '')
  return (
    <button
      type="button"
      className={`moon-option${selected ? ' is-selected' : ''}${disabled ? ' is-incompatible' : ''}`}
      aria-pressed={selected}
      disabled={disabled && !selected}
      onClick={onClick}
      title={item.real ? `Real tool: ${item.real}. ${description}` : description || reason}
    >
      <span className="moon-option__icon" aria-hidden="true">{item.icon ?? '🚀'}</span>
      <span className="moon-option__copy">
        <b>{item.name}</b>
        {description && <small>{description}</small>}
        <small className="moon-option__stats">{stats}</small>
        {disabled && <small className="moon-option__reason">⛔ {reason}</small>}
      </span>
      <span className="moon-option__state" aria-hidden="true">{selected ? '✓' : disabled ? '!' : '+'}</span>
    </button>
  )
}

export function MoonHangar({
  mission,
  difficulty,
  loadout,
  metrics,
  onLoadoutChange,
  onLaunch,
  onExit,
  largeText,
  muted,
  onToggleLargeText,
  onToggleSound,
  briefingOpen,
  onContinue,
}) {
  const [category, setCategory] = useState(null)
  const config = MOON_DIFFICULTIES[difficulty]

  function toggleList(key, id, type = 'multi') {
    onLoadoutChange((current) => {
      const selected = current[key]
      let next
      if (selected.includes(id)) {
        next = selected.filter((item) => item !== id)
      } else if (type === 'single') {
        next = [id]
      } else {
        next = [...selected, id]
      }
      if (key === 'systems' && id.startsWith('antenna-') && !selected.includes(id)) {
        next = [...next.filter((item) => !item.startsWith('antenna-')), id]
      }
      if (key === 'crew' && next.length > 2) return current
      return { ...current, [key]: next }
    })
  }

  const invalidChecks = metrics.checks.filter((check) => !check.ok)
  const selectedRocket = MOON_ROCKETS.find((rocket) => rocket.id === loadout.rocket) ?? MOON_ROCKETS[0]
  const animationLoadout = {
    shield: loadout.systems.includes('radiator') ? 1 : 0,
    boosters: selectedRocket.id === 'heavy' || loadout.systems.includes('fuel') ? 1 : 0,
    food: loadout.systems.includes('food') ? 1 : 0,
    astronaut: loadout.crew.length,
  }
  const categoryItems = category === 'instruments'
    ? MOON_INSTRUMENTS
    : category === 'rocket'
      ? MOON_ROCKETS
      : category === 'systems'
        ? MOON_SYSTEMS
        : MOON_CREW

  function selected(item) {
    if (category === 'rocket') return loadout.rocket === item.id
    const key = category === 'instruments' ? 'instruments' : category === 'systems' ? 'systems' : 'crew'
    return loadout[key].includes(item.id)
  }

  function chooseItem(item) {
    if (category === 'rocket') {
      if (item.lunar) onLoadoutChange((current) => ({ ...current, rocket: item.id }))
      return
    }
    const key = category === 'instruments' ? 'instruments' : category === 'systems' ? 'systems' : 'crew'
    toggleList(key, item.id)
  }

  return (
    <main className={`game game--pad moon-hangar${largeText ? ' is-large' : ''}`}>
      <div className="stage">
        <div className="stage__frame">
          <img className="stage__bg" src={launchPad} alt="" />
          <PadClouds />
          <PadFlag />
          <div className="stage__mount">
            <div className="prep">
              <LaunchTower />
              <img className="prep__base" src={launchBase} alt="" />
              <Rocket equipped={animationLoadout} open />
              <PadCrew />
            </div>
          </div>
        </div>
      </div>

      <header className="game__hud moon-hangar__hud">
        <button type="button" className="game__back" onClick={onExit}>Missions</button>
        <div className="game__mission">
          <div className="game__num">MISSION {mission.number}</div>
          <h1>{mission.title}</h1>
        </div>
        <div className="game__place">{mission.place}</div>
        <nav className="moon-tools moon-hangar__tools" aria-label="Accessibility and sound">
          <button type="button" aria-pressed={largeText} onClick={onToggleLargeText}>A+ Text</button>
          <button type="button" aria-pressed={muted} onClick={onToggleSound}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
        </nav>
      </header>

      <div className="bay moon-hangar__bay">
        <Meters meters={moonMeters(metrics)} />
        {invalidChecks.length > 0 && (
          <div className="moon-alert moon-hangar__warnings" role="status">
            <b>⚠️ {invalidChecks[0].label}:</b> {invalidChecks[0].detail}
          </div>
        )}

        <div className="dock moon-hangar__dock">
          <ul className="parts" aria-label="Spacecraft categories">
            {MOON_CATEGORIES.map((item) => {
              const isCrewLocked = item.id === 'crew' && !config.crew
              const icon = item.id === 'instruments' ? '🔭' : item.id === 'rocket' ? '🚀' : item.id === 'systems' ? '🧰' : '👩‍🚀'
              const selectedCount = item.id === 'rocket' ? 1 : (
                item.id === 'instruments' ? loadout.instruments.length :
                  item.id === 'systems' ? loadout.systems.length : loadout.crew.length
              )
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`part-btn${selectedCount ? ' is-on' : ''}${category === item.id ? ' is-open' : ''}`}
                    aria-label={`${item.label}${isCrewLocked ? ', locked on this level' : ''}`}
                    aria-expanded={category === item.id}
                    title={`${item.label}${isCrewLocked ? ' (not in Medium)' : ''}`}
                    onClick={() => setCategory(category === item.id ? null : item.id)}
                  >
                    <span className="moon-category-icon" aria-hidden="true">{icon}</span>
                    {selectedCount > 0 && <span className="part-btn__qty">{selectedCount}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
          {category && (
            <section className="part-dialog moon-category-panel" aria-label={`${category} choices`}>
              <header className="moon-category-panel__head">
                <div>
                  <h2>{MOON_CATEGORIES.find((item) => item.id === category)?.label}</h2>
                  <p>{MOON_CATEGORIES.find((item) => item.id === category)?.hint}</p>
                </div>
                <button type="button" className="part-dialog__close" onClick={() => setCategory(null)}>Close</button>
              </header>
              <nav className="moon-category-panel__tabs" aria-label="Choose equipment category">
                {MOON_CATEGORIES.map((item) => {
                  const locked = item.id === 'crew' && !config.crew
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`part-btn${category === item.id ? ' is-open' : ''}`}
                      aria-pressed={category === item.id}
                      aria-label={item.label}
                      onClick={() => setCategory(item.id)}
                    >
                      <span className="moon-category-icon" aria-hidden="true">
                        {item.id === 'instruments' ? '🔭' : item.id === 'rocket' ? '🚀' : item.id === 'systems' ? '🧰' : '👩‍🚀'}
                      </span>
                      {locked && <span className="part-btn__qty">🔒</span>}
                    </button>
                  )
                })}
              </nav>
              <div className="moon-options">
                {categoryItems.map((item) => {
                  const isSelected = selected(item)
                  const lockedCrew = category === 'crew' && !config.crew
                  const disabled = lockedCrew || (category === 'rocket' && !item.lunar) || (
                    category === 'systems' && ['food', 'air'].includes(item.id) && !loadout.crew.length
                  )
                  const reason = partReason(item, isSelected, config, loadout.crew) || (lockedCrew ? 'Crew is not available in Medium.' : '')
                  const stats = itemStats(item, category)
                  return (
                    <OptionButton
                      key={item.id}
                      item={item}
                      selected={isSelected}
                      disabled={disabled}
                      reason={reason}
                      stats={stats}
                      onClick={() => chooseItem(item)}
                    />
                  )
                })}
              </div>
              {category === 'crew' && !config.crew && <p className="moon-alert">Crew is not available in Medium.</p>}
              {category === 'crew' && config.crew && <p className="moon-mode-hint">Pick up to two helpers. Crew needs food and air.</p>}
            </section>
          )}
          <button type="button" className="bay__launch moon-hangar__launch" onClick={onLaunch}>
            Aim
          </button>
        </div>
      </div>
      {briefingOpen && (
        <MoonBriefing
          mission={mission}
          onContinue={onContinue}
        />
      )}
    </main>
  )
}
