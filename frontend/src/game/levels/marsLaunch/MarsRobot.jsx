/**
 * The game's own little Mars explorer robot, in pixel art: a dome head with one big round eye
 * that blinks, an antenna with a red light, a round orange body with a speaker grille, three round wheels,
 * one arm resting and one waving its claw. While `talking` the grille glows and the antenna
 * blinks fast. It says the messages of the Mars landing (MarsLanding.jsx).
 * Drawn as stacked full-size SVG layers so each moving part is animated on its own (marsLaunch.css).
 */

const ART = { width: 24, height: 27 }

const WHITE = '#e8ecf2'
const WHITE_SHADE = '#b9c1d0'
const METAL = '#9aa0b0'
const METAL_DARK = '#7d8292'
const ORANGE = '#e8742e'
const ORANGE_LIGHT = '#ffa25a'
const ORANGE_DARK = '#b8521c'
const TIRE = '#2a2c35'

const BODY = [
  // antenna stem, neck and the axle
  [12, 2, 1, 3, METAL_DARK], [11, 13, 2, 1, METAL_DARK], [5, 22, 14, 1, '#4b4e5a'],
  // dome head
  [8, 5, 8, 1, WHITE], [7, 6, 10, 1, WHITE], [6, 7, 12, 5, WHITE], [7, 12, 10, 1, WHITE_SHADE],
  [16, 7, 2, 5, WHITE_SHADE], [7, 7, 1, 2, '#ffffff'],
  // the big eye: dark ring, glowing lens, a glint
  [10, 7, 4, 1, '#2a3350'], [9, 8, 6, 2, '#2a3350'], [10, 10, 4, 1, '#2a3350'],
  [11, 8, 2, 2, '#4fd1ff'], [10, 8, 1, 1, '#9be7ff'], [11, 8, 1, 1, '#ffffff'],
  // orange body with a speaker grille and two status lights
  [8, 14, 8, 1, ORANGE_LIGHT], [7, 15, 10, 1, ORANGE], [6, 16, 12, 4, ORANGE], [7, 20, 10, 1, ORANGE], [8, 21, 8, 1, ORANGE_DARK],
  [16, 16, 2, 4, ORANGE_DARK], [15, 20, 2, 1, ORANGE_DARK], [7, 15, 2, 1, ORANGE_LIGHT],
  [9, 16, 6, 3, '#3a2a2a'], [9, 17, 6, 1, '#6b4a3a'],
  [8, 20, 1, 1, '#3ddc97'], [10, 20, 1, 1, '#ffd23f'],
  // three wheels with hubs
  ...[4, 10, 16].flatMap((x) => [[x + 1, 23, 2, 1, TIRE], [x, 24, 4, 2, TIRE], [x + 1, 26, 2, 1, TIRE], [x + 1, 24, 2, 2, METAL]]),
]
/** Eyelid: covers the eye for a blink. */
const LID = [[9, 7, 6, 4, WHITE], [9, 9, 6, 1, WHITE_SHADE]]
/** Grille glow while talking. */
const VOICE = [[9, 16, 6, 1, '#4fd1ff'], [10, 18, 4, 1, '#4fd1ff']]
const ANTENNA_LIGHT = [[11, 0, 3, 2, '#ff5d73'], [11, 0, 1, 1, '#ffb3c0']]
/** Arm on the viewer's left, resting, with a closed claw. */
const ARM_LEFT = [[4, 15, 2, 5, METAL], [3, 20, 3, 2, METAL_DARK]]
/** Arm on the viewer's right, raised high, waving its open claw. */
const ARM_RIGHT = [[18, 14, 2, 2, METAL], [19, 9, 2, 6, METAL], [18, 7, 1, 2, METAL_DARK], [21, 7, 1, 2, METAL_DARK], [19, 8, 2, 1, METAL_DARK]]

function Layer({ rects, className, origin = [0.5, 0.5] }) {
  const left = Math.min(...rects.map(([x]) => x))
  const top = Math.min(...rects.map(([, y]) => y))
  const right = Math.max(...rects.map(([x, , w]) => x + w))
  const bottom = Math.max(...rects.map(([, y, , h]) => y + h))
  const ox = ((left + (right - left) * origin[0]) * 100) / ART.width
  const oy = ((top + (bottom - top) * origin[1]) * 100) / ART.height
  return (
    <svg
      className={`mars-robot__part ${className}`}
      viewBox={`0 0 ${ART.width} ${ART.height}`}
      shapeRendering="crispEdges"
      style={{ transformOrigin: `${ox}% ${oy}%` }}
      aria-hidden="true"
    >
      {rects.map(([x, y, w, h, fill], index) => <rect key={index} x={x} y={y} width={w} height={h} fill={fill} />)}
    </svg>
  )
}

export function MarsRobot({ talking }) {
  return (
    <div className={`mars-robot${talking ? ' is-talking' : ''}`} aria-hidden="true">
      <div className="mars-robot__bob">
        <Layer rects={ARM_LEFT} className="mars-robot__arm-left" origin={[0.5, 0]} />
        <Layer rects={BODY} className="mars-robot__body" />
        <Layer rects={LID} className="mars-robot__lid" />
        <Layer rects={VOICE} className="mars-robot__voice" />
        <Layer rects={ANTENNA_LIGHT} className="mars-robot__light" />
        <Layer rects={ARM_RIGHT} className="mars-robot__arm-right" origin={[0.2, 1]} />
      </div>
    </div>
  )
}
