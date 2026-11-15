/**
 * Player settings: music volume, ambient/effects volume and the player's name.
 * Pass a storage adapter (Firestore in the app) to load and save remotely.
 * Without one, settings stay in localStorage.
 *
 *   const { playerName, musicVolume, ambientVolume, update } = useSettings();
 *   // volumes are 0..1; the audio engine (src/audio) already applies them
 *   `Great job, ${displayName(playerName)}!`
 *   sayTo(playerName, 'The pad is ready.')
 *
 * useSettings() also works outside <SettingsProvider> (it returns the defaults),
 * so any screen or bot can read it safely.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyLanguage } from '../i18n/index.js';
import { DEFAULT_SETTINGS, loadSettings, normalize, saveSettings } from './settingsStore.js';

const SettingsContext = createContext(null);
const SAVE_DELAY_MS = 400;

export function SettingsProvider({ userId = 'guest', storage = null, children }) {
  // Subscribes the whole game to language changes so every screen redraws.
  useTranslation();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const settingsRef = useRef(settings);
  const hydratedRef = useRef(false);
  const loadedSerial = useRef('');
  const dirty = useRef(false);
  const persistRef = useRef(() => {});
  settingsRef.current = settings;

  const persist = useCallback((value) => {
    if (storage) {
      storage.save(userId, value).catch(() => { /* the adapter keeps the on-device copy */ });
      return;
    }
    saveSettings(value);
  }, [storage, userId]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setHydrated(false);

    const apply = (raw) => {
      if (cancelled) return;
      const next = normalize(raw);
      applyLanguage(next.language);
      loadedSerial.current = JSON.stringify(next);
      dirty.current = false;
      settingsRef.current = next;
      hydratedRef.current = true;
      setSettings(next);
      setHydrated(true);
    };

    if (!storage) apply(loadSettings());
    else storage.load(userId).then(apply).catch(() => apply(loadSettings()));

    return () => {
      cancelled = true;
      if (!dirty.current) return;
      dirty.current = false;
      persist(settingsRef.current);
    };
  }, [userId, storage, persist]);

  useEffect(() => {
    if (!hydratedRef.current) return undefined;
    const serial = JSON.stringify(settings);
    if (serial === loadedSerial.current) return undefined;

    dirty.current = true;
    const timer = setTimeout(() => {
      dirty.current = false;
      loadedSerial.current = JSON.stringify(settingsRef.current);
      persistRef.current(settingsRef.current);
    }, storage ? SAVE_DELAY_MS : 0);

    return () => clearTimeout(timer);
  }, [settings, hydrated, storage, userId]);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = normalize({ ...prev, ...patch });
      applyLanguage(next.language);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...settings, update }), [settings, update]);
  return (
    <SettingsContext.Provider value={value}>
      {hydrated ? children : null}
    </SettingsContext.Provider>
  );
}

const FALLBACK = { ...DEFAULT_SETTINGS, update: () => {} };

export function useSettings() {
  return useContext(SettingsContext) ?? FALLBACK;
}
