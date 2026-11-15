/**
 * End-of-mission stamps, plus one NASA picture and, on the Moon, today's distance.
 */
import { useEffect, useState } from 'react'
import { formatNumber, t } from '../../i18n/index.js'
import { JOBS, missionStamps, photoReport } from './missionPlan.js'
import { findNasaPhoto, moonDistanceFact } from './nasaFacts.js'

function photoLine(photos, translate) {
  if (!photos) return ''
  if (photos.delivered === 0) return translate('No photos got home. On the quiet road you need the radio.')
  if (photos.allHome) return translate('All {{made}} photos got home.', { made: photos.made })
  return translate('{{delivered}} of {{made}} photos got home. A radio can send the rest.', photos)
}

function stampLine(stamp, photos, translate) {
  if (stamp.id === 'ground') return photoLine(photos, translate)
  if (stamp.id === 'launch') {
    return translate(stamp.ok ? 'The rocket left and did its job.' : 'The rocket did not finish the trip.')
  }
  if (stamp.id === 'tool') {
    return translate(stamp.ok ? 'The tool took its pictures.' : 'The tool did not get to work.')
  }
  return translate(photos?.delivered > 0
    ? 'A scientist can learn from the photos that got home.'
    : 'No photos got home to study.')
}

export function MissionReport({ design, success }) {
  const stamps = design ? missionStamps(design, success) : []
  const photos = design ? photoReport(design) : null
  const job = design ? JOBS[design.jobId] : null
  const [picture, setPicture] = useState(null)
  const [moonLine, setMoonLine] = useState(null)

  useEffect(() => {
    if (!job) return undefined
    let cancel = false
    findNasaPhoto(job.imageQuery).then((found) => {
      if (!cancel) setPicture(found)
    })
    if (job.id === 'moon') {
      moonDistanceFact().then((fact) => {
        if (!cancel && fact) setMoonLine(fact)
      })
    }
    return () => { cancel = true }
  }, [job])

  if (!design) return null

  return (
    <section className="dw-report" aria-label={t('Mission report')}>
      <h3 className="dw-report__title">{t('Mission report')}</h3>
      <ul className="dw-report__stamps">
        {stamps.map((stamp) => (
          <li key={stamp.id} className={stamp.ok ? 'is-ok' : 'is-miss'}>
            <b>{stamp.ok ? t('Yes') : t('Not yet')} · {t(stamp.title)}</b>
            <span>{stampLine(stamp, photos, t)}</span>
          </li>
        ))}
      </ul>
      {photos && <p className="dw-report__line">{photoLine(photos, t)}</p>}
      {moonLine && (
        <p className="dw-report__line">
          {moonLine.fromNasa
            ? t('NASA Horizons says the Moon is about {{km}} away today.', { km: `${formatNumber(Math.round(moonLine.km))} km` })
            : t('Today the Moon is about {{km}} away. That number comes from the real Moon orbit.', { km: `${formatNumber(Math.round(moonLine.km))} km` })}
        </p>
      )}
      {picture && (
        <figure className="dw-report__photo">
          <img src={picture.href} alt={picture.title} />
          <figcaption>{t('{{title}}. Photo: NASA Image and Video Library.', { title: picture.title })}</figcaption>
        </figure>
      )}
    </section>
  )
}
