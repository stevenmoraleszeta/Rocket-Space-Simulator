# Mission menu

Menu, unlock rules, stars, and saved progress for players aged 8+.

Three missions are playable, in this order: **Eye on Earth**, **Moon Mapper**, and **Red Planet Rover**. Only Earth starts open. The Moon opens after Earth, and Mars after the Moon. **Lord of the Rings** and **The Black Hole** are listed in `data/upcomingMissions.js`. They show on the menu as coming soon, give no stars, and are not stored in progress.

**Become admin** opens every locked mission in this browser only. It does not rewrite saved stars.

## Running it

From the repo root:

```powershell
npm install --prefix frontend
npm run dev:web
npm test
```

`npm run dev:web` serves the game at http://localhost:5173. `npm test` includes `src/levels/progression.test.js`.

## Structure

```
src/levels/
├── index.js                     import the menu from here
├── data/missions.js             the 3 playable missions
├── data/upcomingMissions.js     Saturn and the black hole
├── progression.js               unlocks, stars, and one attempt
├── progression.test.js
├── flights.js                   one saved trip, packed parts, and picks
├── record.js                    ranks and the stats on the menu
├── storage.js                   localStorage / Firestore adapters
├── adminMode.js                 judge switch, this browser only
├── ProgressContext.jsx          ProgressProvider and useProgress()
├── missions.css
├── assets/sprites.js            planet and background art
└── components/
    ├── MissionSelect.jsx        menu, mission card, admin switch
    ├── PlayerBoards.jsx         rank, history, and stats
    ├── Planet.jsx
    ├── SpaceBackground.jsx
    ├── BlackHoleBackground.jsx
    └── StarRating.jsx
```

Gameplay after the menu:

```
src/game/stages.js                         hangar, then the flight for that mission
src/game/levels/orbit/                     mission 1
src/game/levels/moon/                      mission 2
src/game/levels/marsLaunch/                mission 3
```

Mission copy for the player is in `src/i18n/`. The judge page is `src/project/`, at `/project`.

## Rules

| Rule | Value |
|---|---|
| Unlocking | Only Earth starts open. The Moon opens after Earth, and Mars after the Moon. |
| Completing | Gameplay reports `success: true` and a score at or above the mission `passPct` (60). |
| Stars | 1 at 60 %, 2 at 80 %, 3 at 95 %. |
| Records | Only the best result is kept. A later failure never locks a mission again. |
| Upcoming | Saturn and the black hole are not in `MISSIONS`. |
| Ranks | Star Cadet at 1 star, Orbit Pilot at 4, Star Commander at 7. |

## Usage

```jsx
import { ProgressProvider, MissionSelect, useProgress, localStorageAdapter } from './levels';
import './levels/missions.css';

<ProgressProvider userId={user.uid} storage={localStorageAdapter}>
  <MissionSelect onStartMission={(mission) => startGameplay(mission)} />
</ProgressProvider>
```

`mission.id` is `'earth'`, `'moon'`, or `'mars'`.

When a mission ends, gameplay reports the result:

```js
const { completeMission } = useProgress();

const outcome = completeMission(mission.id, {
  pct: 85,          // score 0–100
  success: true,    // false if the rocket failed or the probe was lost
  flight: {
    packed: { astronaut: 1, food: 1 },
    picks: { site: 'kennedy' },
  },
});
// outcome = { missionId, completed, stars, pct, newBest, unlockedMissionId }
```

### Saving

The app wires this in `src/lib/cloudStorage.js`: an anonymous user, then Firestore, with a copy in localStorage.

```js
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { createFirestoreAdapter } from './levels';

const storage = createFirestoreAdapter({ db: getFirestore(app), doc, getDoc, setDoc });
// progress document at progress/{userId}
```

An adapter needs `load(userId)` and `save(userId, progress)`.

The progress document stored in Firestore:

```js
{
  version: 1,
  updatedAt: '2026-11-15T00:00:00.000Z',
  missions: { earth: { completed: true, stars: 2, bestPct: 85, attempts: 1 } },
}
```

Each trip is a separate document at `progress/{userId}/flights/{id}`:

```js
{
  missionId: 'earth',
  at: '2026-11-15T00:00:00.000Z',
  success: true,
  pct: 85,
  stars: 2,
  packed: { astronaut: 1, food: 1 },
  picks: { site: 'kennedy' },
}
```

The on-device copy may also keep a `flights` array. Settings (`playerName`, `language`, volumes) are a different document, `settings/{userId}`, written from `src/settings/settingsStore.js`.

Part ids and pick keys must match `firestore.rules`.

## Adding the sprites

Planet and background art is configured in `src/levels/assets/sprites.js`.

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

- **Planets:** `frames: 1` is a still image. With more than 1, the image is a horizontal sprite sheet (square frames in one row). Transparent backgrounds look best.
- **Background:** `mode: 'tile'` repeats a small star pattern. `mode: 'cover'` stretches one image. `drift: true` scrolls a tiled background.
- **Pixel art:** add `pixelArt: true` to keep hard pixel edges when scaled up.
- A `null` entry keeps the built-in drawing, so sprites can be added one at a time.

Saturn and the black hole already have SVG files in `src/levels/assets/`.

## Accessibility

- Planets are large buttons, and the menu buttons stay easy to hit.
- Every mission has a spoken label, including a locked mission and a coming-soon mission.
- The keyboard works: Tab to move, Enter to open, Esc to close the card.
- Animations turn off when the system has "reduce motion" enabled.
- On phones, the missions stack vertically.
