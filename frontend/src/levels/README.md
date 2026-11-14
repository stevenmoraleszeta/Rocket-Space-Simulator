# Space Mission: mission selection

Mission selection screen for the first prototype: **3 missions played in order** (Earth → Moon → Mars), designed for players aged 8–15.

It handles:

- the **3 missions** and their order,
- **unlocking** each mission when the previous one is completed,
- **stars** (1–3) for each mission,
- **saving progress** (localStorage today, Firestore ready),
- the **selection screen** and the **mission card** with a "Launch!" button.

Everything else (gameplay, results screen, menus, stats) belongs to other parts of the project.

## Running it

```bash
npm install
npm run dev     # demo at http://localhost:5173
npm test        # 15 tests for the progression logic
```

The demo replaces gameplay with a screen where you pick how the mission ends (failed, 65 %, 85 % or 100 %), so unlocking and stars can be tested.

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
