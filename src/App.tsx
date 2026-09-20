import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from './audio';
import { DEBUG, GAME } from './config';
import type { Bird, GameState, GunState } from './types';
import { Environment } from './Environment';
import { GaneshaTempleScene } from './GaneshaTempleScene';

const A = '/assets/';
const assets = {
  perchedOpen: `${A}bird-perched-open.svg`, perchedClosed: `${A}bird-perched-closed.svg`, alert: `${A}bird-alert.svg`,
  wingUp: `${A}bird-wing-up.svg`, wingDown: `${A}bird-wing-down.svg`, impact: `${A}bird-impact.svg`,
  falling: `${A}bird-falling.svg`, feathers: `${A}feathers.svg`, idle: `${A}gun-idle.svg`, fire: `${A}gun-fire.svg`,
  recoil: `${A}gun-recoil.svg`, reload: `${A}gun-reload.svg`, crosshair: `${A}crosshair.svg`, pause: `${A}pause.svg`,
  ammoAvailable: `${A}ammo-available.svg`, ammoUsed: `${A}ammo-used.svg`, heartFull: `${A}heart-full.svg`, heartEmpty: `${A}heart-empty.svg`,
  blue: {
    perchedOpen: `${A}bird-blue-perched-open.svg`, perchedClosed: `${A}bird-blue-perched-closed.svg`, alert: `${A}bird-blue-alert.svg`,
    wingUp: `${A}bird-blue-wing-up.svg`, wingDown: `${A}bird-blue-wing-down.svg`, impact: `${A}bird-blue-impact.svg`,
    falling: `${A}bird-blue-falling.svg`, feathers: `${A}feathers-blue.svg`,
  },
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeBird(id: number, now: number, perched = false, wave = 1): Bird {
  const mobilePerch = perched && window.matchMedia('(max-aspect-ratio: 10/13)').matches;
  const direction = perched ? (mobilePerch ? -1 : 1) : Math.random() > .5 ? 1 : -1;
  const species = wave >= 2 && Math.random() < Math.min(.55, .25 + (wave - 2) * .08) ? 'blue' : 'green';
  return {
    id, species, state: perched ? 'PERCHED' : 'FLYING', x: perched ? (mobilePerch ? 1209 : 160) : direction === 1 ? -190 : 1940,
    y: perched ? (mobilePerch ? 458 : 343) : rand(205, 575), vx: rand(GAME.birdSpeedMin, GAME.birdSpeedMax) * (1 + (wave - 1) * .12) * (species === 'blue' ? 1.25 : 1) * direction, vy: 0,
    direction, phase: rand(0, Math.PI * 2), born: now, stateAt: now, blinkUntil: 0,
    nextBlink: now + rand(1800, 4500), rotation: 0,
  };
}

function BirdShooter() {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [gun, setGun] = useState<GunState>('IDLE');
  const [birds, setBirds] = useState<Bird[]>([]);
  const [bursts, setBursts] = useState<{id:number;x:number;y:number;species:Bird['species']}[]>([]);
  const aim = useRef({ x: 960, y: 530 });
  const [ammo, setAmmo] = useState<number>(GAME.magazine);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [bestCombo, setBestCombo] = useState(1);
  const [health, setHealth] = useState<number>(GAME.initialHealth);
  const [wave, setWave] = useState(1);
  const [waveHits, setWaveHits] = useState(0);
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(0);
  const [popups, setPopups] = useState<{id:number;x:number;y:number;points:number}[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const crosshair = useRef<HTMLImageElement>(null);
  const birdId = useRef(1);
  const burstId = useRef(1);
  const popupId = useRef(1);
  const waveTimer = useRef<number | undefined>(undefined);
  const reloadDelayTimer = useRef<number | undefined>(undefined);
  const reloadTimer = useRef<number | undefined>(undefined);
  const resumeState = useRef<GameState>('PLAYING');
  const last = useRef(performance.now());
  const lastSpawn = useRef(performance.now());
  const drag = useRef(false);
  const live = useRef({ gameState, birds, ammo, combo, health, wave, waveHits });
  live.current = { gameState, birds, ammo, combo, health, wave, waveHits };

  const reset = useCallback(() => {
    const now = performance.now();
    window.clearTimeout(waveTimer.current);
    window.clearTimeout(reloadDelayTimer.current);
    window.clearTimeout(reloadTimer.current);
    resumeState.current = 'PLAYING';
    setScore(0); setCombo(1); setBestCombo(1); setHealth(3); setAmmo(10); setGun('IDLE'); setBursts([]);
    setWave(1); setWaveHits(0); setHits(0); setShots(0); setPopups([]);
    setBirds([makeBird(birdId.current++, now, true), makeBird(birdId.current++, now)]);
    last.current = now; lastSpawn.current = now; setGameState('PLAYING');
  }, []);

  const startGame = useCallback(() => {
    audio.play('uiClick');
    reset();
  }, [reset]);

  const togglePause = useCallback(() => {
    audio.play('uiClick');
    setGameState(s => {
      if (s === 'PAUSED') return resumeState.current;
      if (s === 'PLAYING' || s === 'RELOADING') { resumeState.current = s; return 'PAUSED'; }
      return s;
    });
  }, []);

  const toVirtual = useCallback((clientX: number, clientY: number) => {
    const r = stage.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(GAME.width, (clientX - r.left) / r.width * GAME.width)),
      y: Math.max(0, Math.min(GAME.height, (clientY - r.top) / r.height * GAME.height)),
    };
  }, []);

  const updateAim = useCallback((point: {x:number;y:number}) => {
    aim.current = point;
    if (crosshair.current) {
      crosshair.current.style.left = `${point.x / GAME.width * 100}%`;
      crosshair.current.style.top = `${point.y / GAME.height * 100}%`;
      crosshair.current.style.opacity = '1';
    }
  }, []);

  const moveAim = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING' && gameState !== 'RELOADING') return;
    updateAim(toVirtual(event.clientX, event.clientY));
  }, [gameState, toVirtual, updateAim]);

  const reload = useCallback(() => {
    const state = live.current.gameState;
    if (state !== 'PLAYING' && state !== 'PAUSED') return;
    if (state === 'PAUSED') resumeState.current = 'RELOADING';
    else setGameState('RELOADING');
    setGun('RELOAD'); audio.play('reload');
    reloadTimer.current = window.setTimeout(() => {
      if (live.current.gameState === 'GAME_OVER') return;
      setAmmo(GAME.magazine); setGun('IDLE');
      if (live.current.gameState === 'PAUSED') resumeState.current = 'PLAYING';
      setGameState(s => s === 'RELOADING' ? 'PLAYING' : s);
    }, GAME.reloadMs);
  }, []);

  const fire = useCallback((point?: {x:number;y:number}) => {
    const state = live.current;
    if (state.gameState !== 'PLAYING' || state.ammo <= 0) return;
    audio.play('gunshot'); setGun('FIRE');
    setShots(n => n + 1);
    window.setTimeout(() => setGun('RECOIL'), 70); window.setTimeout(() => setGun('IDLE'), 180);
    const nextAmmo = state.ammo - 1; setAmmo(nextAmmo);
    const shot = point ?? aim.current;
    const stageRect = stage.current?.getBoundingClientRect();
    const shotX = stageRect ? stageRect.left + shot.x / GAME.width * stageRect.width : 0;
    const shotY = stageRect ? stageRect.top + shot.y / GAME.height * stageRect.height : 0;
    const target = [...state.birds].reverse().find(b => {
      if (!['PERCHED','ALERT','FLYING'].includes(b.state)) return false;
      const birdRect = stage.current?.querySelector<HTMLElement>(`[data-bird-id="${b.id}"]`)?.getBoundingClientRect();
      if (!birdRect) return false;
      const cx = birdRect.left + birdRect.width / 2;
      const cy = birdRect.top + birdRect.height / 2;
      return ((shotX-cx)/(birdRect.width*.42))**2 + ((shotY-cy)/(birdRect.height*.42))**2 <= 1;
    });
    const waveCleared = Boolean(target && state.waveHits + 1 >= GAME.waveGoal + (state.wave - 1) * GAME.waveGoalStep);
    if (target) {
      const now = performance.now(); audio.play('hit'); audio.play('featherBurst');
      const points = GAME.shotScore * (target.species === 'blue' ? 2 : 1) * state.combo;
      const popup = {id:popupId.current++,x:shot.x,y:shot.y,points};
      setPopups(xs => [...xs,popup]);
      window.setTimeout(() => setPopups(xs => xs.filter(x => x.id !== popup.id)), 800);
      crosshair.current?.animate([{scale:'1'},{scale:'1.2'},{scale:'1'}],{duration:190});
      setBirds(bs => bs.map(b => b.id === target.id ? {...b,state:'HIT',stateAt:now,vx:b.vx*.28} : b));
      setBursts(xs => [...xs, { id: burstId.current++, x: target.x - 55, y: target.y + 15, species:target.species }]);
      window.setTimeout(() => setBursts(xs => xs.slice(1)), 650);
      setScore(s => s + points); setBestCombo(v => Math.max(v, state.combo)); setCombo(v => v + 1); setHits(n => n + 1);
      if (waveCleared) {
        setGameState('WAVE_BREAK');
        waveTimer.current = window.setTimeout(() => {
          if (live.current.gameState !== 'WAVE_BREAK') return;
          setWave(w => w + 1); setWaveHits(0); setBirds([]); setAmmo(GAME.magazine);
          lastSpawn.current = performance.now() - GAME.spawnEveryMs;
          setGameState('PLAYING');
        }, GAME.waveBreakMs);
      } else setWaveHits(n => n + 1);
    } else setCombo(1);
    if (nextAmmo === 0 && !waveCleared) reloadDelayTimer.current = window.setTimeout(reload, 200);
  }, [reload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') togglePause(); if (e.key === ' ' && gameState === 'READY') reset(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, reset, gameState]);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now-last.current;
      if (elapsed < 32) { raf=requestAnimationFrame(tick); return; }
      const dt = Math.min(.05, elapsed/1000); last.current = now;
      if (live.current.gameState === 'PLAYING' || live.current.gameState === 'RELOADING' || live.current.gameState === 'WAVE_BREAK') {
        setBirds(prev => prev.map((b): Bird => {
          if (b.state === 'PERCHED') {
            if (now > b.nextBlink && !b.blinkUntil) return {...b, blinkUntil:now+rand(100,180)};
            if (b.blinkUntil && now>b.blinkUntil) return {...b,blinkUntil:0,nextBlink:now+rand(1800,4500)};
            if (now-b.born>rand(4200,6500)) { audio.play('birdAlert'); return {...b,state:'ALERT',stateAt:now}; }
            return b;
          }
          if (b.state === 'ALERT' && now-b.stateAt>GAME.alertMs) {
            audio.play('wingFlap');
            return {...b,state:'FLYING',stateAt:now,vx:-rand(170,230)*(1+(live.current.wave-1)*.12)*(b.species==='blue'?1.25:1),direction:-1};
          }
          if (b.state === 'HIT' && now-b.stateAt>GAME.impactMs) return {...b,state:'FALLING',stateAt:now,vy:80};
          if (b.state === 'FALLING') return {...b,x:b.x+b.vx*dt,y:b.y+b.vy*dt,vy:b.vy+920*dt,rotation:b.rotation+150*dt,state:b.y>1100?'REMOVED':'FALLING'};
          if (b.state === 'FLYING' && live.current.gameState !== 'WAVE_BREAK') return {...b,x:b.x+b.vx*dt,y:b.y+Math.sin(now/420+b.phase)*35*dt};
          return b;
        }).filter(b => {
          const escaped=live.current.gameState!=='WAVE_BREAK'&&b.state==='FLYING'&&(b.x>2040||b.x<-250);
          if (escaped) setHealth(h => Math.max(0,h-1));
          return b.state!=='REMOVED'&&!escaped;
        }));
        const spawnInterval = Math.max(1350, GAME.spawnEveryMs - (live.current.wave - 1) * 230);
        const maxBirds = Math.min(5, GAME.maxBirds + Math.floor((live.current.wave - 1) / 2));
        if (live.current.gameState !== 'WAVE_BREAK' && now-lastSpawn.current>spawnInterval && live.current.birds.length<maxBirds) {
          lastSpawn.current=now;
          const perched = Math.random()<.32 && !live.current.birds.some(b => b.state === 'PERCHED' || b.state === 'ALERT');
          if (!perched) audio.play('wingFlap');
          setBirds(bs=>[...bs,makeBird(birdId.current++,now,perched,live.current.wave)]);
        }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick); return()=>cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(waveTimer.current);
    window.clearTimeout(reloadDelayTimer.current);
    window.clearTimeout(reloadTimer.current);
  }, []);

  useEffect(() => {
    if (health === 0 && gameState !== 'GAME_OVER') {
      if (document.pointerLockElement) document.exitPointerLock();
      setGameState('GAME_OVER');
    }
  }, [health, gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING' && gameState !== 'RELOADING' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [gameState]);

  const gunAsset = gun==='FIRE'?assets.fire:gun==='RECOIL'?assets.recoil:gun==='RELOAD'?assets.reload:assets.idle;
  const statusTitle = gameState==='READY'?'BIRD BLAST':gameState==='PAUSED'?'PAUSED':'GAME OVER';
  const statusCopy = gameState==='READY'?'Aim true. Make every shot count.':gameState==='PAUSED'?'The flock is holding still.':`Score ${score.toLocaleString()} · Wave ${wave} · ${hits} hits · ${shots ? Math.round(hits / shots * 100) : 0}% accuracy · Best combo x${bestCombo}`;
  const showOverlay = ['READY','PAUSED','GAME_OVER'].includes(gameState);
  const bullets = useMemo(()=>Array.from({length:GAME.magazine}),[]);

  return <main className="shell">
    <div className="game-stage" ref={stage}
      onMouseMove={moveAim}
      onMouseDown={e=>{if((e.target as HTMLElement).closest('button'))return;updateAim(toVirtual(e.clientX,e.clientY));fire(aim.current);}}
      onPointerDown={e=>{if(e.pointerType!=='mouse'){drag.current=true;updateAim(toVirtual(e.clientX,e.clientY));}}}
      onPointerMove={e=>{if(drag.current&&e.pointerType!=='mouse')updateAim(toVirtual(e.clientX,e.clientY));}}
      onPointerUp={e=>{if(drag.current&&e.pointerType!=='mouse'){const p=toVirtual(e.clientX,e.clientY);updateAim(p);drag.current=false;fire(p);}}}>
      <Environment/>
      <div className="hud-patch hud-score" aria-live="polite"><span>SCORE<b>{score.toLocaleString()}</b></span><img className="hud-divider" src={`${A}hud-divider.svg`}/><span>COMBO<b>X{combo}</b></span><div className="hearts">{[0,1,2].map(i=><img src={i<health?assets.heartFull:assets.heartEmpty} key={i}/>)}</div></div>
      <div className="wave-progress" aria-live="polite">WAVE {wave} <strong>{waveHits}/{GAME.waveGoal + (wave - 1) * GAME.waveGoalStep}</strong></div>
      <button className="pause" onClick={togglePause} aria-label={gameState==='PAUSED'?'Resume game':'Pause game'}><img src={assets.pause}/></button>
      <div className="ammo"><div className="rounds">{bullets.map((_,i)=><img src={i<ammo?assets.ammoAvailable:assets.ammoUsed} key={i}/>)}</div><span>AMMO<b>{String(ammo).padStart(2,'0')}/10</b></span></div>
      {birds.map(b=>{const flap=Math.floor(performance.now()/GAME.flapMs)%2; const birdAssets=b.species==='blue'?assets.blue:assets; const src=b.state==='PERCHED'?(b.blinkUntil?birdAssets.perchedClosed:birdAssets.perchedOpen):b.state==='ALERT'?birdAssets.alert:b.state==='HIT'?birdAssets.impact:b.state==='FALLING'?birdAssets.falling:flap?birdAssets.wingDown:birdAssets.wingUp;return <div className={`bird ${b.species} ${b.state.toLowerCase()}`} data-bird-id={b.id} key={b.id} style={{left:`${b.x / GAME.width * 100}%`,top:`${b.y / GAME.height * 100}%`,transform:`rotate(${b.rotation}deg) scaleX(${b.direction})`}}><img src={src} draggable={false}/>{DEBUG&&<span/>}</div>})}
      {bursts.map(x=><img className="burst" key={x.id} src={x.species==='blue'?assets.blue.feathers:assets.feathers} style={{left:`${x.x / GAME.width * 100}%`,top:`${x.y / GAME.height * 100}%`}} draggable={false}/>)}
      {popups.map(x=><div className="hit-popup" key={x.id} style={{left:`${x.x / GAME.width * 100}%`,top:`${x.y / GAME.height * 100}%`}}>+{x.points}</div>)}
      <div className={`gun gun-${gun.toLowerCase()}`}><img src={gunAsset} draggable={false}/></div>
      <img ref={crosshair} className="crosshair" src={assets.crosshair} draggable={false} style={{left:'50%',top:`${530 / GAME.height * 100}%`}}/>
      {DEBUG&&<output className="debug">{Math.round(aim.current.x)}, {Math.round(aim.current.y)} · {gameState} · {birds.length} birds</output>}
      {gameState==='WAVE_BREAK'&&<div className="wave-banner" role="status">WAVE {wave} CLEAR<span>WAVE {wave + 1} INCOMING</span></div>}
      {showOverlay&&<section className="overlay" aria-modal="true" role="dialog"><h1>{statusTitle}</h1><p>{statusCopy}</p><button onClick={gameState==='PAUSED'?togglePause:startGame}>{gameState==='PAUSED'?'RESUME':gameState==='GAME_OVER'?'PLAY AGAIN':'START GAME'}</button></section>}
    </div>
  </main>;
}

export function App() {
  const [mode, setMode] = useState<'birds'|'temple'>('temple');
  return <>{mode === 'temple' ? <GaneshaTempleScene onExit={() => setMode('birds')}/> : <BirdShooter/>}
    {mode === 'birds' && <button className="scene-switch" onClick={() => setMode('temple')}>GANESHA TEMPLE</button>}
  </>;
}
