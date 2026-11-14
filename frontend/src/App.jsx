import { useState } from 'react'
import { MissionSelect, ProgressProvider } from './levels'
import { GameScreen } from './game/GameScreen.jsx'
import './levels/missions.css'

export default function App() {
  const [mission, setMission] = useState(null)

  return (
    <ProgressProvider>
      {mission ? (
        <GameScreen mission={mission} onExit={() => setMission(null)} />
      ) : (
        <MissionSelect onStartMission={setMission} />
      )}
    </ProgressProvider>
  )
}
