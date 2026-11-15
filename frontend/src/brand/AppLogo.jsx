/**
 * Game mark. The drawing is public/favicon.svg, so the tab icon and the
 * screens stay the same picture. Pass wordmark to show the name beside it.
 * Pass bare to draw just the rocket, without the icon's square backdrop and star.
 */
import { t } from '../i18n/index.js'
import './brand.css'

export function AppLogo({ size = 64, wordmark = false, bare = false, className = '' }) {
  const named = Boolean(wordmark)
  const classes = ['brand', named ? 'brand--wordmark' : '', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <img
        className="brand__mark"
        src={bare ? '/rocket-mark.svg' : '/favicon.svg'}
        alt={named ? '' : t('Rocket Space Simulator')}
        width={size}
        height={size}
        draggable="false"
      />
      {named && (
        <p className="brand__name">
          Rocket Space
          <span>Simulator</span>
        </p>
      )}
    </div>
  )
}
