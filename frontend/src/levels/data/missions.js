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
  },
];
