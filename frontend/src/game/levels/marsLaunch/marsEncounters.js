/**
 * ENCOUNTERS on the way to Mars, and the space facts shown in the corners (no React).
 *
 * When the rocket passes close to a piece of debris or a satellite, the trip stops and the crew
 * picks what to do. Every situation has three choices:
 *   good   the safe thing real crews do: the trip goes on
 *   mild   not great, or it damages the ship: the score drops. The SECOND mild choice blows it up
 *   bad    dangerous: the ship blows up right away
 *
 * The asteroid challenge: two runaway asteroids from the asteroid belt always cross the road, in
 * the second half of the trip. The first one comes as a whole shower of rocks that the player
 * dodges with the mouse (AsteroidShower.jsx). The second is made of ice: its card tells how icy
 * asteroids and comets brought water to the young Earth.
 * Words are for kids: short sentences, no hard terms.
 */
import { MARS_HAZARDS, hazardPosition } from './marsLaunchRoute.js'

/** Passing closer than this to a hazard (AU) stops the trip for a decision. */
export const ENCOUNTER_AU = 0.13
/** At most this many satellite or debris decisions in one trip (the closest passes). */
export const MAX_ENCOUNTERS = 2
/** Points lost for each mild choice. */
export const MILD_PENALTY = 20
/** This many mild choices and the ship blows up. */
export const MILD_LIMIT = 2

export const CHOICE = Object.freeze({ GOOD: 'good', MILD: 'mild', BAD: 'bad' })

/**
 * Situations for old rocket stages (kind 'debris'). `{{name}}` is the object's name: the screen
 * translates the question first and then fills in the translated name (i18n t() variables).
 */
const DEBRIS_SITUATIONS = [
  {
    id: 'tumbling-stage',
    question: 'The {{name}} is tumbling toward your path! What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Fire the small side thrusters to move out of the way', explain: 'Smart! A small push was enough to slip past it.' },
      { kind: CHOICE.MILD, text: 'Keep going and hope it misses', explain: 'It missed, but only by luck. Real crews never just hope.' },
      { kind: CHOICE.BAD, text: 'Grab it with the robot arm', explain: 'It was spinning too fast! It smashed into the ship.' },
    ],
  },
  {
    id: 'bolt-cloud',
    question: 'Tiny bolts and paint chips from the {{name}} are flying ahead! What should the crew do?',
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
    question: '{{name}} is right ahead! What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Call mission control and follow the safe path they send', explain: 'Perfect! Mission control always knows where the spacecraft are.' },
      { kind: CHOICE.MILD, text: 'Turn on all the lights so it can see you', explain: 'Spacecraft do not have eyes! It did not help, but you were not too close.' },
      { kind: CHOICE.BAD, text: 'Fly right next to it to take a photo', explain: 'Too close! The ship bumped into it.' },
    ],
  },
  {
    id: 'radio-noise',
    question: 'Your radio gets noisy near {{name}}. What should the crew do?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Switch to the backup antenna and keep talking to Earth', explain: 'Nice! A backup is there for moments like this.' },
      { kind: CHOICE.MILD, text: 'Turn the radio off for a while', explain: 'You stayed safe, but Earth could not hear you for hours.' },
      { kind: CHOICE.BAD, text: 'Steer toward it to hear better', explain: 'Steering toward it was a big mistake. The ship crashed into it.' },
    ],
  },
]

/** The two runaway asteroids, met at these fractions of the trip. */
export const RUNAWAY_ASTEROIDS = [
  {
    id: 'runaway-rock',
    kind: 'asteroid',
    name: 'Runaway asteroid',
    icy: false,
    // A whole shower of rocks: a dodging game instead of a choice card
    shower: true,
    tripFraction: 0.5,
    summary: 'A rocky asteroid that escaped the asteroid belt, past Mars, after a push from Jupiter.',
  },
  {
    id: 'runaway-ice',
    kind: 'asteroid',
    name: 'Ice asteroid',
    icy: true,
    tripFraction: 0.78,
    summary: 'An asteroid made of ice and rock that escaped the asteroid belt.',
  },
]

/** The story an ice asteroid tells: where the water on Earth came from. */
export const ICE_WATER_STORY =
  'Long ago, the young Earth was hot and dry. Icy asteroids and comets crashed into it and brought ice that melted into water. Part of the water in our oceans may have come from rocks like this one!'

const ASTEROID_SITUATIONS = {
  rock: {
    id: 'runaway-rock',
    question: 'An asteroid escaped from the asteroid belt and is flying right at the ship! How do you dodge it?',
    choices: [
      { kind: CHOICE.GOOD, text: 'Fire the engines early and move out of its path', explain: 'Great dodge! You moved early, so the asteroid flew past far away.' },
      { kind: CHOICE.MILD, text: 'Turn the shield toward it and let small pieces hit', explain: 'Small rocks dented the ship. It still flies, but it is damaged.' },
      { kind: CHOICE.BAD, text: 'Fly through the gap between its rocks', explain: 'There was no gap big enough. The asteroid smashed into the ship.' },
    ],
  },
  ice: {
    id: 'runaway-ice',
    question: 'Another asteroid escaped the belt. It shines because it is made of ice! How do you dodge it?',
    story: ICE_WATER_STORY,
    choices: [
      { kind: CHOICE.GOOD, text: 'Steer around it and take pictures of the ice', explain: 'Safe! And the pictures help scientists learn where Earth’s water came from.' },
      { kind: CHOICE.MILD, text: 'Get close and scrape some ice with the robot arm', explain: 'The arm got some ice, but flying chunks damaged the ship.' },
      { kind: CHOICE.BAD, text: 'Try to land on it to fill the water tanks', explain: 'It was spinning fast. The ship crashed into the ice.' },
    ],
  },
}

/** Where a runaway asteroid is on a day of the trip: it comes in from the belt to meet the road. */
export function asteroidPosition(asteroid, meet, day) {
  const before = asteroid.meetDay - day // days until it crosses the road
  const out = 1 + Math.max(0, before) * 0.004
  return { x: meet.x * out, y: meet.y * out }
}

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
 * The decisions of one trip, in order: { day, hazard, situation, asteroid? }.
 * The closest passes by satellites or debris, plus the two runaway asteroids.
 */
export function tripEncounters(trip) {
  const endDay = trip.outcome.day
  const passes = []
  for (const hazard of MARS_HAZARDS) {
    let closest = null
    for (const sample of trip.samples) {
      if (sample.day >= endDay) break
      const spot = hazardPosition(hazard, sample.day)
      const distance = Math.hypot(spot.x - sample.x, spot.y - sample.y)
      if (!closest || distance < closest.distance) closest = { day: sample.day, distance }
    }
    if (closest && closest.distance < ENCOUNTER_AU) passes.push({ hazard, ...closest })
  }
  const nearby = passes
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
          choices: shuffled(base.choices, Math.round(pass.day) + index * 7),
        },
      }
    })
  // The two runaway asteroids always cross the road, wherever it goes.
  const asteroids = RUNAWAY_ASTEROIDS.map((asteroid, index) => {
    const day = Math.round(endDay * asteroid.tripFraction)
    const base = asteroid.icy ? ASTEROID_SITUATIONS.ice : ASTEROID_SITUATIONS.rock
    return {
      day,
      hazard: { ...asteroid, meetDay: day },
      asteroid: true,
      shower: Boolean(asteroid.shower),
      situation: { ...base, choices: shuffled(base.choices, day + 31 * (index + 1)) },
    }
  })
  return [...nearby, ...asteroids].sort((a, b) => a.day - b.day)
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
