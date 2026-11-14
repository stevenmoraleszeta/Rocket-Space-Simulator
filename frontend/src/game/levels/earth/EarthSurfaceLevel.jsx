/**
 * LEVEL 0 — EARTH SURFACE
 *
 * Starting point of the 'earth' mission. The player arrives at the launch base,
 * sees the same pad as the hangar, and receives the briefing from mission control.
 * The last briefing line previews the hangar limits and needs (mission.loadout,
 * the same data the hangar meters use), then the player goes to the hangar (GameScreen.jsx).
 */
import { useState } from 'react'
import launchPad from '../../../assets/images/backgrounds/launch_pad.svg'
import launchBase from '../../../assets/images/rockets/launch_base.png'
import { playSound } from '../../audio/soundEffects.js'
import { PadClouds } from '../../PadClouds.jsx'
import { PadCrew } from '../../PadCrew.jsx'
import { EMPTY_LOADOUT } from '../../parts.js'
import { Rocket } from '../../Rocket.jsx'
import '../../game.css'
import './earthSurface.css'

/** Supplies the hangar asks for, in the order its meters show them. */
const TRIP_NEEDS = [
  { key: 'heat', label: 'Heat' },
  { key: 'thrust', label: 'Thrust' },
  { key: 'food', label: 'Food' },
  { key: 'air', label: 'Air' },
]

/**
 * Briefing lines shown one by one. Short sentences for players aged 8–15.
 * A line can carry `needs`: chips with what the trip requires.
 */
function buildBriefingLines(mission) {
  const lines = [
    { text: 'Welcome to the launch base! This is where your space adventure begins.' },
    { text: `Your mission: ${mission.goal}` },
  ]
  const loadout = mission.loadout
  if (loadout) {
    lines.push({
      text: `In the hangar you have ${loadout.budget} credits and the rocket can lift ${loadout.mass} kg in total. Pack enough for the trip:`,
      needs: TRIP_NEEDS.filter((need) => loadout[need.key] > 0).map((need) => ({
        ...need,
        amount: loadout[need.key],
      })),
    })
  } else {
    lines.push({ text: 'Head to the hangar to get your rocket ready.' })
  }
  return lines
}

export function EarthSurfaceLevel({ mission, stageInfo, onContinue, onExit }) {
  const briefingLines = buildBriefingLines(mission)
  const [lineIndex, setLineIndex] = useState(0)
  const isLastLine = lineIndex === briefingLines.length - 1
  const currentLine = briefingLines[lineIndex]

  const showNextLine = () => {
    playSound('select')
    setLineIndex(lineIndex + 1)
  }
  const goToHangar = () => {
    playSound('confirm')
    onContinue()
  }
  const backToMissions = () => {
    playSound('cancel')
    onExit()
  }

  return (
    <div className="game game--pad earth-level">
      <div className="stage">
        <div className="stage__frame">
          <img className="stage__bg" src={launchPad} alt="" />
          <PadClouds />
          <div className="stage__mount">
            <div className="prep">
              <img className="prep__base" src={launchBase} alt="" />
              <Rocket equipped={EMPTY_LOADOUT} />
              <PadCrew />
            </div>
          </div>
        </div>
      </div>

      {/* Same HUD markup and classes as the hangar (GameScreen.jsx / game.css) */}
      <header className="game__hud">
        <button type="button" className="game__back" onClick={backToMissions}>
          Missions
        </button>
        <div className="game__mission">
          <div className="game__num">Level {stageInfo.levelNumber} · {stageInfo.title}</div>
          <h1>{mission.title}</h1>
        </div>
        <div className="game__place">{mission.place}</div>
      </header>

      <section className="earth-briefing" aria-live="polite">
        <div className="earth-briefing__speaker">Mission control</div>
        <p className="earth-briefing__text">{currentLine.text}</p>
        {currentLine.needs && (
          <ul className="earth-briefing__needs">
            {currentLine.needs.map((need) => (
              <li key={need.key} className="earth-need">
                <span className="earth-need__label">{need.label}</span>
                <span className="earth-need__amount">{need.amount}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="earth-briefing__actions">
          <span className="earth-briefing__step">{lineIndex + 1} / {briefingLines.length}</span>
          {isLastLine ? (
            <button type="button" className="ms-btn" onClick={goToHangar}>Go to the hangar →</button>
          ) : (
            <button type="button" className="ms-btn" onClick={showNextLine}>Next</button>
          )}
        </div>
      </section>
    </div>
  )
}
