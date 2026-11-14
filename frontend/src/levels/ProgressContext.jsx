/**
 * React context for mission progress.
 *
 *   <ProgressProvider userId={uid} storage={localStorageAdapter}>
 *     <App />
 *   </ProgressProvider>
 *
 *   const { missions, getState, completeMission } = useProgress();
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MISSIONS } from './data/missions.js';
import * as P from './progression.js';
import { localStorageAdapter } from './storage.js';

const ProgressContext = createContext(null);

export function ProgressProvider({ userId = 'guest', storage = localStorageAdapter, missions = MISSIONS, children }) {
  const [progress, setProgress] = useState(P.createEmptyProgress);
  const [loading, setLoading] = useState(true);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Load whenever the user changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    storage.load(userId)
      .then((raw) => { if (!cancelled) setProgress(P.normalizeProgress(raw)); })
      .catch(() => { if (!cancelled) setProgress(P.createEmptyProgress()); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, storage]);

  const persist = useCallback((next) => {
    setProgress(next);
    storage.save(userId, next).catch(() => { /* keep playing even if saving fails */ });
  }, [storage, userId]);

  /** Called by gameplay when a mission ends. Returns the outcome (stars, unlocks…). */
  const completeMission = useCallback((missionId, result) => {
    const { progress: next, outcome } = P.applyResult(progressRef.current, missionId, result, missions);
    persist(next);
    return outcome;
  }, [missions, persist]);

  const value = useMemo(() => ({
    progress, loading, missions,
    getState: (id) => P.getMissionState(progress, id, missions),
    getStars: (id) => P.getStars(progress, id),
    isUnlocked: (id) => P.isUnlocked(progress, id, missions),
    currentMission: P.getCurrentMission(progress, missions),
    totalStars: P.totalStars(progress),
    maxStars: P.maxStars(missions),
    allCompleted: P.allCompleted(progress, missions),
    completeMission,
    resetProgress: () => persist(P.createEmptyProgress()),
  }), [progress, loading, missions, completeMission, persist]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress() must be used inside <ProgressProvider>');
  return ctx;
}
