/**
 * Settings button (top-right corner) that opens a panel to change
 * the music volume, the ambient/effects volume and the player's name.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { useSettings } from './SettingsContext.jsx';
import { MAX_NAME_LENGTH } from './settingsStore.js';

function VolumeSlider({ label, icon, value, onChange }) {
  const id = useId();
  const pct = Math.round(value * 100);
  const muted = pct === 0;
  return (
    <div className="st-field">
      <label className="st-label" htmlFor={id}>
        <span aria-hidden="true">{muted ? '🔇' : icon}</span> {label}
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

export function SettingsMenu() {
  const { musicVolume, ambientVolume, playerName, update } = useSettings();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const nameRef = useRef(null);
  const nameId = useId();

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
        className="st-toggle"
        aria-label="Settings"
        aria-expanded={open}
        aria-controls="st-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">⚙</span>
      </button>

      {open && (
        <div id="st-panel" ref={panelRef} className="st-panel" role="dialog" aria-label="Settings">
          <h2 className="st-title">Settings</h2>

          <div className="st-field">
            <label className="st-label" htmlFor={nameId}>
              <span aria-hidden="true">🧑‍🚀</span> Your name
            </label>
            <input
              id={nameId}
              ref={nameRef}
              className="st-input"
              type="text"
              placeholder="Astronaut"
              autoComplete="nickname"
              maxLength={MAX_NAME_LENGTH}
              value={playerName}
              onChange={(e) => update({ playerName: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') setOpen(false); }}
            />
          </div>

          <VolumeSlider label="Music" icon="🎵" value={musicVolume} onChange={(v) => update({ musicVolume: v })} />
          <VolumeSlider label="Ambient & effects" icon="🔊" value={ambientVolume} onChange={(v) => update({ ambientVolume: v })} />

          <button className="ms-btn st-done" onClick={() => setOpen(false)}>Done</button>
        </div>
      )}
    </div>
  );
}
