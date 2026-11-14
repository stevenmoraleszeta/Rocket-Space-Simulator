// Player settings (volumes + name). Import from here:
//   import { SettingsProvider, useSettings, SettingsMenu, displayName } from './settings';
export { SettingsProvider, useSettings } from './SettingsContext.jsx';
export { displayName, cleanName, DEFAULT_SETTINGS, MAX_NAME_LENGTH } from './settingsStore.js';
export { SettingsMenu } from './SettingsMenu.jsx';
