/**
 * Mission 3 supply rule: a crew that packs every food pack and every water pack does not
 * starve or run dry on the way to Mars. Other troubles (air, sickness, crashes) still count.
 * Pure (no images), so it can be tested with node --test.
 */

/** Supply failures that a fully stocked rocket never has on this trip. */
export const FOOD_AND_WATER_FAILURES = new Set(['noFood', 'outOfFood', 'noWater', 'outOfWater'])

/**
 * All the food packs and all the water packs the hangar allows are on board.
 * maxima: how many of each the hangar allows, e.g. { food: 4, water: 4 } (from parts.js).
 */
export function hasAllFoodAndWater(equipped, maxima) {
  return ['food', 'water'].every((id) => maxima[id] > 0 && (Number(equipped?.[id]) || 0) >= maxima[id])
}
