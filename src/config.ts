export const GAME = {
  width: 1920,
  height: 1080,
  magazine: 10,
  reloadMs: 1200,
  shotScore: 100,
  initialHealth: 3,
  spawnEveryMs: 3000,
  maxBirds: 3,
  waveGoal: 5,
  waveGoalStep: 2,
  waveBreakMs: 1400,
  flapMs: 120,
  impactMs: 110,
  alertMs: 450,
  birdSpeedMin: 170,
  birdSpeedMax: 250,
  hitboxX: 0.32,
  hitboxY: 0.36,
} as const;

export const DEBUG = import.meta.env.DEV && new URLSearchParams(location.search).has('debug');
