/**
 * LAUNCH FAILURES — why a packed rocket never finishes the trip.
 *
 * On the pad or in the climb (the launch animation stops here):
 *   over budget, too heavy, no crew, not enough power, no food, no oxygen,
 *   no boosters (or the engines cannot lift the weight), no heat shield
 *
 * During the trip, food or oxygen can hit zero. Those wait until the clock
 * reaches that moment (flightSupplyFailure).
 */
import { buildLaunchVehicle } from './levels/orbit/launchVehicle.js';
import { earliestSupplyEnd, supplyReport } from './lifeSupport.js';
import { partCount } from './parts.js';

export const LAUNCH_FAILURES = Object.freeze({
  overBudget: {
    id: 'overBudget',
    at: 'pad',
    message: 'This rocket costs more than the mission can pay for.',
    hint: 'Go back to the hangar and remove something.',
  },
  tooHeavy: {
    id: 'tooHeavy',
    at: 'pad',
    message: 'The rocket is too heavy. It cannot leave the pad safely.',
    hint: 'Go back to the hangar and carry less.',
  },
  noCrew: {
    id: 'noCrew',
    at: 'pad',
    message: 'No one is aboard to fly the rocket.',
    hint: 'Go back to the hangar and add an astronaut.',
  },
  noPower: {
    id: 'noPower',
    at: 'pad',
    message: 'The ship does not have enough power. Life support shuts down.',
    hint: 'Go back to the hangar. The shield, the boosters, and each astronaut use power.',
  },
  noFood: {
    id: 'noFood',
    at: 'pad',
    message: 'There is no food on the rocket. The crew cannot eat.',
    hint: 'Go back to the hangar and pack food.',
  },
  noAir: {
    id: 'noAir',
    at: 'pad',
    message: 'There is no oxygen left to breathe.',
    hint: 'Go back to the hangar. The cabin only holds air for a short trip.',
  },
  noBoosters: {
    id: 'noBoosters',
    at: 'pad',
    message: 'Without boosters the engines could not lift the rocket: it strained on the pad and blew up.',
    hint: 'Go back to the hangar and add the boosters, or carry less.',
  },
  noShield: {
    id: 'noShield',
    at: 'ascent',
    message: 'Without the heat shield the rocket got too hot in the air and blew up.',
    hint: 'Go back to the hangar and add the heat shield.',
  },
  outOfFood: {
    id: 'outOfFood',
    at: 'flight',
    message: 'The food ran out before the trip was over.',
    hint: 'Go back to the hangar and pack more food for the people on board.',
  },
  outOfAir: {
    id: 'outOfAir',
    at: 'flight',
    message: 'The crew ran out of oxygen before the trip was over.',
    hint: 'Go back to the hangar. More people breathe more than the tanks can hold.',
  },
});

/** The failure that stops launch, or null when the rocket can leave the pad. */
export function launchFailure(equipped, mission) {
  const report = supplyReport(equipped, mission);
  const vehicle = buildLaunchVehicle(equipped);
  if (report.cost > report.limits.budget) return LAUNCH_FAILURES.overBudget;
  if (report.massKg > report.limits.mass) return LAUNCH_FAILURES.tooHeavy;
  if (report.crew < report.minCrew) return LAUNCH_FAILURES.noCrew;
  if (report.drawWatts > report.supplyWatts) return LAUNCH_FAILURES.noPower;
  if (report.foodKg <= 0) return LAUNCH_FAILURES.noFood;
  if (report.o2Kg <= 0) return LAUNCH_FAILURES.noAir;
  if (partCount(equipped, 'boosters') <= 0 || vehicle.thrustToWeight <= 1) return LAUNCH_FAILURES.noBoosters;
  if (partCount(equipped, 'shield') <= 0 || report.heat < report.limits.heat) return LAUNCH_FAILURES.noShield;
  return null;
}

/**
 * Food or oxygen runs out after liftoff, before the trip is over.
 * Null when launch already failed, or when the supplies last the whole mission.
 */
export function flightSupplyFailure(equipped, mission) {
  if (launchFailure(equipped, mission)) return null;
  const end = earliestSupplyEnd(supplyReport(equipped, mission));
  if (!end) return null;
  return { ...LAUNCH_FAILURES[end.id], atSeconds: end.atSeconds };
}
