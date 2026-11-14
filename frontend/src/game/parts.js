import rocket from '../assets/images/rockets/rocket_32x32.png';
import shieldSheet from '../assets/images/rockets/animations/heat_shield_sheet.png';
import boosterSheet from '../assets/images/rockets/animations/side_boosters_sheet.png';
import cargo from '../assets/images/items/dollar_bill.svg';

/** Still rocket the player builds on. 32×32, transparent background. */
export const ROCKET = { src: rocket, frame: 32 };

/**
 * Parts the player can add or remove before liftoff.
 * Sheet parts share the rocket's 32×32 cell, so they stack on the same origin.
 */
export const PARTS = [
  {
    id: 'shield',
    name: 'Heat shield',
    blurb: 'Covers the nose',
    sheet: shieldSheet,
    sheetWidth: 256,
    sheetHeight: 64,
    frameX: 0,
    frameY: 32,
    frame: 32,
  },
  {
    id: 'boosters',
    name: 'Boosters',
    blurb: 'Extra rockets on the sides',
    sheet: boosterSheet,
    sheetWidth: 256,
    sheetHeight: 64,
    frameX: 0,
    frameY: 32,
    frame: 32,
  },
  {
    id: 'cargo',
    name: 'Cargo',
    blurb: 'Supplies for the trip',
    src: cargo,
  },
];

export const EMPTY_LOADOUT = { shield: false, boosters: false, cargo: false };
