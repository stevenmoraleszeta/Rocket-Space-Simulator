/**
 * SPRITES — the only file to edit when the art arrives.
 *
 * 1. Copy the image files into this folder (src/levels/assets/).
 * 2. Import them below and fill in SPRITES.
 * 3. Anything left as `null` keeps using the built-in SVG drawings / plain background.
 *
 * Planet sprite options:
 *   src       imported image (PNG, WebP, GIF or SVG; transparent background recommended)
 *   frames    1 = still image. More than 1 = horizontal sprite sheet (all frames in one row,
 *             each frame square), played as an animation.
 *   fps       animation speed for sprite sheets (default 8)
 *   pixelArt  true = keep hard pixel edges when scaled (for pixel-art sprites)
 *
 * Background options:
 *   src       imported image
 *   mode      'tile'  = repeat the image (best for small star patterns)
 *             'cover' = one big image stretched to fill the screen
 *   drift     true = the stars slowly scroll (only in 'tile' mode; turns off with "reduce motion")
 *   pixelArt  same as above
 */

import earth from './earth.svg';
import moon from './moon.svg';
import mars from './mars.svg';

import space from '../../assets/images/backgrounds/space.svg';

export const SPRITES = {
  planets: {
    earth: { src: earth, frames: 1, pixelArt: true },
    moon: { src: moon, frames: 1, pixelArt: true },
    mars: { src: mars, frames: 1, pixelArt: true },
  },
  background: { src: space, mode: 'cover', pixelArt: true },
};
