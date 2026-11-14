import cloud from '../assets/images/backgrounds/cloud.svg';

/**
 * Clouds drifting left to right across the launch pad sky.
 * Positions use the pad art's 480×270 grid so they scale with the background.
 *   y      top of the cloud, in pad pixels
 *   size   width multiplier (1 = 46 pad pixels wide)
 *   time   seconds to cross the whole sky
 *   start  0–1, how far along its trip the cloud is when the screen opens
 */
// Kept between y=26 and y=60 so they pass under the HUD text and above the horizon.
const CLOUDS = [
  { y: 30, size: 1, time: 70, start: 0.3 },
  { y: 46, size: 1.2, time: 95, start: 0.55 },
  { y: 26, size: 0.75, time: 58, start: 0.8, flip: true },
  { y: 56, size: 0.9, time: 82, start: 0.05, flip: true },
  { y: 38, size: 0.65, time: 50, start: 0.95 },
];

export function PadClouds() {
  return (
    <div className="clouds" aria-hidden="true">
      {CLOUDS.map((c) => (
        <div
          key={`${c.y}-${c.time}`}
          className="clouds__lane"
          style={{
            '--cloud-w': `${(46 * c.size * 100) / 480}%`,
            animationDuration: `${c.time}s`,
            animationDelay: `${-c.start * c.time}s`,
          }}
        >
          <img
            className={c.flip ? 'clouds__cloud is-flipped' : 'clouds__cloud'}
            src={cloud}
            alt=""
            style={{ top: `${(c.y * 100) / 270}%` }}
          />
        </div>
      ))}
    </div>
  );
}
