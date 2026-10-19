import type { User } from '@/domain/types'

/** 350000 -> "350 000 FCFA" (espaces insécables, format Bénin) */
export function formatFCFA(amount: number): string {
  const n = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F')
  return `${n}\u00A0FCFA`
}

export function formatTonnes(value: number): string {
  return `${value.toString().replace('.', ',')} ${value > 1 ? 'tonnes' : 'tonne'}`
}

/** Date du jour au format ISO « aaaa-mm-jj ». */
export const today = () => new Date().toISOString().slice(0, 10)

/** Nom affiché d'un compte : raison sociale si elle existe, sinon « Prénom Nom ». */
export const userName = (u?: Pick<User, 'company' | 'firstName' | 'lastName'>) => (u ? u.company || `${u.firstName} ${u.lastName}`.trim() : '—')

/** Libellé court d'un mois « aaaa-mm » : « oct », « nov »… (graphiques de revenus). */
export const monthLabel = (ym: string) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
