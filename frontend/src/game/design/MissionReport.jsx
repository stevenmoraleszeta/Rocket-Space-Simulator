/**
 * End-of-mission stamps, plus one NASA picture and, on the Moon, today's distance.
 */
import { useEffect, useState } from 'react'
import { JOBS, missionStamps, photoReport } from './missionPlan.js'
import { findNasaPhoto, moonDistanceLine } from './nasaFacts.js'

export function MissionReport({ design, success }) {
  const stamps = design ? missionStamps(design, success) : []
  const photos = design ? photoReport(design) : null
  const job = design ? JOBS[design.jobId] : null
  const [picture, setPicture] = useState(null)
  const [moonLine, setMoonLine] = useState('')

  useEffect(() => {
    if (!job) return undefined
    let cancel = false
    findNasaPhoto(job.imageQuery).then((found) => {
      if (!cancel) setPicture(found)
    })
    if (job.id === 'moon') {
      moonDistanceLine().then((line) => {
        if (!cancel) setMoonLine(line)
      })
    }
    return () => { cancel = true }
  }, [job])

  if (!design) return null

  return (
    <section className="dw-report" aria-label="Mission report">
      <h3 className="dw-report__title">Mission report</h3>
      <ul className="dw-report__stamps">
        {stamps.map((stamp) => (
          <li key={stamp.id} className={stamp.ok ? 'is-ok' : 'is-miss'}>
            <b>{stamp.ok ? 'Yes' : 'Not yet'} · {stamp.title}</b>
            <span>{stamp.line}</span>
          </li>
        ))}
      </ul>
      {photos && <p className="dw-report__line">{photos.line}</p>}
      {moonLine && <p className="dw-report__line">{moonLine}</p>}
      {picture && (
        <figure className="dw-report__photo">
          <img src={picture.href} alt={picture.title} />
          <figcaption>{picture.title}. Photo: NASA Image and Video Library.</figcaption>
        </figure>
      )}
    </section>
  )
}
