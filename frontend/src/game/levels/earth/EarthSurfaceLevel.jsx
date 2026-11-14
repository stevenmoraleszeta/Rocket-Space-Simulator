/**
 * LEVEL 0 — EARTH SURFACE
 *
 * Starting point of the 'earth' mission. The player arrives at the launch base,
 * sees the Earth environment and receives the briefing from mission control.
 * The last briefing line previews the hangar limits and needs (mission.loadout,
 * the same data the hangar meters use), then the player goes to the hangar (GameScreen.jsx).
 *
 * The scene is drawn in art pixels inside <PixelStage>. Elements without art yet
 * are PLACEHOLDER shapes drawn with CSS (see earthSurface.css) and are replaced
 * by filling the matching entry in rendering/assetManifest.js.
 */
import { useState } from 'react'
import { playSound } from '../../audio/soundEffects.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import { PixelStage } from '../../rendering/PixelStage.jsx'
import '../../game.css'
import './earthSurface.css'

/** Positions in art pixels. The base sits under the rocket the same way it does in the hangar. */
const GROUND_TOP = 146
const ROCKET_POSITION = { x: 200, y: 102 }
const LAUNCH_BASE_POSITION = {
  x: ROCKET_POSITION.x + 16 - ASSETS.launchBase.frameWidth / 2,
  y: ROCKET_POSITION.y + ASSETS.rocketIdle.frameHeight - 8,
}
/** The cover stage keeps this point in view on narrow screens. */
const SCENE_FOCUS = { x: ROCKET_POSITION.x + 16, y: 120 }

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

/**
 * Draws a sprite from the manifest, or a CSS placeholder when the asset is still null.
 * `x`, `y`, `width` and `height` are in art pixels.
 */
function SceneSprite({ asset, placeholderClassName, x, y, width, height }) {
  const position = { left: x, top: y, width, height }
  if (asset?.src) {
    return <img className="earth-sprite" src={asset.src} style={position} alt="" draggable="false" />
  }
  return <div className={`earth-placeholder ${placeholderClassName}`} style={position} />
}

function EarthScene() {
  return (
    <>
      {/* PLACEHOLDER sky, sun, clouds and mountains (ASSETS.skyBackground) */}
      <div className="earth-sky" />
      <div className="earth-sun" />
      <div className="earth-cloud earth-cloud--a" />
      <div className="earth-cloud earth-cloud--b" />
      <div className="earth-mountains earth-mountains--far" />
      <div className="earth-mountains earth-mountains--near" />

      {/* PLACEHOLDER ground (ASSETS.groundTiles) */}
      <SceneSprite asset={ASSETS.groundTiles} placeholderClassName="earth-ground" x={0} y={GROUND_TOP} width={320} height={34} />

      <SceneSprite asset={ASSETS.missionControlBuilding} placeholderClassName="earth-building" x={96} y={118} width={56} height={28} />
      <SceneSprite asset={ASSETS.launchTower} placeholderClassName="earth-tower" x={176} y={88} width={12} height={58} />

      {/* Real sprites (shared with the hangar): rocket with the engine off, standing on its launch base */}
      <SceneSprite
        asset={ASSETS.rocketIdle}
        x={ROCKET_POSITION.x}
        y={ROCKET_POSITION.y}
        width={ASSETS.rocketIdle.frameWidth}
        height={ASSETS.rocketIdle.frameHeight}
      />
      <SceneSprite
        asset={ASSETS.launchBase}
        x={LAUNCH_BASE_POSITION.x}
        y={LAUNCH_BASE_POSITION.y}
        width={ASSETS.launchBase.frameWidth}
        height={ASSETS.launchBase.frameHeight}
      />
    </>
  )
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
    <div className="game earth-level">
      <PixelStage fit="cover" focus={SCENE_FOCUS} label="Launch base on Earth with a rocket waiting on the launch pad">
        <EarthScene />
      </PixelStage>

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
