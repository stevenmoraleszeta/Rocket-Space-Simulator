/**
 * The 3 missions of the first prototype, in the order they are played.
 * The order of this array IS the progression: mission i unlocks when mission i-1 is completed.
 *
 * Text is written for players aged 8–15: short sentences, no jargon.
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
 * @property {number} loadout.energy  spare power on the ship
 * @property {number} loadout.heat    heat protection the trip needs
 * @property {number} loadout.thrust  thrust the trip needs
 * @property {number} loadout.food    meals the crew needs
 * @property {number} loadout.air     air the crew needs
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
      'You fly into orbit to look down at Earth.',
      'The trip is short, but the astronaut will get hungry. With nothing to eat, the trip is over.',
      'The way up is very hot. Too much heat can break the rocket.',
      'The rocket\'s own push is not enough to reach orbit.',
      'The cabin already has air for a short trip.',
    ],
    hints: [
      'What could end the trip: hunger, heat, or a weak push?',
      'This trip is short. Something on the rocket may already be enough.',
      'A green bar is ready. A yellow bar is still short.',
    ],
    funFact: 'The International Space Station goes around the Earth about every 90 minutes!',
    passPct: 60,
    loadout: { budget: 140, mass: 110, energy: 50, heat: 20, thrust: 40, food: 20, air: 12 },
  },
  {
    id: 'moon',
    number: 2,
    planet: 'moon',
    title: 'Moon Explorer',
    place: 'The Moon',
    goal: 'Fly to the Moon and look for ice in the dark.',
    intro: 'A long trip to the Moon.',
    story: [
      'You fly to the Moon to look for ice in the dark.',
      'The trip takes many days. One box of food will run out.',
      'The Moon has no air. A plant on the ship makes air to breathe.',
      'It is still hot on the way, and the rocket still needs a big push.',
    ],
    hints: [
      'Pack two boxes of food.',
      'Pack one plant for air.',
      'One heat shield and one set of boosters.',
    ],
    funFact: 'Some craters near the Moon\'s south pole never get any sunlight at all.',
    passPct: 60,
    loadout: { budget: 160, mass: 120, energy: 40, heat: 30, thrust: 55, food: 50, air: 40 },
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
      'You send a rover to Mars, far past the Moon.',
      'The crew is away a long time, so they need lots of food.',
      'One plant cannot make enough air for the whole trip.',
      'The rocket still needs a heat shield and boosters.',
      'You cannot pack everything. Watch your money, weight, and power.',
    ],
    hints: [
      'Pack three boxes of food.',
      'Pack two plants.',
      'One heat shield and one set of boosters. An extra box will not fit.',
    ],
    funFact: 'Mars looks red because its dust has a lot of rust in it.',
    passPct: 60,
    loadout: { budget: 175, mass: 130, energy: 44, heat: 35, thrust: 60, food: 90, air: 60 },
  },
];
