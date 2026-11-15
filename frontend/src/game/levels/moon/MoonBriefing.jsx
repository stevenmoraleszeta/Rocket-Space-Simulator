export function MoonBriefing({ mission, onContinue }) {
  return (
    <div className="brief-modal moon-briefing-modal">
      <div className="brief-shell">
        <section className="brief" role="dialog" aria-modal="true" aria-labelledby="moon-brief-title">
          <header className="brief__head">
            <div className="brief__heading">
              <p className="brief__kicker">Mission {mission.number} · {mission.place}</p>
              <h2 id="moon-brief-title" className="brief__title">Story</h2>
            </div>
          </header>
          <p className="brief__intro">Reach the Moon. Take pictures. Look for ice.</p>
          <div className="brief__body moon-briefing-modal__body">
            <div className="brief__story">
              {mission.risks.map((risk) => (
                <p className="moon-briefing-modal__risk" key={risk.title}>
                  <span aria-hidden="true">{risk.icon}</span> <b>{risk.title}:</b> {risk.text}
                </p>
              ))}
              <p className="moon-briefing-modal__fact">🛰️ NASA’s LRO mapped the Moon with 7 tools in 2009.</p>
            </div>
            <aside className="brief__hints moon-briefing-modal__levels">
              <h3>Medium flight</h3>
              <p>2 tries · 2 space events · 110 credits</p>
            </aside>
          </div>
          <button type="button" className="bay__launch moon-briefing-modal__continue" onClick={onContinue}>
            Build spacecraft
          </button>
        </section>
      </div>
    </div>
  )
}
