/**
 * Judge switch for the main menu. It lives in this browser only, so turning it
 * on does not rewrite the player's saved stars.
 */
const KEY = 'space-mission:admin-mode';

export function readAdminMode() {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function writeAdminMode(on) {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* private mode: the switch still works until the page reloads */
  }
}
