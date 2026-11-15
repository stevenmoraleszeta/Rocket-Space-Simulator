/**
 * Settings button that opens a panel to change the music volume,
 * the ambient/effects volume and the player's name, and to sign in with Google.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import googleMark from '../assets/images/icons/google-g.png';
import settingsIcon from '../assets/images/icons/settings.svg';
import { loadGoogleSignIn, renderGoogleButton } from '../lib/googleSignIn.js';
import { googleSignInMessage } from '../lib/playerSession.js';
import { LANGUAGES, t } from '../i18n/index.js';
import { useSettings } from './SettingsContext.jsx';
import { engineerName, MAX_NAME_LENGTH } from './settingsStore.js';

function GoogleMark() {
  return <img className="st-google__mark" src={googleMark} alt="" />;
}

function GoogleSignInButton({ onError }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let active = true;
    loadGoogleSignIn()
      .then(() => {
        requestAnimationFrame(() => {
          if (active && hostRef.current) renderGoogleButton(hostRef.current);
        });
      })
      .catch((error) => {
        if (active) onError(googleSignInMessage(error));
      });
    return () => { active = false; };
  }, [onError]);

  return <div ref={hostRef} className="st-google-host" />;
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
  const { musicVolume, ambientVolume, playerName, language, update } = useSettings();
  const [open, setOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const onGoogleError = useCallback((message) => setAuthError(message), []);
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

  return (
    <div className="st-root">
      <button
        ref={buttonRef}
        type="button"
        className={`ms-btn ms-btn--ghost ms-btn--icon st-toggle${needsYou ? ' is-needed' : ''}`}
        aria-label={needsYou ? t('Settings. Add your name or sign in with Google.') : t('Settings')}
        aria-expanded={open}
        aria-controls="st-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <img className="ms-pixel" src={settingsIcon} alt="" width={28} height={28} draggable="false" />
        {t('Settings')}
        {needsYou && <span className="st-dot" title={t('Add your name or sign in with Google')} />}
      </button>

      {open && (
        <div id="st-panel" ref={panelRef} className="st-panel" role="dialog" aria-label={t('Settings')}>
          <h2 className="st-title">{name ? t('Engineer {{name}}', { name }) : t('Settings')}</h2>
          {needsYou && (
            <p className="st-note">
              {needsName && needsGoogle && t('The red dot stays until you add your name and sign in with Google.')}
              {needsName && !needsGoogle && t('The red dot stays until you add your name.')}
              {!needsName && needsGoogle && t('The red dot stays until you sign in with Google.')}
            </p>
          )}

          <div className="st-field">
            <p className="st-label" id="st-language">{t('Language')}</p>
            <div className="st-lang" role="group" aria-labelledby="st-language">
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`ms-btn${language === item.id ? ' is-on' : ''}`}
                  aria-pressed={language === item.id}
                  onClick={() => update({ language: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="st-field">
            <label className="st-label" htmlFor={nameId}>
              {t('Your name')}
              {needsName && <span className="st-dot" aria-hidden="true" />}
            </label>
            <input
              id={nameId}
              ref={nameRef}
              className="st-input"
              type="text"
              placeholder={t('Type your name')}
              autoComplete="nickname"
              maxLength={MAX_NAME_LENGTH}
              value={playerName}
              onChange={(e) => update({ playerName: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') setOpen(false); }}
            />
            <p className="st-hint">
              {name ? t('The game will call you engineer {{name}}.', { name }) : t('Type your name so the game can talk to you.')}
            </p>
          </div>

          <div className="st-field">
            {googleSignedIn ? (
              <p className="st-signed" role="status">
                <GoogleMark />
                <span>{t('Signed in with Google. Your stars stay with you.')}</span>
              </p>
            ) : (
              <>
                <p className="st-label">
                  <GoogleMark /> {t('Save your stars')}
                  <span className="st-dot" aria-hidden="true" />
                </p>
                <p className="st-hint">{t('Sign in so your name and stars are still here next time.')}</p>
                <GoogleSignInButton onError={onGoogleError} />
                {(authError || redirectError) && <p className="st-error" role="alert">{t(authError || redirectError)}</p>}
                <p className="st-hint">{t('Choose your Google account here. A passkey or password can finish, and your stars stay with you.')}</p>
              </>
            )}
          </div>

          <VolumeSlider label={t('Music')} value={musicVolume} onChange={(v) => update({ musicVolume: v })} />
          <VolumeSlider label={t('Sounds')} value={ambientVolume} onChange={(v) => update({ ambientVolume: v })} />

          <button className="ms-btn st-done" onClick={() => setOpen(false)}>{t('Done')}</button>
        </div>
      )}
    </div>
  );
}
