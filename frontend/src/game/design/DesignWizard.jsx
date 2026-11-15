/**
 * One question per screen. Big cards, one sentence each.
 * The player picks a job's tool, a rocket, a road, and whether to bring a radio.
 */
import { t } from '../../i18n/index.js'
import { SpaceBackground } from '../../levels'
import { SFX, playSfx } from '../../audio'
import {
  JOBS,
  RADIO_COST,
  ROCKETS,
  blockReason,
  designReady,
  moneyLeft,
  pathById,
  pathsFor,
  toolById,
  toolChoices,
} from './missionPlan.js'
import './designWizard.css'

const STEP_TITLES = {
  job: 'Your job',
  tool: 'Pick a tool',
  rocket: 'Pick a rocket',
  path: 'Pick a road',
  radio: 'Call home?',
}

export function DesignWizard({ mission, initial, onDone, onExit }) {
  const job = JOBS[mission.id] ?? JOBS.earth
  const steps = mission.id === 'moon'
    ? ['job', 'tool', 'rocket', 'radio']
    : ['job', 'tool', 'rocket', 'path', 'radio']
  const [index, setIndex] = useState(0)
  const [toolId, setToolId] = useState(initial?.toolId ?? null)
  const [rocketId, setRocketId] = useState(initial?.rocketId ?? null)
  const [pathId, setPathId] = useState(initial?.pathId ?? (mission.id === 'moon' ? 'moon-road' : null))
  const [radio, setRadio] = useState(initial?.radio ?? null)
  const step = steps[index]
  const draft = { jobId: mission.id, toolId, rocketId, pathId, radio }
  const choices = toolChoices(mission.id)
  const ready = designReady({ ...draft, radio: radio === true || radio === false ? radio : false })
    && typeof radio === 'boolean'

  function pick(kind, id) {
    const reason = blockReason(draft, kind, id)
    if (reason) {
      playSfx(SFX.error)
      return
    }
    playSfx(SFX.select)
    if (kind === 'tool') setToolId(id)
    if (kind === 'rocket') setRocketId(id)
    if (kind === 'path') setPathId(id)
    if (kind === 'radio') setRadio(id === 'on')
  }

  function next() {
    if (index < steps.length - 1) {
      playSfx(SFX.confirm)
      setIndex(index + 1)
      return
    }
    if (!ready) return
    playSfx(SFX.confirm)
    onDone({ jobId: mission.id, toolId, rocketId, pathId, radio })
  }

  const canNext = step === 'job'
    || (step === 'tool' && toolId)
    || (step === 'rocket' && rocketId && !blockReason(draft, 'rocket', rocketId))
    || (step === 'path' && pathId && !blockReason(draft, 'path', pathId))
    || (step === 'radio' && ready)

  return (
    <SpaceBackground>
      <div className="dw">
        <header className="dw__bar">
          <button type="button" className="game__back" onClick={onExit}>{t('Missions')}</button>
          <p className="dw__count">{t('Step {{step}} of {{total}}', { step: index + 1, total: steps.length })}</p>
        </header>
        <div className="dw__card">
          <p className="dw__kicker">{t('Mission {{number}}', { number: mission.number })}</p>
          <h1 className="dw__title">{t(STEP_TITLES[step])}</h1>
          {step === 'job' && (
            <>
              <p className="dw__lead">{t(job.line)}</p>
              <p className="dw__note">{t('A real NASA mission like this is called {{name}}.', { name: job.nasaName })}</p>
            </>
          )}
          {step === 'tool' && (
            <ChoiceGrid>
              {choices.open.map((tool) => (
                <Choice
                  key={tool.id}
                  title={tool.name}
                  line={tool.line}
                  selected={toolId === tool.id}
                  onPick={() => pick('tool', tool.id)}
                />
              ))}
              {choices.locked && (
                <Choice title={choices.locked.name} line={choices.locked.lockLine} locked />
              )}
            </ChoiceGrid>
          )}
          {step === 'rocket' && (
            <ChoiceGrid>
              {ROCKETS.map((rocket) => {
                const reason = blockReason(draft, 'rocket', rocket.id)
                return (
                  <Choice
                    key={rocket.id}
                    title={rocket.name}
                    line={reason || rocket.line}
                    selected={rocketId === rocket.id}
                    locked={Boolean(reason)}
                    onPick={() => pick('rocket', rocket.id)}
                  />
                )
              })}
            </ChoiceGrid>
          )}
          {step === 'path' && (
            <ChoiceGrid>
              {pathsFor(mission.id).map((path) => {
                const reason = blockReason(draft, 'path', path.id)
                return (
                  <Choice
                    key={path.id}
                    title={path.name}
                    line={reason || path.line}
                    selected={pathId === path.id}
                    locked={Boolean(reason)}
                    onPick={() => pick('path', path.id)}
                  />
                )
              })}
            </ChoiceGrid>
          )}
          {step === 'radio' && (
            <ChoiceGrid>
              <Choice
                title={t('Radio dish')}
                line={t('Sends the photos home. Costs a little money.')}
                selected={radio === true}
                onPick={() => pick('radio', 'on')}
              />
              <Choice
                title={t('No radio')}
                line={t('Only a few photos can get home. On the quiet road, none do.')}
                selected={radio === false}
                onPick={() => pick('radio', 'off')}
              />
            </ChoiceGrid>
          )}
          {step !== 'job' && (
            <p className="dw__money">{t('Money left: {{left}}', { left: moneyLeft({ ...draft, radio: radio === true }) })}</p>
          )}
          <div className="dw__actions">
            <button
              type="button"
              className="game__back"
              disabled={index === 0}
              onClick={() => { playSfx(SFX.cancel); setIndex(index - 1) }}
            >
              {t('Back')}
            </button>
            <button type="button" className="ms-btn" disabled={!canNext} onClick={next}>
              {step === 'radio' ? t('Pack the rocket') : t('Next')}
            </button>
          </div>
          {step === 'radio' && toolById(toolId) && (
            <p className="dw__note">
              {t(pathById(mission.id, pathId)?.nasa)}
              {' '}{t('A radio costs {{cost}}. Food, water, and air for the crew are packed for you.', { cost: RADIO_COST })}
            </p>
          )}
        </div>
      </div>
    </SpaceBackground>
  )
}

function ChoiceGrid({ children }) {
  return <div className="dw__grid">{children}</div>
}

function Choice({ title, line, selected, locked, onPick }) {
  return (
    <button
      type="button"
      className={`dw__choice${selected ? ' is-on' : ''}${locked ? ' is-locked' : ''}`}
      aria-pressed={selected || undefined}
      disabled={locked}
      onClick={onPick}
    >
      <b>{t(title)}</b>
      <span>{t(line)}</span>
    </button>
  )
}
