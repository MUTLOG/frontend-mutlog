/** 350000 -> "350 000 FCFA" (espaces insécables, format Bénin) */
export function formatFCFA(amount: number): string {
  const n = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F')
  return `${n}\u00A0FCFA`
}

export function formatTonnes(value: number): string {
  return `${value.toString().replace('.', ',')} ${value > 1 ? 'tonnes' : 'tonne'}`
}
