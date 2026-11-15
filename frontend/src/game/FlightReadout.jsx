/** Live flight numbers: time, temperatures, food, oxygen, power, crew, and mass. */
import { t } from '../i18n/index.js'

export function FlightReadout({ rows }) {
  if (!rows?.length) return null
  return (
    <dl className="flight-readout">
      {rows.map((row) => (
        <div key={row.id}>
          <dt>{t(row.label)}</dt>
          <dd className={row.bad ? 'is-bad' : undefined}>{t(row.value)}</dd>
        </div>
      ))}
    </dl>
  )
}
