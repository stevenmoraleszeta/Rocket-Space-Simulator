/**
 * LAUNCH FAILURES — why a packed rocket never finishes the trip.
 *
 * On the pad or in the climb (the launch animation stops here):
 *   over budget, too heavy, no crew, not enough power, no water, no oxygen,
 *   no boosters (or the engines cannot lift the weight), no heat shield
 *
 * With no food the rocket still launches. In space the weak crew cannot steer:
 * mission control calls them back, and the rocket comes home and lands upright on its engine,
 * the way modern reusable rockets do (noFood, returnsHome: true). The mission fails, the crew is safe.
 *
 * During the trip, food, water, or oxygen can hit zero. On a long trip
 * with no medicine, space sickness can stop the crew too.
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
    // Nobody to fly it: mission control calls off the launch. Nothing blows up; the pad crew
    // walks away and one of them shakes "no" (LaunchSequence, PadCrew).
    at: 'scrub',
    message: 'There were no astronauts in the rocket, so there was no one to fly it. Mission control called off the launch.',
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
    // The rocket launches fine. In space the crew gets too weak to go on, so mission control
    // calls them home: the rocket comes back down and lands upright, like modern rockets.
    at: 'flight',
    returnsHome: true,
    message: 'In space the crew had no food and got too weak to go on. Mission control called them home, and the rocket came back and landed safely.',
    hint: 'Go back to the hangar and pack food.',
  },
  noWater: {
    id: 'noWater',
    at: 'pad',
    message: 'There is no water on the rocket. The crew cannot drink.',
    hint: 'Go back to the hangar and pack water.',
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
  outOfWater: {
    id: 'outOfWater',
    at: 'flight',
    message: 'The water ran out before the trip was over.',
    hint: 'Go back to the hangar and pack more water for the people on board.',
  },
  spaceSick: {
    id: 'spaceSick',
    at: 'flight',
    message: 'Someone got space sick, and there was no medicine.',
    hint: 'Go back to the hangar and pack the medicine kit. On a long trip, people can feel sick.',
  },
  outOfAir: {
    id: 'outOfAir',
    at: 'flight',
    message: 'The crew ran out of oxygen before the trip was over.',
    hint: 'Go back to the hangar. More people breathe more than the tanks can hold.',
  },
});

/** Trip fraction when a crew with no food loses control (hangar flights to the Moon and Mars). */
const NO_FOOD_TRIP_FRACTION = 0.3;

/**
 * The failure that stops launch, or null when the rocket can leave the pad.
 * No food does not stop it: the rocket launches and fails in space (flightSupplyFailure).
 */
export function launchFailure(equipped, mission) {
  const report = supplyReport(equipped, mission);
  const vehicle = buildLaunchVehicle(equipped);
  if (report.cost > report.limits.budget) return LAUNCH_FAILURES.overBudget;
  if (report.massKg > report.limits.mass) return LAUNCH_FAILURES.tooHeavy;
  if (report.crew < report.minCrew) return LAUNCH_FAILURES.noCrew;
  if (report.drawWatts > report.supplyWatts) return LAUNCH_FAILURES.noPower;
  if (report.tracksWater && report.waterKg <= 0) return LAUNCH_FAILURES.noWater;
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
  const report = supplyReport(equipped, mission);
  // No food at all: the rocket reaches space, then loses control. The orbit level moves this
  // moment to the coast after the engines stop (OrbitalLaunchLevel), so it is always in space.
  if (report.foodKg <= 0) {
    return { ...LAUNCH_FAILURES.noFood, atSeconds: report.durationSeconds * NO_FOOD_TRIP_FRACTION };
  }
  const end = earliestSupplyEnd(report);
  if (!end) return null;
  return { ...LAUNCH_FAILURES[end.id], atSeconds: end.atSeconds };
}
