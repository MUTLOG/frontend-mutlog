/** Nom affiché d'une personne ou d'une structure (réponses de l'API). */
export const personName = (u?: { displayName?: string | null; firstName?: string | null; lastName?: string | null; company?: string | null } | null) =>
  u?.displayName || u?.company || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—'

export const initialsOf = (name: string) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
