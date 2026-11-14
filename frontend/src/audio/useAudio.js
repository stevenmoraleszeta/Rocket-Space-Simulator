/**
 * React hooks for the audio engine.
 *
 *   useSoundtrack({ music: MUSIC.menu, ambient: AMBIENCE.space });  // in a screen
 *   useAudioVolumes();                                              // once, near the root
 */
import { useEffect } from 'react';
import { useSettings } from '../settings/SettingsContext.jsx';
import { setChannelVolume, setTrack } from './audioManager.js';

/**
 * Chooses what plays while the calling screen is shown.
 * Pass null (or leave out) a channel to silence it on this screen.
 */
export function useSoundtrack({ music = null, ambient = null } = {}) {
  useEffect(() => { setTrack('music', music); }, [music]);
  useEffect(() => { setTrack('ambient', ambient); }, [ambient]);
}

/** Keeps the audio engine in sync with the volume sliders in settings. */
export function useAudioVolumes() {
  const { musicVolume, ambientVolume } = useSettings();
  useEffect(() => { setChannelVolume('music', musicVolume); }, [musicVolume]);
  useEffect(() => { setChannelVolume('ambient', ambientVolume); }, [ambientVolume]);
}

/** Drop-in component version of useAudioVolumes(), for use inside <SettingsProvider>. */
export function AudioVolumeSync() {
  useAudioVolumes();
  return null;
}
