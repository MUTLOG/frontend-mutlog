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
  domain: 'https://mutlog.shalomdigitalsolutions.com', // ex. : mutlog.bj

  /** Éditeur et propriétaire de la plateforme */
  editor: {
    name: 'Mila Logistique',
    status: 'établissement',
    director: 'GUINI Lazare',
    directorTitle: 'Directeur général',
    rccm: 'RB/COT/26 A 115554',
    ifu: '0202249016090',
    address: 'Îlot : 705, Parcelle : D, Maison : GUINI , LITTORAL, COTONOU, 11EMEARRONDISSEMENT, GBEGAMEY AHITO',
    phone: '+2290165296998',
    email: 'milalogistique@gmail.com',
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
    payoutDelayDays: 3, // délai de reversement au transporteur
    cancelFreeHours: 4, // annulation avec remboursement partiel (avant départ)
    cancelFeePercent: 2,
    cancelLateHours: 1, // annulation tardive : pas de remboursement
    claimDelayHours: 72, // délai de signalement d’un litige
    amicableDays: 30,
    rightsReplyDays: 30,
    accountRetentionYears: 1, // après fermeture du compte
    accountingRetentionYears: 10, // opérations, paiements, reçus
    logsRetentionMonths: 12,
    attachmentsRetentionMonths: 3,
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
