/**
 * LUNAR ORBIT EVENTS — short surprises while the crew maps the Moon, after a good arrival.
 *
 * Each choice can need a hangar part (parts.js id in `part`). A part the trip broke
 * (a satellite crash can bend the radio dish) does not count. With no choice before the
 * timer ends, the risky one happens.
 *
 * Effects multiply the science (scienceFactor) or remove map data (dataLoss, in %).
 * A choice with an `action` is hands-on: after picking it, the player has to do it
 *   tap   tap fast enough (`goal` taps) before the clock runs out
 *   aim   turn a dial into the green zone and lock it
 * and a missed action gives `missResult` / `missEffect` (better than the risky choice).
 * Real background:
 *   - Lunar orbiters lose radio contact behind the Moon every orbit (Apollo 8 was the first).
 *   - The August 1972 solar particle event fell between Apollo 16 and Apollo 17.
 *   - LCROSS found water ice in Cabeus crater, which never sees the Sun, in October 2009.
 *   - Apollo cleaned exhaled carbon dioxide with lithium hydroxide filters (Apollo 13 ran short).
 */

/** Packed count of a part (same rule as parts.js partCount, without loading the part art). */
function packed(equipped, id) {
  const value = equipped?.[id]
  if (typeof value === 'number') return Math.max(0, value)
  return value ? 1 : 0
}

export const MOON_ORBIT_EVENTS = [
  {
    id: 'shadow',
    name: 'Behind the Moon',
    icon: 'moon-dark-crescent',
    seconds: 15,
    text: 'The Moon is between you and Earth. Nobody at home can hear the radio.',
    choices: [
      {
        id: 'dish', label: 'Store the maps in the radio dish', part: 'antenna',
        action: { kind: 'aim', label: 'Turn the dish to where Earth comes back, then lock it.' },
        result: 'The dish kept every map and sent them when Earth came back.',
        missResult: 'The dish pointed a bit off. Some maps had to be sent twice and a few were lost.', missEffect: { dataLoss: 8 },
      },
      { id: 'wait', label: 'Stop mapping until Earth is back', result: 'The maps are safe, but you lost some mapping time.', effect: { scienceFactor: 0.94 } },
      { id: 'risk', label: 'Keep sending', risky: true, result: 'The Moon blocked the signal. Some maps never reached Earth.', effect: { dataLoss: 25 } },
    ],
  },
  {
    id: 'storm',
    name: 'Solar storm',
    icon: 'sunBig',
    seconds: 15,
    text: 'The Sun threw out a cloud of very fast particles. It reaches the Moon in minutes.',
    choices: [
      {
        id: 'shelter', label: 'Hide in the storm shelter', part: 'shelter',
        action: { kind: 'tap', goal: 8, label: 'Tap fast to seal the shelter door!' },
        result: 'The crew waited in the thick little room. Everyone is fine.',
        missResult: 'The door closed late and a few particles got in. Science −6%.', missEffect: { scienceFactor: 0.94 },
      },
      { id: 'off', label: 'Turn the cameras off', result: 'The cameras are safe, but some pictures were missed.', effect: { scienceFactor: 0.9 } },
      { id: 'risk', label: 'Keep working', risky: true, result: 'Particles hit the cameras and the crew. Science −20%.', effect: { scienceFactor: 0.8 } },
    ],
  },
  {
    id: 'ice',
    name: 'Dark crater',
    icon: 'ice',
    seconds: 15,
    text: 'You fly over a crater near the south pole that never sees the Sun.',
    choices: [
      {
        id: 'rover', label: 'Send the ice rover in', part: 'prospector',
        action: { kind: 'aim', label: 'Steer the rover to the frozen spot, then lock it.' },
        result: 'The rover found ice in the dark! Big science bonus.', effect: { scienceFactor: 1.2 },
        missResult: 'The rover reached the crater floor but missed the ice. Small bonus.', missEffect: { scienceFactor: 1.05 },
      },
      { id: 'photo', label: 'Take pictures from orbit', result: 'The pictures show the crater rim, but not the ice.' },
      { id: 'risk', label: 'Skip it', risky: true, result: 'You flew past without looking.', effect: { scienceFactor: 0.92 } },
    ],
  },
  {
    id: 'air',
    name: 'Stuffy cabin',
    icon: 'bubbles',
    seconds: 15,
    text: 'The crew breathes out a gas that slowly fills the cabin.',
    choices: [
      {
        id: 'filter', label: 'Change the air filter', part: 'filter',
        action: { kind: 'tap', goal: 6, label: 'Tap to twist the new filter in!' },
        result: 'The filter cleaned the air. Heads are clear.',
        missResult: 'The filter went in slowly. A couple of headaches. Science −5%.', missEffect: { scienceFactor: 0.95 },
      },
      { id: 'risk', label: 'Open a vent and hope', risky: true, result: 'Headaches slowed the crew down. Science −15%.', effect: { scienceFactor: 0.85 } },
    ],
  },
  {
    id: 'rock',
    name: 'Tiny meteor',
    icon: 'asteroid',
    seconds: 15,
    text: 'A grain of space rock, faster than a bullet, is coming at the ship.',
    choices: [
      {
        id: 'shield', label: 'Turn the shield toward it', part: 'shield',
        action: { kind: 'aim', label: 'Turn the shield to face the rock, then lock it.' },
        result: 'The shield took the hit.',
        missResult: 'The shield was only half turned. A small dent. Science −5%.', missEffect: { scienceFactor: 0.95 },
      },
      {
        id: 'dodge', label: 'Fire the side thrusters', part: 'fuel',
        action: { kind: 'tap', goal: 7, label: 'Tap to pulse the thrusters!' },
        result: 'The ship slid out of the way.',
        missResult: 'The ship moved, but not quite enough. A scratch. Science −5%.', missEffect: { scienceFactor: 0.95 },
      },
      { id: 'risk', label: 'Do nothing', risky: true, result: 'The grain cracked a camera. Science −15%.', effect: { scienceFactor: 0.85 } },
    ],
  },
  {
    id: 'misfire',
    name: 'Engine hiccup',
    icon: 'rocket',
    seconds: 15,
    timing: true,
    text: 'The engine that keeps you in orbit coughs. Fire it at the right moment.',
    choices: [
      { id: 'timing', label: 'Hold, then release in the green zone', result: 'Good timing! The orbit is steady.' },
    ],
    missedResult: 'The burn was late. The orbit wobbles and the maps are blurry. Science −20%.',
    missedEffect: { scienceFactor: 0.8 },
  },
]

/** Events played in lunar orbit. */
export const ORBIT_EVENT_COUNT = 3

/** Picks the events for one visit, never the same twice. */
export function pickOrbitEvents(count = ORBIT_EVENT_COUNT, random = Math.random) {
  const remaining = [...MOON_ORBIT_EVENTS]
  const chosen = []
  while (remaining.length && chosen.length < count) {
    chosen.push(remaining.splice(Math.floor(random() * remaining.length), 1)[0])
  }
  return chosen
}

/** Why a choice cannot be picked ('' when it can). */
export function choiceBlockedReason(choice, equipped, broken = []) {
  if (!choice.part) return ''
  if (broken.includes(choice.part)) return 'Broken on the way here.'
  if (packed(equipped, choice.part) < 1) return 'Not packed in the hangar.'
  return ''
}

/** Effect of a choice: { scienceFactor, dataLoss, note }. */
export function resolveOrbitEvent(event, choiceId, { timingSuccess = true, actionSuccess = true } = {}) {
  const choice = event.choices.find((item) => item.id === choiceId)
    ?? event.choices.find((item) => item.risky)
    ?? event.choices[0]
  if (event.timing && !timingSuccess) {
    return { scienceFactor: event.missedEffect.scienceFactor ?? 1, dataLoss: event.missedEffect.dataLoss ?? 0, note: event.missedResult }
  }
  if (choice.action && !actionSuccess) {
    return { scienceFactor: choice.missEffect?.scienceFactor ?? 1, dataLoss: choice.missEffect?.dataLoss ?? 0, note: choice.missResult }
  }
  return {
    scienceFactor: choice.effect?.scienceFactor ?? 1,
    dataLoss: choice.effect?.dataLoss ?? 0,
    note: choice.result,
  }
}
