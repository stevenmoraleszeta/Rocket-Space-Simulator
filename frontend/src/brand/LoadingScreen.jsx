/**
 * Shown while the session or saved progress is still loading.
 * The first paint lives in index.html (.boot) and uses the same picture,
 * so the handoff does not drop to an empty blue page.
 */
import { t } from '../i18n/index.js'
import { AppLogo } from './AppLogo.jsx'

export function LoadingScreen() {
  const label = t('Loading…')
  return (
    <div className="brand-splash" role="status" aria-live="polite">
      <AppLogo size={112} wordmark bare />
      <p className="brand-splash__status">{label}</p>
      <div className="brand-splash__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  )
}
