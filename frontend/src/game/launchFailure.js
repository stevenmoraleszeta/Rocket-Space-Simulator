/**
 * LAUNCH FAILURES — parts the rocket cannot fly without. Missing one makes it blow up.
 *
 *   no boosters     not enough push: the rocket strains on the launch pad and explodes there
 *   no heat shield  the air heats it up while it climbs: it explodes in the atmosphere
 *
 * at: 'pad' (before leaving the ground) or 'ascent' (during the climb, see AscentScene.jsx).
 */
import { partCount } from './parts.js';

export const LAUNCH_FAILURES = Object.freeze({
  noBoosters: {
    id: 'noBoosters',
    at: 'pad',
    message: 'Without boosters the engines could not lift the rocket: it strained on the pad and blew up.',
    hint: 'Go back to the hangar and add the boosters.',
  },
  noShield: {
    id: 'noShield',
    at: 'ascent',
    message: 'Without the heat shield the rocket got too hot in the air and blew up.',
    hint: 'Go back to the hangar and add the heat shield.',
  },
});

/** The failure this loadout will have when launched, or null when it can fly. */
export function launchFailure(equipped) {
  if (partCount(equipped, 'boosters') <= 0) return LAUNCH_FAILURES.noBoosters;
  if (partCount(equipped, 'shield') <= 0) return LAUNCH_FAILURES.noShield;
  return null;
}
