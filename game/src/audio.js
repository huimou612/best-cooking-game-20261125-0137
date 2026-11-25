// Sound effects, all synthesised with WebAudio: no audio files, nothing to
// load. The context is created on the first user gesture, so it never blocks
// the page from loading.

// One short tone: an oscillator that slides from `from` to `to` hertz.
function tone(context, from, to, seconds, kind, gain) {
  const osc = context.createOscillator();
  const amp = context.createGain();
  const now = context.currentTime;
  osc.type = kind;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), now + seconds);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  osc.connect(amp);
  amp.connect(context.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function play(fn) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null) return;
    fn(ctx);
  }

  return {
    // Call on any pointer or key press so the context is ready before it is needed.
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    chop() {
      play((ctx) => tone(ctx, 900, 300, 0.07, 'square', 0.08));
    },
    sizzle() {
      play((ctx) => {
        tone(ctx, 220, 180, 0.12, 'sawtooth', 0.05);
        tone(ctx, 440, 330, 0.1, 'triangle', 0.05);
      });
    },
    ding() {
      play((ctx) => {
        tone(ctx, 880, 880, 0.18, 'sine', 0.12);
        tone(ctx, 1320, 1320, 0.22, 'sine', 0.07);
      });
    },
    serve() {
      play((ctx) => {
        tone(ctx, 523, 523, 0.1, 'triangle', 0.12);
        setTimeout(() => tone(ctx, 659, 659, 0.1, 'triangle', 0.12), 90);
        setTimeout(() => tone(ctx, 784, 784, 0.16, 'triangle', 0.12), 180);
      });
    },
    error() {
      play((ctx) => tone(ctx, 200, 120, 0.18, 'square', 0.09));
    },
    day() {
      play((ctx) => {
        tone(ctx, 392, 392, 0.12, 'triangle', 0.12);
        setTimeout(() => tone(ctx, 523, 523, 0.12, 'triangle', 0.12), 110);
        setTimeout(() => tone(ctx, 659, 659, 0.2, 'triangle', 0.12), 220);
      });
    },
  };
}
