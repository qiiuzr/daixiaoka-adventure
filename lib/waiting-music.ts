// Original 16-bar phrase, 84 BPM: soft felt-key harmonics, playful quiet plucks.
// Synthesized locally; no video soundtrack samples or external music service.
export const WAITING_CHORDS = [
  [48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 57],
  [48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59],
] as const;
export const WAITING_MELODY = [
  [76, 74, 71], [72, 71, 67], [69, 72, 76], [74, 71, 69],
  [67, 71, 74], [72, 76, 71], [69, 67, 64], [67, 69, 71],
] as const;
export const WAITING_BAR_SECONDS = 8 * 60 / 84;

export function createWaitingMusic() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0; master.connect(context.destination);
  const keys = context.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, .24, .13, .05, .018]));
  let audible = false;
  let disposed = false;
  let next = 0;
  let phrase = 0;
  const voices = new Set<OscillatorNode>();
  function note(midi: number, start: number, duration: number, level: number, soft: boolean) {
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    if (!soft) oscillator.setPeriodicWave(keys);
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + (soft ? .7 : .018));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(master);
    oscillator.start(start); oscillator.stop(start + duration + .02);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  }
  function schedule() {
    if (disposed || context.state !== 'running' || !audible) return;
    if (next < context.currentTime) next = context.currentTime + .04;
    if (next > context.currentTime + .2) return;
    const index = phrase++ % WAITING_CHORDS.length;
    WAITING_CHORDS[index].forEach((pitch, i) => note(pitch, next + i * .08, 5.9, .016, true));
    [0, 2, 1, 3].forEach((step, i) => {
      note(WAITING_CHORDS[index][step] + 12, next + .12 + i * 1.43, 1.25, .019, false);
    });
    WAITING_MELODY[index].forEach((pitch, i) => {
      const start = next + .65 + [0, 1.55, 3.05][i];
      note(pitch, start, 2.1, .044, false);
      note(pitch + 12, start + .025, .9, .003, false);
    });
    next += WAITING_BAR_SECONDS;
  }
  const timer = window.setInterval(schedule, 100);
  return {
    async unlock() { if (!disposed) { await context.resume(); if (!disposed) schedule(); } },
    setAudible(value: boolean) {
      if (disposed || value === audible) return;
      audible = value;
      const now = context.currentTime;
      master.gain.cancelAndHoldAtTime(now);
      master.gain.linearRampToValueAtTime(value ? .65 : 0, now + (value ? .9 : .12));
      if (value) { next = now + .04; schedule(); }
      else voices.forEach((voice) => voice.stop(now + .13));
    },
    dispose() { disposed = true; window.clearInterval(timer); void context.close(); },
  };
}
