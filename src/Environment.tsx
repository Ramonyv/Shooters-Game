import { memo, useEffect, useState } from 'react';

const backgroundUrl = '/assets/lakeside-background.svg';

export const Environment = memo(function Environment() {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let active = true;
    fetch(backgroundUrl)
      .then(response => response.text())
      .then(markup => { if (active) setSvg(markup); });
    return () => { active = false; };
  }, []);

  return <div className="environment" aria-hidden="true">
    {svg
      ? <div className="scene-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      : <img className="lakeside-background" src={backgroundUrl} alt="" draggable={false}/>
    }
  </div>;
});
