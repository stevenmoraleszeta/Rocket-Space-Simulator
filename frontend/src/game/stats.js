import { PARTS } from './parts.js';

/** What the empty rocket already brings to the pad. */
export const HULL = {
  mass: 36,
  thrust: 22,
  air: 12,
};

/** Fallback when a mission has no loadout block. */
const DEFAULT_LIMITS = {
  budget: 140,
  mass: 110,
  energy: 50,
  heat: 20,
  thrust: 40,
  food: 20,
  air: 24,
};

/** Short chips shown on a part button. Only the stats that part actually changes. */
export function partTags(part) {
  const tags = [
    { kind: 'cost', text: `${part.cost} cr` },
    { kind: 'mass', text: `${part.mass} kg` },
  ];
  if (part.energy) tags.push({ kind: 'draw', text: `-${part.energy} pwr` });
  if (part.heat) tags.push({ kind: 'good', text: `+${part.heat} heat` });
  if (part.thrust) tags.push({ kind: 'good', text: `+${part.thrust} thrust` });
  if (part.food) tags.push({ kind: 'good', text: `+${part.food} food` });
  if (part.air) tags.push({ kind: 'good', text: `+${part.air} air` });
  return tags;
}

/**
 * Bars for the hangar. Budget, mass, and energy start full and shrink as parts
 * are added. Heat, thrust, food, and air fill toward what the mission needs.
 * @returns {{ meters: object[], problems: string[] }}
 */
export function rocketStatus(equipped, mission) {
  const limits = { ...DEFAULT_LIMITS, ...(mission?.loadout ?? {}) };
  const totals = {
    cost: 0,
    mass: HULL.mass,
    energy: 0,
    heat: 0,
    thrust: HULL.thrust,
    food: 0,
    air: HULL.air,
  };

  for (const part of PARTS) {
    if (!equipped?.[part.id]) continue;
    totals.cost += part.cost || 0;
    totals.mass += part.mass || 0;
    totals.energy += part.energy || 0;
    totals.heat += part.heat || 0;
    totals.thrust += part.thrust || 0;
    totals.food += part.food || 0;
    totals.air += part.air || 0;
  }

  const budgetLeft = limits.budget - totals.cost;
  const massLeft = limits.mass - totals.mass;
  const energyLeft = limits.energy - totals.energy;

  const meters = [
    roomMeter('budget', 'Budget', budgetLeft, limits.budget, 'cr'),
    roomMeter('mass', 'Mass', massLeft, limits.mass, 'kg'),
    roomMeter('energy', 'Energy', energyLeft, limits.energy, ''),
    goalMeter('heat', 'Heat', totals.heat, limits.heat),
    goalMeter('thrust', 'Thrust', totals.thrust, limits.thrust),
    goalMeter('food', 'Food', totals.food, limits.food),
    goalMeter('air', 'Air', totals.air, limits.air),
  ].filter(Boolean);

  const problems = [];
  if (budgetLeft < 0) problems.push(`Over budget by ${-budgetLeft} cr`);
  if (massLeft < 0) problems.push(`Too heavy by ${-massLeft} kg`);
  if (energyLeft < 0) problems.push(`Need ${-energyLeft} more power`);

  return { meters, problems };
}

function roomMeter(id, label, left, max, unit) {
  const over = left < 0;
  const ratio = max > 0 ? left / max : 0;
  const tone = over ? 'over' : ratio <= 0.2 ? 'warn' : 'ok';
  const amount = `${over ? -left : left}${unit ? ` ${unit}` : ''}`;
  return {
    id,
    label,
    current: Math.max(0, left),
    max,
    text: over ? `${amount} over` : `${amount} left`,
    tone,
    fill: over ? 100 : fillOf(left, max),
  };
}

function goalMeter(id, label, current, max) {
  if (!(max > 0)) return null;
  const met = current >= max;
  return {
    id,
    label,
    current: Math.min(current, max),
    max,
    text: `${current} / ${max}`,
    tone: met ? 'ok' : current > 0 ? 'warn' : 'short',
    fill: fillOf(current, max),
  };
}

function fillOf(current, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}
