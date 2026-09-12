import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMusicController } from './background-music.ts';

function fakeAudio() {
  return { paused: true, currentTime: 5, error: null, calls: 0,
    async play() { this.calls++; this.paused = false; },
    pause() { this.paused = true; },
  };
}

test('soundtrack loops independently and subsequent clicks do not restart it', async () => {
  const audio = fakeAudio();
  const states = [];
  const music = createMusicController(audio, (state) => states.push(state));
  await music.start();
  for (let scene = 0; scene < 10; scene++) await music.onGesture();
  assert.equal(audio.calls, 1);
  assert.equal(audio.currentTime, 5);
  assert.equal(audio.loop, true);
  assert.equal(audio.paused, false);
  assert.equal(states.at(-1), 'playing');
  music.dispose();
});

test('browser autoplay denial is retried on the first user gesture', async () => {
  const audio = fakeAudio();
  const originalPlay = audio.play;
  audio.play = async () => { throw new DOMException('Gesture required', 'NotAllowedError'); };
  let state;
  const music = createMusicController(audio, (value) => { state = value; });
  await music.start();
  assert.equal(state, 'blocked');
  audio.play = originalPlay;
  await music.onGesture();
  assert.equal(state, 'playing');
  music.dispose();
});

test('user mute survives all scene clicks and can be explicitly resumed', async () => {
  const audio = fakeAudio();
  const music = createMusicController(audio, () => {});
  await music.start();
  music.toggle();
  for (let scene = 0; scene < 10; scene++) await music.onGesture();
  assert.equal(audio.paused, true);
  assert.equal(audio.calls, 1);
  await music.toggle();
  assert.equal(audio.paused, false);
  assert.equal(audio.currentTime, 5);
  music.dispose();
});

test('cleanup ignores late playback results', async () => {
  const audio = fakeAudio();
  let resolve;
  audio.play = () => new Promise((done) => { resolve = done; });
  const states = [];
  const music = createMusicController(audio, (state) => states.push(state));
  const pending = music.start();
  music.dispose();
  resolve();
  await pending;
  assert.equal(states.includes('playing'), false);
  assert.equal(audio.paused, true);
});
