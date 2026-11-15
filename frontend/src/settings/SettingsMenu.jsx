/**
 * Settings button that opens a panel to change the music volume,
 * the ambient/effects volume and the player's name, and to sign in with Google.
 */
import { useEffect, useId, useRef, useState } from 'react';
import googleMark from '../assets/images/icons/google-g.png';
import settingsIcon from '../assets/images/icons/settings.svg';
import { googleSignInMessage, signInWithGoogle } from '../lib/playerSession.js';
import { useSettings } from './SettingsContext.jsx';
import { engineerName, MAX_NAME_LENGTH } from './settingsStore.js';

function GoogleMark() {
  return <img className="st-google__mark" src={googleMark} alt="" />;
}

function VolumeSlider({ label, value, onChange }) {
  const id = useId();
  const pct = Math.round(value * 100);
  return (
    <div className="st-field">
      <label className="st-label" htmlFor={id}>
        {label}
        <span className="st-value">{pct}%</span>
      </label>
      <input
        id={id}
        className="st-range"
        type="range"
        min="0"
        max="100"
        step="5"
        value={pct}
        style={{ '--st-fill': `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
    </div>
  );
}

export function SettingsMenu({ googleSignedIn = false, authError: redirectError = '' }) {
  const { musicVolume, ambientVolume, playerName, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const nameRef = useRef(null);
  const nameId = useId();
  const name = engineerName(playerName);
  const needsName = !name;
  const needsGoogle = !googleSignedIn;
  const needsYou = needsName || needsGoogle;

  // Close with Esc or by clicking outside the panel
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    const onPointer = (e) => {
      if (!panelRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    nameRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  async function onGoogleClick() {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
        setAuthError(googleSignInMessage(error));
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="st-root">
      <button
        ref={buttonRef}
        type="button"
        className={`ms-btn ms-btn--ghost ms-btn--icon st-toggle${needsYou ? ' is-needed' : ''}`}
        aria-label={needsYou ? 'Settings. Add your name or sign in with Google.' : 'Settings'}
        aria-expanded={open}
        aria-controls="st-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <img className="ms-pixel" src={settingsIcon} alt="" width={28} height={28} draggable="false" />
        Settings
        {needsYou && <span className="st-dot" title="Add your name or sign in with Google" />}
      </button>

      {open && (
        <div id="st-panel" ref={panelRef} className="st-panel" role="dialog" aria-label="Settings">
          <h2 className="st-title">{name ? `Engineer ${name}` : 'Settings'}</h2>
          {needsYou && (
            <p className="st-note">
              {needsName && needsGoogle && 'The red dot stays until you add your name and sign in with Google.'}
              {needsName && !needsGoogle && 'The red dot stays until you add your name.'}
              {!needsName && needsGoogle && 'The red dot stays until you sign in with Google.'}
            </p>
          )}

          <div className="st-field">
            <label className="st-label" htmlFor={nameId}>
              Your name
              {needsName && <span className="st-dot" aria-hidden="true" />}
            </label>
            <input
              id={nameId}
              ref={nameRef}
              className="st-input"
              type="text"
              placeholder="Type your name"
              autoComplete="nickname"
              maxLength={MAX_NAME_LENGTH}
              value={playerName}
              onChange={(e) => update({ playerName: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') setOpen(false); }}
            />
            <p className="st-hint">
              {name ? `The game will call you engineer ${name}.` : 'Type your name so the game can talk to you.'}
            </p>
          </div>

          <div className="st-field">
            {googleSignedIn ? (
              <p className="st-signed" role="status">
                <GoogleMark />
                <span>Signed in with Google. Your stars stay with you.</span>
              </p>
            ) : (
              <>
                <p className="st-label">
                  <GoogleMark /> Save your stars
                  <span className="st-dot" aria-hidden="true" />
                </p>
                <p className="st-hint">Sign in so your name and stars are still here next time.</p>
                <button
                  type="button"
                  className="ms-btn st-google"
                  onClick={onGoogleClick}
                  disabled={signingIn}
                  aria-busy={signingIn}
                >
                  <GoogleMark />
                  <span>{signingIn ? 'Opening Google…' : 'Sign in with Google'}</span>
                </button>
                {(authError || redirectError) && <p className="st-error" role="alert">{authError || redirectError}</p>}
                <p className="st-hint">Google opens on this page so you can finish the sign-in, then the game comes back.</p>
              </>
            )}
          </div>

          <VolumeSlider label="Music" value={musicVolume} onChange={(v) => update({ musicVolume: v })} />
          <VolumeSlider label="Sounds" value={ambientVolume} onChange={(v) => update({ ambientVolume: v })} />

          <button className="ms-btn st-done" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}
