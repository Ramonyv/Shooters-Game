export type SoundName = 'gunshot' | 'reload' | 'birdAlert' | 'wingFlap' | 'hit' | 'featherBurst' | 'uiClick';

type SoundConfig = {
  files: string[];
  volume: number;
};

const root = '/assets/Audio/';
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
};

class AudioManager {
  private sounds = new Map<SoundName, HTMLAudioElement[]>();
  private lastVariant = new Map<SoundName, number>();

  constructor() {
    for (const [name, config] of Object.entries(library) as [SoundName, SoundConfig][]) {
      this.sounds.set(name, config.files.map(file => {
        const sound = new Audio(file);
        sound.preload = 'auto';
        sound.volume = config.volume;
        return sound;
      }));
    }
  }

  play(name: SoundName) {
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
    void sound.play().catch(() => {
      // Browsers may reject playback before the first user gesture.
    });
  }
}

export const audio = new AudioManager();
