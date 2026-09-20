import './bird-game-over.css';

const A = '/assets/bird-game-over/';

type Props = {
  score: number;
  wave: number;
  hits: number;
  accuracy: number;
  bestCombo: number;
  scale: number;
  onHome: () => void;
  onPlayAgain: () => void;
};

const stats = [
  { label: 'Score', icon: 'score.svg', x: 173 },
  { label: 'Wave', icon: 'wave.svg', x: 305 },
  { label: 'Hits', icon: 'hits.svg', x: 426 },
  { label: 'Accuracy', icon: 'accuracy-icon.svg', x: 557 },
  { label: 'Best Combo', icon: 'combo.svg', x: 702 },
] as const;

export function BirdShooterGameOverModal({ score, wave, hits, accuracy, bestCombo, scale, onHome, onPlayAgain }: Props) {
  const values = [score.toLocaleString(), String(wave), String(hits), `${accuracy}%`, String(bestCombo)];
  return <section className="bird-game-over-overlay" role="dialog" aria-modal="true" aria-label="Bird Shooter game over" onMouseDown={event=>event.stopPropagation()} onPointerDown={event=>event.stopPropagation()} onPointerUp={event=>event.stopPropagation()}>
    <div className="bird-game-over-art" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
      <div className="bird-game-over-card">
        <img className="bird-game-over-card-wave" src={`${A}card.svg`} alt="" draggable={false}/>
        <img className="bird-game-over-header" src={`${A}header.svg`} alt="" draggable={false}/>
        <div className="bird-game-over-stats">
          {stats.map((stat, i) => <div className="bird-game-over-stat" key={stat.label} style={{ left: stat.x - 85 }}>
            <img src={`${A}${stat.icon}`} alt="" draggable={false}/>
            <span>{stat.label}</span>
            <strong>{values[i]}</strong>
          </div>)}
          {[159,282,405,538].map(x => <img className="bird-game-over-divider" src={`${A}divider.svg`} style={{left:x}} key={x} alt="" draggable={false}/>)}
        </div>
        <button className="bird-game-over-button home" onClick={onHome} aria-label="Home"><img src={`${A}button-home.svg`} alt="" draggable={false}/></button>
        <button className="bird-game-over-button replay" onClick={onPlayAgain} aria-label="Play Again"><img src={`${A}button-replay.svg`} alt="" draggable={false}/></button>
        <img className="bird-game-over-leaves left" src={`${A}leaves-left.svg`} alt="" draggable={false}/>
        <img className="bird-game-over-leaves right" src={`${A}leaves-right.svg`} alt="" draggable={false}/>
        <button className="bird-game-over-close" onClick={onHome} aria-label="Close and return home"><img src={`${A}close.svg`} alt="" draggable={false}/></button>
      </div>
    </div>
  </section>;
}
