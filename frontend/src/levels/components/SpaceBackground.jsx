/**
 * Full-screen starry background. Uses SPRITES.background when there is one,
 * otherwise a plain dark-blue gradient. Other screens can reuse it:
 *
 *   <SpaceBackground><MyScreen /></SpaceBackground>
 */
import { SPRITES } from '../assets/sprites.js';
import { splitLayers } from '../../lib/svgLayers.js';

/**
 * The moving parts of space.svg: three groups of twinkling stars and three shooting stars.
 * Each becomes a still layer animated by CSS (missions.css, .ms-bg__twinkle / .ms-bg__shoot),
 * so the big sky picture is drawn once instead of on every frame.
 */
const TWINKLES = ['t1', 't2', 't3'];
const SHOOTING = ['fugaz f1', 'fugaz f2', 'fugaz f3'];

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
      {isCover && bg.raw ? (
        <SkyLayers raw={bg.raw} cls={cls} />
      ) : isCover ? (
        <img className={cls} src={bg.src} alt="" aria-hidden="true" />
      ) : (
        <div className={cls} style={style} aria-hidden="true" />
      )}
      <div className="ms-bg__content">{children}</div>
    </div>
  );
}

/** Still sky plus its twinkling and shooting-star layers, each animated on the GPU. */
function SkyLayers({ raw, cls }) {
  const sky = splitLayers(raw, [...TWINKLES, ...SHOOTING]);
  const units = { '--sky-w': sky.width, '--sky-h': sky.height };
  return (
    <>
      <img className={cls} src={sky.base} alt="" aria-hidden="true" />
      {TWINKLES.map((name, index) => (
        <img
          key={name}
          className={`${cls} ms-bg__overlay ms-bg__twinkle ms-bg__twinkle--${index + 1}`}
          src={sky.layers[name]}
          alt=""
          aria-hidden="true"
        />
      ))}
      {SHOOTING.map((name, index) => (
        <img
          key={name}
          className={`${cls} ms-bg__overlay ms-bg__shoot ms-bg__shoot--${index + 1}`}
          src={sky.layers[name]}
          style={units}
          alt=""
          aria-hidden="true"
        />
      ))}
    </>
  );
}
