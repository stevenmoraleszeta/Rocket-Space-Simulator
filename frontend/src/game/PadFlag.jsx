import usFlagRaw from '../assets/images/backgrounds/us_flag.svg?raw';
import { frameStrip } from '../lib/svgLayers.js';

/**
 * United States flag on its flagpole beside the communications station.
 * Uses the pad art's 480×270 grid (like PadClouds) so it stays on the pole at any screen size.
 * The pole in launch_pad.svg is at x=294..296, with its gold top at y=66..69. It sits far enough
 * left that the supplies panel on the right does not cover the flag on laptop screens.
 */
// us_flag.svg waves through 6 frames (<g class="f0"> ... "f5"). Its image is 26×19 art pixels and
// the pole-side top corner of the cloth sits 3 pixels down, so y=70 puts the cloth right under
// the red light. The frames are laid out as one still strip that slides behind a window
// (.pad-flag), so the browser never redraws the 2300-pixel picture while it waves.
const FLAG = { x: 296, y: 70, width: 26 };

export function PadFlag() {
  const strip = frameStrip(usFlagRaw);
  return (
    <span
      className="pad-flag"
      aria-hidden="true"
      style={{
        left: `${(FLAG.x * 100) / 480}%`,
        top: `${(FLAG.y * 100) / 270}%`,
        width: `${(FLAG.width * 100) / 480}%`,
        aspectRatio: `${strip.width} / ${strip.height}`,
        '--frames': strip.frames,
      }}
    >
      <img className="pad-flag__strip" src={strip.url} alt="" />
    </span>
  );
}
