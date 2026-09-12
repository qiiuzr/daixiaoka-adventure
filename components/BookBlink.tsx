'use client';
import { useState } from 'react';

// Only the two eye regions of the generated closed-eye endpoint are composited.
// The underlying held video supplies every other pixel of the page and character.
export function BookBlink() {
  const [ready, setReady] = useState(false);
  return <img src="/book-blink-closed.png" alt="" aria-hidden="true"
    className={`book-blink ${ready ? 'is-ready' : ''}`}
    onLoad={() => setReady(true)} onError={() => setReady(false)} draggable={false} />;
}
