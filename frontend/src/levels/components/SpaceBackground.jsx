/**
 * Full-screen starry background. Uses SPRITES.background when there is one,
 * otherwise a plain dark-blue gradient. Other screens can reuse it:
 *
 *   <SpaceBackground><MyScreen /></SpaceBackground>
 */
import { SPRITES } from '../assets/sprites.js';

export function SpaceBackground({ children }) {
  const bg = SPRITES.background;
  const style = bg?.src
    ? {
        backgroundImage: `url(${bg.src})`,
        backgroundRepeat: bg.mode === 'cover' ? 'no-repeat' : 'repeat',
        backgroundSize: bg.mode === 'cover' ? 'cover' : 'auto',
        backgroundPosition: 'center',
      }
    : undefined;
  const cls = [
    'ms-bg__layer',
    bg?.src ? 'has-image' : '',
    bg?.src && bg.mode !== 'cover' && bg.drift ? 'is-drifting' : '',
    bg?.pixelArt ? 'is-pixel' : '',
  ].join(' ');

  return (
    <div className="ms-bg">
      <div className={cls} style={style} aria-hidden="true" />
      <div className="ms-bg__content">{children}</div>
    </div>
  );
}
