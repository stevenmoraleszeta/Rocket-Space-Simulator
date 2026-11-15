import { useMemo, useState } from 'react'
import { MissionSelect, ProgressProvider } from './levels'
import { MissionFlow } from './game/MissionFlow.jsx'
import { SettingsMenu, SettingsProvider } from './settings'
import { AMBIENCE, AudioVolumeSync, MUSIC, useSoundtrack } from './audio'
import { createCloudProgressStorage, createCloudSettingsStorage } from './lib/cloudStorage.js'
import { usePlayerSession } from './lib/playerSession.js'
import './levels/missions.css'
import './settings/settings.css'

function MenuSoundtrack() {
  useSoundtrack({ music: MUSIC.menu, ambient: AMBIENCE.space })
  return null
}

export default function App() {
  const session = usePlayerSession()
  const [mission, setMission] = useState(null)
  const progressStorage = useMemo(
    () => (session.remote ? createCloudProgressStorage() : null),
    [session.remote],
  )
  const settingsStorage = useMemo(
    () => (session.remote ? createCloudSettingsStorage() : null),
    [session.remote],
  )

  if (!session.ready) return null

  return (
    <SettingsProvider userId={session.uid} storage={settingsStorage}>
      <AudioVolumeSync />
      <ProgressProvider userId={session.uid} storage={progressStorage ?? undefined}>
        {mission ? (
          <MissionFlow key={mission.id} mission={mission} onExit={() => setMission(null)} />
        ) : (
          <>
            <MenuSoundtrack />
            <MissionSelect onStartMission={setMission} />
          </>
        )}
        {/* Music, name and account settings, on every screen (fixed in the top-right corner). */}
        <SettingsMenu googleSignedIn={session.google} />
      </ProgressProvider>
    </SettingsProvider>
  )
}
