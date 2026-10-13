import { useEffect, useState } from 'react';
import { PresentationConfig } from '../../game/configuration/PresentationConfig';

/** Decorative count-up; assistive technology always receives the final, persisted score. */
export function ResultScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(score);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const started = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const progress = motion.matches ? 1 : Math.min(1, (now - started) / (PresentationConfig.Default.resultCountSeconds * 1000));
      setDisplay(Math.round(score * progress));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  return <><span aria-hidden="true">{display}</span><span className="sr-only">Final score: {score}</span></>;
}
