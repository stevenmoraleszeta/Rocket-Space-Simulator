// Every looping track the game uses. Change which file plays where from here.
import calm from '../assets/audio/music/calm.wav';
import soft from '../assets/audio/music/soft.wav';
import intense from '../assets/audio/music/intense.wav';
import spaceAmbience from '../assets/audio/space/space_ambience_loop.wav';
import clinkLow from '../assets/audio/equipment/clink_low.wav';
import armorEquip from '../assets/audio/equipment/armor_equip.wav';
import liftoff from '../assets/audio/rockets/liftoff.wav';

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
};
