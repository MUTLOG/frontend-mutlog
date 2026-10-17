import { LegalLayout, P, type LegalSectionData } from './LegalLayout'
import { LEGAL } from '@/features/legal/config'

// À ajuster selon ce que le frontend dépose réellement (session, préférences, services tiers).
const sections: LegalSectionData[] = [
  {
    id: 'necessaires',
    title: 'Cookies strictement nécessaires',
    content: (
      <P>
        La plateforme utilise des cookies ou stockages locaux indispensables : maintien de la session après connexion,
        protection contre les attaques, mémorisation des préférences d’affichage. Ils ne nécessitent pas votre accord.
      </P>
    ),
  },
  {
    id: 'audience',
    title: 'Mesure d’audience et publicité',
    content: (
      <P>
        Dans la version actuelle, aucun cookie publicitaire n’est utilisé. Si un outil de mesure d’audience est ajouté,
        cette page sera mise à jour et votre accord sera demandé avant tout dépôt non nécessaire.
      </P>
    ),
  },
  {
    id: 'tiers',
    title: 'Services tiers',
    content: (
      <P>
        L’affichage d’une carte (Google Maps) ou le paiement en ligne peuvent déposer leurs propres traceurs. Vous
        pouvez les refuser ou les supprimer dans les paramètres de votre navigateur, ce qui peut limiter ces fonctions.
      </P>
    ),
  },
]

export default function PolitiqueCookiesPage() {
  return (
    <LegalLayout
      title="Politique relative aux cookies"
      currentPath="/politique-cookies"
      intro={<P>Cette page décrit les cookies et traceurs que {LEGAL.brand} peut utiliser et comment les gérer.</P>}
      sections={sections}
    />
  )
}
