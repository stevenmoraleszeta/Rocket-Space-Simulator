import usFlag from '../assets/images/backgrounds/us_flag.svg';

/**
 * United States flag on its flagpole beside the communications station.
 * Uses the pad art's 480×270 grid (like PadClouds) so it stays on the pole at any screen size.
 * The pole in launch_pad.svg is at x=294..296, with its gold top at y=66..69. It sits far enough
 * left that the supplies panel on the right does not cover the flag on laptop screens.
 */
// us_flag.svg is animated (it waves). Its image is 26×19 art pixels and the pole-side top
// corner of the cloth sits 3 pixels down, so y=70 puts the cloth right under the red light.
const FLAG = { x: 296, y: 70, width: 26 };

export function PadFlag() {
  return (
    <img
      className="pad-flag"
      src={usFlag}
      alt=""
      style={{
        left: `${(FLAG.x * 100) / 480}%`,
        top: `${(FLAG.y * 100) / 270}%`,
        width: `${(FLAG.width * 100) / 480}%`,
      }}
    />
  );
}
