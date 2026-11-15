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
      'Apollo 11 took 8 days. Apollo 17 took about 12.',
      'The crew eats and drinks every day. After the first day, someone can feel sick.',
      'People breathe out a gas. On a long trip that gas has to be cleaned.',
      'Going up is hot, and the Moon is much farther than one loop around Earth.',
      'The Moon has almost no air. A ship that is still going fast at the end will crash.',
    ],
    hints: [
      'Food and water for 8 days do not last 12. One person is not two people.',
      'The gas the crew breathes out has to be cleaned, or the cabin turns bad.',
      'Almost no air means nothing up there can catch the ship.',
      'The ice is in a crater the Sun never reaches. Something has to roll in and look.',
      'One path lasts 12 days and meets a storm from the Sun. Another loses the radio at the south pole.',
      'The middle of the road is almost empty. A high or low road can meet a rock.',
    ],
    funFact: 'Apollo 11 flew for 8 days. In 2009 NASA found ice in a dark crater at the south pole.',
    passPct: 60,
    // Quiet 8-day pack: shield, boosters, 1 food, 1 water, medicine, 1 crew,
    // air filter, lander, ice rover = 208 cr, 136 kg, 33 energy.
    // The south pole adds the radio (18 cr, 5 kg).
    // The 12-day storm adds a second food, a second water, and the shelter:
    // 264 cr, 164 kg, 35 energy. 266 cr and 166 kg leave no room for the radio as well.
    loadout: { budget: 266, mass: 166, energy: 40, heat: 30, thrust: 55, minCrew: 1, durationSeconds: 8 * 86400 },
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
