import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS } from './data/missions.js';
import * as P from './progression.js';
import { memoryAdapter } from './storage.js';

const win = (pct = 100) => ({ pct, success: true });
const play = (progress, id, result) => P.applyResult(progress, id, result).progress;

test('has 3 valid missions in order: earth, moon, mars', () => {
  assert.deepEqual(P.validateMissions(), []);
  assert.deepEqual(MISSIONS.map((m) => m.id), ['earth', 'moon', 'mars']);
});

test('detects duplicate ids and unknown planets', () => {
  const errs = P.validateMissions([MISSIONS[0], { ...MISSIONS[0], planet: 'pluto' }]);
  assert.equal(errs.some((e) => e.includes('Duplicate')), true);
  assert.equal(errs.some((e) => e.includes('unknown planet')), true);
});

test('starts with Earth and Moon unlocked, while Mars stays locked', () => {
  const p = P.createEmptyProgress();
  assert.equal(P.getMissionState(p, 'earth'), 'current');
  assert.equal(P.getMissionState(p, 'moon'), 'current');
  assert.equal(P.getMissionState(p, 'mars'), 'locked');
  assert.equal(P.getCurrentMission(p).id, 'earth');
});

test('finishing Earth does not report Moon as newly unlocked', () => {
  const { progress, outcome } = P.applyResult(P.createEmptyProgress(), 'earth', win(70));
  assert.equal(outcome.unlockedMissionId, null);
  assert.equal(P.getMissionState(progress, 'earth'), 'completed');
  assert.equal(P.getMissionState(progress, 'moon'), 'current');
  assert.equal(P.getMissionState(progress, 'mars'), 'locked');
});

test('a failed Earth attempt leaves Moon available but does not unlock Mars', () => {
  const { progress, outcome } = P.applyResult(P.createEmptyProgress(), 'earth', { pct: 100, success: false });
  assert.equal(outcome.completed, false);
  assert.equal(P.isUnlocked(progress, 'moon'), true);
  assert.equal(P.isUnlocked(progress, 'mars'), false);
});

test('allows Moon to be completed before Earth', () => {
  const { progress } = P.applyResult(P.createEmptyProgress(), 'moon', win());
  assert.equal(P.getMissionState(progress, 'moon'), 'completed');
  assert.equal(P.getMissionState(progress, 'mars'), 'current');
});

test('refuses to play a locked mission', () => {
  assert.throws(() => P.applyResult(P.createEmptyProgress(), 'mars', win()), /locked/);
});

test('lets a judge record a locked mission without opening it for a normal player', () => {
  const { progress, outcome } = P.applyResult(P.createEmptyProgress(), 'mars', win(), undefined, { allowLocked: true });
  assert.equal(outcome.completed, true);
  assert.equal(progress.missions.mars.completed, true);
  assert.equal(P.getMissionState(progress, 'mars'), 'locked');
  assert.equal(P.isUnlocked(progress, 'mars'), false);
});

test('finishing all 3 completes the game', () => {
  let p = P.createEmptyProgress();
  for (const m of MISSIONS) p = play(p, m.id, win());
  assert.equal(P.allCompleted(p), true);
  assert.equal(P.getCurrentMission(p), null);
  assert.equal(P.totalStars(p), P.maxStars());
});

test('uses 60 / 80 / 95 thresholds', () => {
  const m = MISSIONS[0];
  assert.equal(P.calcStars(m, win(59)), 0);
  assert.equal(P.calcStars(m, win(60)), 1);
  assert.equal(P.calcStars(m, win(80)), 2);
  assert.equal(P.calcStars(m, win(95)), 3);
});

test('gives no stars when the mission failed, even with a high score', () => {
  assert.equal(P.calcStars(MISSIONS[0], { pct: 100, success: false }), 0);
});

test('keeps the best result and never lowers it', () => {
  const p = play(P.createEmptyProgress(), 'earth', win(96));
  const r = P.applyResult(p, 'earth', win(61));
  assert.equal(r.outcome.stars, 1);
  assert.equal(r.outcome.newBest, false);
  assert.deepEqual(r.progress.missions.earth, { completed: true, stars: 3, bestPct: 96, attempts: 2 });
});

test('failing after completing does not re-lock the next mission', () => {
  let p = play(P.createEmptyProgress(), 'earth', win());
  p = play(p, 'earth', { pct: 0, success: false });
  assert.equal(P.isUnlocked(p, 'moon'), true);
});

test('reports the unlock only the first time', () => {
  const a = P.applyResult(P.createEmptyProgress(), 'earth', win(70));
  const b = P.applyResult(a.progress, 'earth', win(90));
  assert.equal(b.outcome.unlockedMissionId, null);
  assert.equal(b.outcome.newBest, true);
});

test('clamps scores and does not mutate the input', () => {
  const p = P.createEmptyProgress();
  const snap = JSON.stringify(p);
  assert.equal(P.applyResult(p, 'earth', win(250)).outcome.pct, 100);
  assert.equal(JSON.stringify(p), snap);
});

test('normalizes null, garbage and bad values', () => {
  assert.deepEqual(P.normalizeProgress(null), P.createEmptyProgress());
  assert.deepEqual(P.normalizeProgress({ missions: 'x' }), P.createEmptyProgress());
  const n = P.normalizeProgress({ missions: { earth: { completed: 1, stars: 9, bestPct: -5 }, moon: null } });
  assert.deepEqual(n.missions.earth, { completed: true, stars: 3, bestPct: 0, attempts: 0 });
  assert.equal(n.missions.moon, undefined);
  assert.deepEqual(n.flights, []);
});

test('keeps every flight, including a repeat, and drops junk packing', () => {
  let progress = P.createEmptyProgress();
  progress = play(progress, 'earth', {
    pct: 70,
    success: true,
    flight: { packed: { food: 2, shield: 1, laser: 4 }, picks: { site: 'Kennedy, USA', secret: 'no' } },
  });
  progress = play(progress, 'earth', {
    pct: 96,
    success: true,
    flight: { packed: { food: 1 }, picks: { site: 'Kennedy, USA', orbit: 'Sun-synchronous orbit' } },
  });
  assert.equal(progress.missions.earth.attempts, 2);
  assert.equal(progress.missions.earth.stars, 3);
  assert.equal(progress.flights.length, 2);
  const best = progress.flights.find((flight) => flight.pct === 96);
  const earlier = progress.flights.find((flight) => flight.pct === 70);
  assert.ok(best);
  assert.deepEqual(best.picks, { site: 'Kennedy, USA', orbit: 'Sun-synchronous orbit' });
  assert.deepEqual(earlier.packed, { food: 2, shield: 1 });
  assert.equal(earlier.stars, 1);
  const kept = P.normalizeProgress({
    missions: { earth: { completed: true, stars: 2, bestPct: 92, attempts: 9 } },
    flights: [
      {
        id: 'abc12345',
        missionId: 'earth',
        at: '2026-11-15T12:00:00.000Z',
        success: true,
        pct: 80,
        stars: 2,
        packed: { food: 2 },
        picks: { site: 'Kennedy, USA' },
      },
      { id: 'bad id', missionId: 'earth', at: '2026-11-15T12:00:00.000Z', success: false, pct: 0, stars: 0, packed: {}, picks: {} },
    ],
  });
  assert.equal(kept.missions.earth.attempts, 9);
  assert.equal(kept.flights.length, 1);
  assert.deepEqual(kept.flights[0].packed, { food: 2 });
});

test('memoryAdapter saves and loads copies', async () => {
  const s = memoryAdapter();
  const p = play(P.createEmptyProgress(), 'earth', win());
  await s.save('u1', p);
  assert.deepEqual(await s.load('u1'), p);
  assert.equal(await s.load('other'), null);
});
