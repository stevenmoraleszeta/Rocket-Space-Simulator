import { FOOD_KG_PER_PERSON_DAY, WATER_KG_PER_PERSON_DAY, WATTS_PER_ENERGY_POINT, formatKg, supplyReport } from './lifeSupport.js';

/** Short chips shown on a part button. Only the stats that part actually changes. */
export function partTags(part) {
  const each = part.stack ? ' each' : '';
  const tags = [
    { kind: 'cost', text: `${part.cost} cr${each}` },
    { kind: 'mass', text: `${part.mass} kg${each}` },
  ];
  if (part.energy) tags.push({ kind: 'draw', text: `-${part.energy * WATTS_PER_ENERGY_POINT} W${each}` });
  if (part.heat) tags.push({ kind: 'good', text: `+${part.heat} heat` });
  if (part.thrust) tags.push({ kind: 'good', text: `+${part.thrust} thrust` });
  if (part.foodDays) tags.push({ kind: 'good', text: `+${formatKg(part.foodDays * FOOD_KG_PER_PERSON_DAY)} food${each}` });
  if (part.waterDays) tags.push({ kind: 'good', text: `+${formatKg(part.waterDays * WATER_KG_PER_PERSON_DAY)} water${each}` });
  if (part.waterKgPerDay) tags.push({ kind: 'draw', text: `-${formatKg(part.waterKgPerDay)} water/day` });
  if (part.propellantHangarKg && !part.thrust) tags.push({ kind: 'good', text: '+fuel' });
  if (part.o2Kg) tags.push({ kind: 'good', text: `+${formatKg(part.o2Kg)} oxygen${each}` });
  if (part.o2Recycle) tags.push({ kind: 'good', text: 'Cleans used air' });
  if (part.waterRecycle) tags.push({ kind: 'good', text: 'Cleans used water' });
  if (part.stormShelter) tags.push({ kind: 'good', text: 'Safe in a Sun storm' });
  if (part.lands) tags.push({ kind: 'good', text: 'Slows the landing' });
  if (part.explores) tags.push({ kind: 'good', text: 'Looks at the rocks' });
  if (part.radio) tags.push({ kind: 'good', text: 'Calls home' });
  return tags;
}

/**
 * Bars for the hangar. Budget, mass, and energy start full and shrink as parts
 * are added. Heat, thrust, food, air, and crew fill toward what the mission needs.
 * Food and oxygen needs follow NASA rates for this trip and this crew.
 * @returns {{ meters: object[], problems: string[] }}
 */
export function rocketStatus(equipped, mission) {
  const report = supplyReport(equipped, mission);
  const limits = report.limits;
  const budgetLeft = limits.budget - report.cost;
  const massLeft = limits.mass - report.massKg;
  const powerLeft = report.supplyWatts - report.drawWatts;

  const meters = [
    {
      ...roomMeter('budget', 'Budget', budgetLeft, limits.budget, 'cr'),
      text: budgetLeft < 0 ? `${-budgetLeft} cr over` : `${budgetLeft} cr left`,
      bar: true,
    },
    { ...roomMeter('mass', 'Mass', massLeft, limits.mass, 'kg'), text: `${report.massKg} kg` },
    {
      ...roomMeter('energy', 'Energy', powerLeft, report.supplyWatts, 'W'),
      text: `${Math.round(powerLeft)} W`,
    },
    goalMeter('heat', 'Heat', report.heat, limits.heat),
    goalMeter('thrust', 'Thrust', report.thrust, limits.thrust),
    goalMeter('crew', 'Crew', report.crew, report.minCrew),
    {
      ...goalMeter('food', 'Food', report.foodKg, report.foodNeedKg),
      text: formatKg(report.foodKg),
    },
    report.tracksWater
      ? {
        ...goalMeter('water', 'Water', report.waterKg, report.waterNeedKg),
        text: formatKg(report.waterKg),
      }
      : null,
    {
      ...goalMeter('air', 'Oxygen', report.o2Kg, report.o2NeedKg),
      text: formatKg(report.o2Kg),
    },
    report.tracksMedicine && report.durationSeconds > 86400
      ? goalMeter('medicine', 'Medicine', report.medicineCount, 1)
      : null,
  ].filter(Boolean);

  const problems = [];
  if (budgetLeft < 0) problems.push(`Over budget by ${-budgetLeft} cr`);
  if (massLeft < 0) problems.push(`Too heavy by ${-massLeft} kg`);
  if (powerLeft < 0) problems.push(`Need ${Math.round(-powerLeft)} W more power`);
  if (report.crew < report.minCrew) problems.push('No one is flying the rocket');
  if (report.foodKg + 1e-6 < report.foodNeedKg) problems.push('The crew will run out of food');
  if (limits.heat > 0 && report.heat < limits.heat) problems.push('Too hot. The rocket could break');
  if (limits.thrust > 0 && report.thrust < limits.thrust) problems.push('Not enough push to get there');
  if (report.o2Kg + 1e-6 < report.o2NeedKg) problems.push('The crew will run out of air');
  if (report.tracksWater && report.waterKg + 1e-6 < report.waterNeedKg) problems.push('The crew will run out of water');
  if (report.tracksMedicine && report.durationSeconds > 86400 && report.medicineCount < 1) {
    problems.push('No medicine for a long flight');
  }

  return { meters, problems };
}

function roomMeter(id, label, left, max, unit) {
  const over = left < 0;
  const ratio = max > 0 ? left / max : 0;
  const tone = over ? 'over' : ratio <= 0.2 ? 'warn' : 'ok';
  const amount = `${Math.round(left)}${unit ? ` ${unit}` : ''}`;
  return {
    id,
    label,
    current: Math.max(0, left),
    max,
    text: amount,
    tone,
    fill: over ? 100 : fillOf(left, max),
  };
}

function goalMeter(id, label, current, max) {
  if (!(max > 0)) return null;
  const met = current + 1e-6 >= max;
  return {
    id,
    label,
    current: Math.min(current, max),
    max,
    text: `${Math.round(current)}`,
    tone: met ? 'ok' : current > 0 ? 'warn' : 'short',
    fill: fillOf(current, max),
  };
}

function fillOf(current, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}
