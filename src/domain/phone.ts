/**
 * Numéros béninois : indicatif +229. Depuis la migration de 2024, les numéros comptent 10 chiffres
 * (préfixe « 01 »). Les anciens numéros à 8 chiffres sont acceptés et convertis.
 * À vérifier auprès de l'ARCEP Bénin avant mise en production.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s.\-()]/g, '').replace(/^\+/, '')
  let local = digits
  if (local.startsWith('00229')) local = local.slice(5)
  else if (local.startsWith('229')) local = local.slice(3)
  if (/^\d{8}$/.test(local)) local = '01' + local
  if (!/^01\d{8}$/.test(local)) return null
  return '+229' + local
}

export function formatPhone(normalized: string): string {
  const m = normalized.match(/^\+229(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
  return m ? `+229 ${m.slice(1).join(' ')}` : normalized
}
