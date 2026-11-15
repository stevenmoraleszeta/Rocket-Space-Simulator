/**
 * ENCOUNTERS on the way to Mars, and the space facts shown in the corners (no React).
 *
 * When the rocket passes close to a piece of debris or a satellite, the trip stops and the crew
 * picks what to do. Every situation has three choices:
 *   good   the safe thing real crews do: the trip goes on
 *   mild   not great, but nothing breaks: the score drops. The SECOND mild choice blows up the ship
 *   bad    dangerous: the ship blows up right away
 * Words are for kids: short sentences, no hard terms.
 */
import { MARS_HAZARDS, hazardPosition } from './marsLaunchRoute.js'

/** Passing closer than this to a hazard (AU) stops the trip for a decision. */
export const ENCOUNTER_AU = 0.13
/** At most this many decisions in one trip (the closest passes). */
export const MAX_ENCOUNTERS = 3
/** Points lost for each mild choice. */
export const MILD_PENALTY = 20
/** This many mild choices and the ship blows up. */
export const MILD_LIMIT = 2

export const CHOICE = Object.freeze({ GOOD: 'good', MILD: 'mild', BAD: 'bad' })

/** Situations for old rocket stages (kind 'debris'). `{name}` is the object's name. */
const DEBRIS_SITUATIONS = [
  {
    id: 'tumbling-stage',
    question: 'The {name} is tumbling toward your path! What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Fire the small side thrusters to move out of the way', explain: 'Smart! A small push was enough to slip past it.' },
      { kind: CHOICE.MILD, text: 'Keep going and hope it misses', explain: 'It missed, but only by luck. Real crews never just hope.' },
      { kind: CHOICE.BAD, text: 'Grab it with the robot arm', explain: 'It was spinning too fast! It smashed into the ship.' },
    ],
  },
  {
    id: 'bolt-cloud',
    question: 'Tiny bolts and paint chips from the {name} are flying ahead! What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Turn the ship so its strong shield faces the cloud', explain: 'Great! The shield took the little hits and the crew stayed safe.' },
      { kind: CHOICE.MILD, text: 'Close the window covers and wait', explain: 'The covers helped a bit, but some chips scratched the ship.' },
      { kind: CHOICE.BAD, text: 'Open the hatch to look outside', explain: 'Never open the hatch in space! The chips flew straight in.' },
    ],
  },
]

/** Situations for spacecraft (kind 'satellite'). */
const SATELLITE_SITUATIONS = [
  {
    id: 'close-satellite',
    question: '{name} is right ahead! What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Call mission control and follow the safe path they send', explain: 'Perfect! Mission control always knows where the spacecraft are.' },
      { kind: CHOICE.MILD, text: 'Turn on all the lights so it can see you', explain: 'Spacecraft do not have eyes! It did not help, but you were not too close.' },
      { kind: CHOICE.BAD, text: 'Fly right next to it to take a photo', explain: 'Too close! The ship bumped into it.' },
    ],
  },
  {
    id: 'radio-noise',
    question: 'Your radio gets noisy near {name}. What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Switch to the backup antenna and keep talking to Earth', explain: 'Nice! A backup is there for moments like this.' },
      { kind: CHOICE.MILD, text: 'Turn the radio off for a while', explain: 'You stayed safe, but Earth could not hear you for hours.' },
      { kind: CHOICE.BAD, text: 'Steer toward it to hear better', explain: 'Steering toward it was a big mistake. The ship crashed into it.' },
    ],
  },
]

/** Mixes the three choices so the right one is not always first. */
function shuffled(list, seed) {
  const copy = [...list]
  let state = seed
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 9301 + 49297) % 233280
    const j = Math.floor((state / 233280) * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * The close passes of one trip, in order: { day, hazard, situation }.
 * The hazard the rocket crashes into (a bad aim) is not asked: that crash is the aim's fault.
 */
export function tripEncounters(trip) {
  const endDay = trip.outcome.day
  const crashedInto = trip.outcome.hazard?.id
  const passes = []
  for (const hazard of MARS_HAZARDS) {
    if (hazard.id === crashedInto) continue
    let closest = null
    for (const sample of trip.samples) {
      if (sample.day >= endDay) break
      const spot = hazardPosition(hazard, sample.day)
      const distance = Math.hypot(spot.x - sample.x, spot.y - sample.y)
      if (!closest || distance < closest.distance) closest = { day: sample.day, distance }
    }
    if (closest && closest.distance < ENCOUNTER_AU) passes.push({ hazard, ...closest })
  }
  return passes
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_ENCOUNTERS)
    .sort((a, b) => a.day - b.day)
    .map((pass, index) => {
      const pool = pass.hazard.kind === 'debris' ? DEBRIS_SITUATIONS : SATELLITE_SITUATIONS
      const base = pool[index % pool.length]
      return {
        day: pass.day,
        hazard: pass.hazard,
        situation: {
          ...base,
          question: base.question.replace('{name}', pass.hazard.name),
          choices: shuffled(base.choices, Math.round(pass.day) + index * 7),
        },
      }
    })
}

/** Facts shown in a corner, a new one every 20 seconds. */
export const SPACE_FACTS = [
  'A day on Mars is 24 hours and 37 minutes, almost like on Earth.',
  'Mars looks red because its dust has rust in it.',
  'Olympus Mons on Mars is the tallest volcano we know, almost three times taller than Mount Everest.',
  'Light from the Sun takes about 8 minutes to reach Earth.',
  'Mars has two small moons, Phobos and Deimos.',
  'In space there is no air, so there is no sound.',
  'Astronauts grow a little taller in space, because their back is not squeezed by gravity.',
  'The Sun is so big that about one million Earths could fit inside it.',
  'A year on Mars lasts 687 Earth days.',
  'On Mars you would weigh about one third of what you weigh on Earth.',
  'The footprints on the Moon will stay for millions of years, because there is no wind.',
  'The International Space Station goes around the Earth about 16 times every day.',
  'Mars has the biggest dust storms in the Solar System. Some cover the whole planet.',
  'A radio message takes between 3 and 22 minutes to go from Earth to Mars.',
  'Venus is the hottest planet, even though Mercury is closer to the Sun.',
  'Jupiter is so big that all the other planets could fit inside it.',
  'Saturn is so light for its size that it would float in a giant bathtub.',
  'There are robots driving on Mars right now, like the rover Perseverance.',
  'Sunsets on Mars look blue.',
  'Neutron stars are so heavy that a spoonful would weigh as much as a mountain.',
]

export const FACT_EVERY_MS = 20_000
