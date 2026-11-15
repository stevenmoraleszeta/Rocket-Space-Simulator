/**
 * How the "You lose" screen looks for each kind of failure (MissionFailedScreen.jsx):
 * a picture (a PixelIcon name), a headline that names what went wrong, a color, and how the picture moves.
 *
 *   tone    crash (red) · called (yellow: called back, stopped in time) · lost (blue: missed,
 *           drifted off) · supplies (purple: ran out of something) · money (gold)
 *   motion  shake (a crash) · drift (floating off) · bob (everything else)
 */

const LOOKS = {
  // Hangar and launch pad
  overBudget: { art: 'money', title: 'Out of money!', tone: 'money', motion: 'bob' },
  tooHeavy: { art: 'weight', title: 'Too heavy to fly!', tone: 'money', motion: 'bob' },
  noCrew: { art: 'astronaut', title: 'Nobody on board!', tone: 'called', motion: 'bob' },
  fewCrew: { art: 'astronaut', title: 'Not enough crew!', tone: 'called', motion: 'bob' },
  noPower: { art: 'energy', title: 'No power!', tone: 'supplies', motion: 'bob' },
  noBoosters: { art: 'rocket', title: 'Not enough push!', tone: 'crash', motion: 'shake' },
  noShield: { art: 'fire', title: 'Burned up!', tone: 'crash', motion: 'shake' },
  noLiftoff: { art: 'rocket', title: 'It never lifted off!', tone: 'crash', motion: 'shake' },

  // Mission 1 traps
  tooMuchFuel: { art: 'fuelCan', title: 'Too much fuel!', tone: 'crash', motion: 'shake' },
  radioPower: { art: 'antenna', title: 'The radio drained the power!', tone: 'supplies', motion: 'bob' },
  plantsNoWater: { art: 'garden', title: 'The plants had no water!', tone: 'called', motion: 'bob' },

  // Supplies
  noFood: { art: 'food', title: 'Called back: no food!', tone: 'called', motion: 'bob' },
  outOfFood: { art: 'food', title: 'Called back: no food!', tone: 'called', motion: 'bob' },
  noWater: { art: 'water', title: 'No water!', tone: 'supplies', motion: 'bob' },
  outOfWater: { art: 'water', title: 'Out of water!', tone: 'supplies', motion: 'bob' },
  noAir: { art: 'air', title: 'No air!', tone: 'supplies', motion: 'bob' },
  outOfAir: { art: 'air', title: 'Out of air!', tone: 'supplies', motion: 'bob' },
  spaceSick: { art: 'medicine', title: 'The crew got sick!', tone: 'supplies', motion: 'bob' },

  // Mission 1: the climb to orbit
  earthImpact: { art: 'earth', title: 'Fell back to Earth!', tone: 'crash', motion: 'shake' },
  satelliteCollision: { art: 'satellite', title: 'Hit a satellite!', tone: 'crash', motion: 'shake' },
  lostInSpace: { art: 'galaxy', title: 'Lost in space!', tone: 'lost', motion: 'drift' },
  missedTarget: { art: 'target', title: 'Missed the orbit!', tone: 'lost', motion: 'drift' },

  // Mission 2: the trip to the Moon
  moonImpact: { art: 'moon-new', title: 'Crashed into the Moon!', tone: 'crash', motion: 'shake' },
  moonShort: { art: 'arrowDown', title: 'Not enough speed!', tone: 'called', motion: 'bob' },
  moonPast: { art: 'galaxy', title: 'Missed the Moon!', tone: 'lost', motion: 'drift' },
  moonTooEarly: { art: 'fastForward', title: 'Too early for the Moon!', tone: 'called', motion: 'bob' },
  moonTooLate: { art: 'rewind', title: 'Too late for the Moon!', tone: 'called', motion: 'bob' },
  moonLoop: { art: 'spiral', title: 'Went around Earth!', tone: 'lost', motion: 'drift' },
  noLander: { art: 'lander', title: 'No way to stop!', tone: 'lost', motion: 'drift' },
  moonLowScience: { art: 'camera', title: 'The maps came out dark!', tone: 'supplies', motion: 'bob' },
}

const FALLBACK = { art: 'boom', title: 'You lose', tone: 'crash', motion: 'shake' }

/** The look for a failed result ({ outcome: { type } }). */
export function failureLook(result) {
  return LOOKS[result?.outcome?.type] ?? FALLBACK
}
