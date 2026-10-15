import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getDb, run, useDb } from '@/store/store'
import * as L from '@/store/logic'
import type { Role, User } from '@/domain/types'
import { api, apiEnabled, getApiUser, setApiUser, setToken } from '@/services/api'

function apiUserAsDomain(): User | null {
  const user = getApiUser()
  if (!user) return null
  return {
    id: String(user.id), role: user.role, userType: user.userType as User['userType'],
    firstName: user.firstName, lastName: user.lastName, company: user.company ?? undefined,
    phone: user.phone, email: user.email ?? undefined, address: user.address, city: user.city,
    idNumber: user.idNumber ?? undefined, documents: user.documents ?? [], passwordHash: '',
    status: user.status, createdAt: user.createdAt ?? new Date().toISOString(),
  }
}

export function useAuth() {
  const db = useDb()
  const remoteUser = apiEnabled ? apiUserAsDomain() : null
  const user = remoteUser ?? db.users.find((u) => u.id === db.session.userId) ?? null
  return {
    db,
    user,
    login: (phone: string, password: string) => run((d) => L.login(d, phone, password)),
    logout: async () => {
      if (apiEnabled) {
        try { if (getApiUser()) await api('/auth/logout', { method: 'POST' }) } finally { setToken(null); setApiUser(null) }
      }
      return run((d) => { d.session.userId = null; return { ok: true as const, value: undefined } })
    },
  }
}

export function currentUser(): User | null {
  if (apiEnabled) return apiUserAsDomain()
  const db = getDb()
  return db.users.find((u) => u.id === db.session.userId) ?? null
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
