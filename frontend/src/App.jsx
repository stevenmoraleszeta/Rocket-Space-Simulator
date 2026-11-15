import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppLogo } from './brand/AppLogo.jsx'
import { BlackHoleBackground, MISSIONS, MissionSelect, ProgressProvider } from './levels'
import { MissionFlow } from './game/MissionFlow.jsx'
import { SettingsMenu, SettingsProvider } from './settings'
import { AMBIENCE, AudioVolumeSync, MUSIC, useSoundtrack } from './audio'
import { IntroTrailer, introSeen } from './intro'
import { menuRoute, missionRoute, readAppRoute, routesEqual, writeAppRoute } from './lib/appRoute.js'
import { t } from './i18n/index.js'
import { createCloudProgressStorage, createCloudSettingsStorage } from './lib/cloudStorage.js'
import { usePlayerSession } from './lib/playerSession.js'
import { ProjectPage } from './project/ProjectPage.jsx'
import { isProjectLocation } from './project/projectRoute.js'
import './levels/missions.css'
import './settings/settings.css'

function MenuSoundtrack() {
  useSoundtrack({ music: MUSIC.menu, ambient: AMBIENCE.space })
  return null
}

export default function App() {
  const [projectPage, setProjectPage] = useState(isProjectLocation)
  useEffect(() => {
    const syncProject = () => setProjectPage(isProjectLocation())
    window.addEventListener('popstate', syncProject)
    window.addEventListener('hashchange', syncProject)
    return () => {
      window.removeEventListener('popstate', syncProject)
      window.removeEventListener('hashchange', syncProject)
    }
  }, [])

  const session = usePlayerSession()
  // The open mission and tab come from the hash, so a refresh stays on that screen.
  const [route, setRoute] = useState(() => readAppRoute())
  const navigate = useCallback((update, mode = 'push') => {
    setRoute((current) => {
      const next = typeof update === 'function' ? update(current) : update
      if (!next || routesEqual(current, next)) return current
      writeAppRoute(next, mode)
      return next
    })
  }, [])

  useEffect(() => {
    // /project and #/project are the judge page. Writing the game hash would erase them.
    if (isProjectLocation()) return undefined
    writeAppRoute(readAppRoute(), 'replace')
    const sync = () => setRoute(readAppRoute())
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  const mission = MISSIONS.find((item) => item.id === route.missionId) ?? null
  // Intro trailer: 'first' opens by itself the first time the menu shows on this device;
  // 'replay' is the Trailer button on the menu. null = closed.
  const [intro, setIntro] = useState(() => (introSeen() ? null : 'first'))
  const closeIntro = useCallback(() => setIntro(null), [])
  const progressStorage = useMemo(
    () => (session.remote ? createCloudProgressStorage() : null),
    [session.remote],
  )
  const settingsStorage = useMemo(
    () => (session.remote ? createCloudSettingsStorage() : null),
    [session.remote],
  )

  if (projectPage) return <ProjectPage />

  if (!session.ready) {
    return (
      <BlackHoleBackground>
        <div className="brand-splash">
          <AppLogo size={96} wordmark bare />
          <p className="brand-splash__status">{t('Loading…')}</p>
        </div>
      </BlackHoleBackground>
    )
  }

  return (
    <SettingsProvider userId={session.uid} storage={settingsStorage}>
      <AudioVolumeSync />
      <ProgressProvider userId={session.uid} storage={progressStorage ?? undefined}>
        {intro && !mission ? (
          <IntroTrailer replay={intro === 'replay'} onDone={closeIntro} />
        ) : mission ? (
          <MissionFlow
            key={mission.id}
            mission={mission}
            route={route}
            onRoute={navigate}
            onExit={() => navigate(menuRoute())}
            onNextMission={() => navigate(missionRoute('mars'))}
          />
        ) : (
          <>
            <MenuSoundtrack />
            <MissionSelect
              googleSignedIn={session.google}
              authError={session.authError}
              onStartMission={(next) => navigate(missionRoute(next.id))}
              onWatchTrailer={() => setIntro('replay')}
            />
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
