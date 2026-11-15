/**
 * Compact notes for one finished trip: how many of each part, and the short choices.
 */
import { PARTS, partCount } from './parts.js';

const PICK_KEYS = ['site', 'orbit', 'window', 'craft', 'place'];

export function flightNotes(equipped, picks = {}) {
  const packed = {};
  for (const part of PARTS) {
    const count = partCount(equipped, part.id);
    if (count > 0) packed[part.id] = Math.min(8, count);
  }
  const clean = {};
  for (const key of PICK_KEYS) {
    const value = picks[key];
    if (typeof value !== 'string') continue;
    const text = value.trim().slice(0, 48);
    if (text) clean[key] = text;
  }
  return { packed, picks: clean };
}
