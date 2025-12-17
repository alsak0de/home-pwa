let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    // @ts-expect-error - webkit prefix for Safari
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    audioCtx.resume?.().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

export function playPressFeedback(): void {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
      return;
    }
  } catch {
    // fall through
  }
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const durationMs = 35;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 180;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.01);
  } catch {
    // ignore
  }
}


