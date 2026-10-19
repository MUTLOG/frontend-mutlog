import { useCallback, useEffect, useRef, useState } from 'react'

interface RemoteState<T> {
  data: T | undefined
  error: string
  loading: boolean
}

/**
 * Charge des données depuis l'API Laravel.
 * - `deps` : relance le chargement quand ils changent (filtres, identifiant…) ;
 * - `refreshMs` : actualisation silencieuse périodique (sans clignotement) ;
 * - `reload()` : à appeler après une action (valider, annuler…) pour relire le serveur.
 */
export function useRemote<T>(load: () => Promise<T>, deps: readonly unknown[] = [], options: { refreshMs?: number } = {}) {
  const [state, setState] = useState<RemoteState<T>>({ data: undefined, error: '', loading: true })
  const [tick, setTick] = useState(0)
  const loader = useRef(load)
  loader.current = load

  useEffect(() => {
    let active = true
    const run = (silent: boolean) => {
      if (!silent) setState((s) => ({ ...s, loading: true, error: '' }))
      loader.current()
        .then((data) => { if (active) setState({ data, error: '', loading: false }) })
        .catch((cause: unknown) => {
          if (!active || silent) return
          setState((s) => ({ ...s, loading: false, error: cause instanceof Error ? cause.message : 'Chargement impossible.' }))
        })
    }
    run(false)
    const timer = options.refreshMs
      ? setInterval(() => { if (document.visibilityState !== 'hidden') run(true) }, options.refreshMs)
      : undefined
    return () => { active = false; if (timer) clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, options.refreshMs, ...deps])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  // `loading` : seulement tant qu'aucune donnée n'est arrivée ; les relectures après une action restent silencieuses.
  return { data: state.data, error: state.error, loading: state.loading && state.data === undefined, reload }
}
