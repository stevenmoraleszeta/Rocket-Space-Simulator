/**
 * Player settings: music volume, ambient/effects volume and the player's name.
 * Saved in localStorage so they survive reloads.
 *
 *   const { playerName, musicVolume, ambientVolume, update } = useSettings();
 *   // volumes are 0..1; the audio engine (src/audio) already applies them
 *   `Great job, ${displayName(playerName)}!`
 *
 * useSettings() also works outside <SettingsProvider> (it returns the defaults),
 * so any screen or bot can read it safely.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, normalize, saveSettings } from './settingsStore.js';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => { saveSettings(settings); }, [settings]);

  const update = useCallback((patch) => {
    setSettings((prev) => normalize({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ ...settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

const FALLBACK = { ...DEFAULT_SETTINGS, update: () => {} };

export function useSettings() {
  return useContext(SettingsContext) ?? FALLBACK;
}
