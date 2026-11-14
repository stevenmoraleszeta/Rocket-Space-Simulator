import { useState } from 'react'
import { MissionSelect, ProgressProvider } from './levels'
import { GameScreen } from './game/GameScreen.jsx'
import { SettingsMenu, SettingsProvider } from './settings'
import { AMBIENCE, AudioVolumeSync, MUSIC, useSoundtrack } from './audio'
import './levels/missions.css'
import './settings/settings.css'

function MenuSoundtrack() {
  useSoundtrack({ music: MUSIC.menu, ambient: AMBIENCE.space })
  return null
}

export default function App() {
  const [mission, setMission] = useState(null)

  return (
    <SettingsProvider>
      <AudioVolumeSync />
      <ProgressProvider>
        {mission ? (
          <GameScreen mission={mission} onExit={() => setMission(null)} />
        ) : (
          <>
            <MenuSoundtrack />
            <MissionSelect onStartMission={setMission} />
            <SettingsMenu />
          </>
        )}
      </ProgressProvider>
    </SettingsProvider>
  )
}
