/**
 * The Eagle, the lunar lander, in pixel art: silver cabin with two windows, antennas and
 * side thrusters on top, gold foil descent stage below, four legs with round footpads,
 * a ladder and the engine bell. With `firing` a layered flame burns under the bell.
 * Used by the landing mini-game (MoonLanding.jsx) and its tutorial cards (MoonTips.jsx).
 * The art is 32×30; the footpads sit on the bottom row, so the picture's bottom is the ground.
 */

const SILVER = '#d4d7df'
const SILVER_LIGHT = '#eef0f5'
const SILVER_SHADE = '#a1a6b4'
const SILVER_DARK = '#7d8292'
const GOLD = '#d8a23a'
const GOLD_LIGHT = '#f2c94c'
const GOLD_SHINE = '#ffe08a'
const GOLD_FOLD = '#a8781e'
const GOLD_DARK = '#8f6418'
const WINDOW = '#1d2a52'
const GLASS = '#6d8bd6'
const IRON = '#4b4e5a'

const BODY = [
  // antennas: the dish on its mast, a whip on the other side
  [19, 0, 1, 3, SILVER_DARK], [17, 0, 4, 1, SILVER_LIGHT], [11, 1, 1, 2, SILVER_DARK],
  // side thrusters (the little quads that turn the lander)
  [7, 5, 2, 3, SILVER_DARK], [6, 6, 1, 1, IRON], [23, 5, 2, 3, SILVER_DARK], [25, 6, 1, 1, IRON],
  // cabin (ascent stage)
  [11, 3, 10, 1, SILVER_LIGHT], [10, 4, 12, 8, SILVER], [9, 6, 14, 5, SILVER],
  [10, 4, 1, 2, SILVER_LIGHT], [20, 4, 2, 8, SILVER_SHADE], [22, 6, 1, 5, SILVER_SHADE], [10, 11, 12, 1, SILVER_SHADE],
  // windows with a glint, and the hatch the crew climbs out of
  [12, 6, 3, 2, WINDOW], [12, 6, 1, 1, GLASS], [17, 6, 3, 2, WINDOW], [17, 6, 1, 1, GLASS],
  [14, 9, 4, 3, SILVER_DARK], [15, 10, 2, 1, '#5a5f70'],
  // gold foil descent stage, with folds and shiny spots
  [7, 12, 18, 1, GOLD_LIGHT], [6, 13, 20, 7, GOLD],
  [9, 13, 1, 7, GOLD_FOLD], [14, 13, 1, 7, GOLD_FOLD], [19, 13, 1, 7, GOLD_FOLD], [24, 13, 1, 7, GOLD_FOLD],
  [11, 14, 2, 1, GOLD_SHINE], [16, 15, 2, 1, GOLD_SHINE], [21, 14, 2, 1, GOLD_SHINE], [7, 16, 1, 2, GOLD_SHINE],
  [6, 19, 20, 1, GOLD_DARK],
  // engine bell
  [13, 20, 6, 1, IRON], [12, 21, 8, 2, '#6c6f7c'], [14, 21, 4, 1, '#2a2c35'],
  // left leg: strut, brace and footpad
  [5, 16, 1, 2, SILVER], [4, 18, 1, 3, SILVER], [3, 21, 1, 3, SILVER], [2, 24, 1, 4, SILVER],
  [6, 20, 1, 2, SILVER_DARK], [5, 22, 1, 2, SILVER_DARK], [4, 24, 1, 2, SILVER_DARK],
  [0, 28, 5, 1, SILVER_LIGHT], [1, 29, 3, 1, SILVER_SHADE],
  // right leg
  [26, 16, 1, 2, SILVER], [27, 18, 1, 3, SILVER], [28, 21, 1, 3, SILVER], [29, 24, 1, 4, SILVER],
  [25, 20, 1, 2, SILVER_DARK], [26, 22, 1, 2, SILVER_DARK], [27, 24, 1, 2, SILVER_DARK],
  [27, 28, 5, 1, SILVER_LIGHT], [28, 29, 3, 1, SILVER_SHADE],
  // front leg with the ladder
  [8, 20, 1, 8, SILVER_SHADE], [10, 20, 1, 8, SILVER_SHADE], [9, 22, 1, 1, SILVER_LIGHT], [9, 25, 1, 1, SILVER_LIGHT],
  [7, 28, 5, 1, SILVER_LIGHT], [8, 29, 3, 1, SILVER_SHADE],
]

/** Two flame shapes, swapped quickly so the fire flickers. */
const FLAME_A = [
  [12, 23, 8, 2, '#ff7a2a'], [13, 25, 6, 2, '#ffb347'], [14, 27, 4, 2, '#ffd23f'], [15, 23, 2, 5, '#fff6c8'],
]
const FLAME_B = [
  [13, 23, 6, 2, '#ff7a2a'], [12, 24, 8, 2, '#ffb347'], [14, 26, 4, 3, '#ffd23f'], [15, 23, 2, 4, '#fff6c8'],
]

function Pixels({ rects }) {
  return rects.map(([x, y, w, h, fill], index) => <rect key={index} x={x} y={y} width={w} height={h} fill={fill} />)
}

export function LunarLander({ firing = false, className = '' }) {
  return (
    <svg className={`lunar-lander ${className}`} viewBox="0 0 32 30" shapeRendering="crispEdges" aria-hidden="true" overflow="visible">
      {firing && (
        <g className="lunar-lander__flame">
          <g className="lunar-lander__flame-a"><Pixels rects={FLAME_A} /></g>
          <g className="lunar-lander__flame-b"><Pixels rects={FLAME_B} /></g>
        </g>
      )}
      <Pixels rects={BODY} />
    </svg>
  )
}
