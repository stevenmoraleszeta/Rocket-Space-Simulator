/**
 * Game mark. The drawing is public/favicon.svg, so the tab icon and the
 * screens stay the same picture. Pass wordmark to show the name beside it.
 */
import './brand.css'

export function AppLogo({ size = 64, wordmark = false, className = '' }) {
  const named = Boolean(wordmark)
  const classes = ['brand', named ? 'brand--wordmark' : '', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <img
        className="brand__mark"
        src="/favicon.svg"
        alt={named ? '' : 'Rocket Space Simulator'}
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
