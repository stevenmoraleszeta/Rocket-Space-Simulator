import { useState } from 'react'
import { MissionSelect, ProgressProvider } from './levels'
import { MissionFlow } from './game/MissionFlow.jsx'
import './levels/missions.css'

export default function App() {
  const [mission, setMission] = useState(null)

  return (
    <ProgressProvider>
      {mission ? (
        <MissionFlow key={mission.id} mission={mission} onExit={() => setMission(null)} />
      ) : (
        <MissionSelect onStartMission={setMission} />
      )}
    </ProgressProvider>
  )
}
