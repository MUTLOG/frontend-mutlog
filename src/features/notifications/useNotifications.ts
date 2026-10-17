import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { apiEnabled } from '@/services/api'
import { sharedApi } from '@/services/mutlogApi'
import { run } from '@/store/store'

export interface NotificationItem {
  id: string
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

interface Snapshot {
  items: NotificationItem[]
  loaded: boolean
  error: string
}

const REFRESH_MS = 30_000
const EMPTY: Snapshot = { items: [], loaded: false, error: '' }

/**
 * Notifications du serveur (Laravel) partagées entre la cloche et la page Notifications :
 * un seul chargement, actualisé toutes les 30 s et au retour sur l'onglet.
 * Sans API (mode démonstration), les notifications restent celles du stockage local.
 */
let snapshot: Snapshot = EMPTY
let owner: string | null = null
let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined
let inflight = false
const listeners = new Set<() => void>()

const publish = (next: Snapshot) => {
  snapshot = next
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function normalize(raw: unknown): NotificationItem[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : []
  return list.map((entry) => {
    const n = entry as Record<string, unknown>
    return {
      id: String(n.id),
      title: String(n.title ?? ''),
      body: String(n.body ?? ''),
      link: typeof n.link === 'string' && n.link ? n.link : undefined,
      read: Boolean(n.read),
      createdAt: typeof n.createdAt === 'string' && n.createdAt ? n.createdAt : new Date().toISOString(),
    }
  })
}

export async function refreshNotifications() {
  if (!apiEnabled || inflight) return
  inflight = true
  const forOwner = owner
  try {
    const items = normalize(await sharedApi.notifications())
    if (owner === forOwner) publish({ items, loaded: true, error: '' })
  } catch (cause) {
    if (owner === forOwner) {
      publish({ ...snapshot, loaded: true, error: cause instanceof Error ? cause.message : 'Impossible de charger les notifications.' })
    }
  } finally {
    inflight = false
  }
}

const onFocus = () => { void refreshNotifications() }

function acquire(userId: string) {
  if (owner !== userId) {
    owner = userId
    publish(EMPTY)
  }
  subscribers += 1
  void refreshNotifications()
  if (subscribers === 1) {
    timer = setInterval(() => { if (document.visibilityState !== 'hidden') void refreshNotifications() }, REFRESH_MS)
    window.addEventListener('focus', onFocus)
  }
  return () => {
    subscribers -= 1
    if (subscribers === 0) {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }
}

export function useNotifications() {
  const { db, user } = useAuth()
  const userId = user ? String(user.id) : null
  const remote = useSyncExternalStore(subscribe, () => snapshot)

  useEffect(() => {
    if (!apiEnabled || !userId) return
    return acquire(userId)
  }, [userId])

  const items: NotificationItem[] = apiEnabled
    ? remote.items
    : db.notifications
        .filter((n) => n.userId === userId)
        .map(({ id, title, body, link, read, createdAt }) => ({ id, title, body, link, read, createdAt }))
  const unread = items.filter((n) => !n.read).length

  const markRead = useCallback(async (id: string) => {
    if (!apiEnabled) {
      run((d) => { const n = d.notifications.find((x) => x.id === id); if (n) n.read = true; return { ok: true as const, value: undefined } })
      return
    }
    publish({ ...snapshot, items: snapshot.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })
    try { await sharedApi.markNotificationRead(id) } catch { void refreshNotifications() }
  }, [])

  const markAll = useCallback(async () => {
    if (!apiEnabled) {
      run((d) => { d.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true)); return { ok: true as const, value: undefined } })
      return
    }
    publish({ ...snapshot, items: snapshot.items.map((n) => ({ ...n, read: true })) })
    try { await sharedApi.markNotificationsRead() } catch { void refreshNotifications() }
  }, [userId])

  return {
    items,
    unread,
    loaded: apiEnabled ? remote.loaded : true,
    error: apiEnabled ? remote.error : '',
    markRead,
    markAll,
  }
}
