'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { createWaitingMusic } from '@/lib/waiting-music';

export function BackgroundMusic({ onPaper, waiting, muted, onToggle }: {
  onPaper: boolean; waiting: boolean; muted: boolean; onToggle: () => void;
}) {
  const engine = useRef<ReturnType<typeof createWaitingMusic> | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    try { engine.current = createWaitingMusic(); } catch { setUnavailable(true); }
    const unlock = (event: Event) => {
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
      void engine.current?.unlock().catch(() => setUnavailable(true));
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      engine.current?.dispose(); engine.current = null;
    };
  }, []);
  useEffect(() => { engine.current?.setAudible(waiting && !muted); }, [waiting, muted]);
  return (
    <button type="button" data-music-toggle className={`music-toggle ${onPaper ? 'on-paper' : ''}`}
      onClick={onToggle} aria-label={muted ? '开启声音' : '关闭声音'} aria-pressed={!muted}
      title={unavailable ? '等待音乐暂不可用，视频原声不受影响' : muted ? '开启声音' : '关闭声音'}>
      {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      <span>{muted ? '开启声音' : '关闭声音'}</span>
    </button>
  );
}
