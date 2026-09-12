'use client';

import DepthText from './DepthText';
import type { CSSProperties } from 'react';

export function SceneDepthText({ lines, anchor }: { lines: string[]; anchor?: CSSProperties }) {
  return <div className={`bookstore-invitation scene-depth-invitation${anchor ? ' scene-depth-at-door' : ''}`}
    style={anchor ? { left: anchor.left, top: anchor.top } : undefined} aria-live="polite">
    {lines.map((text) => <p key={text}><DepthText
      text={text} layers={20} depth={2.4} faceColor="#f8fafc" depthColor="#EAB308"
      tilt={7.5} pointerTracking smoothing={0.14} perspective={900}
      autoOrbit orbitSpeed={0.35} fontSize="clamp(34px, 4vw, 72px)"
      fontWeight={900} shadow
    /></p>)}
  </div>;
}
