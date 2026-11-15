/**
 * Launch umbilical tower next to the rocket on the pad, modeled on NASA's: a red steel lattice
 * tower (Apollo's launch umbilical tower, kept by the SLS mobile launcher) with a hammerhead
 * crane and a lightning mast on top.
 *
 * It holds the rocket at the same points NASA's tower does. Every coordinate is in pixels of the
 * 32 × 32 rocket sprite, so the arms touch the hull at these rows at any --scale:
 *   crew access arm   rows 4–6   the capsule
 *   stage umbilical   rows 13–15 the joint where the rear stage separates in space
 *   core umbilical    rows 19–21 the lower body (fuel and power lines)
 * Each arm is a plain 3-pixel strip of medium gray steel.
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
  arm: '#a3abb8',
  armLight: '#c3cad4',
  hook: '#8d96a4',
  crane: '#f2c94c',
  mast: '#c9dcf0',
  light: '#ff5d73',
};

/** Arms: top row and x where they touch the rocket hull. All of them are ARM_THICKNESS rows tall. */
const ARM_THICKNESS = 3;
const ARMS = [
  { id: 'crew', top: 4, hullX: 20 },
  { id: 'stage', top: 13, hullX: 21 },
  { id: 'core', top: 19, hullX: 22 },
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
    px(25, TOWER_TOP - 1, COLORS.hook, 1, 2, 'hook'),
    // Lightning mast with its red warning light
    px(32, TOWER_TOP - 9, COLORS.mast, 1, 7, 'mast'),
    px(32, TOWER_TOP - 10, COLORS.light, 1, 1, 'mast-light'),
  ];
}

function arm({ id, top: y, hullX }) {
  const length = LEFT_LEG - hullX;
  return (
    <g key={id} className={`tower__arm tower__arm--${id}`}>
      {/* lit top edge, then the rest of the strip */}
      {px(hullX, y, COLORS.armLight, length, 1, `${id}-top`)}
      {px(hullX, y + 1, COLORS.arm, length, ARM_THICKNESS - 1, `${id}-body`)}
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
