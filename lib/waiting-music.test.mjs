import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWaitingMusic, WAITING_CHORDS, WAITING_MELODY } from './waiting-music.ts';

test('new music only schedules while waiting, fades out and cleans up', async () => {
  let context, tick, cleared = false;
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime() {}, cancelAndHoldAtTime() {} });
  class Context {
    state = 'suspended'; currentTime = 0; destination = {}; voices = []; gains = [];
    constructor() { context = this; }
    createPeriodicWave() { return {}; }
    createGain() { const node = { gain: parameter(), connect() {}, disconnect() {} }; this.gains.push(node); return node; }
    createOscillator() { const voice = { frequency: parameter(), setPeriodicWave() {}, connect() {}, disconnect() {}, start(t) { this.startTime = t; }, stop(t) { this.stopTime = t; } }; this.voices.push(voice); return voice; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }
  const originalContext = globalThis.AudioContext, originalWindow = globalThis.window;
  globalThis.AudioContext = Context;
  globalThis.window = { setInterval(fn) { tick = fn; return 1; }, clearInterval() { cleared = true; } };
  try {
    const music = createWaitingMusic();
    music.setAudible(true);
    assert.equal(context.voices.length, 0, 'must wait for user gesture');
    await music.unlock();
    assert.equal(context.voices.length, 14);
    const count = context.voices.length;
    music.setAudible(false);
    assert.equal(context.gains[0].gain.value, 0);
    assert.ok(context.voices.every(v => v.stopTime === .13));
    context.currentTime = 100;
    tick(); await music.unlock();
    assert.equal(context.voices.length, count, 'video phases and clicks must not schedule music');
    music.setAudible(true);
    assert.equal(context.voices.length, count + 14);
    music.dispose(); tick();
    assert.equal(context.state, 'closed'); assert.equal(cleared, true);
    assert.equal(WAITING_CHORDS.length, WAITING_MELODY.length);
  } finally { globalThis.AudioContext = originalContext; globalThis.window = originalWindow; }
});
