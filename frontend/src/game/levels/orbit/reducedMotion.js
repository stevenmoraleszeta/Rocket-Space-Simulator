/** True when the player asked the system for less motion (the story scenes then hold still). */
export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
