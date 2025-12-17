let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    // Safari uses webkitAudioContext
    // @ts-expect-error - webkit prefix
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    // Some browsers require a resume inside a user gesture
    // We attempt but ignore failures
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    audioCtx.resume?.().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Best-effort lightweight press feedback across platforms.
 * - Android/Chrome: uses Vibrate API
 * - iOS/Safari (no Vibrate): short audio click via WebAudio
 */
export function playPressFeedback(): void {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
      return;
    }
  } catch {
    // fall through to audio
  }
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const durationMs = 35;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 180; // subtle thud
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    // Quick attack and fast decay envelope
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.01);
  } catch {
    // ignore
  }
}


