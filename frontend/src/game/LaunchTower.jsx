/**
 * Launch umbilical tower next to the rocket on the pad, modeled on NASA's: a red steel lattice
 * tower (Apollo's launch umbilical tower, kept by the SLS mobile launcher) with a hammerhead
 * crane and a lightning mast on top.
 *
 * Every coordinate is in pixels of the 32 × 32 rocket sprite, so the arms touch the hull at these
 * rows at any --scale.
 * All three hold the upper part of the rocket. They are thin red beams like the tower (Apollo's
 * swing arms were red too), so no gray block sticks to the rocket:
 *   crew access arm   row 4    the capsule, just under the nose
 *   upper arm         row 8    the upper stage
 *   stage arm         row 12   above the joint where the rear stage separates in space
 * The hold-down posts on the fins are part of launch_base.png.
 *
 * launching: the arms swing back into the tower before liftoff (see .tower__arm in game.css).
 */

// Drawn area, in rocket sprite pixels: from (ORIGIN_X, ORIGIN_Y) to (ORIGIN_X + WIDTH, 32).
const ORIGIN_X = 18;
// Starts at the glow above the mast light (TOWER_TOP - 11), so the light is never clipped.
const ORIGIN_Y = -15;
const WIDTH = 18;
const HEIGHT = 32 - ORIGIN_Y;

const LEFT_LEG = 29;
const RIGHT_LEG = 34;
const TOWER_TOP = -4;

const COLORS = {
  steel: '#c8372d',
  steelDark: '#8e2a20',
  steelLight: '#e8604c',
  hook: '#8d96a4',
  crane: '#f2c94c',
  mast: '#c9dcf0',
  light: '#ff5d73',
  glow: 'rgba(255, 93, 115, 0.45)',
};

/** Arms: row and x where they touch the rocket hull. Each one is a single pixel row. */
const ARMS = [
  { id: 'crew', top: 4, hullX: 20 },
  { id: 'upper', top: 8, hullX: 21 },
  { id: 'stage', top: 12, hullX: 21 },
];

function px(x, y, color, w = 1, h = 1, key = `${x},${y},${color}`, className = undefined) {
  return (
    <rect key={key} className={className} x={x - ORIGIN_X} y={y - ORIGIN_Y} width={w} height={h} fill={color} />
  );
}

function lattice() {
  const pixels = [];
  for (let y = TOWER_TOP; y < 32; y += 1) {
    pixels.push(px(LEFT_LEG, y, COLORS.steel), px(RIGHT_LEG, y, COLORS.steelDark));
    const bay = ((y - TOWER_TOP) % 4 + 4) % 4;
    if (bay === 0) {
      pixels.push(px(LEFT_LEG + 1, y, COLORS.steelLight, RIGHT_LEG - LEFT_LEG - 1, 1));
    } else {
      // X bracing inside each 4-row bay
      pixels.push(px(LEFT_LEG + bay, y, COLORS.steel), px(RIGHT_LEG - bay, y, COLORS.steelDark));
    }
  }
  return pixels;
}

function top() {
  return [
    // Hammerhead crane: boom, counterweight and hook line
    px(25, TOWER_TOP - 2, COLORS.crane, 11, 1, 'boom'),
    px(LEFT_LEG, TOWER_TOP - 1, COLORS.crane, RIGHT_LEG - LEFT_LEG + 1, 1, 'crane-base'),
    px(34, TOWER_TOP - 3, COLORS.steelDark, 2, 1, 'counterweight'),
    px(25, TOWER_TOP - 1, COLORS.hook, 1, 2, 'hook'),
    // Lightning mast with its red warning light at the tip. It blinks, and a pixel cross
    // glows around it while it is on (see .tower__light in game.css).
    px(32, TOWER_TOP - 9, COLORS.mast, 1, 7, 'mast'),
    px(31, TOWER_TOP - 10, COLORS.glow, 3, 1, 'mast-glow-h', 'tower__light tower__light--glow'),
    px(32, TOWER_TOP - 11, COLORS.glow, 1, 3, 'mast-glow-v', 'tower__light tower__light--glow'),
    px(32, TOWER_TOP - 10, COLORS.light, 1, 1, 'mast-light', 'tower__light'),
  ];
}

function arm({ id, top: y, hullX }) {
  return (
    <g key={id} className={`tower__arm tower__arm--${id}`}>
      {px(hullX, y, COLORS.steel, LEFT_LEG - hullX, 1, `${id}-beam`)}
    </g>
  );
}

export function LaunchTower({ launching = false }) {
  return (
    <svg
      className={launching ? 'tower is-launching' : 'tower'}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ '--tower-x': ORIGIN_X, '--tower-y': ORIGIN_Y, '--tower-w': WIDTH, '--tower-h': HEIGHT }}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {lattice()}
      {top()}
      {ARMS.map(arm)}
    </svg>
  );
}
