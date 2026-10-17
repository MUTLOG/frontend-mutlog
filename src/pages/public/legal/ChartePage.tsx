import { LegalLayout, P, UL, Note, type LegalSectionData } from './LegalLayout'
import { LEGAL } from '@/features/legal/config'

const sections: LegalSectionData[] = [
  {
    id: 'interdites',
    title: 'Marchandises interdites',
    content: (
      <>
        {/* DÉCISION D7 : liste à valider. */}
        <UL>
          <li>Armes, munitions et explosifs.</li>
          <li>Stupéfiants et substances illicites.</li>
          <li>Produits volés ou contrefaits.</li>
          <li>Marchandises dont le transport est interdit par la loi béninoise.</li>
          <li>Êtres humains.</li>
          <li>Animaux transportés dans des conditions contraires à leur bien-être.</li>
        </UL>
      </>
    ),
  },
  {
    id: 'reglementees',
    title: 'Marchandises réglementées',
    content: (
      <>
        <P>
          Ces marchandises doivent être déclarées et acceptées par le Transporteur : produits périssables ou nécessitant
          le froid, produits agricoles soumis à contrôle sanitaire ou phytosanitaire, animaux vivants autorisés,
          produits chimiques, inflammables ou dangereux, carburants, marchandises de très grande valeur, marchandises
          fragiles ou hors format.
        </P>
        <P>Indiquez ces exigences dans le champ « exigences particulières » de votre demande.</P>
      </>
    ),
  },
  {
    id: 'mutualisation',
    title: 'Marchandises et mutualisation',
    content: (
      <P>
        Des marchandises incompatibles entre elles (par exemple denrées alimentaires et produits chimiques) ne peuvent
        pas être regroupées dans un même véhicule. L’Administrateur peut refuser un regroupement pour ce motif.
      </P>
    ),
  },
  {
    id: 'comportements',
    title: 'Comportements attendus',
    content: (
      <UL>
        <li>
          <strong>Chargement et déchargement :</strong> le Client prépare sa marchandise (emballage, étiquetage,
          quantité conforme) et la remet à l’heure convenue ; le Transporteur se présente à l’heure, avec le véhicule
          déclaré.
        </li>
        <li>
          <strong>Respect :</strong> aucun propos injurieux, discriminatoire ou menaçant envers les autres utilisateurs
          ou l’équipe {LEGAL.brand}.
        </li>
        <li>
          <strong>Honnêteté :</strong> informations vraies, avis sincères, pas de faux comptes, pas de manipulation des
          évaluations.
        </li>
        <li>
          <strong>Loyauté :</strong> pas de contournement de la plateforme pour éviter la commission sur une opération
          qu’elle a permis de conclure.
        </li>
        <li>
          <strong>Sécurité :</strong> le Transporteur respecte le code de la route, les charges autorisées et les règles
          de sécurité de la marchandise.
        </li>
      </UL>
    ),
  },
  {
    id: 'sanctions',
    title: 'En cas de manquement',
    content: (
      <Note>
        Tout manquement peut entraîner un avertissement, la suspension ou la suppression du compte, sans préjudice
        d’éventuelles poursuites.
      </Note>
    ),
  },
]

export default function ChartePage() {
  return (
    <LegalLayout
      title="Charte d’utilisation"
      currentPath="/charte"
      intro={
        <P>
          Cette charte fait partie des conditions d’utilisation. Elle précise ce qui peut être transporté et la conduite
          attendue de chacun.
        </P>
      }
      sections={sections}
    />
  )
}
