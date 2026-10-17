import { LegalLayout, P, UL, V, type LegalSectionData } from './LegalLayout'
import { LEGAL } from '@/features/legal/config'

const { editor, developer, host, contact } = LEGAL

const sections: LegalSectionData[] = [
  {
    id: 'editeur',
    title: 'Éditeur et propriétaire de la plateforme',
    content: (
      <>
        <P>
          La plateforme {LEGAL.brand}, accessible à l’adresse <V>{LEGAL.domain}</V>, est une application de l’
          {editor.status} <strong>{editor.name}</strong>.
        </P>
        <UL>
          <li>Dénomination : {editor.name}</li>
          <li>Forme : {editor.status}</li>
          <li>
            RCCM : <V>{editor.rccm}</V>
          </li>
          <li>
            IFU : <V>{editor.ifu}</V>
          </li>
          <li>
            Siège : <V>{editor.address}</V>, {editor.country}
          </li>
          <li>
            Téléphone : <V>{editor.phone}</V>
          </li>
          <li>
            E-mail : <V>{editor.email}</V>
          </li>
        </UL>
      </>
    ),
  },
  {
    id: 'direction',
    title: 'Direction de la publication',
    content: (
      <P>
        {editor.directorTitle} et directeur de la publication : <strong>{editor.director}</strong>.
      </P>
    ),
  },
  {
    id: 'conception',
    title: 'Conception et réalisation',
    content: (
      <>
        <P>
          {editor.name} a confié la conception et le développement de la plateforme à <strong>{developer.name}</strong>{' '}
          ({developer.short}), société établie au {developer.country}.
        </P>
        <P>
          La plateforme a été éditée par {developer.representative}, {developer.representativeTitle} de{' '}
          {developer.short}. Site :{' '}
          <a className="underline" href={developer.website} target="_blank" rel="noopener noreferrer">
            {developer.website.replace('https://', '')}
          </a>
          .
        </P>
      </>
    ),
  },
  {
    id: 'hebergement',
    title: 'Hébergement',
    content: (
      <P>
        Hébergeur : <V>{host.name}</V>. Adresse : <V>{host.address}</V>. Contact : <V>{host.contact}</V>.
      </P>
    ),
  },
  {
    id: 'propriete-intellectuelle',
    title: 'Propriété intellectuelle',
    content: (
      <>
        <P>
          La marque {LEGAL.brand}, le logo, l’identité visuelle, les textes, les images, les bases de données et le code
          de la plateforme sont protégés. Toute reproduction ou réutilisation sans autorisation écrite de l’éditeur est
          interdite.
        </P>
        <P>
          Les contenus déposés par les utilisateurs (descriptions, photos, documents) restent leur propriété. Ils
          accordent à {LEGAL.brand} le droit de les afficher et de les traiter dans la seule mesure nécessaire au
          fonctionnement du service.
        </P>
      </>
    ),
  },
  {
    id: 'signalement',
    title: 'Signalement d’un contenu ou d’un comportement',
    content: (
      <P>
        Tout contenu ou comportement contraire aux règles de la plateforme peut être signalé à <V>{contact.report}</V>{' '}
        ou depuis la page Contact.
      </P>
    ),
  },
  {
    id: 'donnees',
    title: 'Données personnelles et cookies',
    content: (
      <P>
        Le traitement de vos données est décrit dans la politique de confidentialité et la politique relative aux
        cookies, accessibles depuis le pied de page.
      </P>
    ),
  },
  {
    id: 'droit',
    title: 'Droit applicable',
    content: (
      <P>
        Le site et ses documents légaux sont soumis au droit béninois. Les règles de compétence sont précisées dans les
        conditions d’utilisation.
      </P>
    ),
  },
]

export default function MentionsLegalesPage() {
  return <LegalLayout title="Mentions légales" currentPath="/mentions-legales" sections={sections} />
}
