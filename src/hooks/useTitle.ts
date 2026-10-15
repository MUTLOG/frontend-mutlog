import { useEffect } from 'react'

/** Titre de l'onglet et lecteurs d'écran : « Page — MUTLOG ». */
export function useTitle(title?: string) {
  useEffect(() => { document.title = title ? `${title} — MUTLOG` : 'MUTLOG — Le transport plus intelligent, ensemble' }, [title])
}
