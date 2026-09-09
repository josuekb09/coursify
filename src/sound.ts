// Web Audio API synthesized notification sound (WhatsApp/iOS style clean pop chime)
let audioCtx: AudioContext | null = null

export function playMessageChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    if (!audioCtx) {
      audioCtx = new AudioContextClass()
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume()
    }

    const now = audioCtx.currentTime

    // Note 1: gentle chime frequency (D5: 587.33Hz)
    const osc1 = audioCtx.createOscillator()
    const gain1 = audioCtx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
    osc1.connect(gain1)
    gain1.connect(audioCtx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    // Note 2: harmonious sparkling pop (A5: 880Hz)
    const osc2 = audioCtx.createOscillator()
    const gain2 = audioCtx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now + 0.08)
    gain2.gain.setValueAtTime(0.001, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(audioCtx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.48)
  } catch {
    /* Browser policy might require an initial user gesture before playing audio */
  }
}

/**
 * Ensures the Web Audio context is initialized and resumed on the user's first gesture
 * so incoming message chimes are never silenced by browser autoplay policies.
 */
export function initAudioUnlock() {
  if (typeof window === "undefined") return
  const unlock = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        if (!audioCtx) {
          audioCtx = new AudioContextClass()
        }
        if (audioCtx.state === "suspended") {
          void audioCtx.resume()
        }
      }
    } catch {
      /* ignore */
    }
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
  window.addEventListener("pointerdown", unlock, { once: true, passive: true })
  window.addEventListener("keydown", unlock, { once: true, passive: true })
}

// Automatically bind the unlock on module load in client environments
initAudioUnlock()
