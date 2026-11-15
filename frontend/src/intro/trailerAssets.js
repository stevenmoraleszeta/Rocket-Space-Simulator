/**
 * Real game code, drawn as a backdrop while the player aims the launch in the intro trailer.
 * It is the flight loop of the launch simulation: the lines with the physics in them.
 */
import simulationSource from '../game/levels/orbit/launchSimulation.js?raw'

const CODE_FIRST_LINE = 66
const CODE_LINES = 96
// The backdrop has two columns; longer lines are cut so one column never runs into the other.
const CODE_LINE_WIDTH = 60

export const CODE = simulationSource
  .split('\n')
  .slice(CODE_FIRST_LINE, CODE_FIRST_LINE + CODE_LINES)
  .map((line) => line.slice(0, CODE_LINE_WIDTH))
  .join('\n')
