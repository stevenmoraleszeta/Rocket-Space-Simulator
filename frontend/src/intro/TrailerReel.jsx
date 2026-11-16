/**
 * The one-minute trailer itself: eleven scenes cut like a video, built only from the game's
 * own sprites, screens and sounds.
 *
 *   countdown → pad (build, then pack) → aim → launch → orbit → moon → events → mars → fact
 *   → ranks → finale
 *
 * One timeline (SCENE_STARTS and the cues in the effect below) drives the pictures, the sound
 * effects and the voice, so they always stay together. Motion inside a scene is CSS (intro.css).
 */
import { useEffect, useRef, useState } from 'react'
import asteroidSheet from '../assets/images/asteroids/asteroid_sheet.png'
import cloud from '../assets/images/backgrounds/cloud.svg'
import launchPad from '../assets/images/backgrounds/launch_pad.svg'
import sunGlow from '../assets/images/backgrounds/sun_glow.svg'
import pin from '../assets/images/icons/pin.svg'
import pinSelected from '../assets/images/icons/pin_selected.svg'
import thrustIcon from '../assets/images/icons/thrust.svg'
import deimos from '../assets/images/planets/deimos.svg'
import phobos from '../assets/images/planets/phobos.svg'
import cadetBadge from '../assets/images/ranks/cadet.svg'
import commanderBadge from '../assets/images/ranks/commander.svg'
import pilotBadge from '../assets/images/ranks/pilot.svg'
import explosionSheet from '../assets/images/rockets/animations/explosion_sheet.png'
import launchBase from '../assets/images/rockets/launch_base.png'
import goldSatelliteSheet from '../assets/images/satellites/gold_satellite_sheet.png'
import { SFX, SYNTH, playSynth, setSceneLevel, startSfx } from '../audio'
import { AppLogo } from '../brand/AppLogo.jsx'
import { LaunchTower } from '../game/LaunchTower.jsx'
import { PadClouds } from '../game/PadClouds.jsx'
import { PadCrew } from '../game/PadCrew.jsx'
import { PadFlag } from '../game/PadFlag.jsx'
import { PadLaika } from '../game/PadLaika.jsx'
import { ICON_URLS, PixelIcon } from '../game/PixelIcon.jsx'
import { Rocket } from '../game/Rocket.jsx'
import { LAUNCH_SITES } from '../game/levels/orbit/launchSites.js'
import { PARTS } from '../game/parts.js'
import { t } from '../i18n/index.js'
import { SPRITES } from '../levels/assets/sprites.js'
import { BlackHoleBackground } from '../levels/components/BlackHoleBackground.jsx'
import { RANKS } from '../levels/record.js'
import { CODE } from './trailerAssets.js'
import { speak, stopSpeaking } from './voice.js'

/** The whole trailer, start to end. It never runs longer than this. */
const TRAILER_MS = 60000

// When each scene starts, in milliseconds.
const SCENE_STARTS = {
  countdown: 0,
  pad: 3600,
  aim: 14400,
  launch: 20600,
  orbit: 26000,
  moon: 30600,
  events: 36000,
  mars: 40600,
  fact: 46200,
  ranks: 51200,
  finale: 55400,
}
// Pad scene: first the rocket is built, then the camera pushes in and the crew packs it.
const PACK_AT = 9000
// Launch scene: the rear stage drops away, then only the upper stage is left.
const SEPARATION_AT = SCENE_STARTS.launch + 2900
const UPPER_STAGE_AT = SEPARATION_AT + 800

// The picture is drawn for a window whose shorter side is this long, and scales with it.
const DESIGN_SIDE = 900
// The launch pad picture is 480 x 270 art pixels. The rocket stands 34% across it.
const PAD_ASPECT = 16 / 9
const PAD_ROCKET_X = 0.34

/** Sizes that follow the window: the scene unit, and the launch pad picture with its rocket. */
function viewportMetrics() {
  const width = window.innerWidth
  const height = window.innerHeight
  const padWidth = Math.max(width, height * PAD_ASPECT)
  // Where the rocket stands across the window: a third of the way on wide screens,
  // near the middle on tall phones, where the pad picture is much wider than the screen.
  const rocketX = width < height ? width * 0.46 : Math.max(width * PAD_ROCKET_X, width / 2 - padWidth * 0.16)
  return {
    '--intro-unit': Math.min(width, height) / DESIGN_SIDE,
    '--intro-pad-w': `${padWidth}px`,
    '--intro-pad-left': `${rocketX - padWidth * PAD_ROCKET_X}px`,
    // Screen pixels for one pixel of the rocket sprite, so the rocket and its tower always fit.
    '--intro-pad-scale': Math.min(padWidth / 96, width / 42, height / 60),
  }
}

const SKY = SPRITES.background.src
const PLANET = Object.fromEntries(Object.entries(SPRITES.planets).map(([id, sprite]) => [id, sprite.src]))
// The rocket with every outside part on: heat shield, boosters and fuel tanks.
const LOADOUT = { shield: 1, boosters: 1, fuel: 1 }
// Ten different things the crew can pack, flying into the rocket one after another.
const CARGO = [...new Set(PARTS.filter((part) => part.inside).map((part) => part.src))].slice(0, 10)
const ROVER = PARTS.find((part) => part.id === 'rover')?.src
// What the hangar counts while building, and what the crew needs on the trip.
const BUILD_METERS = [ICON_URLS.money, ICON_URLS.weight, ICON_URLS.energy, thrustIcon, ICON_URLS.fire]
const LIFE_METERS = [ICON_URLS.astronaut, ICON_URLS.food, ICON_URLS.water, ICON_URLS.air]
const CLOUDS = [8, 62, 30, 78, 46]
const STREAKS = [6, 17, 29, 41, 58, 70, 83, 94]

// Aim scene, in percent of its square: the Earth, the target, and how the dotted path bends.
const AIM_EARTH = { x: 38, y: 62, radius: 24 }
const AIM_TARGET = { x: 86, y: 16 }
const AIM_BEND = { x: 52, y: 16 }
const AIM_DOTS = 13
/** The real launch bases, placed like the game's map: North Pole in the middle of the Earth. */
const SITE_SPOTS = LAUNCH_SITES.map((site) => {
  const reach = ((90 - site.latitudeDeg) / 135) * AIM_EARTH.radius
  const turn = ((site.longitudeDeg + 110) * Math.PI) / 180
  return { id: site.id, name: site.name, x: AIM_EARTH.x + reach * Math.sin(turn), y: AIM_EARTH.y - reach * Math.cos(turn) }
})
// Kourou: the base closest to the equator, where the spin of the Earth pushes the most.
const CHOSEN_SITE = SITE_SPOTS.find((site) => site.id === 'kourou') ?? SITE_SPOTS[0]
/** A point on the dotted path, from the chosen base (0) to the target (1). */
function aimPoint(along) {
  const mix = (from, bend, to) => (1 - along) ** 2 * from + 2 * along * (1 - along) * bend + along ** 2 * to
  return { x: mix(CHOSEN_SITE.x, AIM_BEND.x, AIM_TARGET.x), y: mix(CHOSEN_SITE.y, AIM_BEND.y, AIM_TARGET.y) }
}
const AIM_PATH = Array.from({ length: AIM_DOTS }, (_, index) => aimPoint((index + 1) / (AIM_DOTS + 1)))
const AIM_MIDDLE = aimPoint(0.5)
const AIM_STYLE = {
  '--x0': `${CHOSEN_SITE.x}%`,
  '--y0': `${CHOSEN_SITE.y}%`,
  '--xm': `${AIM_MIDDLE.x}%`,
  '--ym': `${AIM_MIDDLE.y}%`,
  '--x1': `${AIM_TARGET.x}%`,
  '--y1': `${AIM_TARGET.y}%`,
}

// Surprises in lunar orbit: solar storm, tiny meteor, radio silence behind the Moon.
const EVENT_ICONS = ['sunBig', 'asteroid', 'moon-dark-crescent']
// Rocks on the way to Mars: start height, how far they sink, and size.
const ROCKS = [
  { y: 14, drop: 22, size: 3 },
  { y: 62, drop: -18, size: 5 },
  { y: 36, drop: 30, size: 2.5 },
  { y: 78, drop: -30, size: 4 },
  { y: 22, drop: 10, size: 6 },
  { y: 50, drop: 24, size: 3.5 },
]
const RANK_BADGES = { cadet: cadetBadge, pilot: pilotBadge, commander: commanderBadge }
// Stars needed for the top title: one star lands for each.
const RANK_STARS = Math.max(...RANKS.map((rank) => rank.minStars))
const FINALE_PLANETS = ['earth', 'moon', 'mars', 'saturn', 'blackHole']
const BURST_STARS = 12

/** Music and effects in the trailer, as a share of the game's volume (voice not included). */
const TRAILER_LEVEL = 0.6
/** The trailer's sound effects on top of that: many of them are loud one-shots. */
const TRAILER_SFX = 0.5

/** What the voice says in each scene. `who` is "Engineer Sam", or just "Engineer". */
function trailerLines(who) {
  return {
    countdown: t('{{who}}! Space needs you.', { who }),
    build: t('You design the rocket. Every kilo counts.'),
    pack: t('Food, water, air. Your crew trusts you.'),
    aim: t('Pick a real launch base. The spin of the Earth pushes you.'),
    launch: t('Liftoff! Nothing stops you.'),
    orbit: t('Orbit! One lap takes ninety minutes.'),
    moon: t('The Moon. Land softly. Fuel is short.'),
    events: t('Storms, meteors, radio silence. You decide.'),
    mars: t('Mars: seven months away. Dodge, brake, explore.'),
    fact: t('Did you know? On Mars, sunsets are blue.'),
    ranks: t('Earn stars. Become Star Commander.'),
    finale: t('You are a legend, {{who}}. Your turn!', { who }),
  }
}

function engineerTitle(name) {
  return name ? t('Engineer {{name}}', { name }) : t('Engineer')
}

const noop = () => {}

/** A row of small bars under the top edge, each with its icon. */
function Meters({ icons, kind }) {
  return (
    <ul className={`intro-meters intro-meters--${kind}`}>
      {icons.map((icon, index) => (
        <li key={icon} style={{ '--i': index }}>
          <img src={icon} alt="" />
          <span className="intro-meter"><span /></span>
        </li>
      ))}
    </ul>
  )
}

/** A short label with its icon, popping in under the top edge. */
function Chip({ icon, children, at = 0 }) {
  return (
    <p className="intro-chip" style={{ '--at': `${at}s` }}>
      <img src={icon} alt="" />
      {children}
    </p>
  )
}

function CountdownScene() {
  return (
    <>
      <img className="intro-sky" src={SKY} alt="" />
      <div className="intro-ship intro-ship--pad">
        <Rocket equipped={LOADOUT} straining />
      </div>
      <span className="intro-blast" />
      {[3, 2, 1].map((digit, index) => (
        <span key={digit} className="intro-digit" style={{ '--i': index }}>{digit}</span>
      ))}
    </>
  )
}

/** The game's own launch pad: crane, tower, crew, Laika, clouds and flag. */
function PadScene({ beat }) {
  return (
    <>
      <div className={`intro-pad is-${beat}`}>
        <img className="stage__bg" src={launchPad} alt="" />
        <img className="stage__glow" src={sunGlow} alt="" />
        <PadClouds />
        <PadFlag />
        <div className="intro-pad__mount">
          <div className="prep intro-pad__prep">
            <LaunchTower />
            <img className="prep__base" src={launchBase} alt="" />
            <div className="prep__swap is-in">
              <span className="prep__cable" />
              <Rocket equipped={LOADOUT} />
            </div>
            <span className="prep__dust" />
            <PadLaika onTalk={noop} talking={false} />
            <PadCrew />
            {beat === 'pack' && CARGO.map((src, index) => (
              <img
                key={src}
                className="intro-cargo"
                src={src}
                alt=""
                style={{ '--a': `${index * 36 - 90}deg`, '--i': index }}
              />
            ))}
          </div>
        </div>
      </div>
      {beat === 'build' ? <Meters kind="build" icons={BUILD_METERS} /> : <Meters kind="life" icons={LIFE_METERS} />}
      <p key={beat} className="intro-word intro-word--side">{beat === 'build' ? t('BUILD') : t('PACK')}</p>
    </>
  )
}

function AimScene() {
  return (
    <>
      <img className="intro-sky" src={SKY} alt="" />
      <pre className="intro-code">{CODE}</pre>
      <div className="intro-aim" style={AIM_STYLE}>
        <span className="intro-aim__spin" style={{ left: `${AIM_EARTH.x}%`, top: `${AIM_EARTH.y}%` }} />
        <img className="intro-aim__earth" src={PLANET.earth} alt="" style={{ left: `${AIM_EARTH.x}%`, top: `${AIM_EARTH.y}%` }} />
        {AIM_PATH.map((dot, index) => (
          <span key={index} className="intro-aim__dot" style={{ left: `${dot.x}%`, top: `${dot.y}%`, '--i': index }} />
        ))}
        <img className="intro-aim__target" src={ICON_URLS.target} alt="" />
        {SITE_SPOTS.map((site, index) => (
          <img key={site.id} className="intro-aim__pin" src={pin} alt="" style={{ left: `${site.x}%`, top: `${site.y}%`, '--i': index }} />
        ))}
        <img className="intro-aim__pin intro-aim__pin--chosen" src={pinSelected} alt="" />
        <img className="intro-aim__rocket" src={ICON_URLS.rocket} alt="" />
        <img className="intro-aim__hand" src={ICON_URLS.hand} alt="" />
      </div>
      <Chip icon={pinSelected} at={2}>{CHOSEN_SITE.name}</Chip>
      <p className="intro-word">{t('AIM')}</p>
    </>
  )
}

function LaunchScene({ stage }) {
  return (
    <>
      <div className="intro-launch__sky" />
      <img className="intro-sky intro-launch__stars" src={SKY} alt="" />
      {CLOUDS.map((left, index) => (
        <img key={left} className="intro-cloud" src={cloud} alt="" style={{ left: `${left}%`, '--i': index }} />
      ))}
      {STREAKS.map((left, index) => (
        <span key={left} className="intro-streak" style={{ left: `${left}%`, '--i': index }} />
      ))}
      <div className={`intro-ship intro-ship--launch is-${stage}`}>
        <Rocket equipped={LOADOUT} ascending stage={stage} />
      </div>
      <p className="intro-word">{t('LAUNCH')}</p>
    </>
  )
}

function OrbitScene() {
  return (
    <>
      <img className="intro-sky" src={SKY} alt="" />
      <div className="intro-system">
        <span className="intro-ring intro-ring--low" />
        <span className="intro-ring intro-ring--high" />
        <img className="intro-system__earth" src={PLANET.earth} alt="" />
        <span className="intro-sat intro-sat--gold">
          <span className="intro-sat__gold" style={{ backgroundImage: `url(${goldSatelliteSheet})` }} />
        </span>
        <span className="intro-sat intro-sat--comms"><img src={ICON_URLS.satellite} alt="" /></span>
        <span className="intro-sat intro-sat--scope"><img src={ICON_URLS.telescope} alt="" /></span>
        <span className="intro-sat intro-sat--junk"><img src={ICON_URLS.junk} alt="" /></span>
        <span className="intro-sat intro-sat--ship"><img src={ICON_URLS.rocket} alt="" /></span>
      </div>
      <Chip icon={ICON_URLS.clock} at={0.6}>{t('1 lap = 90 min')}</Chip>
      <p className="intro-word">{t('ORBIT')}</p>
    </>
  )
}

/** The landing mini-game: short engine burns, little fuel, a soft touchdown. */
function MoonScene() {
  return (
    <>
      <img className="intro-sky" src={SKY} alt="" />
      <img className="intro-moon__earth" src={PLANET.earth} alt="" />
      <img className="intro-moon__ground" src={PLANET.moon} alt="" />
      <span className="intro-moon__dust" />
      <div className="intro-moon__lander">
        <span className="intro-moon__flame" />
        <img src={ICON_URLS.lander} alt="" />
      </div>
      <img className="intro-moon__prop intro-moon__prop--flag" src={ICON_URLS.flag} alt="" />
      <img className="intro-moon__prop intro-moon__prop--steps" src={ICON_URLS.footprints} alt="" />
      <img className="intro-moon__prop intro-moon__prop--ice" src={ICON_URLS.ice} alt="" />
      <div className="intro-moon__fuel">
        <img src={ICON_URLS.fuelCan} alt="" />
        <span className="intro-meter"><span /></span>
      </div>
      <img className="intro-moon__hand" src={ICON_URLS.hand} alt="" />
      <Chip icon={ICON_URLS.check} at={3.4}>{t('Soft landing!')}</Chip>
      <p className="intro-word">{t('MOON')}</p>
    </>
  )
}

/** Three surprises with a clock running, answered just in time. */
function EventsScene() {
  return (
    <>
      <img className="intro-sky" src={SKY} alt="" />
      <img className="intro-events__moon" src={PLANET.moon} alt="" />
      <ul className="intro-events">
        {EVENT_ICONS.map((icon, index) => (
          <li key={icon} style={{ '--i': index }}>
            <PixelIcon name={icon} className="intro-events__icon" />
            <span className="intro-events__timer"><span /></span>
            <img className="intro-events__ok" src={ICON_URLS.check} alt="" />
          </li>
        ))}
      </ul>
      <img className="intro-events__hand" src={ICON_URLS.hand} alt="" />
      <p className="intro-word">{t('DECIDE')}</p>
    </>
  )
}

function MarsScene() {
  return (
    <>
      <img className="intro-sky intro-mars__sky" src={SKY} alt="" />
      <img className="intro-mars__planet" src={PLANET.mars} alt="" />
      <img className="intro-mars__moon intro-mars__moon--phobos" src={phobos} alt="" />
      <img className="intro-mars__moon intro-mars__moon--deimos" src={deimos} alt="" />
      {ROCKS.map((rock, index) => (
        <span
          key={rock.y}
          className="intro-rock"
          style={{
            backgroundImage: `url(${asteroidSheet})`,
            '--y': `${rock.y}vh`,
            '--drop': `${rock.drop}vh`,
            '--size': rock.size,
            '--i': index,
          }}
        />
      ))}
      <div className="intro-ship intro-ship--mars">
        <Rocket equipped={LOADOUT} ascending stage="upper" />
      </div>
      <span className="intro-boom" style={{ backgroundImage: `url(${explosionSheet})` }} />
      <img className="intro-mars__warn" src={ICON_URLS.warning} alt="" />
      <img className="intro-mars__gear intro-mars__gear--chute" src={ICON_URLS.parachute} alt="" />
      <img className="intro-mars__gear intro-mars__gear--rover" src={ROVER} alt="" />
      <Chip icon={ICON_URLS.clock} at={0.8}>{t('203 days')}</Chip>
      <p className="intro-word">{t('MARS')}</p>
    </>
  )
}

/** One of the game's space facts: on Mars the sky turns blue around the setting Sun. */
function FactScene() {
  return (
    <>
      <div className="intro-fact__dusk" />
      <div className="intro-fact__blue" />
      <img className="intro-fact__sun" src={ICON_URLS.sun} alt="" />
      <div className="intro-fact__ground" />
      <img className="intro-fact__rover" src={ROVER} alt="" />
      <Chip icon={ICON_URLS.sparkle} at={0.1}>{t('Did you know?')}</Chip>
    </>
  )
}

/** Stars land one by one; a badge lands with the star that earns it. Then what comes next. */
function RanksScene() {
  return (
    <>
      <img className="intro-sky" src={SKY} alt="" />
      <span className="intro-ranks__next intro-ranks__next--saturn">
        <img src={PLANET.saturn} alt="" />
        <img className="intro-ranks__lock" src={SPRITES.lock.src} alt="" />
      </span>
      <span className="intro-ranks__next intro-ranks__next--hole">
        <img src={PLANET.blackHole} alt="" />
        <img className="intro-ranks__lock" src={SPRITES.lock.src} alt="" />
      </span>
      <div className="intro-ranks">
        <div className="intro-ranks__stars">
          {Array.from({ length: RANK_STARS }, (_, index) => (
            <img key={index} src={ICON_URLS.star} alt="" style={{ '--i': index }} />
          ))}
        </div>
        <div className="intro-ranks__badges">
          {RANKS.map((rank) => (
            <img key={rank.id} src={RANK_BADGES[rank.id]} alt="" style={{ '--i': rank.minStars - 1 }} />
          ))}
        </div>
      </div>
      <p className="intro-word">{t('RISE')}</p>
    </>
  )
}

function FinaleScene({ who }) {
  return (
    <>
      <div className="intro-finale__hole"><BlackHoleBackground /></div>
      <div className="intro-finale">
        <div className="intro-finale__planets">
          {FINALE_PLANETS.map((id, index) => (
            <img key={id} src={PLANET[id]} alt="" style={{ '--i': index }} />
          ))}
        </div>
        <div className="intro-finale__logo"><AppLogo size={96} wordmark bare /></div>
        <p className="intro-finale__who">{who}</p>
      </div>
      <div className="intro-burst">
        {Array.from({ length: BURST_STARS }, (_, index) => (
          <img key={index} src={ICON_URLS.star} alt="" style={{ '--a': `${(index * 360) / BURST_STARS}deg` }} />
        ))}
      </div>
    </>
  )
}

/**
 * shownName: the player's name as typed, for the screen. spokenName: how the voice reads it.
 * voiceVolume: 0..1; 0 plays the trailer without the voice. onEnd runs when the minute is up.
 */
export function TrailerReel({ shownName = '', spokenName = '', language = 'en', voiceVolume = 1, onEnd }) {
  const [scene, setScene] = useState('countdown')
  const [beat, setBeat] = useState('build')
  const [stage, setStage] = useState('full')
  const [metrics, setMetrics] = useState(viewportMetrics)
  const onEndRef = useRef(onEnd)
  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  useEffect(() => {
    const onResize = () => setMetrics(viewportMetrics())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Everything in the trailer plays softer than the game, so the voice is easy to hear.
  useEffect(() => {
    setSceneLevel(TRAILER_LEVEL)
    return () => setSceneLevel(1)
  }, [])

  useEffect(() => {
    const timers = []
    const stops = []
    // The trailer reached its end by itself: the last words are allowed to finish.
    let ended = false
    const at = (ms, run) => {
      timers.push(setTimeout(run, ms))
    }
    // until: the moment (on the trailer clock) a long sound is cut, so it ends with its scene.
    const sound = (ms, src, { volume = 1, until = 0 } = {}) => at(ms, () => {
      const stop = startSfx([{ src, volume: volume * TRAILER_SFX }])
      stops.push(stop)
      if (until > ms) at(until - ms, stop)
    })
    const synth = (ms, recipe) => at(ms, () => playSynth(recipe))
    const say = (ms, text) => at(ms, () => speak(text, { language, volume: voiceVolume, queue: true }))
    const lines = trailerLines(engineerTitle(spokenName))
    const { pad, aim, launch, orbit, moon, events, mars, fact, ranks, finale } = SCENE_STARTS

    for (const [id, start] of Object.entries(SCENE_STARTS)) {
      if (start > 0) at(start, () => setScene(id))
    }
    at(PACK_AT, () => setBeat('pack'))
    at(SEPARATION_AT, () => setStage('separating'))
    at(UPPER_STAGE_AT, () => setStage('upper'))

    // Countdown: 3, 2, 1, ignition.
    say(0, lines.countdown)
    for (const beep of [0, 800, 1600]) sound(beep, SFX.countdownBeep)
    sound(2450, SFX.ignition, { volume: 0.8, until: pad + 400 })

    // Pad, build: the crane lowers the rocket, three parts snap on, the budget runs red and is fixed.
    say(pad + 700, lines.build)
    synth(pad, SYNTH.whoosh)
    sound(pad + 980, SFX.rockImpact, { volume: 0.5 })
    for (const snap of [1600, 2100, 2600]) sound(pad + snap, SFX.equip, { volume: 0.8 })
    sound(pad + 3250, SFX.error)
    sound(pad + 4500, SFX.coinsEarn, { volume: 0.8 })

    // Pad, pack: the camera pushes in, the cargo flies aboard, Laika barks.
    say(PACK_AT + 200, lines.pack)
    synth(PACK_AT, SYNTH.whoosh)
    for (let item = 0; item < 8; item += 1) sound(PACK_AT + 600 + item * 340, SFX.place)
    synth(PACK_AT + 1300, SYNTH.woof)
    sound(PACK_AT + 3900, SFX.gearUpgrade)
    synth(PACK_AT + 4500, SYNTH.woof)

    // Aim: seven real bases pop up, one is picked, the dotted path is dragged to its target.
    say(aim + 200, lines.aim)
    for (let site = 0; site < SITE_SPOTS.length; site += 1) synth(aim + 300 + site * 220, SYNTH.pop)
    sound(aim + 2000, SFX.select)
    sound(aim + 2600, SFX.aim, { volume: 0.8 })
    for (let step = 0; step < 6; step += 1) synth(aim + 2800 + step * 280, SYNTH.tick)
    sound(aim + 4450, SFX.confirm)
    sound(aim + 4700, SFX.rocketPass, { volume: 0.7, until: launch })
    synth(aim + 5700, SYNTH.sparkle)

    // Launch: liftoff, then the rear stage drops away.
    say(launch + 200, lines.launch)
    sound(launch, SFX.liftoff, { until: orbit })
    sound(SEPARATION_AT, SFX.unequip, { volume: 0.9 })
    sound(SEPARATION_AT + 100, SFX.rocketPass, { volume: 0.7, until: orbit })

    // Orbit: radio and satellite beeps.
    say(orbit + 200, lines.orbit)
    sound(orbit, SFX.radioSignal)
    synth(orbit + 600, SYNTH.chime)
    for (const beep of [500, 1100, 1900, 3100]) sound(orbit + beep, SFX.satelliteBeep)
    synth(orbit + 2500, SYNTH.sparkle)

    // Moon: three engine burns on the way down, touchdown, flag.
    say(moon + 200, lines.moon)
    sound(moon + 100, SFX.scanner, { volume: 0.6 })
    for (const [from, to] of [[320, 900], [1280, 1980], [2370, 3100]]) {
      sound(moon + from, SFX.engineLoop, { volume: 0.8, until: moon + to })
    }
    sound(moon + 3150, SFX.landing)
    synth(moon + 3400, SYNTH.bright)
    sound(moon + 3550, SFX.starCollect, { volume: 0.8 })

    // Events: solar storm, meteor, radio silence, each answered before its clock runs out.
    say(events + 200, lines.events)
    synth(events + 200, SYNTH.alarm)
    synth(events + 1200, SYNTH.zoom)
    synth(events + 2200, SYNTH.static)
    for (let tap = 0; tap < 4; tap += 1) synth(events + 2900 + tap * 150, SYNTH.tick)
    for (let answer = 0; answer < EVENT_ICONS.length; answer += 1) synth(events + 3300 + answer * 200, SYNTH.bright)
    sound(events + 3950, SFX.confirm)

    // Mars: alarm, rocks, one of them blows up, then the parachute and the rover.
    say(mars + 200, lines.mars)
    sound(mars, SFX.alarm, { volume: 0.7 })
    sound(mars + 450, SFX.asteroidShower, { volume: 0.8, until: mars + 3200 })
    sound(mars + 1600, SFX.explosion)
    synth(mars + 3000, SYNTH.whoosh)
    sound(mars + 3800, SFX.rockImpact, { volume: 0.7 })
    synth(mars + 4100, SYNTH.sparkle)

    // Fact: wind on Mars while the sunset turns blue.
    say(fact + 200, lines.fact)
    synth(fact + 100, SYNTH.chime)
    sound(fact, SFX.planetWind, { volume: 0.8, until: ranks })
    synth(fact + 3000, SYNTH.sparkle)

    // Ranks: a star for each step, a badge at stars 1, 4 and 7, then the locked planets.
    say(ranks + 200, lines.ranks)
    for (let star = 0; star < RANK_STARS; star += 1) sound(ranks + 200 + star * 200, SFX.starCollect, { volume: 0.6 })
    for (const rank of RANKS) sound(ranks + 300 + (rank.minStars - 1) * 200, SFX.gearUpgrade, { volume: 0.7 })
    sound(ranks + 1700, SFX.levelUp, { volume: 0.8 })
    for (const lock of [2300, 2600]) sound(ranks + lock, SFX.unequip, { volume: 0.8 })

    // Finale: planets, logo, the player's name.
    say(finale + 200, lines.finale)
    sound(finale, SFX.unlock, { volume: 0.7 })
    for (let planet = 0; planet < FINALE_PLANETS.length; planet += 1) {
      sound(finale + planet * 150, SFX.coinCollect, { volume: 0.7 })
    }
    sound(finale + 800, SFX.missionComplete)
    sound(finale + 2000, SFX.levelUp)

    at(TRAILER_MS, () => {
      ended = true
      onEndRef.current?.()
    })

    return () => {
      timers.forEach(clearTimeout)
      stops.forEach((stop) => stop())
      if (!ended) stopSpeaking()
    }
  }, [language, spokenName, voiceVolume])

  return (
    <div className="intro-reel" style={{ '--intro-length': `${TRAILER_MS}ms`, ...metrics }} aria-hidden="true" inert>
      <div key={scene} className={`intro-scene intro-scene--${scene}`}>
        {scene === 'countdown' && <CountdownScene />}
        {scene === 'pad' && <PadScene beat={beat} />}
        {scene === 'aim' && <AimScene />}
        {scene === 'launch' && <LaunchScene stage={stage} />}
        {scene === 'orbit' && <OrbitScene />}
        {scene === 'moon' && <MoonScene />}
        {scene === 'events' && <EventsScene />}
        {scene === 'mars' && <MarsScene />}
        {scene === 'fact' && <FactScene />}
        {scene === 'ranks' && <RanksScene />}
        {scene === 'finale' && <FinaleScene who={engineerTitle(shownName)} />}
      </div>
      <div className="intro-reel__screen" />
      <div className="intro-reel__bars" />
      <div className="intro-reel__progress"><span /></div>
      <div className="intro-reel__end" />
    </div>
  )
}
