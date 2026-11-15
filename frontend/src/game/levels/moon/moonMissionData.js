export const MOON_DIFFICULTIES = {
  basic: { id: 'basic', name: 'Basic', budget: 119, attempts: 3, events: 1, crew: false },
  intermediate: { id: 'intermediate', name: 'Medium', budget: 110, attempts: 2, events: 2, crew: false },
  advanced: { id: 'advanced', name: 'Advanced', budget: 100, attempts: 1, events: 3, crew: true },
  experimental: { id: 'experimental', name: 'Experimental', budget: Infinity, attempts: 3, events: 4, crew: true },
}

export const MOON_CATEGORIES = [
  { id: 'instruments', label: '🔭 Instruments', hint: 'Tools that study the Moon.' },
  { id: 'rocket', label: '🚀 Rocket', hint: 'Pick a rocket that can reach the Moon.' },
  { id: 'systems', label: '🧰 Systems', hint: 'Power, heat, fuel, radio, and data.' },
  { id: 'crew', label: '👩‍🚀 Crew', hint: 'Helpers are only for Advanced and Experimental.' },
]

export const MOON_ROCKETS = [
  { id: 'small', name: 'Small rocket', cost: 10, mass: 45, capacity: 150, thrust: 24, fuel: 18, lunar: false, reason: 'Too little power to reach the Moon.' },
  { id: 'medium', name: 'Medium rocket', cost: 35, mass: 90, capacity: 350, thrust: 55, fuel: 20, lunar: true },
  { id: 'heavy', name: 'Heavy rocket', cost: 90, mass: 180, capacity: 1800, thrust: 90, fuel: 45, lunar: true },
]

export const MOON_INSTRUMENTS = [
  { id: 'camera', name: 'Moon Eyes', real: 'camera', icon: '📷', mass: 35, energy: 40, heat: 3, data: 10, cost: 8, science: 30, tip: 'Takes clear pictures of the Moon.' },
  { id: 'laser', name: 'Laser Ruler', real: 'laser altimeter', icon: '📏', mass: 30, energy: 60, heat: 4, data: 2, cost: 11, science: 26, tip: 'Measures hills and crater depths.' },
  { id: 'thermometer', name: 'Thermometer', real: 'radiometer', icon: '🌡️', mass: 15, energy: 20, heat: 1, data: 1, cost: 4, science: 14, tip: 'Measures how warm or cold the ground is.' },
  { id: 'ice', name: 'Ice Finder', real: 'hydrogen detector', icon: '🧊', mass: 20, energy: 25, heat: 2, data: 0.5, cost: 6, science: 18, tip: 'Looks for signs of water ice.' },
  { id: 'radiation', name: 'Radiation Meter', real: 'cosmic-ray telescope', icon: '☢️', mass: 8, energy: 10, heat: 1, data: 0.3, cost: 3, science: 12, tip: 'Checks the space weather around the Moon.' },
  { id: 'compass', name: 'Space Compass', real: 'magnetometer', icon: '🧭', mass: 5, energy: 5, heat: 1, data: 0.1, cost: 2, science: 10, tip: 'Measures the Moon’s tiny magnetic fields.' },
  { id: 'radar', name: 'Echo Mapper', real: 'Mini-RF radar', icon: '📡', mass: 18, energy: 25, heat: 2, data: 2, cost: 9, science: 22, tip: 'Radar can look for ice in dark craters.' },
]

export const MOON_SYSTEMS = [
  { id: 'solar', name: 'Solar panels', icon: '☀️', mass: 18, energySupply: 90, cost: 12, tip: 'Makes power in sunlight.' },
  { id: 'battery', name: 'Battery', icon: '🔋', mass: 10, energySupply: 45, cost: 8, tip: 'Stores power for the Moon’s shadow.' },
  { id: 'radiator', name: 'Radiator', icon: '❄️', mass: 12, heat: -12, cost: 8, tip: 'Moves extra heat away from the ship.' },
  { id: 'heater', name: 'Heater', icon: '🔥', mass: 6, energyUse: 12, heat: 2, cost: 6, tip: 'Uses power to keep tools warm at night.' },
  { id: 'fuel', name: 'Fuel tank', icon: '⛽', mass: 12, thrust: 18, fuel: 35, cost: 10, tip: 'Adds fuel for the trip and lunar braking.' },
  { id: 'antenna-low', name: 'Small antenna', icon: '📶', mass: 8, energyUse: 3, comms: 6, cost: 7, tip: 'Sends a little data to Earth each day.' },
  { id: 'antenna-medium', name: 'Medium antenna', icon: '📡', mass: 15, energyUse: 6, comms: 18, cost: 12, tip: 'Sends more data, but needs more power.' },
  { id: 'antenna-high', name: 'Big antenna', icon: '🛰️', mass: 25, energyUse: 12, comms: 32, cost: 25, tip: 'Sends lots of data, with extra mass and cost.' },
  { id: 'storage', name: 'Data drive', icon: '💾', mass: 8, storage: 22, cost: 6, tip: 'Saves data while the Moon blocks the signal.' },
  { id: 'shield', name: 'Debris shield', icon: '🛡️', mass: 14, energyUse: 5, cost: 12, tip: 'Stops space debris from damaging the ship.' },
  { id: 'spare', name: 'Spare instrument', icon: '🧰', mass: 8, cost: 8, tip: 'Lets you replace one broken instrument.' },
  { id: 'food', name: 'Food pack', icon: '🥫', mass: 12, food: 30, cost: 6, tip: 'Food for a crew member.' },
  { id: 'air', name: 'Air tank', icon: '🫧', mass: 12, air: 30, cost: 6, tip: 'Breathing air for a crew member.' },
]

export const MOON_CREW = [
  { id: 'spark', name: 'Spark', job: 'Electrician', icon: '⚡', mass: 12, energyFactor: 0.9, risk: '25% short-circuit risk', tip: 'Uses 10% less power, but may cause a short circuit.' },
  { id: 'wrench', name: 'Wrench', job: 'Mechanic', icon: '🔧', mass: 12, ignoreFirstDamage: true, risk: '+12 kg', tip: 'Stops the first damage, but adds 12 kg.' },
  { id: 'lens', name: 'Lens', job: 'Scientist', icon: '🔬', mass: 12, scienceFactor: 1.15, dataFactor: 1.2, risk: '+20% data', tip: 'Adds 15% science, but makes 20% more data.' },
  { id: 'cloud', name: 'Cloud', job: 'Communications', icon: '📻', mass: 12, commsFactor: 1.25, energyUse: 8, risk: 'Uses extra power', tip: 'Sends 25% more data, but uses extra power.' },
]

export const MOON_EVENTS = [
  {
    id: 'debris', name: 'Space debris', icon: '☄️', seconds: 2,
    choices: [
      { id: 'dodge', label: 'Dodge', result: 'The ship turned in time. Space rocks are dangerous.' },
      { id: 'shield', label: 'Use shield', system: 'shield', energy: 8, result: 'The shield blocked the debris.' },
      { id: 'risk', label: 'Do nothing', risky: true, result: 'Debris damaged the ship. Science −15%.' },
    ],
  },
  {
    id: 'storm', name: 'Solar storm', icon: '☀️', seconds: 5,
    choices: [
      { id: 'off', label: 'Turn tools off', result: 'The tools stayed safe, but missed some science.' },
      { id: 'panels', label: 'Turn panels away', system: 'solar', fuel: 2, result: 'The panels turned away from the storm.' },
      { id: 'risk', label: 'Keep going', risky: true, result: 'The storm used 20% extra power.' },
    ],
  },
  {
    id: 'fault', name: 'Tool trouble', icon: '🔧', seconds: 5,
    choices: [
      { id: 'restart', label: 'Restart it', system: 'battery', energy: 10, result: 'A quick restart fixed the tool.' },
      { id: 'spare', label: 'Use spare tool', system: 'spare', result: 'The spare tool replaced the broken one.' },
      { id: 'risk', label: 'Ignore it', risky: true, result: 'The broken tool made 18% less science.' },
    ],
  },
  {
    id: 'shadow', name: 'Behind the Moon', icon: '🌘', seconds: 5,
    choices: [
      { id: 'save', label: 'Save data', system: 'storage', result: 'The drive saved data until the signal returned.' },
      { id: 'send', label: 'Keep sending', risky: true, result: 'The Moon blocked the signal. The data was not sent.' },
    ],
  },
  {
    id: 'heat', name: 'Too much heat', icon: '🌡️', seconds: 5,
    choices: [
      { id: 'radiator', label: 'Use radiator', system: 'radiator', result: 'The radiator carried heat away.' },
      { id: 'off', label: 'Turn one tool off', result: 'The tools cooled down.' },
      { id: 'risk', label: 'Ignore it', risky: true, result: 'Heat turned off one instrument.' },
    ],
  },
  {
    id: 'night', name: 'Lunar night', icon: '🌙', seconds: 5,
    choices: [
      { id: 'save', label: 'Save battery', system: 'battery', result: 'Power was saved for the cold night.' },
      { id: 'heater', label: 'Use heater', system: 'heater', energy: 5, result: 'The heater kept the instruments warm.' },
      { id: 'risk', label: 'Ignore it', risky: true, result: 'Cold used 20% extra power.' },
    ],
  },
  {
    id: 'misfire', name: 'Engine misfire', icon: '🚀', seconds: 5,
    choices: [{ id: 'timing', label: 'Hold, then release in the green zone', result: 'Good timing! The engine stayed on.' }],
  },
]

export const SUGGESTED_MOON_LOADOUT = {
  rocket: 'medium',
  instruments: ['camera', 'ice', 'thermometer'],
  systems: ['solar', 'battery', 'radiator', 'fuel', 'antenna-medium', 'storage'],
  crew: [],
}

export function calculateMoonMetrics(loadout, difficultyId = 'basic') {
  const difficulty = MOON_DIFFICULTIES[difficultyId] ?? MOON_DIFFICULTIES.basic
  const rocket = MOON_ROCKETS.find((item) => item.id === loadout.rocket) ?? MOON_ROCKETS[0]
  const instruments = MOON_INSTRUMENTS.filter((item) => loadout.instruments.includes(item.id))
  const systems = MOON_SYSTEMS.filter((item) => loadout.systems.includes(item.id))
  const crew = MOON_CREW.filter((item) => loadout.crew.includes(item.id))
  const sum = (items, key) => items.reduce((total, item) => total + (item[key] ?? 0), 0)
  const mass = 45 + rocket.mass + sum(instruments, 'mass') + sum(systems, 'mass') + sum(crew, 'mass')
  const cost = rocket.cost + sum(instruments, 'cost') + sum(systems, 'cost')
  const energySupply = sum(systems, 'energySupply')
  const crewEnergyFactor = crew.some((item) => item.id === 'spark') ? 0.9 : 1
  const energyUse = (8 + sum(instruments, 'energy') + sum(systems, 'energyUse') + sum(crew, 'energyUse')) * crewEnergyFactor
  const rawHeat = 8 + sum(instruments, 'heat') + sum(systems, 'heat')
  const thrust = rocket.thrust + sum(systems, 'thrust')
  const fuel = rocket.fuel + sum(systems, 'fuel')
  const dataPerDay = sum(instruments, 'data') * (crew.some((item) => item.id === 'lens') ? 1.2 : 1)
  const commsPerDay = sum(systems, 'comms') * (crew.some((item) => item.id === 'cloud') ? 1.25 : 1)
  const storage = sum(systems, 'storage')
  const totalData = dataPerDay * 10
  const retainedData = Math.min(totalData, commsPerDay * 9 + storage)
  const dataLostPercent = totalData > 0 ? Math.round((1 - retainedData / totalData) * 100) : 100
  const science = sum(instruments, 'science') * (crew.some((item) => item.id === 'lens') ? 1.15 : 1)
  const food = sum(systems, 'food')
  const air = sum(systems, 'air')
  const crewNeedsFood = crew.length * 10
  const crewNeedsAir = crew.length * 10
  const maxHeat = 18
  const thrustChecks = [
    { id: 'earth', label: 'Leave Earth', need: 35, fuel: 12 },
    { id: 'travel', label: 'Travel to the Moon', need: 42, fuel: 18 },
    { id: 'braking', label: 'Slow into lunar orbit', need: 38, fuel: 15 },
  ]
  const availableFuel = thrustChecks.reduce((total, check) => total + check.fuel, 0)
  const mainInstrument = instruments.some((item) => item.id === 'camera' || item.id === 'laser')

  const checks = [
    { id: 'rocket', label: 'Moon rocket', ok: rocket.lunar, detail: rocket.lunar ? `${rocket.name} can reach the Moon.` : rocket.reason },
    { id: 'instrument', label: 'Map instrument', ok: mainInstrument, detail: mainInstrument ? 'Moon Eyes or Laser Ruler is ready.' : 'Add Moon Eyes or Laser Ruler to make a map.' },
    { id: 'budget', label: 'Budget', ok: cost <= difficulty.budget, luckyChance: difficulty.budget !== Infinity && cost > difficulty.budget && cost <= difficulty.budget * 1.12, detail: difficulty.budget === Infinity || cost <= difficulty.budget ? `${difficulty.budget === Infinity ? 'No limit' : difficulty.budget - cost + ' credits left'}.` : `${cost - difficulty.budget} credits over budget.` },
    { id: 'mass', label: 'Mass', ok: mass <= rocket.capacity, luckyChance: mass > rocket.capacity && mass <= rocket.capacity * 1.12, detail: mass <= rocket.capacity ? `${mass} of ${rocket.capacity} kg.` : `${mass - rocket.capacity} kg too heavy.` },
    { id: 'energy', label: 'Energy', ok: energySupply >= energyUse && loadout.systems.includes('battery'), luckyChance: loadout.systems.includes('battery') && energySupply < energyUse && energySupply >= energyUse * 0.9, detail: energySupply >= energyUse && loadout.systems.includes('battery') ? `${energySupply} power ready for ${Math.ceil(energyUse)} needed.` : 'Add enough solar power and a battery for the Moon’s shadow.' },
    { id: 'heat', label: 'Heat', ok: rawHeat <= maxHeat, luckyChance: rawHeat > maxHeat && rawHeat <= maxHeat * 1.12, detail: rawHeat <= maxHeat ? `${rawHeat} heat is safe.` : `Too hot by ${rawHeat - maxHeat}. Add a radiator or remove a tool.` },
    { id: 'fuel', label: 'Fuel and thrust', ok: thrustChecks.every((check) => thrust >= check.need) && fuel >= availableFuel, luckyChance: (!thrustChecks.every((check) => thrust >= check.need) || fuel < availableFuel) && thrustChecks.every((check) => thrust >= check.need * 0.9) && fuel >= availableFuel * 0.9, detail: thrustChecks.map((check) => `${check.label}: ${thrust >= check.need && fuel >= check.fuel ? 'Good' : 'Fail'}`).join(' · ') },
    { id: 'data', label: 'Data', ok: dataLostPercent <= 20, luckyChance: dataLostPercent > 20 && dataLostPercent <= 32, detail: `${dataLostPercent}% data lost. Save data behind the Moon.` },
    { id: 'crew', label: 'Crew supplies', ok: food >= crewNeedsFood && air >= crewNeedsAir, detail: crew.length ? `${food}/${crewNeedsFood} food · ${air}/${crewNeedsAir} air.` : 'Robot mission: no food or air needed.' },
  ]

  return {
    difficulty, rocket, instruments, systems, crew, mass, cost, energySupply, energyUse, rawHeat,
    maxHeat, thrust, fuel, dataPerDay, commsPerDay, storage, dataLostPercent, science,
    food, air, crewNeedsFood, crewNeedsAir, thrustChecks, checks,
  }
}

export function assessMoonBuild(loadout, difficultyId, random = Math.random) {
  const metrics = calculateMoonMetrics(loadout, difficultyId)
  const lucky = []
  const checks = metrics.checks.map((check) => {
    const { luckyChance, ...result } = check
    if (check.ok || !luckyChance || random() >= 0.12) return result
    lucky.push(check.label)
    return { ...result, ok: true, lucky: true, detail: `${check.detail} Lucky! The ship survived by a little.` }
  })
  return { ...metrics, checks, lucky, success: checks.every((check) => check.ok) }
}

export function createMoonEventOrder(count, random = Math.random) {
  const remaining = [...MOON_EVENTS]
  const chosen = []
  while (remaining.length && chosen.length < count) {
    const index = Math.floor(random() * remaining.length)
    chosen.push(remaining.splice(index, 1)[0])
  }
  return chosen
}

export function resolveMoonEvent(eventId, choiceId, loadout, options = {}) {
  const event = MOON_EVENTS.find((item) => item.id === eventId)
  if (!event) throw new Error(`Unknown Moon event: ${eventId}`)
  const choice = event.choices.find((item) => item.id === choiceId)
    ?? event.choices.find((item) => item.risky)
    ?? event.choices[0]
  const random = options.random ?? Math.random
  const impact = { scienceFactor: 1, dataLoss: 0, energyPenalty: 0, fuelPenalty: 0 }

  if (choice.risky) {
    if (eventId === 'debris') impact.scienceFactor = 0.85
    if (eventId === 'storm' || eventId === 'night') impact.energyPenalty = 27
    if (eventId === 'fault' || eventId === 'heat') impact.scienceFactor = 0.82
    if (eventId === 'shadow') impact.dataLoss = 30
  } else if (eventId === 'storm' && choice.id === 'off') {
    impact.scienceFactor = 0.92
  } else if (eventId === 'storm' && choice.id === 'panels') {
    impact.fuelPenalty = choice.fuel
  } else if (eventId === 'fault' && choice.id === 'restart') {
    impact.energyPenalty = choice.energy
  } else if (eventId === 'heat' && choice.id === 'off') {
    impact.scienceFactor = 0.9
  } else if (eventId === 'night' && choice.id === 'heater') {
    impact.energyPenalty = choice.energy
  } else if (eventId === 'misfire' && !options.timingSuccess) {
    impact.scienceFactor = 0.75
    impact.energyPenalty = 10
  } else if (choice.energy) {
    impact.energyPenalty = choice.energy
  }

  const instrumentIds = loadout.instruments
  const availableInstruments = (eventId === 'fault' || (eventId === 'heat' && choice.risky))
    ? MOON_INSTRUMENTS.filter((item) => instrumentIds.includes(item.id))
    : []
  const instrumentIndex = availableInstruments.length
    ? Math.min(availableInstruments.length - 1, Math.floor(random() * availableInstruments.length))
    : -1
  const instrument = availableInstruments[instrumentIndex] ?? null
  const shortCircuit = loadout.crew.includes('spark') && random() < 0.25
  if (shortCircuit) impact.energyPenalty += 12

  const ignoredDamage = Boolean(options.ignoreDamage && choice.risky)
  if (ignoredDamage) {
    impact.scienceFactor = 1
    impact.dataLoss = 0
    impact.energyPenalty = 0
    impact.fuelPenalty = 0
  }

  const eventNote = instrument && eventId === 'fault'
    ? choice.id === 'risk' ? `${instrument.name} stopped; science was reduced.` : `${instrument.name} works again.`
    : instrument && eventId === 'heat' && !ignoredDamage
      ? `${instrument.name} switched off to cool the ship.`
      : choice.result
  const note = shortCircuit
    ? `${eventNote} Spark caused a short circuit; extra power was lost.`
    : ignoredDamage
      ? `${eventNote} Wrench stopped the first damage.`
      : eventNote
  return { ...impact, note, choiceId: choice.id }
}
