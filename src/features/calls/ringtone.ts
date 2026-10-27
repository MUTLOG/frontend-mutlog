/**
 * Sonneries générées par le navigateur (aucun fichier audio à héberger) :
 * - « incoming » : sonnerie d'appel entrant (deux tons, répétée) + vibration sur mobile ;
 * - « outgoing » : tonalité d'attente côté appelant (ton unique plus doux).
 * Les navigateurs peuvent bloquer le son tant que la page n'a reçu aucun geste de l'utilisateur : sans effet alors, la vibration
 * et l'écran d'appel restent là.
 */
export type RingKind = 'incoming' | 'outgoing'

type AudioContextCtor = typeof AudioContext

export function startRingtone(kind: RingKind): () => void {
  if (typeof window === 'undefined') return () => undefined
  const Ctor: AudioContextCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  let ctx: AudioContext | null = null
  try { ctx = Ctor ? new Ctor() : null } catch { ctx = null }
  void ctx?.resume?.().catch?.(() => undefined)

  const burst = () => {
    if (ctx && ctx.state !== 'closed') {
      try {
        const now = ctx.currentTime
        const tones = kind === 'incoming' ? [{ f: 440, at: 0 }, { f: 480, at: 0 }] : [{ f: 425, at: 0 }]
        for (const { f, at } of tones) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = f
          gain.gain.setValueAtTime(0.0001, now + at)
          gain.gain.exponentialRampToValueAtTime(kind === 'incoming' ? 0.18 : 0.08, now + at + 0.05)
          gain.gain.setValueAtTime(kind === 'incoming' ? 0.18 : 0.08, now + at + 0.9)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 1)
          osc.connect(gain).connect(ctx.destination)
          osc.start(now + at)
          osc.stop(now + at + 1.05)
        }
      } catch { /* son indisponible : sans importance */ }
    }
    if (kind === 'incoming') { try { navigator.vibrate?.([500, 250, 500]) } catch { /* vibration indisponible */ } }
  }

  burst()
  const timer = setInterval(burst, kind === 'incoming' ? 2500 : 3500)
  return () => {
    clearInterval(timer)
    try { navigator.vibrate?.(0) } catch { /* ignoré */ }
    void ctx?.close?.().catch?.(() => undefined)
  }
}
