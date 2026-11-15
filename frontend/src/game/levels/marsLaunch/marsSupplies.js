/**
 * Mission 3 supply rules: what a well packed crew does NOT fail on the way to Mars.
 * Pure (no images), so it can be tested with node --test.
 *
 *   air          an air scrubber or an air filter on board: they never run out of air
 *   propulsion   boosters on board: the rocket never fails for lack of push
 *   food         the food bar more than half full (or every food pack): nobody starves
 *   water        every water pack on board: nobody runs dry
 * Sickness without medicine, a bad aim and the crew's choices still count.
 */

/** Supply and launch failures each rule can forgive. */
const RULES = {
  air: ['noAir', 'outOfAir'],
  propulsion: ['noBoosters'],
  food: ['noFood', 'outOfFood'],
  water: ['noWater', 'outOfWater'],
}

/** The food bar has to be at least this full for the crew to make it. */
export const FOOD_BAR_ENOUGH = 0.5

/**
 * Facts about the packed rocket, from the hangar (parts.js and lifeSupport.js):
 *   equipped   { partId: count }
 *   maxima     { food, water }: how many packs the hangar allows
 *   foodKg, foodNeedKg   the food bar (packed / needed for the trip)
 */
export function marsSupplyFacts(equipped, maxima, foodKg, foodNeedKg) {
  const count = (id) => Number(equipped?.[id]) || 0
  return {
    airPacked: count('scrubber') > 0 || count('filter') > 0,
    boostersPacked: count('boosters') > 0,
    foodBar: foodNeedKg > 0 ? foodKg / foodNeedKg : 1,
    allFood: maxima.food > 0 && count('food') >= maxima.food,
    allWater: maxima.water > 0 && count('water') >= maxima.water,
  }
}

/** Failure ids that cannot happen to this rocket on the way to Mars. */
export function forgivenFailures(facts) {
  const forgiven = new Set()
  if (facts.airPacked) RULES.air.forEach((id) => forgiven.add(id))
  if (facts.boostersPacked) RULES.propulsion.forEach((id) => forgiven.add(id))
  if (facts.allFood || facts.foodBar >= FOOD_BAR_ENOUGH) RULES.food.forEach((id) => forgiven.add(id))
  if (facts.allWater) RULES.water.forEach((id) => forgiven.add(id))
  return forgiven
}
