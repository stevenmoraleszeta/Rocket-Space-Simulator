/**
 * Launch umbilical tower next to the rocket on the pad, modeled on NASA's: a red steel lattice
 * tower (Apollo's launch umbilical tower, kept by the SLS mobile launcher) with a hammerhead
 * crane and a lightning mast on top.
 *
 * It holds the rocket at the same points NASA's tower does. Every coordinate is in pixels of the
 * 32 × 32 rocket sprite, so the arms touch the hull at these rows at any --scale:
 *   crew access arm   rows 3–6   the capsule, ending in the white room the crew walks through
 *   stage umbilical   rows 13–14 the joint where the rear stage separates in space
 *   core umbilical    rows 19–20 the lower body (fuel and power lines)
 * The hold-down posts on the fins are part of launch_base.png.
 *
 * launching: the arms swing back into the tower before liftoff (see .tower__arm in game.css).
 */

// Drawn area, in rocket sprite pixels: from (ORIGIN_X, ORIGIN_Y) to (ORIGIN_X + WIDTH, 32).
const ORIGIN_X = 18;
const ORIGIN_Y = -10;
const WIDTH = 18;
const HEIGHT = 32 - ORIGIN_Y;

const LEFT_LEG = 29;
const RIGHT_LEG = 34;
const TOWER_TOP = -4;

const COLORS = {
  steel: '#c8372d',
  steelDark: '#8e2a20',
  steelLight: '#e8604c',
  arm: '#b9c2ec',
  armDark: '#5d6a8a',
  whiteRoom: '#ffffff',
  hose: '#f2994a',
  crane: '#f2c94c',
  mast: '#c9dcf0',
  light: '#ff5d73',
};

/** Arms: row (top), height, and x where they touch the rocket hull. */
const ARMS = [
  { id: 'crew', top: 4, height: 2, hullX: 20, end: 'whiteRoom' },
  { id: 'stage', top: 13, height: 2, hullX: 21, end: 'hose' },
  { id: 'core', top: 19, height: 2, hullX: 22, end: 'hose' },
];

function px(x, y, color, w = 1, h = 1, key = `${x},${y},${color}`) {
  return <rect key={key} x={x - ORIGIN_X} y={y - ORIGIN_Y} width={w} height={h} fill={color} />;
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
    px(25, TOWER_TOP - 1, COLORS.armDark, 1, 2, 'hook'),
    // Lightning mast with its red warning light
    px(32, TOWER_TOP - 9, COLORS.mast, 1, 7, 'mast'),
    px(32, TOWER_TOP - 10, COLORS.light, 1, 1, 'mast-light'),
  ];
}

function arm({ id, top: y, height, hullX, end }) {
  const length = LEFT_LEG - hullX;
  return (
    <g key={id} className={`tower__arm tower__arm--${id}`}>
      {px(hullX, y, COLORS.arm, length, 1, `${id}-deck`)}
      {px(hullX, y + 1, COLORS.armDark, length, height - 1, `${id}-truss`)}
      {end === 'whiteRoom'
        ? px(hullX, y - 1, COLORS.whiteRoom, 2, height + 2, `${id}-room`)
        : px(hullX, y, COLORS.hose, 1, height, `${id}-plate`)}
      {/* service platform on the tower where the arm is hinged */}
      {px(LEFT_LEG - 1, y + height, COLORS.armDark, 2, 1, `${id}-hinge`)}
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
