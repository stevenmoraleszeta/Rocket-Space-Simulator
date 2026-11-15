/**
 * The 3 missions of the first prototype, in the order they are played.
 * The order of this array IS the progression: mission i unlocks when mission i-1 is completed.
 *
 * Text is written for players aged 7–12: short sentences, everyday words.
 *
 * @typedef {Object} Mission
 * @property {string} id        stable id, used to save progress and to tell gameplay which mission to load
 * @property {number} number    number shown to the player (1, 2, 3)
 * @property {string} planet    'earth' | 'moon' | 'mars' — which planet drawing to show
 * @property {string} title
 * @property {string} place     where the mission goes
 * @property {string} goal      one-sentence goal, shown on the mission card
 * @property {string} intro     one short line that sets the trip, shown before the story
 * @property {string[]} story   a few short sentences the player reads before packing
 * @property {string[]} hints   short clues about the trip. They never name what to pack.
 * @property {string} funFact   short fact, shown on the mission card
 * @property {number} passPct   minimum score (%) to complete the mission
 * @property {Object} loadout   hangar limits and what the trip needs
 * @property {number} loadout.budget  credits the player can spend
 * @property {number} loadout.mass    kilograms the rocket can still lift
 * @property {number} loadout.energy  power the ship can supply, in hangar points (1 point = 40 W)
 * @property {number} loadout.heat    heat protection the trip needs
 * @property {number} loadout.thrust  thrust the trip needs
 * @property {number} loadout.minCrew people who must be aboard
 * @property {number} loadout.durationSeconds how long food and oxygen must last
 */

/** @type {Mission[]} */
export const MISSIONS = [
  {
    id: 'earth',
    number: 1,
    planet: 'earth',
    title: 'Eye on Earth',
    place: 'Earth orbit',
    goal: 'Pack a rocket and fly once around Earth.',
    intro: 'A short trip around Earth.',
    story: [
      'You are the engineer. Fly once around Earth and look down.',
      'One loop takes about 99 minutes, plus the climb up.',
      'Someone has to fly. An empty rocket cannot finish the trip.',
      'The trip is short, but the crew gets hungry. With nothing to eat, the trip stops.',
      'Going up gets very hot. Too much heat can break the rocket.',
      'The rocket needs a bigger push to reach space.',
      'The cabin already has air for this short trip.',
      'Money is tight. Pack only what this trip needs.',
    ],
    hints: [
      'What could stop the trip: no one aboard, hunger, heat, a weak push, or no power?',
      'This trip is short. The cabin may already hold enough air.',
      'A green bar is ready. A yellow bar is low. A red bar means too much.',
    ],
    funFact: 'The space station goes all the way around Earth in about 90 minutes!',
    passPct: 60,
    // 108 credits is the one loadout that can fly. 2 credits are left, not enough for anything else.
    // 6,518 s = a 10 minute climb + one 98.6 minute loop at 700 km.
    loadout: { budget: 110, mass: 94, energy: 40, heat: 20, thrust: 40, minCrew: 1, durationSeconds: 6518 },
  },
  {
    id: 'moon',
    number: 2,
    planet: 'moon',
    title: 'Moon Explorer',
    place: 'The Moon',
    goal: 'Fly to the Moon and look for ice where it is dark.',
    intro: 'A long trip to the Moon.',
    story: [
      'You fly to the Moon to look for ice in the dark.',
      'The trip takes 8 days. The crew has to eat every day.',
      'The Moon has no air. The cabin alone cannot last that long.',
      'The way there is hot, and the Moon is much farther than a loop around Earth.',
    ],
    hints: [
      'Food for one person is not food for two.',
      'There is no air outside the ship. The crew still has to breathe.',
      'This trip is farther. Heat and push still matter.',
    ],
    funFact: 'Some craters near the south pole of the Moon never see the Sun.',
    passPct: 60,
    loadout: { budget: 160, mass: 120, energy: 40, heat: 30, thrust: 55, minCrew: 1, durationSeconds: 8 * 86400 },
  },
  {
    id: 'mars',
    number: 3,
    planet: 'mars',
    title: 'Red Planet Rover',
    place: 'Mars',
    goal: 'Send a rover to Mars and look at the red rocks.',
    intro: 'A very long trip to Mars.',
    story: [
      'You send a crew to Mars. It is much farther than the Moon.',
      'The trip takes 12 days. They eat the whole way.',
      'A little air is not enough. They need air for the whole trip.',
      'Two people can breathe the tanks dry before they arrive.',
      'The way is still hot, and Mars is the farthest place yet.',
      'Money, weight, and power can run out. Packing extra can leave you short.',
    ],
    hints: [
      'This trip lasts longer than the Moon. What has to last the whole way?',
      'A second person can use up the oxygen.',
      'A red bar means you packed too much.',
    ],
    funFact: 'Mars looks red because its dust is rusty, like an old bike in the rain.',
    passPct: 60,
    loadout: { budget: 175, mass: 130, energy: 44, heat: 35, thrust: 60, minCrew: 1, durationSeconds: 12 * 86400 },
  },
];
