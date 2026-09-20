export type GameState = 'READY' | 'PLAYING' | 'WAVE_BREAK' | 'PAUSED' | 'RELOADING' | 'GAME_OVER';
export type BirdState = 'PERCHED' | 'ALERT' | 'FLYING' | 'HIT' | 'FALLING' | 'REMOVED';
export type GunState = 'IDLE' | 'FIRE' | 'RECOIL' | 'RELOAD';

export interface Bird {
  id: number;
  species: 'green' | 'blue';
  state: BirdState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: 1 | -1;
  phase: number;
  born: number;
  stateAt: number;
  blinkUntil: number;
  nextBlink: number;
  rotation: number;
}
