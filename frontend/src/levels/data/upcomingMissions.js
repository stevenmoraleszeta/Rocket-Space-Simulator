/**
 * Missions shown on the menu as "Coming soon". They are not in MISSIONS on purpose:
 * they cannot be played, give no stars and do not change the progression.
 * Each one appears after the playable missions, in this order, locked.
 */
export const UPCOMING_MISSIONS = [
  {
    id: 'saturn',
    number: 4,
    planet: 'saturn',
    title: 'Lord of the Rings',
    place: 'Saturn',
  },
  {
    id: 'black-hole',
    number: 5,
    planet: 'blackHole',
    title: 'The Black Hole',
    place: 'A black hole',
  },
];
