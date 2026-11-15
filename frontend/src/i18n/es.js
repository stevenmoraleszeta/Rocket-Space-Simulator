import { ui } from './es/ui.js'
import { missions } from './es/missions.js'
import { parts } from './es/parts.js'
import { failures } from './es/failures.js'
import { moon } from './es/moon.js'
import { world } from './es/world.js'

export const es = {
  ...ui,
  ...missions,
  ...parts,
  ...failures,
  ...moon,
  ...world,
}
