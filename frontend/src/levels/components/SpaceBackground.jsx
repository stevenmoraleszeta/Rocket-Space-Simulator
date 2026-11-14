/**
 * Full-screen starry background. Uses SPRITES.background when there is one,
 * otherwise a plain dark-blue gradient. Other screens can reuse it:
 *
 *   <SpaceBackground><MyScreen /></SpaceBackground>
 */
import { SPRITES } from '../assets/sprites.js';

export function SpaceBackground({ children }) {
  const bg = SPRITES.background;
  const isCover = Boolean(bg?.src && bg.mode === 'cover');
  const style = bg?.src && !isCover
    ? {
        backgroundImage: `url(${bg.src})`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        backgroundPosition: 'center',
      }
    : undefined;
  const cls = [
    'ms-bg__layer',
    bg?.src ? 'has-image' : '',
    bg?.src && !isCover && bg.drift ? 'is-drifting' : '',
    bg?.pixelArt ? 'is-pixel' : '',
  ].join(' ');

  return (
    <div className="ms-bg">
      {isCover ? (
        <img className={cls} src={bg.src} alt="" aria-hidden="true" />
      ) : (
        <div className={cls} style={style} aria-hidden="true" />
      )}
      <div className="ms-bg__content">{children}</div>
    </div>
  );
}
