/**
 * Mission 3 supply rule: a crew that packs every food pack and every water pack does not
 * starve or run dry on the way to Mars. Other troubles (air, sickness, crashes) still count.
 */
import { PARTS, partCount, partMax } from '../../parts.js'

/** Supply failures that a fully stocked rocket never has on this trip. */
export const FOOD_AND_WATER_FAILURES = new Set(['noFood', 'outOfFood', 'noWater', 'outOfWater'])

/** All the food packs and all the water packs the hangar allows are on board. */
export function hasAllFoodAndWater(equipped) {
  return ['food', 'water'].every((id) => {
    const part = PARTS.find((candidate) => candidate.id === id)
    return Boolean(part) && partCount(equipped, id) >= partMax(part)
  })
}
