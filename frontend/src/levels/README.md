# Space Mission: mission selection

Mission selection screen for the first prototype: **3 missions played in order** (Earth → Moon → Mars), designed for players aged 8–15.

It handles:

- the **3 missions** and their order,
- **unlocking** each mission when the previous one is completed,
- **stars** (1–3) for each mission,
- **saving progress** (Firestore for the signed-in player, with a copy in localStorage),
- the **selection screen** and the **mission card** with a "Launch!" button.

Mission 1 gameplay stays in `src/game/`. Mission 2 uses the same hangar (`GameScreen.jsx`, with the Moon parts), then `src/game/levels/moon/MoonLaunchLevel.jsx`: pick a base on the polar Earth map, accept, then choose the launch day (a slider over the Moon phase on each arrival day) and hour. Earth turns with the real sidereal time, the Moon sits on its real orbit, and a corner card shows its real phase, from above and from Earth. Changing the day glides everything to its new place. The player drags the dotted path like mission 1; the path is a real Earth–Moon gravity simulation (`moonTransfer.js`). Satellites and debris clouds follow modeled orbits, not live tracking; flying through one damages the ship and the object it hit. A good arrival plays the landing mini-game (`MoonLanding.jsx`) and three lunar orbit events (`moonOrbitEvents.js`, some hands-on), then the ship flies home on a return path found with the same gravity simulation (`simulateReturn`), shown while aiming as "WAY HOME". The flight runs on an even clock shown at the top of the map. Brighter Moon on arrival day gives better maps.

## Running it

```bash
npm install
npm run dev     # game at http://localhost:5173
npm run test:moon
```

Mission 2 is temporarily available from the start. Mission 3 still unlocks after Mission 2 is completed.

## Structure

```
src/levels/
├── index.js                ← import everything from here
├── data/missions.js        ← the 3 missions (edit text here)
├── progression.js          ← pure logic: unlocking and stars
├── progression.test.js
├── storage.js              ← localStorage / Firestore adapters
├── ProgressContext.jsx     ← <ProgressProvider> + useProgress()
├── missions.css            ← styles (ms-* classes, colors in CSS variables)
└── components/
    ├── MissionSelect.jsx   ← selection screen + mission card
    ├── Planet.jsx          ← planet sprite (or built-in SVG drawing)
    ├── SpaceBackground.jsx ← starry background (reusable on other screens)
    └── StarRating.jsx
src/levels/assets/
└── sprites.js              ← plug the art in here
src/game/levels/moon/
├── MoonLaunchLevel.jsx     ← base map, launch day, aim, flight, orbit events, result
├── MoonPhaseCard.jsx       ← corner card: the Moon phase on the chosen date
├── MoonEventCard.jsx       ← pop-up for one lunar orbit event (tap / dial actions)
├── MoonLanding.jsx         ← landing mini-game
├── moonTransfer.js         ← Earth–Moon flight, Sun and Moon positions, satellites and junk
├── moonScene.js            ← canvas drawing of the Earth–Moon map
├── moonOrbitEvents.js      ← lunar orbit events, adapted to the hangar parts
└── moonLaunchPlanning.js   ← Moon orbit, lunar phase, sidereal time
```

## Rules

| Rule | Value |
|---|---|
| Unlocking | Mission 1 is always open. Mission 2 opens after completing 1, and 3 after completing 2. |
| Completing | Gameplay reports `success: true` and a score ≥ 60 %. |
| Stars | 1 ★ at 60 %, 2 ★ at 80 %, 3 ★ at 95 %. |
| Records | Only the best result is kept, and failing later never re-locks anything. |

## Usage

```jsx
import { ProgressProvider, MissionSelect, useProgress, localStorageAdapter } from './levels';
import './levels/missions.css';

<ProgressProvider userId={user.uid} storage={localStorageAdapter}>
  <MissionSelect onStartMission={(mission) => startGameplay(mission)} />
</ProgressProvider>
```

`mission.id` is `'earth'`, `'moon'` or `'mars'`, which tells gameplay which mission to load.

When a mission ends, gameplay reports the result:

```js
const { completeMission } = useProgress();

const outcome = completeMission(mission.id, {
  pct: 85,          // score 0–100
  success: true,    // false if the rocket failed or the probe was lost
});
// outcome = { missionId, completed, stars, pct, newBest, unlockedMissionId }
```

### Saving to Firestore

The app does this in `src/lib/cloudStorage.js`: an anonymous user, then `progress/{uid}`.
`createFirestoreAdapter` is the same shape if another screen needs it.

```js
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { createFirestoreAdapter } from './levels';

const storage = createFirestoreAdapter({ db: getFirestore(app), doc, getDoc, setDoc });
// stored at progress/{userId}
```

If progress goes through the Python backend instead, write an adapter with the same two functions (`load(userId)` and `save(userId, progress)`) that calls the API.

Saved format:

```js
{ version: 1, missions: { earth: { completed: true, stars: 2, bestPct: 85, attempts: 1 } } }
```

## Adding the sprites

All art is configured in `src/levels/assets/sprites.js`. No component needs to change.

1. Copy the files into `src/levels/assets/` (for example `earth.png`, `moon.png`, `mars.png`, `stars.png`).
2. Import them in `sprites.js` and fill in the entries:

```js
import earth from './earth.png';
import moon from './moon.png';
import mars from './mars.png';
import stars from './stars.png';

export const SPRITES = {
  planets: {
    earth: { src: earth, frames: 1 },
    moon:  { src: moon,  frames: 1 },
    mars:  { src: mars,  frames: 8, fps: 10 },   // animated sprite sheet
  },
  background: { src: stars, mode: 'tile', drift: true },
};
```

- **Planets:** `frames: 1` is a still image. With more than 1, the image is treated as a horizontal sprite sheet (square frames in one row) and plays as an animation. Transparent backgrounds look best.
- **Background:** `mode: 'tile'` repeats a small star pattern and `mode: 'cover'` stretches one big image. `drift: true` makes the stars scroll slowly (tile mode only).
- **Pixel art:** add `pixelArt: true` to keep hard pixel edges when scaled up.
- Anything left as `null` keeps the built-in drawing, so the sprites can be added one at a time.

## Accessibility

- Planets are 130 px buttons, and all buttons are at least 52 px tall.
- Every mission has a spoken label, for example "Mission 2, Moon Explorer. Locked. Finish mission 1 to unlock it."
- Works with the keyboard: Tab to move, Enter to open, Esc to close the card.
- Animations turn off when the system has "reduce motion" enabled.
- On phones, the missions stack vertically.
