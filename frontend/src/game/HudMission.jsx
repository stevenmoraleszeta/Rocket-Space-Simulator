/** The mission name in the top bar of a flight screen. */
export function HudMission({ kicker, title }) {
  return (
    <div className="game__mission">
      <div className="game__num">{kicker}</div>
      <h1>{title}</h1>
    </div>
  );
}
