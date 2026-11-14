import { describe, it, expect } from 'vitest';
import * as P from './progression.js';
import { MISSIONS } from './data/missions.js';
import { memoryAdapter } from './storage.js';

const win = (pct = 100) => ({ pct, success: true });
const play = (progress, id, result) => P.applyResult(progress, id, result).progress;

describe('mission data', () => {
  it('has 3 valid missions in order: earth, moon, mars', () => {
    expect(P.validateMissions()).toEqual([]);
    expect(MISSIONS.map((m) => m.id)).toEqual(['earth', 'moon', 'mars']);
  });
  it('detects duplicate ids and unknown planets', () => {
    const errs = P.validateMissions([MISSIONS[0], { ...MISSIONS[0], planet: 'pluto' }]);
    expect(errs.some((e) => e.includes('Duplicate'))).toBe(true);
    expect(errs.some((e) => e.includes('unknown planet'))).toBe(true);
  });
});

describe('unlocking', () => {
  it('starts with only mission 1 unlocked', () => {
    const p = P.createEmptyProgress();
    expect(P.getMissionState(p, 'earth')).toBe('current');
    expect(P.getMissionState(p, 'moon')).toBe('locked');
    expect(P.getMissionState(p, 'mars')).toBe('locked');
    expect(P.getCurrentMission(p).id).toBe('earth');
  });
  it('completing a mission unlocks the next one', () => {
    const { progress, outcome } = P.applyResult(P.createEmptyProgress(), 'earth', win(70));
    expect(outcome.unlockedMissionId).toBe('moon');
    expect(P.getMissionState(progress, 'earth')).toBe('completed');
    expect(P.getMissionState(progress, 'moon')).toBe('current');
    expect(P.getMissionState(progress, 'mars')).toBe('locked');
  });
  it('a failed attempt unlocks nothing', () => {
    const { progress, outcome } = P.applyResult(P.createEmptyProgress(), 'earth', { pct: 100, success: false });
    expect(outcome.completed).toBe(false);
    expect(P.isUnlocked(progress, 'moon')).toBe(false);
  });
  it('refuses to play a locked mission', () => {
    expect(() => P.applyResult(P.createEmptyProgress(), 'mars', win())).toThrow(/locked/);
  });
  it('finishing all 3 completes the game', () => {
    let p = P.createEmptyProgress();
    for (const m of MISSIONS) p = play(p, m.id, win());
    expect(P.allCompleted(p)).toBe(true);
    expect(P.getCurrentMission(p)).toBe(null);
    expect(P.totalStars(p)).toBe(P.maxStars());
  });
});

describe('stars', () => {
  const m = MISSIONS[0];
  it('uses 60 / 80 / 95 thresholds', () => {
    expect(P.calcStars(m, win(59))).toBe(0);
    expect(P.calcStars(m, win(60))).toBe(1);
    expect(P.calcStars(m, win(80))).toBe(2);
    expect(P.calcStars(m, win(95))).toBe(3);
  });
  it('gives no stars when the mission failed, even with a high score', () => {
    expect(P.calcStars(m, { pct: 100, success: false })).toBe(0);
  });
  it('keeps the best result and never lowers it', () => {
    let p = play(P.createEmptyProgress(), 'earth', win(96));
    const r = P.applyResult(p, 'earth', win(61));
    expect(r.outcome.stars).toBe(1);
    expect(r.outcome.newBest).toBe(false);
    expect(r.progress.missions.earth).toEqual({ completed: true, stars: 3, bestPct: 96, attempts: 2 });
  });
  it('failing after completing does not re-lock the next mission', () => {
    let p = play(P.createEmptyProgress(), 'earth', win());
    p = play(p, 'earth', { pct: 0, success: false });
    expect(P.isUnlocked(p, 'moon')).toBe(true);
  });
  it('reports the unlock only the first time', () => {
    const a = P.applyResult(P.createEmptyProgress(), 'earth', win(70));
    const b = P.applyResult(a.progress, 'earth', win(90));
    expect(b.outcome.unlockedMissionId).toBe(null);
    expect(b.outcome.newBest).toBe(true);
  });
  it('clamps scores and does not mutate the input', () => {
    const p = P.createEmptyProgress();
    const snap = JSON.stringify(p);
    expect(P.applyResult(p, 'earth', win(250)).outcome.pct).toBe(100);
    expect(JSON.stringify(p)).toBe(snap);
  });
});

describe('saved data', () => {
  it('normalizes null, garbage and bad values', () => {
    expect(P.normalizeProgress(null)).toEqual(P.createEmptyProgress());
    expect(P.normalizeProgress({ missions: 'x' })).toEqual(P.createEmptyProgress());
    const n = P.normalizeProgress({ missions: { earth: { completed: 1, stars: 9, bestPct: -5 }, moon: null } });
    expect(n.missions.earth).toEqual({ completed: true, stars: 3, bestPct: 0, attempts: 0 });
    expect(n.missions.moon).toBeUndefined();
  });
  it('memoryAdapter saves and loads copies', async () => {
    const s = memoryAdapter();
    const p = play(P.createEmptyProgress(), 'earth', win());
    await s.save('u1', p);
    expect(await s.load('u1')).toEqual(p);
    expect(await s.load('other')).toBe(null);
  });
});
