import rocket from '../assets/images/rockets/rocket_32x32.png';
import rocketOff from '../assets/images/rockets/rocket_off_32x32.png';
import shieldSheet from '../assets/images/rockets/animations/heat_shield_sheet.png';
import boosterSheet from '../assets/images/rockets/animations/side_boosters_sheet.png';
import food from '../assets/images/items/food.svg';
import astronaut from '../assets/images/items/astronaut.svg';

/** Still rocket the player builds on. 32×32, transparent background. `off` has a cold nozzle. */
export const ROCKET = { src: rocket, off: rocketOff, frame: 32 };

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
  },
  {
    id: 'boosters',
    name: 'Boosters',
    blurb: 'Extra push to go farther',
    cost: 42,
    mass: 24,
    energy: 6,
    thrust: 46,
    sheet: boosterSheet,
    sheetWidth: 256,
    sheetHeight: 64,
    frameX: 0,
    frameY: 32,
    offX: 32,
    offY: 0,
    frame: 32,
  },
  {
    id: 'food',
    name: 'Food',
    blurb: 'Meals. You can pack more than one.',
    stack: true,
    max: 4,
    cost: 16,
    mass: 9,
    food: 40,
    src: food,
    inside: true,
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    blurb: 'Flies the ship. The suit holds air. You can pack more than one.',
    stack: true,
    max: 3,
    cost: 22,
    mass: 7,
    energy: 12,
    air: 36,
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
