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
    goal: 'Build a rocket and send a satellite into space to take pictures of our planet.',
    funFact: 'The International Space Station goes around the Earth about every 90 minutes!',
    passPct: 60,
    loadout: { budget: 140, mass: 110, energy: 50, heat: 20, thrust: 40, food: 20, air: 24 },
  },
  {
    id: 'moon',
    number: 2,
    planet: 'moon',
    title: 'Moon Explorer',
    place: 'The Moon',
    goal: 'Fly all the way to the Moon and look for hidden ice inside its dark craters.',
    funFact: 'Some craters near the Moon\'s south pole never get any sunlight at all.',
    passPct: 60,
    loadout: { budget: 115, mass: 98, energy: 32, heat: 35, thrust: 60, food: 35, air: 40 },
  },
  {
    id: 'mars',
    number: 3,
    planet: 'mars',
    title: 'Red Planet Rover',
    place: 'Mars',
    goal: 'Land a rover on Mars and drill into red rocks to learn about the planet\'s past.',
    funFact: 'Mars looks red because its dust has a lot of rust in it.',
    passPct: 60,
    loadout: { budget: 90, mass: 84, energy: 20, heat: 35, thrust: 60, food: 35, air: 40 },
  },
];
