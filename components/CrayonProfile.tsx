'use client';
import { useState, type CSSProperties } from 'react';
import { assetPath } from '@/lib/asset-path';

const lines = ['名字：呆小咖', '物种：软萌奶黄色考拉', '性格标签', '慵懒佛系、慢半拍、放空发呆', '不爱凑热闹，安静治愈', '外表丧丧懒懒，', '内心温柔软乎乎。'];
const boundaries = [0, 20, 34, 47, 61, 74, 86, 100];

export function CrayonProfile() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className={`crayon-body ${ready ? 'is-loaded' : ''}`}>
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs><filter id="crayon-transparent-ink" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        {/* Preserve the drawn grain as opacity; white becomes transparent, not blended white. */}
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.333333 -.333333 -.333333 0 1" />
        <feComponentTransfer><feFuncA type="linear" slope="1.04" intercept="-.04" /></feComponentTransfer>
      </filter></defs>
    </svg>
    <div className={failed ? 'crayon-body-fallback' : 'sr-only'}>{lines.map(line => <p key={line}>{line}</p>)}</div>
    {!failed && lines.map((line, i) => <img key={line} src={assetPath('/book-crayon-body.png')} alt="" aria-hidden="true"
      draggable={false} onLoad={() => setReady(true)} onError={() => setFailed(true)}
      style={{ clipPath: `inset(${boundaries[i]}% 0 ${100 - boundaries[i + 1]}% 0)`, '--line': i + 1 } as CSSProperties} />)}
  </div>;
}
