import rocket from '../assets/images/rockets/rocket_32x32.png';
import rocketOff from '../assets/images/rockets/rocket_off_32x32.png';
import rocketHangar from '../assets/images/rockets/rocket_hangar_32x32.png';
import rocketSheet from '../assets/images/rockets/animations/rocket_sheet.png';
import shieldSheet from '../assets/images/rockets/animations/heat_shield_sheet.png';
import boosterSheet from '../assets/images/rockets/animations/side_boosters_small_sheet.png';
import food from '../assets/images/items/food.svg';
import astronaut from '../assets/images/items/astronaut.svg';

/**
 * What the empty rocket already brings to the pad.
 * `o2Kg` is cabin oxygen: 2.4 kg lasts one person about 2.9 days
 * at NASA's 0.84 kg/person/day, enough for a short orbit and not for the Moon.
 */
export const HULL = {
  mass: 36,
  thrust: 22,
  o2Kg: 2.4,
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
    id: 'astronaut',
    name: 'Astronaut',
    blurb: 'Flies the ship and brings oxygen tanks. Uses power. You can pack more than one.',
    stack: true,
    max: 3,
    cost: 22,
    mass: 7,
    energy: 12,
    // Suit tanks. With the cabin, one astronaut can breathe on the Moon and on Mars.
    // Two astronauts on Mars use the oxygen up before the trip ends.
    o2Kg: 8.5,
    src: astronaut,
    inside: true,
  },
];

/** How many of this part are packed. Missing entries count as zero. */
export function partCount(equipped, id) {
  const value = equipped?.[id];
  if (typeof value === 'number') return Math.max(0, value);
  return value ? 1 : 0;
}

export const partMax = (part) => part.max ?? 1;

export const EMPTY_LOADOUT = Object.fromEntries(PARTS.map((part) => [part.id, 0]));
