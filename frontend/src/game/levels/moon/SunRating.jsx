import { PixelIcon } from '../../PixelIcon.jsx'

/** How much light the cameras get, as 1 to 3 pixel suns (in place of ☀ text). */
export function SunRating({ level }) {
  return (
    <span className="sun-rating" aria-hidden="true">
      {Array.from({ length: level }, (_, index) => <PixelIcon key={index} name="sun" />)}
    </span>
  )
}
