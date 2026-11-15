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
import countdownBeep from '../assets/audio/rockets/countdown_beep.wav';
import ignition from '../assets/audio/rockets/ignition.wav';
import rocketPass from '../assets/audio/rockets/rocket_pass.wav';
import place from '../assets/audio/ui/place.wav';
import gearUpgrade from '../assets/audio/equipment/gear_upgrade.wav';
import radioSignal from '../assets/audio/space/radio_signal.wav';
import satelliteBeep from '../assets/audio/space/satellite_beep.wav';
import scanner from '../assets/audio/space/scanner.wav';
import alarm from '../assets/audio/space/alarm.wav';
import asteroidShower from '../assets/audio/asteroids/asteroid_shower.wav';
import rockImpact from '../assets/audio/asteroids/rock_impact.wav';
import coinCollect from '../assets/audio/coins/coin_collect.wav';
import starCollect from '../assets/audio/stars/star_collect.wav';
import levelUp from '../assets/audio/win_lose/level_up.wav';
import unlock from '../assets/audio/win_lose/unlock.wav';
import aim from '../assets/audio/ui/aim.wav';
import coinsEarn from '../assets/audio/coins/coins_earn.wav';
import engineLoop from '../assets/audio/rockets/engine_loop.wav';
import landing from '../assets/audio/rockets/landing.wav';
import planetWind from '../assets/audio/space/planet_wind.wav';

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
  // Intro trailer (src/intro/TrailerReel.jsx)
  countdownBeep,       // 3, 2, 1
  ignition,            // the engines light
  rocketPass,          // the rear stage drops away
  place,               // cargo lands in the rocket
  gearUpgrade,         // the rocket is ready; a rank badge lands
  radioSignal,         // reaching orbit
  satelliteBeep,       // satellites going round
  scanner,             // coming down to the Moon
  alarm,               // rocks ahead on the way to Mars
  asteroidShower,      // the rocks fly by
  rockImpact,          // touchdown
  coinCollect,         // a planet pops in
  starCollect,         // the flag is planted
  levelUp,             // the player's name appears
  unlock,              // the finale opens
  aim,                 // the dotted path is dragged to its target
  coinsEarn,           // the budget fits again
  engineLoop,          // the lander fires its engine
  landing,             // the lander touches the Moon
  planetWind,          // wind on Mars at sunset
};
