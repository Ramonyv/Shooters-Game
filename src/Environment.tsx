import { memo, useEffect, useState } from 'react';

const backgroundUrl = '/assets/lakeside-background.svg';

export const Environment = memo(function Environment() {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let active = true;
    fetch(backgroundUrl)
      .then(response => response.text())
      .then(markup => { if (active) setSvg(markup.replace('<svg ', '<svg preserveAspectRatio="none" ')); });
    return () => { active = false; };
  }, []);

  return <div className="environment" aria-hidden="true">
    {svg
      ? <div className="scene-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      : <img className="lakeside-background" src={backgroundUrl} alt="" draggable={false}/>
    }
    <div className="mobile-scene">
      <img className="mobile-right-branch" src="/assets/mobile-right-branch.svg" alt=""/>
      <img className="mobile-right-trunk" src="/assets/mobile-right-trunk.svg" alt=""/>
      <div className="mobile-trunk-edge"/>
      <div className="mobile-canopy light canopy-one"/>
      <div className="mobile-canopy light canopy-two"/>
      <div className="mobile-canopy dark canopy-three"/>
      <div className="mobile-canopy dark canopy-four"/>
      <img className="mobile-village" src="/assets/env-village.svg" alt=""/>
      <div className="mobile-shore"/>
      <img className="mobile-lake" src="/assets/mobile-lake.svg" alt=""/>
      <img className="mobile-rock mobile-rock-left" src="/assets/mobile-rock-left.svg" alt=""/>
      <img className="mobile-rock mobile-rock-right" src="/assets/mobile-rock-right.svg" alt=""/>
      <div className="mobile-foreground"/>
    </div>
  </div>;
});
