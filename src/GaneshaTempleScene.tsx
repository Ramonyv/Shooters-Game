import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { audio } from './audio';
import './ganesha.css';

const A = '/assets/ganesha/';
const W = 1920, H = 1080;
const MAGAZINE = 10;
const RELOAD_SECONDS = 1.25;
type MousePhase = 'enter' | 'peek' | 'idle' | 'carry' | 'hit' | 'escape';
type MouseSide = 'left' | 'right';
type MouseKind = 'runner' | 'sneak' | 'thief';
type Mouse = { id: number; kind: MouseKind; phase: MousePhase; side: MouseSide; x: number; y: number; scale: number; phaseTime: number; idleWait: number; speed: number; hit: boolean };
type BellSide = 'left' | 'right';
type BellState = 'idle' | 'hit' | 'left' | 'right';
type LayoutMode = 'desktop' | 'compact' | 'square' | 'portrait' | 'short';
type Shot = { id: number; x: number; y: number; tx: number; ty: number; age: number; duration: number; target: 'mouse' | 'bell-left' | 'bell-right' | null; mouseId?: number };
type Burst = { id: number; x: number; y: number; age: number };
type BellReward = { id: number; x: number; y: number; age: number };
type BellSpark = { id: number; x: number; y: number; vx: number; vy: number; size: number; age: number; color: string };
type ShowerFlower = { id: number; x: number; y: number; vx: number; vy: number; size: number; rotation: number; spin: number; sway: number; color: string; delay: number; age: number };
const FLOWER_SHOWER_COLORS = [
  '#00a85d','#60c4ea','#b77cc3','#ff2c98','#ff4b42','#ff7c18','#f8bc00',
  '#075344','#10477f','#59278d','#b00060','#b71933','#79420d','#d98609',
  '#dafa70','#d7f6f8','#d8c2ff','#f5bafe','#ffc0a5','#ddd0a6','#fff36b',
];
type FlyingBird = { image: SVGImageElement; x: number; y: number; baseY: number; speed: number; direction: 1 | -1; phase: number; blue: boolean; wingDown: boolean };
const BIRD_WIDTH = 87, BIRD_HEIGHT = 92;
const SVG_NS = 'http://www.w3.org/2000/svg';
const mouseArt: Record<MousePhase,string> = { enter:'mouse_escape',peek:'mouse_escape',idle:'mouse_idle',carry:'mouse_carry',hit:'mouse_hit',escape:'mouse_escape' };
const mouseSize: Record<MousePhase,{width:number;height:number}> = {
  enter:{width:239,height:156},peek:{width:239,height:156},idle:{width:212,height:145},carry:{width:229,height:161},
  hit:{width:226,height:213},escape:{width:239,height:156},
};
const bellArt = { idle:'bell_idle', hit:'bell_hit', left:'bell_left', right:'bell_right' };
const bellAnchors: Record<BellSide, number> = { left: 618.62, right: 1164 };
const MOUSE_FUR = [
  [-112,-58,-100,25,'#656772'],[-75,-100,-35,20,'#797b86'],[-24,-112,-10,17,'#535660'],
  [42,-100,40,24,'#858792'],[105,-72,95,19,'#535660'],[130,-8,135,25,'#737580'],
  [92,64,185,18,'#858792'],[39,99,215,23,'#5b5e69'],[-28,93,258,18,'#777984'],
  [-105,62,290,24,'#535660'],[-132,9,320,17,'#858792'],[65,-26,70,15,'#ffa094'],
] as const;
const rand = (a:number,b:number) => a + Math.random() * (b-a);

export function GaneshaTempleScene({ onExit }: { onExit: () => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const crosshair = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [view, setView] = useState({mode:'desktop' as LayoutMode,left:0,right:W,top:0,bottom:H,width:W,lift:0});
  const viewRef = useRef(view);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [environment, setEnvironment] = useState('');
  const [foreground, setForeground] = useState('');
  const [footer, setFooter] = useState('');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [miceView, setMiceView] = useState<Mouse[]>([]);
  const [mouseSvgs, setMouseSvgs] = useState<Record<string,string>>({});
  const [bellView, setBellView] = useState<Record<BellSide, BellState>>({left:'idle',right:'idle'});
  const [weapon, setWeapon] = useState<'idle'|'fire'|'recoil'|'reload'>('idle');
  const [ammoCount, setAmmoCount] = useState(MAGAZINE);
  const [shotsView, setShotsView] = useState<Shot[]>([]);
  const [burstsView, setBurstsView] = useState<Burst[]>([]);
  const [showerView, setShowerView] = useState<ShowerFlower[]>([]);
  const [bellRewardsView, setBellRewardsView] = useState<BellReward[]>([]);
  const [bellSparksView, setBellSparksView] = useState<BellSpark[]>([]);
  const [ganeshaHappy, setGaneshaHappy] = useState(false);
  const mice = useRef<Mouse[]>([]);
  const mouseId = useRef(1);
  const lastMouseSide = useRef<MouseSide | null>(null);
  const nextMouseKind = useRef(0);
  const shots = useRef<Shot[]>([]);
  const bursts = useRef<Burst[]>([]);
  const shower = useRef<ShowerFlower[]>([]);
  const bellRewards = useRef<BellReward[]>([]);
  const bellSparks = useRef<BellSpark[]>([]);
  const bellClock = useRef<Record<BellSide, number>>({left:0,right:0});
  const ganeshaHappyClock = useRef(0);
  const nextMouse = useRef(.8);
  const nextBird = useRef(1.2);
  const birds = useRef<FlyingBird[]>([]);
  const birdLayer = useRef<SVGGElement | null>(null);
  const gameClock = useRef(0);
  const lastHit = useRef(-100);
  const seq = useRef(1);
  const weaponClock = useRef(0);
  const weaponState = useRef<'idle'|'fire'|'recoil'|'reload'>('idle');
  const ammo = useRef(MAGAZINE);
  const aim = useRef({x:960,y:660});
  const narrow = () => viewRef.current.mode==='portrait';
  const pauseScale = Math.max(.35, Math.min(view.mode === 'portrait' ? .76 : 1, (view.width-24)/795, (view.bottom-view.top-24)/950));

  useEffect(() => {
    fetch(`${A}environment.svg`).then(r=>r.text()).then(svg => {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const serializer = new XMLSerializer();
      for (const id of ['HUD / Ammo','HUD / Score',' HUD State = Pause / Resume','Target / TempleBell','Weapon / FlowerLauncher']) {
        doc.getElementById(id)?.remove();
      }
      const foregroundIds = new Set([
        'Foreground / Bushes / Left_2', 'Foreground / Bushes / Left_3',
        'Foreground / TempleWall / Left', 'Foreground / TempleWall / Right',
        'Foreground / Tree / Left', 'Foreground / Tree / Right',
      ]);
      const foregroundGroups = Array.from(doc.querySelectorAll('g[id]')).filter(group => foregroundIds.has(group.id)).map(group => {
        const markup = serializer.serializeToString(group);
        group.remove();
        return markup;
      });
      const footerArt = doc.getElementById('Rectangle 7');
      if (footerArt) {
        // The Figma footer starts on a fractional pixel; overlap its top edge
        // slightly so responsive SVG scaling cannot reveal a hairline seam.
        const footerY = Number(footerArt.getAttribute('y'));
        const footerHeight = Number(footerArt.getAttribute('height'));
        footerArt.setAttribute('y', String(footerY - 2));
        footerArt.setAttribute('height', String(footerHeight + 2));
        setFooter(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${serializer.serializeToString(footerArt)}</svg>`);
        footerArt.remove();
      }
      const defs = doc.querySelector('defs');
      const shrine = doc.getElementById('Shrine / Structure');
      if (shrine?.parentNode) {
        // Clouds are farther away than the flock; the shrine is in front of it.
        for (const id of ['Background / Cloud / Left','Background / Cloud / Right','Background / Cloud / Center']) {
          const cloud = doc.getElementById(id);
          if (cloud) shrine.parentNode.insertBefore(cloud, shrine);
        }
        const layer = doc.createElementNS(SVG_NS, 'g');
        layer.setAttribute('id', 'Temple / Flying Birds');
        layer.setAttribute('aria-hidden', 'true');
        shrine.parentNode.insertBefore(layer, shrine);
      }
      setForeground(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${defs ? serializer.serializeToString(defs) : ''}${foregroundGroups.join('')}</svg>`);
      setEnvironment(serializer.serializeToString(doc.documentElement));
    });
  }, []);

  useEffect(() => {
    birdLayer.current = scene.current?.querySelector<SVGGElement>('[id="Temple / Flying Birds"]') ?? null;
  }, [environment]);

  useEffect(() => {
    Promise.all(['mouse_idle','mouse_carry','mouse_hit','mouse_escape'].map(async name =>
      [name, await fetch(`${A}${name}.svg`).then(r=>r.text())] as const
    )).then(entries => setMouseSvgs(Object.fromEntries(entries)));
  }, []);

  useEffect(() => {
    audio.startLoop('templeAmbience');
    return () => audio.stopTemple();
  }, []);

  useEffect(() => {
    const resize = () => {
      const box = viewport.current?.getBoundingClientRect();
      if (!box) return;
      const nextScale=Math.max(box.width/W, box.height/H);
      const width=box.width/nextScale, height=box.height/nextScale;
      const left=(W-width)/2, top=(H-height)/2;
      const ratio=box.width/box.height;
      const mode:LayoutMode=ratio<.9?'portrait':ratio<1.25?'square':box.height<=520?'short':ratio<1.7?'compact':'desktop';
      const bottom=top+height;
      const lift=mode==='portrait'?140:mode==='square'?160:mode==='short'?H-bottom:0;
      const next={mode,left,right:left+width,top,bottom,width,lift};
      viewRef.current=next;
      setView(next);
      setScale(nextScale);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    audio.setTemplePaused(pausedRef.current);
    audio.play('uiClick');
  }, []);
  useEffect(() => {
    const key = (e:KeyboardEvent) => { if(e.key==='Escape') togglePause(); };
    window.addEventListener('keydown',key);
    return () => window.removeEventListener('keydown',key);
  }, [togglePause]);

  const point = (clientX:number,clientY:number) => {
    const r = scene.current!.getBoundingClientRect();
    return { x:Math.max(0,Math.min(W,(clientX-r.left)/scale)), y:Math.max(0,Math.min(H,(clientY-r.top)/scale)) };
  };
  const updateAim = (p:{x:number;y:number}) => {
    aim.current=p;
    if(crosshair.current){crosshair.current.style.left=`${p.x}px`;crosshair.current.style.top=`${p.y}px`;crosshair.current.style.opacity='1';}
  };
  const fire = (p:{x:number;y:number}) => {
    if(pausedRef.current || weaponState.current==='reload' || ammo.current===0)return;
    updateAim(p);
    ammo.current-=1;
    setAmmoCount(ammo.current);
    const targetMouse=[...mice.current].reverse().find(m =>
      !m.hit && m.phase!=='hit' &&
      Math.abs(p.x-(m.x+106))<125*m.scale &&
      Math.abs(p.y-(m.y+145-75*m.scale))<95*m.scale);
    const bellX = narrow() ? {left:740,right:1060} : bellAnchors;
    const bellSide = (Object.keys(bellX) as BellSide[]).find(side => p.x>bellX[side]-18 && p.x<bellX[side]+155 && p.y>78 && p.y<320);
    const target: Shot['target'] = targetMouse?'mouse':bellSide?`bell-${bellSide}`:null;
    const muzzleY=875-viewRef.current.lift;
    shots.current.push({id:seq.current++,x:960,y:muzzleY,tx:p.x,ty:p.y,age:0,duration:Math.max(.12,Math.min(.25,Math.hypot(p.x-960,p.y-muzzleY)/3600)),target,mouseId:targetMouse?.id});
    setShotsView([...shots.current]);
    weaponState.current='fire';setWeapon('fire');weaponClock.current=.1;
    audio.play('flowerLaunch');
  };

  useEffect(() => {
    let raf=0, last=performance.now();
    const tick=(now:number)=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;
      if(!pausedRef.current){
        gameClock.current+=dt;
        const layer = birdLayer.current;
        if (layer && gameClock.current >= nextBird.current && birds.current.length < (narrow()?2:3)) {
          const direction:1|-1 = Math.random()<.5?1:-1;
          const blue = Math.random()<.5;
          const image = document.createElementNS(SVG_NS, 'image');
          image.setAttribute('width', String(BIRD_WIDTH));
          image.setAttribute('height', String(BIRD_HEIGHT));
          image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          image.setAttribute('href', `/assets/${blue?'bird-blue-':'bird-'}wing-up.svg`);
          layer.appendChild(image);
          const visible = viewRef.current;
          // Keep the flight path in the upper sky. The roof itself then
          // occludes birds crossing the temple, without a visible cut line.
          const baseY = rand(65, 145);
          birds.current.push({image,x:direction===1?visible.left-BIRD_WIDTH-8:visible.right+8,
            y:baseY,baseY,speed:rand(115,175),direction,phase:rand(0,Math.PI*2),blue,wingDown:false});
          nextBird.current=gameClock.current+rand(2.2,3.8);
        }
        birds.current=birds.current.filter(bird=>{
          bird.x+=bird.speed*bird.direction*dt;
          bird.phase+=dt*5;
          bird.y=bird.baseY+Math.sin(bird.phase)*7;
          const down=Math.sin(bird.phase*4)<0;
          if(down!==bird.wingDown){
            bird.wingDown=down;
            bird.image.setAttribute('href', `/assets/${bird.blue?'bird-blue-':'bird-'}wing-${down?'down':'up'}.svg`);
          }
          bird.image.setAttribute('x', String(bird.x));
          bird.image.setAttribute('y', String(bird.y));
          if(bird.direction===-1) bird.image.setAttribute('transform', `translate(${2*bird.x+BIRD_WIDTH} 0) scale(-1 1)`);
          const visible=viewRef.current;
          const gone=bird.direction===1?bird.x>visible.right+8:bird.x<visible.left-BIRD_WIDTH-8;
          if(gone) bird.image.remove();
          return !gone;
        });
        if(mice.current.length<(narrow()?3:4) && gameClock.current>=nextMouse.current){
          const side:MouseSide = lastMouseSide.current
            ? (lastMouseSide.current==='left'?'right':'left')
            : (Math.random()<.5?'left':'right');
          const spawn=(from:MouseSide)=>{
            const kind=(['runner','sneak','thief'] as MouseKind[])[nextMouseKind.current++%3];
            const id=mouseId.current++;
            mice.current.push({id,kind,phase:'enter',side:from,
              x:from==='left'?(narrow()?610:-230):(narrow()?1260:W+80),
              y:rand(kind==='sneak'?660:643,kind==='sneak'?682:677),
              scale:[.72,1,1.14,.86][(id-1)%4],phaseTime:0,
              idleWait:kind==='sneak'?rand(.55,.9):rand(.7,1.2),
              speed:kind==='runner'?rand(210,260):kind==='sneak'?rand(78,105):rand(145,180),hit:false});
          };
          const pair=Math.random()<.27 && mice.current.length<=(narrow()?1:2);
          spawn(side);
          if(pair)spawn(side==='left'?'right':'left');
          lastMouseSide.current=pair?(side==='left'?'right':'left'):side;
          nextMouse.current=gameClock.current+rand(1.8,2.8);
        }
        mice.current=mice.current.filter(m=>{
          m.phaseTime+=dt;
          const direction=m.side==='left'?1:-1;
          const visible=viewRef.current;
          if(m.phase==='enter') {
            m.x+=direction*m.speed*dt;
            if(m.kind==='runner'){
              if(direction===1?m.x>visible.right+60:m.x<visible.left-250)return false;
            } else {
              const stop=m.kind==='sneak'
                ?(m.side==='left'?(narrow()?750:105):(narrow()?1040:W-340))
                :(m.side==='left'?(narrow()?785:585):(narrow()?1000:1140));
              if((direction===1&&m.x>=stop)||(direction===-1&&m.x<=stop)){
                m.x=stop;m.phase=m.kind==='sneak'?'peek':'idle';m.phaseTime=0;
              }
            }
          }
          else if(m.phase==='peek' && m.phaseTime>m.idleWait){m.phase='escape';m.phaseTime=0;}
          else if(m.phase==='idle' && m.phaseTime>m.idleWait){m.phase='carry';m.phaseTime=0;audio.play('modakPickup');}
          else if(m.phase==='carry'){
            m.x-=direction*m.speed*1.7*dt;
            const gone=m.side==='left'?m.x<visible.left-250:m.x>visible.right+80;
            if(gone)return false;
          }
          else if(m.phase==='hit' && m.phaseTime>.72){m.phase='escape';m.phaseTime=0;}
          else if(m.phase==='escape'){
            const exitDirection=m.hit?1:m.kind==='sneak'?-direction:direction;
            m.x+=exitDirection*m.speed*(m.hit?1.65:1.35)*dt;
            if(exitDirection===1?m.x>visible.right+60:m.x<visible.left-250)return false;
          }
          return true;
        });
        if(mice.current.some(m=>['enter','carry','escape'].includes(m.phase))) audio.startLoop('mouseScurry');
        else audio.stopLoop('mouseScurry');
        const finished:Shot[]=[];
        shots.current=shots.current.filter(s=>{s.age+=dt;if(s.age>=s.duration){finished.push(s);return false;}return true;});
        for(const s of finished){
          if(s.target!=='mouse')bursts.current.push({id:seq.current++,x:s.tx,y:s.ty,age:0});
          audio.play('flowerImpact');
          const hitMouse=s.mouseId===undefined?undefined:mice.current.find(m=>m.id===s.mouseId);
          if(s.target==='mouse' && hitMouse && !hitMouse.hit){
            hitMouse.phase='hit';hitMouse.phaseTime=0;hitMouse.hit=true;
            const chained=gameClock.current-lastHit.current<3;setCombo(chained?c=>c+1:1);setScore(v=>v+100*(chained?2:1));lastHit.current=gameClock.current;audio.play('mouseSurprised');
            const flowers = Array.from({length:36},(_,i):ShowerFlower=>({
              id:seq.current++,x:rand(820,1100),y:rand(305,365),vx:rand(-42,42),vy:rand(65,115),
              size:rand(17,31),rotation:rand(-180,180),spin:rand(-190,190),sway:rand(0,Math.PI*2),
              color:FLOWER_SHOWER_COLORS[i%FLOWER_SHOWER_COLORS.length],delay:rand(0,.5),age:0,
            }));
            shower.current.push(...flowers);
            if(shower.current.length>108) shower.current=shower.current.slice(-108);
          } else if(s.target?.startsWith('bell-')){
            const side = s.target.slice(5) as BellSide;
            bellClock.current[side]=1.35;
            setBellView(view=>({...view,[side]:'hit'}));
            setScore(v=>v+50);audio.play('templeBell');
            const bellX=narrow()?{left:740,right:1060}:bellAnchors;
            const x=bellX[side]+69;
            bellRewards.current.push({id:seq.current++,x,y:305,age:0});
            const count=Math.floor(rand(3,6));
            for(let i=0;i<count;i++)bellSparks.current.push({id:seq.current++,x:x+rand(-30,30),y:rand(225,275),
              vx:rand(-85,85),vy:rand(-145,-70),size:rand(12,21),age:0,
              color:FLOWER_SHOWER_COLORS[Math.floor(rand(0,7))]});
            ganeshaHappyClock.current=1.05;
            scene.current?.querySelector<SVGGElement>('[id="Left Hand"]')?.getAnimations().forEach(animation=>{
              animation.currentTime=0;
              animation.play();
            });
            setGaneshaHappy(true);
          }
        }
        setMiceView(mice.current.map(m=>({...m})));
        bursts.current=bursts.current.filter(b=>(b.age+=dt)<.45);
        setShotsView([...shots.current]);setBurstsView([...bursts.current]);
        if(shower.current.length){
          shower.current=shower.current.filter(f=>(f.age+=dt)<2.2);
          setShowerView([...shower.current]);
        }
        if(bellRewards.current.length){
          bellRewards.current=bellRewards.current.filter(r=>(r.age+=dt)<1.15);
          setBellRewardsView([...bellRewards.current]);
        }
        if(bellSparks.current.length){
          bellSparks.current=bellSparks.current.filter(spark=>(spark.age+=dt)<.9);
          setBellSparksView([...bellSparks.current]);
        }
        if(ganeshaHappyClock.current>0){
          ganeshaHappyClock.current=Math.max(0,ganeshaHappyClock.current-dt);
          if(ganeshaHappyClock.current===0)setGaneshaHappy(false);
        }
        for(const side of ['left','right'] as BellSide[]){
          if(bellClock.current[side]>0){
            bellClock.current[side]=Math.max(0,bellClock.current[side]-dt);
            const t=1.35-bellClock.current[side];
            const state:BellState=t<.12?'hit':bellClock.current[side]===0?'idle':Math.floor((t-.12)/.16)%2?'right':'left';
            setBellView(view=>view[side]===state?view:{...view,[side]:state});
          }
        }
        if(weaponClock.current>0){
          weaponClock.current-=dt;
          if(weaponClock.current<=0){
            if(weaponState.current==='fire'){
              weaponState.current='recoil';setWeapon('recoil');weaponClock.current=.18;
            } else if(weaponState.current==='recoil' && ammo.current===0){
              weaponState.current='reload';setWeapon('reload');weaponClock.current=RELOAD_SECONDS;audio.play('flowerReload');
            } else if(weaponState.current==='reload'){
              ammo.current=MAGAZINE;setAmmoCount(MAGAZINE);
              weaponState.current='idle';setWeapon('idle');weaponClock.current=0;
            } else {
              weaponState.current='idle';setWeapon('idle');weaponClock.current=0;
            }
          }
        }
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  }, []);

  return <main className="temple-viewport" ref={viewport}>
    <div className={`temple-scene layout-${view.mode} ${paused?'is-paused':''}`} ref={scene} style={{transform:`translate(-50%,-50%) scale(${scale})`,
      '--visible-left':`${view.left}px`,'--visible-right':`${view.right}px`,'--visible-top':`${view.top}px`,
      '--visible-bottom':`${view.bottom}px`,'--visible-width':`${view.width}px`,'--launcher-lift':`${view.lift}px`} as CSSProperties}
      onPointerDown={()=>audio.startLoop('templeAmbience')}
      onPointerMove={e=>{if(!pausedRef.current)updateAim(point(e.clientX,e.clientY));}}
      onPointerUp={e=>{if(!(e.target as HTMLElement).closest('button'))fire(point(e.clientX,e.clientY));}}>
      <div className={`temple-environment ${ganeshaHappy?'ganesha-happy':''}`} dangerouslySetInnerHTML={{__html:environment}}/>
      {miceView.map(m=><div key={m.id} className={`temple-mouse mouse-${m.phase} kind-${m.kind} from-${m.side} ${m.hit?'was-hit':''}`} style={{left:m.x-(mouseSize[m.phase].width-212)/2,top:m.y-(mouseSize[m.phase].height-145)}}>
        <div className="mouse-size" style={{transform:`scale(${m.scale})`}}>
          {mouseSvgs[mouseArt[m.phase]]
            ? <div className="mouse-art" dangerouslySetInnerHTML={{__html:mouseSvgs[mouseArt[m.phase]]}}/>
            : <img src={`${A}${mouseArt[m.phase]}.svg`} draggable={false} alt=""/>}
          {m.phase==='hit'&&<div className="mouse-impact" aria-hidden="true">
            {MOUSE_FUR.map(([dx,dy,turn,size,color],i)=><span key={i} className="mouse-impact-fur" style={{'--dx':`${dx}px`,'--dy':`${dy}px`,'--turn':`${turn}deg`,'--fur-size':`${size}px`,'--fur-color':color,'--delay':`${i%3*22}ms`} as CSSProperties}/>)}
          </div>}
        </div>
      </div>)}
      <div className="temple-foreground" dangerouslySetInnerHTML={{__html:foreground}}/>
      <div className="temple-footer" dangerouslySetInnerHTML={{__html:footer}}/>
      {(['left','right'] as BellSide[]).map(side=><div className={`temple-bell ${side} ${bellView[side]==='idle'?'':'ringing'}`} key={side}>
        <img className={`bell-${bellView[side]}`} src={`${A}${bellArt[bellView[side]]}.svg`} draggable={false} alt=""/>
      </div>)}
      {bellRewardsView.map(reward=><div key={reward.id} className="temple-bell-reward" style={{left:reward.x,top:reward.y-48*reward.age,opacity:1-reward.age/1.15}}>DING! +50</div>)}
      <div className="temple-bell-sparks" aria-hidden="true">{bellSparksView.map(spark=><span key={spark.id} className="bell-spark" style={{
        left:spark.x+spark.vx*spark.age,top:spark.y+spark.vy*spark.age+110*spark.age*spark.age,
        width:spark.size,height:spark.size,backgroundColor:spark.color,opacity:1-spark.age/.9,
        transform:`translate(-50%,-50%) rotate(${spark.age*240}deg)`,
      }}/>)}</div>
      {shotsView.map(s=>{const t=Math.min(1,s.age/s.duration);return <img key={s.id} className="temple-projectile" src={`${A}flower.svg`} style={{left:s.x+(s.tx-s.x)*t,top:s.y+(s.ty-s.y)*t}} alt=""/>;})}
      {burstsView.map(b=><img key={b.id} className="temple-burst" src={`${A}flower.svg`} style={{left:b.x,top:b.y,opacity:1-b.age/.45,transform:`translate(-50%,-50%) scale(${1+b.age*2})`}} alt=""/>)}
      <div className="temple-flower-shower" aria-hidden="true">{showerView.map(f=>{
        const t=Math.max(0,f.age-f.delay);
        return <span key={f.id} className="shower-flower" style={{
          left:f.x+f.vx*t+Math.sin(t*7+f.sway)*11,
          top:f.y+f.vy*t+55*t*t,
          width:f.size,height:f.size,
          backgroundColor:f.color,
          opacity:f.age<f.delay?0:Math.min(1,t*6)*Math.min(1,(2-t)/.7),
          transform:`translate(-50%,-50%) rotate(${f.rotation+f.spin*t}deg)`,
        }}/>;
      })}</div>
      <div className={`temple-launcher temple-${weapon}`}>
        {(['idle','fire','recoil','reload'] as const).map(state=><img key={state} className={`launcher-art launcher-${state}`} src={`${A}launcher_${state}.svg`} draggable={false} alt=""/>)}
      </div>
      <img className="temple-crosshair" src={`${A}crosshair.svg`} ref={crosshair} style={{left:960,top:660}} draggable={false} alt=""/>
      <div className="temple-score"><div><small>SCORE</small><strong>{score.toLocaleString()}</strong></div><i/><div><small>COMBO</small><strong className="temple-combo">X{combo}</strong></div><div className="temple-hearts">{[0,1,2].map(i=><img key={i} src={i<2?`${A}heart.svg`:'/assets/heart-empty.svg'} alt=""/>)}</div></div>
      <button className="temple-pause" onPointerUp={e=>e.stopPropagation()} onClick={togglePause} aria-label={paused?'Resume temple scene':'Pause temple scene'}><img src={`${A}pause.svg`} alt=""/></button>
      <div className="temple-ammo"><div className="temple-flowers">{Array.from({length:MAGAZINE},(_,i)=><img key={i} src={`${A}${i<ammoCount?'flower':'flower_empty'}.svg`} alt=""/>)}</div><div><small>AMMO</small><strong>{String(ammoCount).padStart(2,'0')}/10</strong></div></div>
      {paused&&<div className="temple-overlay" role="dialog" aria-modal="true" aria-label="Game paused" style={{left:view.left,top:view.top,width:view.width,height:view.bottom-view.top}}>
        <div className="temple-pause-art" style={{transform:`scale(${pauseScale})`}}>
          <img className="pause-rays" src={`${A}pause-rays.svg`} alt=""/>
          <img className="pause-leaves pause-leaves-left" src={`${A}pause-leaves-left.svg`} alt=""/>
          <img className="pause-leaves pause-leaves-right" src={`${A}pause-leaves-right.svg`} alt=""/>
          <img className="pause-ganesha" src={`${A}pause-ganesha.svg`} alt=""/>
          <img className="pause-card-layer pause-card-shadow" src={`${A}pause-card-shadow.svg`} alt=""/>
          <img className="pause-card-layer pause-card-border" src={`${A}pause-card-border.svg`} alt=""/>
          <img className="pause-card-layer pause-card-fill" src={`${A}pause-card.svg`} alt=""/>
          <img className="pause-mouse pause-mouse-left" src={`${A}pause-mouse.svg`} alt=""/>
          <img className="pause-mouse pause-mouse-right" src={`${A}pause-mouse.svg`} alt=""/>
          <div className="pause-content">
            <h1>PAUSED</h1>
            <p>Take a breath, enjoy the blessings <span aria-hidden="true">♥</span></p>
            <button className="pause-resume" onClick={togglePause}><img src={`${A}pause-button-flower.svg`} alt=""/>RESUME<img src={`${A}pause-button-flower.svg`} alt=""/></button>
            <button className="pause-exit" onClick={onExit}><img src="/assets/bird-wing-up.svg" alt=""/>BIRD SHOOTER<img src={`${A}pause-button-flower.svg`} alt=""/></button>
            <div className="pause-vibes">GOOD VIBES ALWAYS</div>
            <img className="pause-flourish pause-flourish-left" src={`${A}pause-flourish-left.svg`} alt=""/>
            <img className="pause-flourish pause-flourish-right" src={`${A}pause-flourish-right.svg`} alt=""/>
            <img className="pause-petals pause-petals-left" src={`${A}pause-petals-left.svg`} alt=""/>
            <img className="pause-petals pause-petals-right" src={`${A}pause-petals-right.svg`} alt=""/>
            <img className="pause-bottom-flower" src={`${A}pause-bottom-flower.svg`} alt=""/>
          </div>
        </div>
      </div>}
    </div>
  </main>;
}
