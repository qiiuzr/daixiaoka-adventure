export type MusicStatus = 'starting' | 'playing' | 'muted' | 'blocked' | 'error';

// Independent of scene/video state. Native looping never seeks when a scene changes.
export function createMusicController(audio: HTMLAudioElement, report: (status: MusicStatus) => void) {
  let enabled = true;
  let disposed = false;
  let request = 0;
  audio.loop = true;
  audio.volume = 0.35;

  async function start() {
    if (disposed || !enabled) return;
    const current = ++request;
    report('starting');
    try {
      if (audio.error) audio.load();
      await audio.play();
      if (!disposed && current === request) report('playing');
    } catch (error) {
      if (!disposed && current === request) {
        report(error instanceof Error && error.name === 'NotAllowedError' ? 'blocked' : 'error');
      }
    }
  }

  return {
    start,
    onGesture() { if (enabled && audio.paused) return start(); },
    toggle() {
      if (enabled && !audio.paused) {
        enabled = false;
        request++;
        audio.pause();
        report('muted');
      } else {
        enabled = true;
        return start();
      }
    },
    dispose() {
      disposed = true;
      request++;
      audio.pause();
    },
  };
}
