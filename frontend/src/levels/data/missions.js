/**
 * The 3 playable missions, in menu order: Earth, Moon, Mars.
 * Only Earth starts open. The Moon unlocks when Earth is completed, and Mars when the Moon is.
 * Saturn and the black hole are not in this list; they live in upcomingMissions.js.
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
      'You are the engineer. Fly once around Earth. It takes less than two hours.',
      'Someone must fly the rocket, and they will get hungry and thirsty.',
      'Going up is very hot, and the rocket needs a big push to reach space.',
      'The cabin already has air. Money is tight, so pack only what you need.',
    ],
    hints: [
      'What could stop the trip: no one aboard, hunger, heat, a weak push, or no power?',
      'This trip is short. The cabin may already hold enough air.',
      'Green money is ready. Yellow money is low. Red money is too much.',
    ],
    funFact: 'The space station goes all the way around Earth in about 90 minutes!',
    passPct: 60,
    // The loadout that flies: shield, boosters, food, one astronaut (108 credits, 1,040 W).
    // The hangar also offers three traps, and the budget lets each one be packed so it fails
    // in its own way (launchFailure.js): the fuel tank (too heavy to reach orbit), the radio
    // dish (one more draw than the 1,080 W the ship has) and the plant locker (no water aboard).
    // Mass 90 of 102. 6,518 s = a 10 minute climb + one 98.6 minute loop at 700 km.
    loadout: { budget: 150, mass: 102, energy: 27, heat: 20, thrust: 40, minCrew: 1, durationSeconds: 6518 },
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
      'You fly a crew to the Moon and map it from orbit. Pick a base and a day.',
      'Drag the dotted line to the Moon, away from satellites and space junk.',
      'The crew eats, drinks, and breathes for days. Pack enough for the whole trip.',
      'The Moon has almost no air, so only a rocket engine can slow the ship.',
    ],
    hints: [
      'Two astronauts fly for about 5 days. Each one eats, drinks, and breathes.',
      'Space junk can break the computer. A shield helps.',
      'On a long trip, the air the crew breathes out must be cleaned.',
      'The ice hides in a dark crater. Something has to roll in and look.',
    ],
    funFact: 'Apollo 11 took about 3 days to reach the Moon. In 2009 NASA found ice in a dark crater at the south pole.',
    passPct: 60,
    // A crew of 2 for up to 8 days: shield, boosters, 2 astronauts, 2 food, 2 water, medicine,
    // filter, lander = 242 cr, 150 kg, 43 energy. That leaves room for the fuel tank only.
    // The upgrade (+25% mass and power for 45 cr: 208 kg, 55 energy) makes room for two more
    // extras, like the ice rover and the radio dish.
    loadout: {
      budget: 330, mass: 166, energy: 44, heat: 30, thrust: 55, minCrew: 2, durationSeconds: 8 * 86400,
      upgrade: { cost: 45, pct: 25 },
    },
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
      'You send a crew to Mars. The trip takes about 7 months!',
      'Every day the crew eats, drinks, and breathes. Pack enough, keep the air clean, and bring medicine.',
      'The Sun can send storms and hide Earth from the radio. Bring a safe room and a way to call home.',
      'Mars has thin air, so the ship needs help to slow down. Then something must roll out and look at the red rocks.',
    ],
    hints: [
      'Three astronauts fly for months. Each one eats, drinks, and breathes.',
      'A few rocks share the road to Mars. The big asteroid belt is past it.',
      'A shorter path needs fewer meals. A path behind the Sun needs a way to call home.',
      'Red money means you packed more than you can pay for.',
    ],
    funFact: 'Perseverance flew about 471 million km in 203 days. The asteroid belt is farther out, past Mars.',
    passPct: 60,
    // 203 days, the Perseverance cruise, with a crew of 3. One winning pack for the long paths:
    // shield, boosters, 3 crew, 3 meal lockers, 2 food, 2 water, water recycler, scrubber,
    // shelter, parachute, rover, medicine = 390 cr, 209 kg, 69 energy.
    // The radio (18 cr, 5 kg, 2 energy) fits only if the food packs come off, and then only the
    // 180-day path lasts. The upgrade (+40% mass and power for 70 cr: 297 kg, 99 energy)
    // carries the radio and the full meals, so any path works.
    loadout: {
      budget: 480, mass: 212, energy: 71, heat: 35, thrust: 60, minCrew: 3, durationSeconds: 203 * 86400,
      upgrade: { cost: 70, pct: 40 },
    },
  },
];
