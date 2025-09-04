const sounds = {
  success: new Audio('https://actions.google.com/sounds/v1/positive/success.ogg'),
  error: new Audio('https://actions.google.com/sounds/v1/alarms/disallowed_action.ogg'),
  levelUp: new Audio('https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg'),
  badge: new Audio('https://actions.google.com/sounds/v1/achievements/achievement_unlocked.ogg'),
  click: new Audio('https://actions.google.com/sounds/v1/ui/ui_tap_forward.ogg'),
  duelStart: new Audio('https://actions.google.com/sounds/v1/weapons/sword_clank.ogg')
};

const playSound = (sound: HTMLAudioElement) => {
  // Reset playback to the start and play the sound
  // sound.currentTime = 0;
  // sound.play().catch(error => console.error(`Error playing sound: ${sound.src}`, error));
};

export const playSuccessSound = () => playSound(sounds.success);
export const playErrorSound = () => playSound(sounds.error);
export const playLevelUpSound = () => playSound(sounds.levelUp);
export const playBadgeSound = () => playSound(sounds.badge);
export const playClickSound = () => playSound(sounds.click);
export const playDuelStartSound = () => playSound(sounds.duelStart);