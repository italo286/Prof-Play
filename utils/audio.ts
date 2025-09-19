import { Howl } from 'howler';

const sounds = {
  success: new Howl({ src: ['https://actions.google.com/sounds/v1/positive/success.mp3'] }),
  error: new Howl({ src: ['https://actions.google.com/sounds/v1/alarms/disallowed_action.mp3'] }),
  levelUp: new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/magic_chime.mp3'] }),
  badge: new Howl({ src: ['https://actions.google.com/sounds/v1/achievements/achievement_unlocked.mp3'] }),
  click: new Howl({ src: ['https://actions.google.com/sounds/v1/ui/ui_tap_forward.mp3'] }),
  duelStart: new Howl({ src: ['https://actions.google.com/sounds/v1/weapons/sword_clank.mp3'] })
};

const playSound = (sound: Howl) => {
  if (!sound.playing()) {
    sound.play();
  }
};

export const playSuccessSound = () => playSound(sounds.success);
export const playErrorSound = () => playSound(sounds.error);
export const playLevelUpSound = () => playSound(sounds.levelUp);
export const playBadgeSound = () => playSound(sounds.badge);
export const playClickSound = () => playSound(sounds.click);
export const playDuelStartSound = () => playSound(sounds.duelStart);