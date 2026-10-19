import { useMemo, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role, User } from '@/domain/types'
import { api, getApiUser, setApiUser, setToken, subscribeApiUser, type ApiUser } from '@/services/api'

function toDomainUser(user: ApiUser | null): User | null {
  if (!user) return null
  return {
    id: String(user.id), role: user.role, userType: user.userType as User['userType'],
    firstName: user.firstName, lastName: user.lastName, company: user.company ?? undefined,
    phone: user.phone, email: user.email ?? undefined, address: user.address, city: user.city,
    idNumber: user.idNumber ?? undefined, documents: user.documents ?? [], passwordHash: '',
    status: user.status, createdAt: user.createdAt ?? new Date().toISOString(),
  }
}

/** Ferme la session : prévient le serveur (sans bloquer si le jeton a déjà expiré) puis efface la session locale. */
async function logout() {
  try {
    if (getApiUser()) await api('/auth/logout', { method: 'POST' })
  } catch {
    // Jeton déjà invalide ou serveur injoignable : la session locale est fermée dans tous les cas.
  } finally {
    setToken(null)
    setApiUser(null)
  }
}

/** Utilisateur connecté (source unique : la réponse de l'API, conservée dans le navigateur) et déconnexion. */
export function useAuth() {
  const apiUser = useSyncExternalStore(subscribeApiUser, getApiUser)
  const user = useMemo(() => toDomainUser(apiUser), [apiUser])
  return { user, logout }
}

export const homeFor = (role: Role) => `/${role}/dashboard`

/** Contrôle d'accès par type de compte (CDC §22) : redirige vers la connexion ou l'espace correct. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/connexion" replace state={{ from: loc.pathname }} />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}
