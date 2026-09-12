import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOK_CLIP, BOOK_PAGE, bookSceneLayout, holdVideoFrame, isBookTap, resumeBookClosing } from './book-scene.ts';
import { positionHotspot, positionInteractionLabel, SCENE_HOTSPOTS } from './scene-hotspots.ts';

class FakeVideo extends EventTarget {
  currentTime = 0;
  paused = false;
  frames = new Map();
  nextFrame = 0;
  error = null;
  async play() { this.paused = false; }
  pause() { this.paused = true; }
  requestVideoFrameCallback(callback) {
    const id = ++this.nextFrame;
    this.frames.set(id, callback);
    return id;
  }
  cancelVideoFrameCallback(id) { this.frames.delete(id); }
  frame(mediaTime) {
    this.currentTime = mediaTime;
    const callbacks = [...this.frames.values()];
    this.frames.clear();
    callbacks.forEach((callback) => callback(0, { mediaTime }));
  }
}

test('video and page retain one source aspect ratio at desktop, ultrawide and portrait sizes', () => {
  for (const [width, height] of [[1920,1080], [1280,720], [1440,900], [2560,1080], [390,844], [320,568], [768,1024]]) {
    const layout = bookSceneLayout({ width, height });
    assert.ok(Math.abs(layout.width / layout.height - BOOK_CLIP.width / BOOK_CLIP.height) < 1e-9);
    assert.ok(Math.abs(layout.centered - (layout.width - width) / 2) < 1e-9);
    assert.ok(layout.readingOffset >= 0 && layout.readingOffset <= layout.width - width + 1e-9);
    const textLeft = layout.width * BOOK_PAGE.left - layout.readingOffset;
    const textRight = textLeft + layout.width * BOOK_PAGE.width;
    const textTop = layout.top + layout.height * BOOK_PAGE.top;
    const textBottom = textTop + layout.height * BOOK_PAGE.height;
    assert.ok(textLeft >= 0 && textRight <= width, `page width at ${width}x${height}`);
    assert.ok(textTop >= 0 && textBottom <= height, `page height at ${width}x${height}`);
  }
});

test('closing resumes from the held frame and opening can be repeated', async () => {
  const video = new FakeVideo();
  let reveals = 0;
  for (let visit = 0; visit < 2; visit++) {
    video.currentTime = 0;
    const cleanup = holdVideoFrame(video, BOOK_CLIP.holdTime, () => reveals++);
    video.frame(2.8);
    assert.equal(video.paused, true);
    cleanup();
    await resumeBookClosing(video);
    assert.equal(video.currentTime, 2.8, 'closing must not rewind, seek or substitute a still');
    assert.equal(video.paused, false);
    video.frame(4.5);
    video.dispatchEvent(new Event('timeupdate'));
    assert.equal(video.currentTime, 4.5, 'old hold listener must not stop the closing segment');
    video.frame(8);
    video.dispatchEvent(new Event('ended'));
    assert.equal(reveals, visit + 1);
    assert.equal(video.frames.size, 0);
  }
});

test('a rejected close playback is reported to the caller', async () => {
  const video = new FakeVideo();
  video.currentTime = 2.8;
  video.play = () => Promise.reject(new Error('playback unavailable'));
  await assert.rejects(resumeBookClosing(video), /playback unavailable/);
  assert.equal(video.currentTime, 2.8);
});

test('book taps are distinct from panning, scrolling and text selection', () => {
  assert.equal(isBookTap({ movement: 2, scrolled: false, textSelected: false }), true);
  assert.equal(isBookTap({ movement: 25, scrolled: false, textSelected: false }), false);
  assert.equal(isBookTap({ movement: 0, scrolled: true, textSelected: false }), false);
  assert.equal(isBookTap({ movement: 0, scrolled: false, textSelected: true }), false);
});

test('all interaction labels stay within the visible window, including the returned storefront', () => {
  for (const [width, height] of [[1920,1080], [1280,720], [1440,900], [2560,1080], [390,844]]) {
    const viewport = { width, height };
    for (const [key, source] of [['bell', BOOK_CLIP], ['bed', BOOK_CLIP], ['door', { width: 3840, height: 2160 }], ['door', BOOK_CLIP]]) {
      const hotspot = positionHotspot(viewport, source, SCENE_HOTSPOTS[key]);
      const hint = positionInteractionLabel(viewport, hotspot, key === 'door' ? 'above' : 'below');
      const center = hotspot.left - hotspot.width / 2 + hint.left;
      const top = hotspot.top + hint.top;
      assert.ok(center - hint.width / 2 >= 16 - 1e-9);
      assert.ok(center + hint.width / 2 <= width - 16 + 1e-9);
      assert.ok(top >= 16 && top + 48 <= height - 16);
    }
  }
});

test('plays continuously until the open-book frame and reveals text once', () => {
  const video = new FakeVideo();
  let reveals = 0;
  const cleanup = holdVideoFrame(video, BOOK_CLIP.holdTime, () => reveals++);
  for (let frame = 0; frame < 84; frame++) video.frame(frame / 30);
  assert.equal(reveals, 0);
  assert.equal(video.paused, false);
  video.frame(84 / 30);
  assert.equal(reveals, 1);
  assert.equal(video.paused, true);
  assert.equal(video.currentTime, 2.8);
  assert.equal(video.frames.size, 0);
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(reveals, 1);
  cleanup();
});

test('fallback browsers stop on the open book as well', () => {
  const video = new FakeVideo();
  video.requestVideoFrameCallback = undefined;
  let reveals = 0;
  const cleanup = holdVideoFrame(video, 2.8, () => reveals++);
  video.currentTime = 2.9;
  video.dispatchEvent(new Event('timeupdate'));
  assert.equal(video.paused, true);
  assert.equal(reveals, 1);
  cleanup();
});

test('background-tab or ended catch-up seeks to the open frame before revealing the profile', () => {
  for (const event of ['timeupdate', 'ended']) {
    const video = new FakeVideo();
    let reveals = 0;
    const cleanup = holdVideoFrame(video, 2.8, () => reveals++);
    video.currentTime = 7.8;
    video.dispatchEvent(new Event(event));
    assert.equal(video.paused, true);
    assert.equal(video.currentTime, 2.8);
    assert.equal(reveals, 0);
    assert.equal(video.frames.size, 0);
    video.dispatchEvent(new Event('seeked'));
    assert.equal(reveals, 1);
    cleanup();
  }
});

test('leaving the scene cancels callbacks, including an unfinished recovery seek', () => {
  for (const recovering of [false, true]) {
    const video = new FakeVideo();
    let reveals = 0;
    const cleanup = holdVideoFrame(video, 2.8, () => reveals++);
    if (recovering) {
      video.currentTime = 6;
      video.dispatchEvent(new Event('timeupdate'));
    }
    cleanup();
    video.frame(3);
    video.dispatchEvent(new Event('timeupdate'));
    video.dispatchEvent(new Event('seeked'));
    assert.equal(reveals, 0);
    assert.equal(video.frames.size, 0);
  }
});
