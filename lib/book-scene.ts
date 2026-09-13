import type { SceneSize } from './scene-hotspots';
import { assetPath } from './asset-path';

export const BOOK_CLIP = {
  src: assetPath('/book-opening-final.mp4'),
  width: 3184,
  height: 1792,
  // Pause after the opening motion has settled, on the character's open-eye frame.
  holdTime: 3.18,
};

// The right page's flat, printable area, measured in the supplied open-book frame.
export const BOOK_PAGE = { left: 0.545, top: 0.260, width: 0.210, height: 0.404 };

export function isBookTap(gesture: { movement: number; scrolled: boolean; textSelected: boolean }) {
  return gesture.movement <= 8 && !gesture.scrolled && !gesture.textSelected;
}

// Resume from the held frame: the remaining source clip already closes the book
// and returns to the storefront. Never rewind or replace it with a still image.
export function resumeBookClosing(video: HTMLVideoElement) {
  if (video.error) {
    video.load();
    video.currentTime = BOOK_CLIP.holdTime;
  }
  return video.play();
}

export function bookSceneLayout(viewport: SceneSize, source: SceneSize = BOOK_CLIP) {
  const scale = Math.max(viewport.width / source.width, viewport.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  const centered = Math.max(0, (width - viewport.width) / 2);
  // Portrait readers can pan across the same full-size book, without shrinking its text.
  const pageCentered = width * (BOOK_PAGE.left + BOOK_PAGE.width / 2) - viewport.width / 2;
  return {
    width,
    height,
    top: (viewport.height - height) / 2,
    centered,
    readingOffset: viewport.width < viewport.height
      ? Math.max(0, Math.min(width - viewport.width, pageCentered))
      : centered,
  };
}

/** Freeze the actual playing video, never substitute a differently sized still image. */
export function holdVideoFrame(video: HTMLVideoElement, holdTime: number, onHold: () => void) {
  let frameId: number | null = null;
  let holding = false;
  let disposed = false;
  const hasFrameCallback = typeof video.requestVideoFrameCallback === 'function';

  function removeWatchers() {
    if (frameId !== null) video.cancelVideoFrameCallback(frameId);
    frameId = null;
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.removeEventListener('ended', onEnded);
  }

  function reveal() {
    video.removeEventListener('seeked', reveal);
    if (!disposed) onHold();
  }

  function hold(mediaTime: number) {
    if (disposed || holding || mediaTime < holdTime) return false;
    holding = true;
    removeWatchers();
    video.pause();
    if (mediaTime > holdTime + 0.2) {
      // Timers can be throttled in background tabs. Recover before the closing sequence.
      video.addEventListener('seeked', reveal, { once: true });
      video.currentTime = holdTime;
    } else {
      reveal();
    }
    return true;
  }

  function onFrame(_now: number, metadata: VideoFrameCallbackMetadata) {
    frameId = null;
    if (!hold(metadata.mediaTime) && !disposed && !holding) frameId = video.requestVideoFrameCallback(onFrame);
  }

  function onTimeUpdate() {
    if (!hasFrameCallback || video.currentTime > holdTime + 0.2) hold(video.currentTime);
  }

  function onEnded() { hold(video.currentTime); }

  video.addEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('ended', onEnded);
  if (!hold(video.currentTime) && hasFrameCallback) frameId = video.requestVideoFrameCallback(onFrame);
  return () => {
    disposed = true;
    removeWatchers();
    video.removeEventListener('seeked', reveal);
  };
}
