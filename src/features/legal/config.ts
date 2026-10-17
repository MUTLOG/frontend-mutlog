/**
 * Configuration centrale des pages légales de MUTLOG.
 * Tout champ égal à TODO est affiché en surbrillance (voir <V />)
 * jusqu'à ce que vous le complétiez : RCCM, IFU, adresse, e-mails, etc.
 */
export const TODO = 'À compléter'

export const LEGAL = {
  brand: 'MUTLOG',
  version: '1.0',
  lastUpdate: '17 octobre 2026',
  domain: TODO, // ex. : mutlog.bj

  /** Éditeur et propriétaire de la plateforme */
  editor: {
    name: 'Mila Logistique',
    status: 'établissement',
    director: 'GUINI Lazare',
    directorTitle: 'Directeur général',
    rccm: TODO,
    ifu: TODO,
    address: TODO,
    phone: TODO,
    email: TODO,
    country: 'Bénin',
  },

  /** Conception et réalisation de la plateforme */
  developer: {
    name: 'Shalom Digital Solutions',
    short: 'SDS',
    representative: 'Romain AKPO',
    representativeTitle: 'Directeur général et fondateur',
    country: 'Bénin',
    website: 'https://www.shalomdigitalsolutions.com',
  },

  host: { name: TODO, address: TODO, contact: TODO },

  contact: {
    general: TODO,
    privacy: TODO, // adresse dédiée aux droits sur les données
    report: TODO, // signalement de contenus
    phone: TODO,
  },

  authority: 'l’Autorité de protection des données personnelles (APDP)',

  /** Paramètres métier cités dans les textes (décisions D3 à D8). */
  params: {
    commissionMin: 5, // cahier des charges : 5 % à 10 %
    commissionMax: 10,
    payoutDelayDays: TODO, // délai de reversement au transporteur
    cancelFreeHours: TODO, // annulation avec remboursement partiel (avant départ)
    cancelFeePercent: TODO,
    cancelLateHours: TODO, // annulation tardive : pas de remboursement
    claimDelayHours: TODO, // délai de signalement d’un litige
    amicableDays: 30,
    rightsReplyDays: 30,
    accountRetentionYears: TODO, // après fermeture du compte
    accountingRetentionYears: 10, // opérations, paiements, reçus
    logsRetentionMonths: 12,
    attachmentsRetentionMonths: TODO,
  },
}

/** Vrai si le champ a été renseigné (différent de « À compléter »). */
export const isSet = (v: string | number) => v !== TODO

export const LEGAL_PAGES = [
  { path: '/mentions-legales', label: 'Mentions légales' },
  { path: '/conditions-utilisation', label: 'Conditions d’utilisation' },
  { path: '/conditions-commerciales', label: 'Conditions commerciales' },
  { path: '/politique-de-confidentialite', label: 'Politique de confidentialité' },
  { path: '/politique-cookies', label: 'Politique cookies' },
  { path: '/charte', label: 'Charte d’utilisation' },
] as const
