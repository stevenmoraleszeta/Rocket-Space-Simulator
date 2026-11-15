import pinUrl from '../../../assets/images/icons/pin.svg'
import pinSelectedUrl from '../../../assets/images/icons/pin_selected.svg'

/**
 * Pixel map pin for a launch base (mission 1 and Mars maps). Red, or yellow when picked.
 * Its tip sits on the base's real spot (orbitalLaunch.css .orbit-site__dot).
 */
export function SitePin({ selected = false }) {
  return (
    <span className="orbit-site__dot">
      <img className="orbit-site__pin" src={selected ? pinSelectedUrl : pinUrl} alt="" draggable="false" />
    </span>
  )
}
