/** Live flight numbers: time, temperatures, food, oxygen, power, crew, and mass. */
export function FlightReadout({ rows }) {
  if (!rows?.length) return null
  return (
    <dl className="flight-readout">
      {rows.map((row) => (
        <div key={row.id}>
          <dt>{row.label}</dt>
          <dd className={row.bad ? 'is-bad' : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
