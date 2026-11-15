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
      'The crew gets thirsty too. People drink water every day.',
      'Going up gets very hot. Too much heat can break the rocket.',
      'The rocket needs a bigger push to reach space.',
      'The cabin already has air for this short trip.',
      'Money is tight. Pack only what this trip needs.',
    ],
    hints: [
      'What could stop the trip: no one aboard, hunger, heat, a weak push, or no power?',
      'This trip is short. The cabin may already hold enough air.',
      'Green money is ready. Yellow money is low. Red money is too much.',
    ],
    funFact: 'The space station goes all the way around Earth in about 90 minutes!',
    passPct: 60,
    // 122 credits is the one loadout that can fly: shield, boosters, food, water, one astronaut.
    // 2 credits are left. The cheapest extra part costs 14.
    // Mass 98 of 102. 6,518 s = a 10 minute climb + one 98.6 minute loop at 700 km.
    loadout: { budget: 124, mass: 102, energy: 40, heat: 20, thrust: 40, minCrew: 1, durationSeconds: 6518 },
    // Hangar checklist (MissionChecklist.jsx): pictures with a check or a cross.
    checklist: {
      required: [
        { part: 'shield', why: 'The climb through the air gets very hot. Without it the rocket burns.' },
        { part: 'boosters', why: 'The main engine alone cannot lift the rocket off the pad.' },
        { part: 'astronaut', why: 'Someone has to fly the rocket.' },
        { part: 'food', why: 'The crew gets weak without food, and mission control calls them home.' },
      ],
      recommended: [],
    },
  },
  {
    id: 'moon',
    number: 2,
    planet: 'moon',
    title: 'Moon Mapper',
    place: 'Lunar orbit',
    goal: 'Fly a crew to the Moon, slow down into orbit, and map the dark craters.',
    intro: 'A long trip to the Moon.',
    story: [
      'You fly a crew to the Moon and map it from orbit.',
      'Pick a base on Earth. Then pick the day: the Moon moves around Earth every day.',
      'Drag the dotted line to the Moon. Fly around satellites and space junk.',
      'The crew eats, drinks, and breathes for days. Pack enough for the whole trip.',
      'The Moon has almost no air. Only a rocket engine can slow the ship down there.',
    ],
    hints: [
      'The Moon is about 384,400 km away. The trip takes about 5 days.',
      'Space junk can break the computer and lose data. A shield helps.',
      'Hitting a satellite hurts it, and it hurts your ship too.',
      'The gas the crew breathes out has to be cleaned on a long trip.',
      'The ice is in a crater the Sun never reaches. Something has to roll in and look.',
    ],
    funFact: 'Apollo 11 took about 3 days to reach the Moon. In 2009 NASA found ice in a dark crater at the south pole.',
    passPct: 60,
    // A crew of at least 1 for up to 8 days: shield, boosters, food, water, medicine, filter, lander.
    loadout: { budget: 266, mass: 166, energy: 40, heat: 30, thrust: 55, minCrew: 1, durationSeconds: 8 * 86400 },
    checklist: {
      required: [
        { part: 'shield', why: 'The climb through the air gets very hot. Without it the rocket burns.' },
        { part: 'boosters', why: 'The main engine alone cannot lift the rocket off the pad.' },
        { part: 'astronaut', why: 'Someone has to fly the ship to the Moon.' },
        { part: 'food', why: 'The trip lasts days. A hungry crew cannot keep going.' },
        { part: 'water', why: 'Each person drinks about 2.5 kg of water a day.' },
        { part: 'medicine', why: 'On a long trip people can feel space sick.' },
        { part: 'filter', why: 'People breathe out a gas that fills the cabin in about 2 days.' },
        { part: 'lander', why: 'The Moon has almost no air. Only an engine can slow the ship down there.' },
      ],
      recommended: [
        { part: 'fuel', why: 'Extra fuel fixes the path on the way: the yellow ring at the Moon gets bigger.' },
        { part: 'antenna', why: 'Behind the Moon the radio goes quiet. The dish keeps your maps safe.' },
        { part: 'shelter', why: 'If the Sun throws a storm, the crew has a safe room.' },
        { part: 'prospector', why: 'It can drive into a dark crater and find ice: big science bonus.' },
      ],
    },
  },
  {
    id: 'mars',
    number: 3,
    planet: 'mars',
    title: 'Red Planet Rover',
    place: 'Mars',
    goal: 'Fly a crew to Mars and set a rover on the red rocks.',
    intro: 'A long cruise to Mars.',
    story: [
      'You send a crew to Mars. It is much farther than the Moon.',
      'A real cruise lasts about 7 months. Perseverance flew for 203 days.',
      'The crew eats every day of those months. A few meals will not last.',
      'They drink every day too. A few bottles will not last seven months.',
      'They breathe out the whole way. The air in the cabin has to stay clean.',
      'On a flight this long, someone can feel sick.',
      'The Sun can throw a storm of fast particles. The crew needs a safe room.',
      'Mars has air, but it is very thin. The ship is still going very fast at the end.',
      'You came to look at the red rocks. Something has to roll out and look.',
      'On some days the Sun sits between Earth and Mars, and the radio goes quiet.',
      'Money, weight, and power can run out. Packing extra can leave you short.',
    ],
    hints: [
      'This trip lasts many months. What has to last, and what has to be cleaned?',
      'A second person needs more air, more meals, more water, and more power.',
      'The big asteroid belt is past Mars. A few rocks still share this road.',
      'A shorter path needs fewer meals. A path behind the Sun needs a way to call home.',
      'Red money means you packed more than you can pay for.',
    ],
    funFact: 'Perseverance flew about 471 million km in 203 days. The asteroid belt is farther out, past Mars.',
    passPct: 60,
    // 203 days, the Perseverance cruise. One winning pack for the long paths:
    // shield, boosters, 1 crew, 3 food, meal locker, scrubber, shelter, parachute,
    // rover, medicine, 1 water, water recycler = 300 cr, 176 kg, 41 energy.
    // The radio (18 cr, 5 kg, 2 energy) fits only if the meal packs come off, and then only the 180-day path lasts.
    loadout: { budget: 302, mass: 178, energy: 43, heat: 35, thrust: 60, minCrew: 1, durationSeconds: 203 * 86400 },
  },
];
