export function MoonMissionReport({ report, bestScore, storageError, onRedesign, onNext, onExit }) {
  return (
    <main className="moon-page moon-report">
      <header className="moon-page__heading">
        <p className="moon-kicker">MISSION 2 · FLIGHT REPORT</p>
        <h1>{report.success ? 'Moon mapped!' : 'Mission report'}</h1>
        <p className={report.success ? 'moon-report__result is-good' : 'moon-report__result is-bad'}>
          {report.success ? '🎉 In lunar orbit! Your robot sent science home.' : `🛰️ Mission not complete. ${report.reason}`}
        </p>
      </header>

      <section className="moon-report__score-grid" aria-label="Mission score">
        <div className="moon-score-card"><span>🔬 Science</span><b>{report.science} / {report.scienceTarget}</b></div>
        <div className="moon-score-card"><span>📡 Data lost</span><b>{report.dataLostPercent}%</b></div>
        <div className="moon-score-card"><span>🏆 Best score</span><b>{bestScore}%</b></div>
      </section>

      <details className="moon-panel moon-report__more">
        <summary>More results</summary>
        <div className="moon-report__score-grid">
          <div className="moon-score-card"><span>💰 Budget left</span><b>{report.budgetLeft === Infinity ? 'Unlimited' : `${report.budgetLeft} credits`}</b></div>
          <div className="moon-score-card"><span>🎲 Events handled</span><b>{report.eventsHandled}</b></div>
          <div className="moon-score-card"><span>🚀 Tries left</span><b>{report.attemptsLeft}</b></div>
        </div>
      </details>

      {storageError && <p className="moon-alert">The best score could not be saved on this device.</p>}

      <details className="moon-panel moon-report__checks">
        <summary>Mission checks</summary>
        <ul>
          {report.checks.map((check) => (
            <li key={check.id} className={check.ok ? 'is-good' : 'is-bad'}>
              <span aria-hidden="true">{check.ok ? '✅' : '❌'}</span>
              <b>{check.label}: {check.ok ? check.lucky ? 'Lucky!' : 'Good' : 'Fail'}</b>
              <span>{check.detail}</span>
            </li>
          ))}
        </ul>
      </details>

      {report.events.length > 0 && (
        <details className="moon-panel moon-report__events">
          <summary>Space events</summary>
          <ul>{report.events.map((event, index) => <li key={`${event.id}-${index}`}><b>{event.name}:</b> {event.note}</li>)}</ul>
        </details>
      )}

      <p className="moon-report__why">{report.why}</p>
      <div className="moon-report__actions">
        <button type="button" className="moon-button" onClick={onRedesign}>Redesign 🔧</button>
        {report.success
          ? <button type="button" className="moon-button moon-button--primary" onClick={onNext}>Next mission ➜</button>
          : <button type="button" className="moon-button moon-button--primary" onClick={onExit}>Missions</button>}
      </div>
    </main>
  )
}
