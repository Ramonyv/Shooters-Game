type BirdSoundName = 'gunshot' | 'reload' | 'birdAlert' | 'wingFlap' | 'hit' | 'featherBurst' | 'uiClick';
type TempleSoundName = 'flowerLaunch' | 'flowerImpact' | 'templeBell' | 'mouseSurprised' | 'modakPickup' | 'flowerReload';
export type SoundName = BirdSoundName | TempleSoundName;
type LoopName = 'templeAmbience' | 'mouseScurry';

type SoundConfig = {
  files: string[];
  volume: number;
};

const root = '/assets/Audio/Bird%20Shoot/';
const templeRoot = '/assets/Audio/Ganesha%20Music/';
const templeGame = `${templeRoot}game/`;
const numbered = (name: string, count = 4) =>
  Array.from({ length: count }, (_, index) => `${root}${name}%20${index + 1}.wav`);

const library: Record<SoundName, SoundConfig> = {
  gunshot: { files: numbered('gunshot'), volume: .46 },
  reload: { files: numbered('reload'), volume: .34 },
  birdAlert: { files: numbered('Bird%20alert'), volume: .3 },
  wingFlap: {
    // Variant 3 is currently an invalid 243-byte file, so it is intentionally excluded.
    files: [`${root}Wing%20flap%201.wav`, `${root}Wing%20flap%202.wav`, `${root}Wing%20flap%204.wav`],
    volume: .16,
  },
  hit: { files: numbered('Hit'), volume: .4 },
  featherBurst: { files: numbered('Feather%20burst'), volume: .28 },
  uiClick: { files: numbered('UI%20click'), volume: .22 },
  flowerLaunch: { files: [1,2,3,4].map(i => `${templeGame}flower_launch_0${i}.wav`), volume: .36 },
  flowerImpact: { files: [`${templeGame}flower_impact.wav`], volume: .3 },
  templeBell: { files: [`${templeGame}temple_bell.wav`], volume: .42 },
  mouseSurprised: { files: [`${templeGame}mouse_surprised.wav`], volume: .38 },
  modakPickup: { files: [`${templeGame}modak_pickup.wav`], volume: .3 },
  flowerReload: { files: [`${templeRoot}flower_reload.wav`], volume: .36 },
};

const loopLibrary: Record<LoopName, SoundConfig> = {
  templeAmbience: { files: [`${templeRoot}temple_ambience_loop%202%20.wav`], volume: .3 },
  mouseScurry: { files: [`${templeRoot}mouse_scurry_loop.wav`], volume: .65 },
};

class AudioManager {
  private sounds = new Map<SoundName, HTMLAudioElement[]>();
  private lastVariant = new Map<SoundName, number>();
  private loops = new Map<LoopName, HTMLAudioElement>();
  private activeLoops = new Set<LoopName>();
  private activeTempleSounds = new Set<HTMLAudioElement>();
  private templePaused = false;

  constructor() {
    for (const [name, config] of Object.entries(library) as [SoundName, SoundConfig][]) {
      this.sounds.set(name, config.files.map(file => {
        const sound = new Audio(file);
        sound.preload = 'auto';
        sound.volume = config.volume;
        return sound;
      }));
    }
    for (const [name, config] of Object.entries(loopLibrary) as [LoopName, SoundConfig][]) {
      const sound = new Audio(config.files[0]);
      sound.preload = 'auto'; sound.loop = true; sound.volume = config.volume;
      this.loops.set(name, sound);
    }
  }

  play(name: SoundName) {
    if (this.templePaused && this.isTempleSound(name)) return;
    const variants = this.sounds.get(name);
    if (!variants?.length) return;

    const previous = this.lastVariant.get(name) ?? -1;
    let index = Math.floor(Math.random() * variants.length);
    if (variants.length > 1 && index === previous) index = (index + 1) % variants.length;
    this.lastVariant.set(name, index);

    const source = variants[index];
    const sound = source.paused || source.ended ? source : source.cloneNode(true) as HTMLAudioElement;
    sound.volume = library[name].volume;
    sound.currentTime = 0;
    if (this.isTempleSound(name)) {
      this.activeTempleSounds.add(sound);
      sound.addEventListener('ended', () => this.activeTempleSounds.delete(sound), {once:true});
    }
    void sound.play().catch(() => {
      // Browsers may reject playback before the first user gesture.
    });
  }

  private isTempleSound(name: SoundName): name is TempleSoundName {
    return ['flowerLaunch','flowerImpact','templeBell','mouseSurprised','modakPickup','flowerReload'].includes(name);
  }

  startLoop(name: LoopName) {
    this.activeLoops.add(name);
    const sound = this.loops.get(name);
    if (!this.templePaused && sound?.paused) void sound.play().catch(() => {
      // Retry on the next player gesture when autoplay is blocked.
    });
  }

  stopLoop(name: LoopName) {
    if (!this.activeLoops.has(name)) return;
    this.activeLoops.delete(name);
    const sound = this.loops.get(name);
    if (sound) { sound.pause(); sound.currentTime = 0; }
  }

  setTemplePaused(paused: boolean) {
    this.templePaused = paused;
    for (const name of this.activeLoops) {
      const sound = this.loops.get(name);
      if (paused) sound?.pause();
      else void sound?.play().catch(() => {});
    }
    for (const sound of this.activeTempleSounds) {
      if (paused) sound.pause();
      else void sound.play().catch(() => {});
    }
  }

  stopTemple() {
    this.stopLoop('templeAmbience');
    this.stopLoop('mouseScurry');
    for (const sound of this.activeTempleSounds) { sound.pause(); sound.currentTime = 0; }
    this.activeTempleSounds.clear();
    this.templePaused = false;
  }
}

export const audio = new AudioManager();
