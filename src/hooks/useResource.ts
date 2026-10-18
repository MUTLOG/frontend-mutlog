import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { ApiError, errorMessage } from '@/services/api'

/**
 * Charge une ressource depuis l'API MUTLOG (toujours, quel que soit le mode : plus de base locale).
 *
 * - `loaded` : la première réponse (succès ou erreur) est arrivée ; les rechargements ne le remettent pas à faux,
 *   la page garde donc ses données affichées pendant un `reload()`.
 * - `deps` : valeurs primitives (identifiants, filtres) qui déclenchent un nouveau chargement ; un changement
 *   remet `loaded` à faux. `initial` doit être une constante stable (définie hors du composant).
 */
export function useResource<T>(load: () => Promise<T>, initial: T, deps: DependencyList = []) {
  const [data, setData] = useState<T>(initial)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined)
  const [reloadKey, setReloadKey] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  const depsKey = deps.map(String).join('|')
  const [seenKey, setSeenKey] = useState(depsKey)
  if (seenKey !== depsKey) {
    // Changement d'identifiant : on repart d'un état vierge (évite d'afficher l'ancienne fiche).
    setSeenKey(depsKey)
    setLoaded(false)
    setData(initial)
    setError('')
    setErrorStatus(undefined)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loadRef.current()
      .then((result) => {
        if (!active) return
        setData(result)
        setError('')
        setErrorStatus(undefined)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(errorMessage(cause, 'Impossible de charger les données.'))
        setErrorStatus(cause instanceof ApiError ? cause.status : undefined)
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setLoaded(true)
      })
    return () => { active = false }
  }, [reloadKey, depsKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return { data, setData, loaded, loading, error, errorStatus, reload }
}
