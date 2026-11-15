/**
 * Mission design for players aged 8–12.
 * One picture-card choice at a time: job, tool, rocket, road, radio.
 * Two different packs can both succeed. A heavy tool or a high road needs the big rocket.
 * Scores and stamps stay in plain words. Hangar kilograms stay inside the flight loadout.
 */

export const DESIGN_BUDGET = 120

export const JOBS = Object.freeze({
  earth: {
    id: 'earth',
    name: 'Photos of Earth',
    line: 'Take pictures of Earth so people can see clouds, forests, and cities.',
    nasaName: 'Landsat',
    imageQuery: 'Landsat Earth from space',
  },
  moon: {
    id: 'moon',
    name: 'Ice on the Moon',
    line: 'Look for ice in a crater on the Moon that never sees the Sun.',
    nasaName: 'LCROSS',
    imageQuery: 'LCROSS Moon crater',
  },
  mars: {
    id: 'mars',
    name: 'Rocks on Mars',
    line: 'Look at the red rocks on Mars and send the pictures home.',
    nasaName: 'Perseverance',
    imageQuery: 'Perseverance Mars rover',
  },
})

export const TOOLS = Object.freeze([
  {
    id: 'earth-day', jobs: ['earth'], name: 'Day camera', heavy: false, photos: 2, cost: 20,
    line: 'Takes a few clear pictures. Light enough for the small rocket.',
  },
  {
    id: 'earth-wide', jobs: ['earth'], name: 'Wide camera', heavy: true, photos: 4, cost: 40,
    line: 'Takes many pictures. It is heavy, so it needs the big rocket.',
  },
  {
    id: 'moon-camera', jobs: ['moon'], name: 'Moon camera', heavy: false, photos: 2, cost: 20,
    line: 'Takes a few pictures of the Moon. Light enough for the small rocket.',
  },
  {
    id: 'moon-ice', jobs: ['moon'], name: 'Ice finder', heavy: true, photos: 4, cost: 40,
    line: 'Drives into a dark crater to look for ice. It needs the big rocket.',
  },
  {
    id: 'mars-camera', jobs: ['mars'], name: 'Rock camera', heavy: false, photos: 2, cost: 20,
    line: 'Takes a few pictures of the rocks. Light enough for the small rocket.',
  },
  {
    id: 'mars-lab', jobs: ['mars'], name: 'Rock lab', heavy: true, photos: 4, cost: 40,
    line: 'Looks closely at the rocks and makes more pictures. It needs the big rocket.',
  },
])

export const ROCKETS = Object.freeze([
  {
    id: 'small', name: 'Small rocket', cost: 30,
    line: 'Cheap and light. It cannot lift a heavy tool or fly a high road.',
  },
  {
    id: 'big', name: 'Big rocket', cost: 55,
    line: 'Costs more. It can lift a heavy tool and fly a high road.',
  },
])

/** Kid names for the three Earth orbits already used by the flight. */
export const EARTH_PATHS = Object.freeze([
  {
    id: 'station-orbit', name: 'Low road', high: false, fit: 0.6,
    line: 'Easy to reach. The air up there slows a satellite down, so it falls sooner.',
    nasa: 'The space station uses a road like this.',
  },
  {
    id: 'sun-synchronous', name: 'Same-light road', high: true, fit: 1,
    line: 'Every photo has the same sunlight. Landsat flies a road like this.',
    nasa: 'Landsat takes Earth photos from this kind of road.',
  },
  {
    id: 'tropical-orbit', name: 'Storm road', high: true, fit: 0.75,
    line: 'Great for rain and storms. It never sees the poles.',
    nasa: 'Weather satellites watch storms from roads like this.',
  },
])

/**
 * Three Mars roads inside the window that still meets Mars (134°–138°).
 * The quiet road is the one where Earth is hard to hear.
 */
export const MARS_PATHS = Object.freeze([
  {
    id: 'short', name: 'Short road', high: false, fit: 1, needsRadio: false,
    angleDeg: 135.55, power: 0.75,
    line: 'The quick way. You meet Mars on time.',
    nasa: 'Perseverance flew for about 203 days.',
  },
  {
    id: 'safe', name: 'Clear road', high: false, fit: 0.9, needsRadio: false,
    angleDeg: 136.4, power: 0.75,
    line: 'A little to the side. You still meet Mars, away from the rocks.',
    nasa: 'A small turn still reaches Mars on this map.',
  },
  {
    id: 'quiet', name: 'Quiet road', high: false, fit: 0.85, needsRadio: true,
    angleDeg: 134.3, power: 0.75,
    line: 'Earth is hard to hear on this road. Bring the radio, or the photos stay in space.',
    nasa: 'When the Sun sits between Earth and Mars, the radio can go quiet.',
  },
])

export const MOON_PATH = Object.freeze({
  id: 'moon-road', name: 'Road to the Moon', high: false, fit: 1, needsRadio: false,
  line: 'Next you pick the day. The Moon moves, so the day matters.',
  nasa: 'Apollo 11 took about 3 days to reach the Moon.',
})

export const RADIO_COST = 15

const SURVIVAL = Object.freeze({
  earth: { shield: 1, boosters: 1, astronaut: 1, food: 1 },
  moon: { shield: 1, boosters: 1, astronaut: 1, food: 1, water: 1, medicine: 1, filter: 1, lander: 1 },
  mars: {
    shield: 1, boosters: 1, astronaut: 1, food: 3, pantry: 1, scrubber: 1,
    shelter: 1, parachute: 1, rover: 1, medicine: 1, water: 1, recycler: 1,
  },
})

export const toolById = (id) => TOOLS.find((tool) => tool.id === id) ?? null
export const rocketById = (id) => ROCKETS.find((rocket) => rocket.id === id) ?? null

export function pathsFor(missionId) {
  if (missionId === 'earth') return EARTH_PATHS
  if (missionId === 'mars') return MARS_PATHS
  return [MOON_PATH]
}

export const pathById = (missionId, id) => pathsFor(missionId).find((path) => path.id === id) ?? null

/** Tools for this job, plus one tool from another job shown locked. */
export function toolChoices(missionId) {
  const open = TOOLS.filter((tool) => tool.jobs.includes(missionId))
  const locked = TOOLS.find((tool) => !tool.jobs.includes(missionId))
  return {
    open,
    locked: locked
      ? { ...locked, locked: true, lockLine: 'This tool is for a different job.' }
      : null,
  }
}

export function moneySpent(design) {
  if (!design) return 0
  const tool = toolById(design.toolId)
  const rocket = rocketById(design.rocketId)
  return (tool?.cost ?? 0) + (rocket?.cost ?? 0) + (design.radio ? RADIO_COST : 0)
}

export function moneyLeft(design) {
  return DESIGN_BUDGET - moneySpent(design)
}

/** Why this card cannot be picked, or '' when it is allowed. */
export function blockReason(design, kind, id) {
  const tool = toolById(design?.toolId)
  const rocket = rocketById(kind === 'rocket' ? id : design?.rocketId)
  if (kind === 'rocket' && id === 'small' && tool?.heavy) {
    return 'That tool is heavy. Pick the big rocket.'
  }
  if (kind === 'path') {
    const path = pathById(design?.jobId, id)
    if (path?.high && rocket?.id !== 'big') {
      return 'The small rocket cannot fly this high. Pick the big rocket, or pick the low road.'
    }
  }
  return ''
}

export function designReady(design) {
  if (!design?.jobId || !design.toolId || !design.rocketId) return false
  if (design.jobId !== 'moon' && !design.pathId) return false
  if (typeof design.radio !== 'boolean') return false
  if (blockReason(design, 'rocket', design.rocketId)) return false
  if (design.pathId && blockReason(design, 'path', design.pathId)) return false
  return moneyLeft(design) >= 0
}

export function photoReport(design) {
  const tool = toolById(design?.toolId)
  const path = pathById(design?.jobId, design?.pathId)
  const made = tool?.photos ?? 0
  let delivered = Math.min(made, design?.radio ? 4 : 1)
  if (path?.needsRadio && !design?.radio) delivered = 0
  const allHome = made > 0 && delivered >= made
  let line = `All ${made} photos got home.`
  if (!allHome && delivered > 0) line = `${delivered} of ${made} photos got home. A radio can send the rest.`
  if (delivered === 0) line = 'No photos got home. On the quiet road you need the radio.'
  return { made, delivered, allHome, line }
}

/**
 * Star score for a finished flight. Arriving is enough to pass.
 * A heavier tool, a better road, and photos that get home add stars.
 * @returns {number} 0–100
 */
export function planScore(design) {
  if (!designReady(design)) return 0
  const path = pathById(design.jobId, design.pathId) ?? MOON_PATH
  const tool = toolById(design.toolId)
  const photos = photoReport(design)
  let score = 62
  if (tool?.heavy) score += 16
  if (path.fit >= 0.95) score += 12
  if (photos.allHome) score += 10
  return Math.min(100, score)
}

/** Four stamps: launch, tool, ground station, and the people who use the photos. */
export function missionStamps(design, success) {
  const photos = photoReport(design)
  return [
    {
      id: 'launch',
      ok: Boolean(success),
      title: 'Rocket',
      line: success ? 'The rocket left and did its job.' : 'The rocket did not finish the trip.',
    },
    {
      id: 'tool',
      ok: Boolean(success && design?.toolId),
      title: 'Tool',
      line: success ? 'The tool took its pictures.' : 'The tool did not get to work.',
    },
    {
      id: 'ground',
      ok: Boolean(success && photos.allHome),
      title: 'Home',
      line: photos.line,
    },
    {
      id: 'users',
      ok: Boolean(success && photos.delivered > 0),
      title: 'Science',
      line: photos.delivered > 0
        ? 'A scientist can learn from the photos that got home.'
        : 'No photos got home to study.',
    },
  ]
}

export function weightWord(design) {
  const tool = toolById(design?.toolId)
  if (!tool) return 'Pick a tool'
  return tool.heavy ? 'Full, and it fits' : 'Light'
}

/** Crew supplies plus the chosen radio and, on the Moon, the ice finder. */
export function buildFlightLoadout(missionId, design) {
  const equipped = { ...(SURVIVAL[missionId] ?? SURVIVAL.earth) }
  if (design?.radio) equipped.antenna = 1
  if (design?.toolId === 'moon-ice') equipped.prospector = 1
  return equipped
}

/** A little extra room when the player chose the radio, so the dish fits on the rocket. */
export function missionWithDesign(mission, design) {
  if (!design?.radio || !mission?.loadout) return mission
  return {
    ...mission,
    loadout: {
      ...mission.loadout,
      budget: mission.loadout.budget + 24,
      mass: mission.loadout.mass + 8,
      energy: mission.loadout.energy + 4,
    },
  }
}

export function designAim(design) {
  const path = pathById(design?.jobId, design?.pathId)
  if (!path?.angleDeg) return null
  return { angleDeg: path.angleDeg, power: path.power }
}

/** Meters for the ready screen. Money, photos, radio, and weight. No loose watts. */
export function planMeters(design) {
  const photos = photoReport(design)
  const left = moneyLeft(design)
  const spent = moneySpent(design)
  return [
    {
      id: 'budget',
      label: 'Money',
      current: Math.max(0, left),
      max: DESIGN_BUDGET,
      text: `${Math.max(0, left)} left`,
      fill: Math.round((Math.max(0, left) / DESIGN_BUDGET) * 100),
      tone: left < 20 ? 'warn' : 'ok',
      bar: true,
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: '📷',
      current: photos.delivered,
      max: Math.max(1, photos.made),
      text: `${photos.delivered} home`,
      fill: photos.made ? Math.round((photos.delivered / photos.made) * 100) : 0,
      tone: photos.allHome ? 'ok' : 'warn',
    },
    {
      id: 'radio',
      label: 'Radio',
      icon: '📡',
      current: design?.radio ? 1 : 0,
      max: 1,
      text: design?.radio ? 'On' : 'Off',
      fill: design?.radio ? 100 : 15,
      tone: design?.radio ? 'ok' : 'warn',
    },
    {
      id: 'mass',
      label: 'Weight',
      icon: '⚖️',
      current: toolById(design?.toolId)?.heavy ? 2 : 1,
      max: 2,
      text: weightWord(design),
      fill: toolById(design?.toolId)?.heavy ? 80 : 40,
      tone: 'ok',
    },
  ]
}

export function designPicks(design) {
  const tool = toolById(design?.toolId)
  const rocket = rocketById(design?.rocketId)
  const path = pathById(design?.jobId, design?.pathId)
  return {
    site: '',
    orbit: path?.name ?? '',
    window: design?.radio ? 'Radio on' : 'Radio off',
    craft: rocket?.name ?? '',
    place: tool?.name ?? '',
  }
}
