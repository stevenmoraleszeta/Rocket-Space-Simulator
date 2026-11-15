import { useEffect, useState } from 'react'
import { AppLogo } from '../brand/AppLogo.jsx'
import { applyLanguage } from '../i18n/index.js'
import { BlackHoleBackground, Planet } from '../levels'
import { loadSettings, saveSettings } from '../settings/settingsStore.js'
import { PROJECT_COPY, PROJECT_LANGUAGES, PROJECT_LINKS } from './copy.js'
import { readProjectLanguage } from './projectRoute.js'
import '../levels/missions.css'
import './project.css'

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('')
}

function rememberLanguage(language) {
  applyLanguage(language)
  const current = loadSettings()
  if (current.language !== language) saveSettings({ ...current, language })
}

export function ProjectPage() {
  const [language, setLanguage] = useState(() => {
    const next = readProjectLanguage()
    applyLanguage(next)
    return next
  })
  const copy = PROJECT_COPY[language]

  useEffect(() => {
    document.documentElement.lang = language
    document.title = copy.metaTitle
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.metaDescription)
  }, [language, copy.metaTitle, copy.metaDescription])

  function selectLanguage(next) {
    const url = new URL(window.location.href)
    if (next === 'en') url.searchParams.delete('lang')
    else url.searchParams.set('lang', 'es')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    setLanguage(next)
    rememberLanguage(next)
  }

  function play() {
    rememberLanguage(language)
  }

  return (
    <BlackHoleBackground>
      <div className="proj" lang={language}>
        <a className="proj-skip" href="#content">{copy.skip}</a>
        <header className="proj-bar">
          <a className="proj-brand" href="#content" aria-label={copy.metaTitle}>
            <AppLogo size={48} wordmark bare />
          </a>
          <nav className="proj-nav" aria-label={copy.navLabel}>
            {copy.nav.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <div className="proj-tools">
            <div className="proj-lang" role="group" aria-label={copy.langLabel}>
              {PROJECT_LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`ms-btn${language === item.id ? ' is-on' : ' ms-btn--ghost'}`}
                  aria-pressed={language === item.id}
                  onClick={() => selectLanguage(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <a className="ms-btn" href={PROJECT_LINKS.play} onClick={play}>{copy.play}</a>
          </div>
        </header>

        <main id="content" className="proj-main">
          <section className="proj-hero">
            <p className="proj-kicker">{copy.kicker}</p>
            <h1>{copy.thesis}</h1>
            <p className="proj-lead">{copy.lead}</p>
            <ul className="proj-chips">
              {copy.chips.map((chip) => <li key={chip}>{chip}</li>)}
            </ul>
            <div className="proj-hero__actions">
              <a className="ms-btn" href={PROJECT_LINKS.play} onClick={play}>{copy.playPrototype}</a>
              <a className="ms-btn ms-btn--ghost" href="#try">{copy.howTo}</a>
            </div>
          </section>

          <section id="challenge" className="proj-section">
            <h2>{copy.challengeTitle}</h2>
            <p className="proj-difficulty">{copy.difficulty}</p>
            <ul className="proj-chips">
              {copy.subjects.map((subject) => <li key={subject}>{subject}</li>)}
            </ul>
            {copy.challenge.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p className="proj-note">{copy.agesNote}</p>
            <p>
              <a className="proj-out" href={PROJECT_LINKS.challenge} target="_blank" rel="noreferrer">
                {copy.challengeLink}
                <span className="proj-sr">{copy.openTab}</span>
              </a>
            </p>
          </section>

          <section id="missions" className="proj-section">
            <h2>{copy.missionsTitle}</h2>
            <p>{copy.missionsIntro}</p>
            <ol className="proj-missions">
              {copy.missions.map((mission) => (
                <li key={mission.planet} className="proj-panel">
                  <Planet planet={mission.planet} size={96} />
                  <p className="proj-index">{mission.index}</p>
                  <h3>{mission.title}</h3>
                  <p className="proj-place">{mission.place}</p>
                  <p>{mission.text}</p>
                </li>
              ))}
            </ol>
            <p className="proj-note">{copy.soon}</p>
          </section>

          <section id="tradeoffs" className="proj-section">
            <h2>{copy.tradeTitle}</h2>
            <p>{copy.tradeIntro}</p>
            <div className="proj-grid">
              {copy.tradeoffs.map((item) => (
                <article key={item.title} className="proj-panel">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="data" className="proj-section">
            <h2>{copy.dataTitle}</h2>
            <p>{copy.dataIntro}</p>
            <div className="proj-table-wrap proj-panel">
              <table className="proj-table">
                <caption className="proj-sr">{copy.dataTitle}</caption>
                <thead>
                  <tr>
                    <th scope="col">{copy.dataColumns[0]}</th>
                    <th scope="col">{copy.dataColumns[1]}</th>
                  </tr>
                </thead>
                <tbody>
                  {copy.sources.map(([source, detail]) => (
                    <tr key={source}>
                      <th scope="row">{source}</th>
                      <td>{detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="proj-note">{copy.dataNote}</p>
          </section>

          <section id="try" className="proj-section">
            <h2>{copy.tryTitle}</h2>
            <ol className="proj-steps">
              {copy.trySteps.map((step, index) => (
                <li key={step} className="proj-panel">
                  <span className="proj-index" aria-hidden="true">{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <p>
              <a className="ms-btn" href={PROJECT_LINKS.play} onClick={play}>{copy.playPrototype}</a>
            </p>
          </section>

          <section id="team" className="proj-section">
            <h2>{copy.teamTitle}</h2>
            <p>{copy.teamLead}</p>
            <ul className="proj-team">
              {copy.members.map((member) => (
                <li key={member.name} className="proj-panel">
                  <span className="proj-badge" aria-hidden="true">{initials(member.name)}</span>
                  <p className="proj-member">{member.name}</p>
                  {member.owner ? <p className="proj-place">{copy.owner}</p> : null}
                </li>
              ))}
            </ul>
            <p>
              <a className="proj-out" href={PROJECT_LINKS.team} target="_blank" rel="noreferrer">
                {copy.teamLink}
                <span className="proj-sr">{copy.openTab}</span>
              </a>
            </p>
            <p className="proj-stack">{copy.stack}</p>
          </section>
        </main>

        <footer className="proj-foot">
          <p>{copy.footer}</p>
          <p>
            <a href={PROJECT_LINKS.play} onClick={play}>{copy.playPrototype}</a>
            <a href={PROJECT_LINKS.challenge} target="_blank" rel="noreferrer">{copy.challengeLink}</a>
            <a href={PROJECT_LINKS.team} target="_blank" rel="noreferrer">{copy.teamLink}</a>
          </p>
        </footer>
      </div>
    </BlackHoleBackground>
  )
}
