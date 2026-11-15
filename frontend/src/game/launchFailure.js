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
import { WATTS_PER_ENERGY_POINT, earliestSupplyEnd, supplyReport } from './lifeSupport.js';
import { PARTS, partCount } from './parts.js';

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
  fewCrew: {
    id: 'fewCrew',
    // Some crew, but fewer than the trip needs: called off on the pad like no crew.
    at: 'scrub',
    bubble: 'We need more astronauts!',
    message: 'This trip is too long and too hard for so few astronauts. Mission control called off the launch.',
    hint: 'Go back to the hangar and add astronauts. More people also need more food, water, and air.',
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
    // It lifts off, but without the boosters' push it cannot climb fast enough to stay up:
    // before reaching orbit it loses height, falls back and crashes.
    at: 'climb',
    message: 'Without boosters the rocket lifted off, but it could not climb fast enough. Before reaching orbit it lost height, fell back and crashed.',
    hint: 'Go back to the hangar and add the boosters, or carry less.',
  },
  noShield: {
    id: 'noShield',
    at: 'ascent',
    message: 'Without the heat shield the rocket got too hot in the air and blew up.',
    hint: 'Go back to the hangar and add the heat shield.',
  },
  // Mission 1 traps (the three extra parts in the Earth-orbit hangar)
  tooMuchFuel: {
    id: 'tooMuchFuel',
    // The extra tanks are dead weight for one short loop: it lifts off, climbs too slowly,
    // and falls back before it reaches orbit.
    at: 'climb',
    message: 'The extra fuel tanks made the rocket too heavy. It climbed too slowly, could not reach orbit, and fell back.',
    hint: 'One loop around Earth does not need extra fuel. Go back to the hangar and leave the fuel tank.',
  },
  radioPower: {
    id: 'radioPower',
    at: 'pad',
    message: 'The radio dish used up the last of the power. Life support shut down before the rocket could leave.',
    hint: 'Close to Earth the rocket can already talk to mission control. Leave the radio dish in the hangar.',
  },
  plantsNoWater: {
    id: 'plantsNoWater',
    // Called off on the pad, like no crew: the pad crew walks away and one says why.
    at: 'scrub',
    bubble: 'No water for the plants!',
    message: 'The plant locker needs water, and there is no water on this rocket. The plants would dry up, so mission control called off the launch.',
    hint: 'Plants are for long trips. Leave the plant locker in the hangar for this short loop.',
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
  if (report.crew <= 0) return LAUNCH_FAILURES.noCrew;
  if (report.crew < report.minCrew) {
    return {
      ...LAUNCH_FAILURES.fewCrew,
      bubble: `We need ${report.minCrew} astronauts!`,
      message: `This trip needs ${report.minCrew} astronauts, and only ${report.crew} got on board. Mission control called off the launch.`,
    };
  }
  // Plants drink water: with none on board they cannot fly (mission 1 carries no water).
  if (partCount(equipped, 'veggie') > 0 && !report.tracksWater) return LAUNCH_FAILURES.plantsNoWater;
  if (report.drawWatts > report.supplyWatts) {
    // The radio dish was the part too many
    const dish = PARTS.find((part) => part.id === 'antenna');
    const dishWatts = partCount(equipped, 'antenna') * (dish?.energy ?? 0) * WATTS_PER_ENERGY_POINT;
    if (dishWatts > 0 && report.drawWatts - dishWatts <= report.supplyWatts) return LAUNCH_FAILURES.radioPower;
    return LAUNCH_FAILURES.noPower;
  }
  if (report.tracksWater && report.waterKg <= 0) return LAUNCH_FAILURES.noWater;
  if (report.o2Kg <= 0) return LAUNCH_FAILURES.noAir;
  if (partCount(equipped, 'boosters') <= 0 || vehicle.thrustToWeight <= 1) return LAUNCH_FAILURES.noBoosters;
  if (partCount(equipped, 'shield') <= 0 || report.heat < report.limits.heat) return LAUNCH_FAILURES.noShield;
  // One short loop around Earth: extra fuel tanks are only dead weight.
  if (mission?.id === 'earth' && partCount(equipped, 'fuel') > 0) return LAUNCH_FAILURES.tooMuchFuel;
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
