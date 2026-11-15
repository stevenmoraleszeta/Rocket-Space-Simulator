import { useMemo, useState } from 'react'
import { AppLogo } from './brand/AppLogo.jsx'
import { MissionSelect, ProgressProvider, SpaceBackground } from './levels'
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

  if (!session.ready) {
    return (
      <SpaceBackground>
        <div className="brand-splash">
          <AppLogo size={96} wordmark />
          <p className="brand-splash__status">Loading…</p>
        </div>
      </SpaceBackground>
    )
  }

  return (
    <SettingsProvider userId={session.uid} storage={settingsStorage}>
      <AudioVolumeSync />
      <ProgressProvider userId={session.uid} storage={progressStorage ?? undefined}>
        {mission ? (
          <MissionFlow key={mission.id} mission={mission} onExit={() => setMission(null)} />
        ) : (
          <>
            <MenuSoundtrack />
            <MissionSelect googleSignedIn={session.google} authError={session.authError} onStartMission={setMission} />
          </>
        )}
        {/* The mission menu shows its own settings button; on the game screens it comes from here,
            so the music settings are available on every screen (fixed in the top-right corner). */}
        {mission && (
          <div className="st-floating">
            <SettingsMenu googleSignedIn={session.google} authError={session.authError} />
          </div>
        )}
      </ProgressProvider>
    </SettingsProvider>
  )
}
