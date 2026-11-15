import rocket from '../assets/images/rockets/rocket_32x32.png';
import rocketOff from '../assets/images/rockets/rocket_off_32x32.png';
import rocketHangar from '../assets/images/rockets/rocket_hangar_32x32.png';
import rocketSheet from '../assets/images/rockets/animations/rocket_sheet.png';
import shieldSheet from '../assets/images/rockets/animations/heat_shield_sheet.png';
import boosterSheet from '../assets/images/rockets/animations/side_boosters_small_sheet.png';
import fuelSheet from '../assets/images/rockets/animations/fuel_tank_sheet.png';
import food from '../assets/images/items/food.svg';
import water from '../assets/images/items/water_bottle.svg';
import medicine from '../assets/images/items/medicine.svg';
import garden from '../assets/images/items/garden.svg';
import astronaut from '../assets/images/items/astronaut.svg';
import pantry from '../assets/images/items/pantry.svg';
import recycler from '../assets/images/items/recycler.svg';
import scrubber from '../assets/images/items/scrubber.svg';
import shelter from '../assets/images/items/shelter.svg';
import parachute from '../assets/images/items/parachute.svg';
import rover from '../assets/images/items/rover.svg';
import antenna from '../assets/images/items/antenna.svg';

/**
 * What the empty rocket already brings to the pad.
 * `o2Kg` is cabin oxygen: 2.4 kg lasts one person about 2.9 days
 * at NASA's 0.84 kg/person/day, enough for a short orbit and not for the Moon.
 */
export const HULL = {
  mass: 36,
  thrust: 22,
  o2Kg: 2.4,
  // A sip of cabin water: enough for one orbit, not for the Moon (20 kg for 8 days).
  waterKg: 0.5,
};

/** Still rocket the player builds on. 32×32, transparent background. `off` has a cold nozzle. */
export const ROCKET = {
  src: rocket,
  off: rocketOff,
  // Hangar view: `off` with plain white hull where the windows and vents were
  hangar: rocketHangar,
  frame: 32,
  // In flight: first row of rocket_sheet.png, 4 frames of flickering flame
  flight: { sheet: rocketSheet, sheetWidth: 256, sheetHeight: 96, frameY: 0, frames: 4 },
  // Leaving the atmosphere: third row, 8 frames where the rear stage drops away (played once)
  separation: { sheet: rocketSheet, sheetWidth: 256, sheetHeight: 96, frameY: 64, frames: 8 },
  // Only the short upper stage left: last 2 frames of that row, small flickering flame
  upperStage: { sheet: rocketSheet, sheetWidth: 256, sheetHeight: 96, frameY: 64, firstFrame: 6, frames: 2 },
};

/**
 * Parts the player can add or remove before liftoff.
 * Sheet parts share the rocket's 32×32 cell, so they stack on the same origin.
 * `inside` parts ride in the cabin and only show when the hull is open.
 */
export const PARTS = [
  {
    id: 'shield',
    name: 'Heat shield',
    blurb: 'Keeps the rocket safe from heat',
    cost: 28,
    mass: 14,
    energy: 8,
    heat: 40,
    sheet: shieldSheet,
    sheetWidth: 256,
    sheetHeight: 64,
    frameX: 0,
    frameY: 32,
    offX: 128,
    offY: 0,
    frame: 32,
    breaksOnSeparation: true, // the shell cracks in two out of the atmosphere, no heat left
    flightFrames: 5, // lit frames in row frameY, played while flying
  },
  {
    id: 'boosters',
    name: 'Boosters',
    blurb: 'Extra push to go farther',
    cost: 42,
    mass: 24,
    energy: 6,
    thrust: 46,
    // 12px tall boosters strapped to the body, cold (row 0) and in flight (row 1)
    sheet: boosterSheet,
    sheetWidth: 160,
    sheetHeight: 64,
    frameX: 0,
    frameY: 32,
    offX: 0,
    offY: 0,
    frame: 32,
    dropsWithStage: true, // fixed to the rear stage: falls away with it in space
    flightFrames: 5, // lit frames in row frameY, played while flying
    // Extra propellant the boosters carry (hangar kg). Not thrust.
    propellantHangarKg: 300,
  },
  {
    id: 'fuel',
    name: 'Fuel tank',
    blurb: 'Side tanks with more fuel.',
    from: 'moon',
    cost: 26,
    mass: 12,
    // Extra propellant only. The engines are still the boosters.
    propellantHangarKg: 180,
    sheet: fuelSheet,
    sheetWidth: 256,
    sheetHeight: 64,
    frameX: 0,
    frameY: 32,
    offX: 0,
    offY: 0,
    frame: 32,
    dropsWithStage: true,
    flightFrames: 8,
  },
  {
    id: 'food',
    name: 'Food',
    blurb: 'Meals for the crew. You can pack more than one.',
    stack: true,
    max: 4,
    cost: 16,
    mass: 9,
    // 8 person-days. NASA packs about 1.83 kg of food per person per day.
    foodDays: 8,
    src: food,
    inside: true,
  },
  {
    id: 'water',
    name: 'Water',
    blurb: 'Drinking water for the crew. You can pack more than one.',
    from: 'moon',
    stack: true,
    max: 4,
    cost: 14,
    mass: 8,
    // 8 person-days. NASA-STD-3001: 2.5 kg of potable water per person per day.
    waterDays: 8,
    src: water,
    inside: true,
  },
  {
    id: 'medicine',
    name: 'Medicine',
    blurb: 'A kit for when someone feels sick.',
    from: 'moon',
    cost: 18,
    mass: 5,
    // One kit for the crew, the way NASA flies a medical kit.
    medicine: true,
    src: medicine,
    inside: true,
  },
  {
    id: 'veggie',
    name: 'Plant locker',
    blurb: 'A small plant locker. The lights use power, and the plants drink water.',
    from: 'mars',
    cost: 32,
    mass: 11,
    // NASA Veggie uses about 70 W. One energy point is 40 W, so this is 80 W.
    energy: 2,
    // About half a kilogram a day. Veggie drinks water the whole time it is on.
    // Lettuce on the station took 33 days. None of these trips last that long.
    waterKgPerDay: 0.5,
    src: garden,
    inside: true,
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    blurb: 'Flies the ship and brings oxygen tanks. Uses power. You can pack more than one.',
    stack: true,
    max: 3,
    cost: 22,
    mass: 7,
    energy: 12,
    // Suit tanks. With the cabin, one astronaut can breathe on the Moon.
    // On Mars the air scrubber has to be aboard. Then one astronaut lasts the
    // 203-day cruise, and two still breathe the tanks dry.
    o2Kg: 8.5,
    src: astronaut,
    inside: true,
  },
  // Mission 3 (Mars) on: the long cruise and the landing.
  {
    id: 'pantry',
    name: 'Meal locker',
    blurb: 'A big locker of meals. A cruise of many months needs this and some food packs.',
    from: 'mars',
    cost: 24,
    mass: 10,
    energy: 2,
    // 180 person-days. Three food packs (24 more) last the 203-day cruise. Two do not.
    foodDays: 180,
    src: pantry,
    inside: true,
  },
  {
    id: 'recycler',
    name: 'Water recycler',
    blurb: 'Cleans most of the water the crew drinks, so one bottle lasts for months.',
    from: 'mars',
    cost: 20,
    mass: 8,
    energy: 3,
    // Returns 98% of the crew's water. Plants, if any, still drink fresh water.
    // One astronaut then needs about 10 kg for 203 days. Four bottles alone last about a month.
    waterRecycle: 0.98,
    src: recycler,
    inside: true,
  },
  {
    id: 'scrubber',
    name: 'Air scrubber',
    blurb: 'Cleans the air the crew breathes out, so the tanks last for months.',
    from: 'mars',
    cost: 22,
    mass: 8,
    energy: 5,
    // Keeps 94% of the oxygen in the loop. One astronaut then lasts 203 days. Two do not.
    o2Recycle: 0.94,
    src: scrubber,
    inside: true,
  },
  {
    id: 'shelter',
    name: 'Storm shelter',
    blurb: 'A thick little room. The crew hides here when the Sun throws a particle storm.',
    from: 'mars',
    cost: 26,
    mass: 11,
    energy: 2,
    stormShelter: true,
    src: shelter,
    inside: true,
  },
  {
    id: 'parachute',
    name: 'Parachute',
    blurb: 'Opens in Mars’s thin air and slows the ship for landing.',
    from: 'mars',
    cost: 16,
    mass: 6,
    lands: true,
    src: parachute,
    inside: true,
  },
  {
    id: 'rover',
    name: 'Rover',
    blurb: 'Rolls out on Mars and looks at the red rocks.',
    from: 'mars',
    cost: 20,
    mass: 12,
    energy: 3,
    explores: true,
    src: rover,
    inside: true,
  },
  {
    id: 'antenna',
    name: 'Radio dish',
    blurb: 'Calls home. Needed when the Sun sits between Earth and Mars.',
    from: 'mars',
    cost: 18,
    mass: 5,
    energy: 2,
    radio: true,
    src: antenna,
    inside: true,
  },
];

/** Missions in play order. Parts unlock along it and stay unlocked (see `from`). */
const MISSION_ORDER = ['earth', 'moon', 'mars'];

/**
 * Parts offered in this mission: every part whose `from` mission comes at or before it.
 * A part with no `from` is there from the first mission. Mission 1 has only the basics,
 * and each later mission adds its own parts on top of the ones before.
 */
export function partsForMission(missionId) {
  const at = Math.max(0, MISSION_ORDER.indexOf(missionId));
  return PARTS.filter((part) => MISSION_ORDER.indexOf(part.from ?? 'earth') <= at);
}

/** How many of this part are packed. Missing entries count as zero. */
export function partCount(equipped, id) {
  const value = equipped?.[id];
  if (typeof value === 'number') return Math.max(0, value);
  return value ? 1 : 0;
}

export const partMax = (part) => part.max ?? 1;

export const EMPTY_LOADOUT = Object.fromEntries(PARTS.map((part) => [part.id, 0]));
