/**
 * How the "You lose" screen looks for each kind of failure (MissionFailedScreen.jsx):
 * a picture, a headline that names what went wrong, a color, and how the picture moves.
 *
 *   tone    crash (red) · called (yellow: called back, stopped in time) · lost (blue: missed,
 *           drifted off) · supplies (purple: ran out of something) · money (gold)
 *   motion  shake (a crash) · drift (floating off) · bob (everything else)
 */

const LOOKS = {
  // Hangar and launch pad
  overBudget: { art: '💸', title: 'Out of money!', tone: 'money', motion: 'bob' },
  tooHeavy: { art: '🏋️', title: 'Too heavy to fly!', tone: 'money', motion: 'bob' },
  noCrew: { art: '🧑‍🚀', title: 'Nobody on board!', tone: 'called', motion: 'bob' },
  fewCrew: { art: '👩‍🚀', title: 'Not enough crew!', tone: 'called', motion: 'bob' },
  noPower: { art: '🔋', title: 'No power!', tone: 'supplies', motion: 'bob' },
  noBoosters: { art: '🚀', title: 'Not enough push!', tone: 'crash', motion: 'shake' },
  noShield: { art: '🔥', title: 'Burned up!', tone: 'crash', motion: 'shake' },
  noLiftoff: { art: '🚀', title: 'It never lifted off!', tone: 'crash', motion: 'shake' },

  // Mission 1 traps
  tooMuchFuel: { art: '⛽', title: 'Too much fuel!', tone: 'crash', motion: 'shake' },
  radioPower: { art: '📡', title: 'The radio drained the power!', tone: 'supplies', motion: 'bob' },
  plantsNoWater: { art: '🌱', title: 'The plants had no water!', tone: 'called', motion: 'bob' },

  // Supplies
  noFood: { art: '🍔', title: 'Called back: no food!', tone: 'called', motion: 'bob' },
  outOfFood: { art: '🍔', title: 'Called back: no food!', tone: 'called', motion: 'bob' },
  noWater: { art: '💧', title: 'No water!', tone: 'supplies', motion: 'bob' },
  outOfWater: { art: '💧', title: 'Out of water!', tone: 'supplies', motion: 'bob' },
  noAir: { art: '🫧', title: 'No air!', tone: 'supplies', motion: 'bob' },
  outOfAir: { art: '🫧', title: 'Out of air!', tone: 'supplies', motion: 'bob' },
  spaceSick: { art: '🤢', title: 'The crew got sick!', tone: 'supplies', motion: 'bob' },

  // Mission 1: the climb to orbit
  earthImpact: { art: '🌍', title: 'Fell back to Earth!', tone: 'crash', motion: 'shake' },
  satelliteCollision: { art: '🛰️', title: 'Hit a satellite!', tone: 'crash', motion: 'shake' },
  lostInSpace: { art: '🌌', title: 'Lost in space!', tone: 'lost', motion: 'drift' },
  missedTarget: { art: '🎯', title: 'Missed the orbit!', tone: 'lost', motion: 'drift' },

  // Mission 2: the trip to the Moon
  moonImpact: { art: '🌑', title: 'Crashed into the Moon!', tone: 'crash', motion: 'shake' },
  moonShort: { art: '⬇️', title: 'Not enough speed!', tone: 'called', motion: 'bob' },
  moonPast: { art: '🌌', title: 'Missed the Moon!', tone: 'lost', motion: 'drift' },
  moonTooEarly: { art: '⏩', title: 'Too early for the Moon!', tone: 'called', motion: 'bob' },
  moonTooLate: { art: '⏪', title: 'Too late for the Moon!', tone: 'called', motion: 'bob' },
  moonLoop: { art: '🌀', title: 'Went around Earth!', tone: 'lost', motion: 'drift' },
  noLander: { art: '🛬', title: 'No way to stop!', tone: 'lost', motion: 'drift' },
  moonLowScience: { art: '📷', title: 'The maps came out dark!', tone: 'supplies', motion: 'bob' },
}

const FALLBACK = { art: '💥', title: 'You lose', tone: 'crash', motion: 'shake' }

/** The look for a failed result ({ outcome: { type } }). */
export function failureLook(result) {
  return LOOKS[result?.outcome?.type] ?? FALLBACK
}
