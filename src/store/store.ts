import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'
import type { Db, Result } from './db'

const KEY = 'mutlog.db.v1'

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed.version === 1) return parsed
    }
  } catch { /* stockage indisponible : on repart du jeu de démonstration */ }
  return buildSeed()
}

let db: Db = load()
const listeners = new Set<() => void>()

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota / navigation privée */ }
}

export function getDb(): Db { return db }

/** Applique une action sur une copie ; ne valide la modification que si l'action réussit. */
export function run<T>(action: (draft: Db) => Result<T>): Result<T> {
  const draft = structuredClone(db)
  const res = action(draft)
  if (res.ok) {
    db = draft
    persist()
    listeners.forEach((l) => l())
  }
  return res
}

export function resetDemo() {
  db = buildSeed()
  persist()
  listeners.forEach((l) => l())
}

export function useDb(): Db {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => db)
}
