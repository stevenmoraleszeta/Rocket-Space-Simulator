/**
 * React context for mission progress.
 *
 *   <ProgressProvider userId={uid} storage={firestoreProgressStorage}>
 *     <App />
 *   </ProgressProvider>
 *
 *   const { missions, getState, completeMission } = useProgress();
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readAdminMode, writeAdminMode } from './adminMode.js';
import { MISSIONS } from './data/missions.js';
import * as P from './progression.js';
import { localStorageAdapter } from './storage.js';

const ProgressContext = createContext(null);

export function ProgressProvider({ userId = 'guest', storage = localStorageAdapter, missions = MISSIONS, children }) {
  const [progress, setProgress] = useState(P.createEmptyProgress);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminModeState] = useState(readAdminMode);
  const progressRef = useRef(progress);
  const adminRef = useRef(adminMode);
  progressRef.current = progress;
  adminRef.current = adminMode;
  // A result saved while a load is in flight must win over that load.
  const saveCount = useRef(0);

  // Load whenever the user changes
  useEffect(() => {
    let cancelled = false;
    const stamp = saveCount.current;
    setLoading(true);
    storage.load(userId)
      .then((raw) => {
        if (!cancelled && saveCount.current === stamp) setProgress(P.normalizeProgress(raw));
      })
      .catch(() => {
        if (!cancelled && saveCount.current === stamp) setProgress(P.createEmptyProgress());
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, storage]);

  const persist = useCallback((next) => {
    saveCount.current += 1;
    const stamp = saveCount.current;
    setProgress(next);
    storage.save(userId, next)
      .then((saved) => {
        if (saved && saveCount.current === stamp) setProgress(P.normalizeProgress(saved));
      })
      .catch(() => { /* keep playing even if saving fails */ });
  }, [storage, userId]);

  /** Called by gameplay when a mission ends. Returns the outcome (stars, unlocks…). */
  const completeMission = useCallback((missionId, result) => {
    const { progress: next, outcome } = P.applyResult(progressRef.current, missionId, result, missions, {
      allowLocked: adminRef.current,
    });
    persist(next);
    return outcome;
  }, [missions, persist]);

  const setAdminMode = useCallback((on) => {
    const next = !!on;
    writeAdminMode(next);
    adminRef.current = next;
    setAdminModeState(next);
  }, []);

  const value = useMemo(() => ({
    progress, loading, missions, adminMode, setAdminMode,
    getState: (id) => {
      if (!adminMode) return P.getMissionState(progress, id, missions);
      return progress.missions[id]?.completed ? 'completed' : 'current';
    },
    getStars: (id) => P.getStars(progress, id),
    isUnlocked: (id) => adminMode || P.isUnlocked(progress, id, missions),
    playerUnlocked: (id) => P.isUnlocked(progress, id, missions),
    currentMission: P.getCurrentMission(progress, missions),
    totalStars: P.totalStars(progress),
    maxStars: P.maxStars(missions),
    allCompleted: P.allCompleted(progress, missions),
    completeMission,
    resetProgress: () => persist(P.createEmptyProgress()),
  }), [progress, loading, missions, adminMode, setAdminMode, completeMission, persist]);

  return (
    <ProgressContext.Provider value={value}>
      {loading ? null : children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress() must be used inside <ProgressProvider>');
  return ctx;
}
