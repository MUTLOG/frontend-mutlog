const configuredBase = import.meta.env.VITE_API_URL?.trim()
export const API_BASE_URL = (configuredBase || 'http://localhost:8000/api/v1').replace(/\/+$/, '')
const TOKEN_KEY = 'mutlog.token'
const USER_KEY = 'mutlog.api-user'
let token: string | null = localStorage.getItem(TOKEN_KEY)

function mapKeys(value: unknown, mapper: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => mapKeys(item, mapper))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [mapper(key), mapKeys(item, mapper)]))
  }
  return value
}
const toSnakeKey = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
const toCamelKey = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
export const toSnake = <T,>(value: T): unknown => mapKeys(value, toSnakeKey)
export const toCamel = <T,>(value: unknown): T => mapKeys(value, toCamelKey) as T

export type ApiUser = {
  id: number | string
  role: 'client' | 'transporteur' | 'admin'
  userType: string
  firstName: string
  lastName: string
  displayName?: string
  company?: string | null
  phone: string
  email?: string | null
  address: string
  city: string
  idNumber?: string | null
  documents?: string[]
  status: 'actif' | 'en_attente' | 'suspendu'
  verified?: boolean
  rating?: { avg: number; count: number } | null
  createdAt?: string
}

/** Erreur renvoyée par l'API : conserve le statut HTTP (404, 403, 422…) pour que l'interface puisse réagir. */
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
export const errorMessage = (cause: unknown, fallback: string) => (cause instanceof Error && cause.message ? cause.message : fallback)

export function setToken(value: string | null) {
  token = value
  if (value) localStorage.setItem(TOKEN_KEY, value)
  else localStorage.removeItem(TOKEN_KEY)
}
export const getToken = () => token
export function setApiUser(user: ApiUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}
export function getApiUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) as ApiUser : null
  } catch { return null }
}
export const apiEnabled = Boolean(configuredBase) && import.meta.env.MODE !== 'test'
export const adminApiMode = import.meta.env.MODE !== 'test'

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.json !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(toSnake(init.json)) : init.body,
    })
  } catch {
    throw new Error(`Impossible de joindre l’API MUTLOG (${API_BASE_URL}). Vérifiez que Laravel est démarré et que CORS est configuré.`)
  }
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (response.status === 401 && token) {
    setToken(null)
    setApiUser(null)
  }
  if (!response.ok) {
    const errors = data.errors && typeof data.errors === 'object'
      ? Object.values(data.errors as Record<string, unknown>).flat().filter((v) => typeof v === 'string').join(' ')
      : ''
    throw new ApiError(errors || (typeof data.message === 'string' ? data.message : `Erreur API (${response.status})`), response.status)
  }
  return toCamel<T>(data)
}

export async function apiData<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const response = await api<T | { data: T }>(path, init)
  return response && typeof response === 'object' && !Array.isArray(response) && 'data' in response
    ? (response as { data: T }).data
    : response as T
}
