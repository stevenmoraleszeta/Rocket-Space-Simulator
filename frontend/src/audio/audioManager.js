/**
 * Small audio engine with two looping channels (music and ambience) plus one-shot effects.
 * One shared instance for the whole app: screens say WHAT should play, settings say HOW LOUD.
 *
 * - Changing a channel's track crossfades from the old one to the new one.
 * - Volumes come from the settings sliders (0..1) and apply live, even mid-fade.
 * - Browsers block audio until the player interacts with the page. If playback is blocked,
 *   it retries automatically on the first click, tap or key press.
 */

const FADE_MS = 900;

// Slider position → loudness. Squaring makes the slider feel even (50% sounds about half as loud).
const loudness = (v) => v * v;

function createChannel(maxLevel = 1) {
  return {
    maxLevel,        // where 100% on the slider lands, as a slider position (0.5 = old 50%)
    src: null,       // track that should be playing
    el: null,        // its <audio> element
    fade: 0,         // 0..1 fade multiplier of the current element
    fadingOut: [],   // old elements fading out: { el, fade }
    volume: 0,       // settings volume 0..1
  };
}

// The space ambience loop is loud next to the music, so its 100% matches what 50% used to be.
// Sound effects (playSfx) share the ambient slider but are not capped.
const channels = { music: createChannel(1), ambient: createChannel(0.5) };
let rafId = 0;
let lastTick = 0;
let waitingForGesture = false;

function applyVolume(channel, el, fade) {
  el.volume = Math.min(1, Math.max(0, loudness(channel.volume * channel.maxLevel) * fade));
}

function tick(now) {
  const step = lastTick ? (now - lastTick) / FADE_MS : 0;
  lastTick = now;
  let busy = false;

  for (const channel of Object.values(channels)) {
    if (channel.el && channel.fade < 1) {
      channel.fade = Math.min(1, channel.fade + step);
      busy = true;
    }
    if (channel.el) applyVolume(channel, channel.el, channel.fade);

    channel.fadingOut = channel.fadingOut.filter((old) => {
      old.fade = Math.max(0, old.fade - step);
      applyVolume(channel, old.el, old.fade);
      if (old.fade > 0) return true;
      old.el.pause();
      old.el.removeAttribute('src');
      old.el.load(); // release the decoded audio
      return false;
    });
    if (channel.fadingOut.length) busy = true;
  }

  if (busy) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = 0;
    lastTick = 0;
  }
}

function startFading() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function tryPlay(el) {
  const p = el.play();
  if (p && typeof p.catch === 'function') {
    p.catch((err) => {
      if (err?.name === 'NotAllowedError') waitForGesture();
    });
  }
}

/** Autoplay was blocked: resume every channel on the first user interaction. */
function waitForGesture() {
  if (waitingForGesture) return;
  waitingForGesture = true;
  const resume = () => {
    waitingForGesture = false;
    window.removeEventListener('pointerdown', resume, true);
    window.removeEventListener('keydown', resume, true);
    for (const channel of Object.values(channels)) {
      if (channel.el?.paused) tryPlay(channel.el);
    }
  };
  window.addEventListener('pointerdown', resume, true);
  window.addEventListener('keydown', resume, true);
}

/**
 * Sets the looping track of a channel ('music' or 'ambient'). null stops it.
 * Calling it again with the same track does nothing, so the music never restarts by accident.
 */
export function setTrack(channelName, src) {
  const channel = channels[channelName];
  if (!channel || channel.src === (src ?? null)) return;
  channel.src = src ?? null;

  if (channel.el) {
    channel.fadingOut.push({ el: channel.el, fade: channel.fade });
    channel.el = null;
  }

  if (src) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = 'auto';
    channel.el = el;
    channel.fade = 0;
    applyVolume(channel, el, 0);
    tryPlay(el);
  }
  startFading();
}

/** Updates the volume (0..1) of a channel. Applies immediately. */
export function setChannelVolume(channelName, volume) {
  const channel = channels[channelName];
  if (!channel) return;
  channel.volume = Math.min(1, Math.max(0, Number(volume) || 0));
  if (channel.el) applyVolume(channel, channel.el, channel.fade);
  for (const old of channel.fadingOut) applyVolume(channel, old.el, old.fade);
}

/**
 * Plays a one-shot sound effect at the ambient/effects volume.
 * Accepts a file, or a sequence of steps to build a combined sound:
 *   playSfx([{ src: a }, { src: b, at: 0.11, volume: 0.8 }])   // `at` in seconds
 */
export function playSfx(sound) {
  const volume = loudness(channels.ambient.volume);
  if (!sound || volume <= 0) return;
  const steps = Array.isArray(sound) ? sound : [{ src: sound }];
  for (const step of steps) {
    const el = new Audio(step.src);
    el.volume = Math.min(1, volume * (step.volume ?? 1));
    const start = () => el.play().catch(() => { /* blocked or interrupted: effects are optional */ });
    if (step.at > 0) setTimeout(start, step.at * 1000);
    else start();
  }
}

/** Effects loudness (0..1) from the settings, for sounds built in code (synth.js). */
export function effectsLoudness() {
  return loudness(channels.ambient.volume);
}
