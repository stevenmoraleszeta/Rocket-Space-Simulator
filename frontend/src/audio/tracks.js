// Every looping track the game uses. Change which file plays where from here.
import calm from '../assets/audio/music/calm.wav';
import soft from '../assets/audio/music/soft.wav';
import intense from '../assets/audio/music/intense.wav';
import spaceAmbience from '../assets/audio/space/space_ambience_loop.wav';

export const MUSIC = {
  menu: calm,       // mission select
  assemble: soft,   // fitting the rocket on the launch pad
  flight: intense,  // rocket in flight
};

export const AMBIENCE = {
  space: spaceAmbience,
};
