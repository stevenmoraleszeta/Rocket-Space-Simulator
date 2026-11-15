/** The mission name in the top bar of a flight screen. */
export function HudMission({ title }) {
  return (
    <div className="game__mission">
      <h1>{title}</h1>
    </div>
  );
}
