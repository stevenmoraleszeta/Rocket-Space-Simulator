/**
 * Mission title in the flight HUD, with the game mark beside it.
 */
import { AppLogo } from '../brand/AppLogo.jsx'

export function HudMission({ kicker, title, children }) {
  return (
    <div className="game__mission">
      <AppLogo size={32} decorative />
      <div className="game__mission-copy">
        <div className="game__num">{kicker}</div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  )
}
