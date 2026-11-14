import { MissionSelect, ProgressProvider } from './levels'
import './levels/missions.css'

export default function App() {
  return (
    <ProgressProvider>
      <MissionSelect />
    </ProgressProvider>
  )
}
