import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { adminApiMode } from '@/services/api'

export function useAdminResource<T>(load: () => Promise<T>, initial: T, dependencies: DependencyList = []) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(adminApiMode)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadRef.current())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!adminApiMode) return
    let active = true
    setLoading(true)
    setError('')
    loadRef.current()
      .then((result) => { if (active) setData(result) })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les données.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  // The caller lists only values that affect the request; inline loaders are safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...dependencies])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return { data, setData, loading, error, refresh, reload }
}
