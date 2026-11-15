// Every looping track the game uses. Change which file plays where from here.
import calm from '../assets/audio/music/calm.wav';
import soft from '../assets/audio/music/soft.wav';
import intense from '../assets/audio/music/intense.wav';
import spaceAmbience from '../assets/audio/space/space_ambience_loop.wav';
import clinkLow from '../assets/audio/equipment/clink_low.wav';
import armorEquip from '../assets/audio/equipment/armor_equip.wav';
import liftoff from '../assets/audio/rockets/liftoff.wav';
import select from '../assets/audio/ui/select.wav';
import confirm from '../assets/audio/ui/confirm.wav';
import cancel from '../assets/audio/ui/cancel.wav';
import error from '../assets/audio/ui/error.wav';
import explosion from '../assets/audio/space/explosion.wav';
import missionComplete from '../assets/audio/win_lose/mission_complete.wav';
import lose from '../assets/audio/win_lose/lose.wav';

export const MUSIC = {
  menu: calm,       // mission select
  assemble: soft,   // fitting the rocket on the launch pad
  flight: intense,  // rocket in flight
};

export const AMBIENCE = {
  space: spaceAmbience,
};

// One-shot sound effects, played with playSfx(SFX.equip).
export const SFX = {
  equip: armorEquip,   // a rocket part is added
  unequip: clinkLow,   // a rocket part is removed
  liftoff,             // the Launch button is pressed
  select,              // a launch site or orbit is picked
  confirm,             // next step in the orbit launch
  cancel,              // back one step in the orbit launch
  error,               // a buy is refused: not enough money
  explosion,           // the rocket crashes
  missionComplete,     // the satellite reaches its orbit
  lose,                // the launch misses the orbit
};
