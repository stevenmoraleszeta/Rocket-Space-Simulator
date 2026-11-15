/**
 * Hangar checklist: what this mission MUST pack and what is a good idea, as part pictures
 * with a green check or a red cross. Tapping a picture opens that part.
 * The first missing must-have also shows a short warning with the reason.
 *
 * Lists come from mission.checklist (src/levels/data/missions.js):
 *   { required: [{ part, why }], recommended: [{ part, why }] }
 */
import { useState } from 'react'
import { PARTS, partCount } from './parts.js'
import { PartIcon } from './Rocket.jsx'
import './missionChecklist.css'

function Item({ entry, equipped, onOpenPart, kind }) {
  const part = PARTS.find((candidate) => candidate.id === entry.part)
  if (!part) return null
  const packed = partCount(equipped, part.id) > 0
  return (
    <li>
      <button
        type="button"
        className={`checklist__item is-${kind}${packed ? ' is-packed' : ''}`}
        onClick={() => onOpenPart(part.id)}
        title={`${part.name}: ${entry.why}`}
        aria-label={`${part.name}. ${packed ? 'Packed' : 'Missing'}. ${entry.why}`}
      >
        <PartIcon part={part} lit />
        <span className="checklist__mark" aria-hidden="true">{packed ? '✓' : kind === 'required' ? '✕' : '+'}</span>
      </button>
    </li>
  )
}

export function MissionChecklist({ mission, equipped, onOpenPart }) {
  const [open, setOpen] = useState(true)
  const list = mission.checklist
  if (!list) return null
  const missing = list.required.filter((entry) => partCount(equipped, entry.part) <= 0)
  const extras = list.recommended.filter((entry) => partCount(equipped, entry.part) <= 0)
  const ready = missing.length === 0
  const firstMissing = missing[0]
  const firstPart = firstMissing && PARTS.find((part) => part.id === firstMissing.part)
  const tipEntry = !firstMissing && extras[0]
  const tipPart = tipEntry && PARTS.find((part) => part.id === tipEntry.part)

  return (
    <section className={`checklist${ready ? ' is-ready' : ''}${open ? '' : ' is-closed'}`} aria-label="Mission checklist">
      <button type="button" className="checklist__head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="checklist__badge" aria-hidden="true">{ready ? '🚀' : '📋'}</span>
        <span>
          <b>{ready ? 'Ready to fly!' : `Missing ${missing.length} must-have${missing.length === 1 ? '' : 's'}`}</b>
          <small>{open ? 'Tap a picture to pack it' : 'Show checklist'}</small>
        </span>
      </button>
      {open && (
        <div className="checklist__body">
          <p className="checklist__label">Must pack</p>
          <ul className="checklist__grid">
            {list.required.map((entry) => <Item key={entry.part} entry={entry} equipped={equipped} onOpenPart={onOpenPart} kind="required" />)}
          </ul>
          <p className="checklist__label">Good idea</p>
          <ul className="checklist__grid">
            {list.recommended.map((entry) => <Item key={entry.part} entry={entry} equipped={equipped} onOpenPart={onOpenPart} kind="recommended" />)}
          </ul>
          {firstPart && (
            <p className="checklist__tip is-warn" key={firstPart.id}>
              <span aria-hidden="true">⚠</span> <b>{firstPart.name}:</b> {firstMissing.why}
            </p>
          )}
          {tipPart && (
            <p className="checklist__tip" key={tipPart.id}>
              <span aria-hidden="true">💡</span> <b>{tipPart.name}:</b> {tipEntry.why}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
