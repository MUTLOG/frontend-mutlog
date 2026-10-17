import { LegalLayout, P, UL, V, type LegalSectionData } from './LegalLayout'
import { LEGAL } from '@/features/legal/config'

const { editor, params, contact } = LEGAL

const sections: LegalSectionData[] = [
  {
    id: 'responsable',
    title: 'Article 1 – Responsable du traitement',
    content: (
      <>
        {/* DÉCISION D12 : formalités APDP à confirmer avec un juriste avant la mise en production. */}
        <P>
          Le responsable du traitement est {editor.name}, éditeur de {LEGAL.brand}, représenté par {editor.director},{' '}
          {editor.directorTitle}. Adresse : <V>{editor.address}</V>. Contact : <V>{contact.privacy}</V>.
        </P>
        <P>
          {LEGAL.brand} traite les données personnelles conformément à la réglementation béninoise applicable, notamment
          le Code du numérique, sous le contrôle de {LEGAL.authority}.
        </P>
      </>
    ),
  },
  {
    id: 'donnees',
    title: 'Article 2 – Données collectées',
    content: (
      <>
        <P>
          <strong>Compte (tous les utilisateurs).</strong> Nom et prénom, numéro de téléphone, adresse, ville ou
          localité, type d’utilisateur, adresse e-mail (facultative), mot de passe (stocké sous forme chiffrée, jamais
          en clair).
        </P>
        <P>
          <strong>Transporteurs.</strong> Nom ou raison sociale, numéro d’identification si applicable, documents de
          l’entreprise si nécessaire, informations sur les véhicules (type, marque, immatriculation, capacité, volume,
          marchandises acceptées, disponibilité).
        </P>
        <P>
          <strong>Opérations.</strong> Lieux de départ et de destination, date, nature, poids, volume et nombre de colis
          de la marchandise, description, exigences particulières, photos ou documents joints, réservations, statuts,
          historique, évaluations et commentaires.
        </P>
        <P>
          <strong>Paiements.</strong> Montants, statuts des paiements, commissions, reçus et références de transaction
          fournies par le moyen de paiement. {LEGAL.brand} ne conserve pas les codes secrets de vos comptes Mobile
          Money.
        </P>
        <P>
          <strong>Données techniques.</strong> Journaux de connexion et journal des actions importantes (nécessaires à
          la sécurité), type d’appareil et de navigateur, adresse IP.
        </P>
        <P>
          <strong>Géolocalisation.</strong> Non collectée dans la version actuelle. Si le suivi GPS des transports est
          ajouté, les utilisateurs en seront informés et leur accord sera demandé avant toute activation.
        </P>
      </>
    ),
  },
  {
    id: 'finalites',
    title: 'Article 3 – Pourquoi nous utilisons vos données',
    content: (
      <UL>
        <li>Créer et gérer votre compte, vous authentifier, récupérer un compte : exécution du service.</li>
        <li>
          Publier les demandes et offres, effectuer le matching, proposer et valider les mutualisations, gérer les
          réservations et le suivi : exécution du service.
        </li>
        <li>
          Calculer le prix, enregistrer les commissions, gérer les paiements et les reçus : exécution du service et
          obligations comptables.
        </li>
        <li>Envoyer les notifications liées aux opérations : exécution du service.</li>
        <li>
          Permettre à l’administrateur de contrôler les opérations, vérifier les transporteurs et traiter les
          signalements : intérêt légitime à prévenir la fraude et à garantir la qualité du service.
        </li>
        <li>
          Assurer la sécurité de la plateforme, journaliser les actions importantes, réaliser des sauvegardes : intérêt
          légitime et obligation de sécurité.
        </li>
        <li>
          Produire des statistiques de fonctionnement, sur données agrégées dans la mesure du possible : intérêt
          légitime.
        </li>
        <li>
          Vous envoyer des informations commerciales ou des actualités du service : uniquement avec votre accord,
          retirable à tout moment.
        </li>
      </UL>
    ),
  },
  {
    id: 'destinataires',
    title: 'Article 4 – Qui voit vos données',
    content: (
      <>
        <P>
          Les données ne sont pas accessibles publiquement sans autorisation. Chaque utilisateur n’accède qu’aux
          informations nécessaires à son rôle.
        </P>
        <UL>
          <li>
            <strong>Les autres utilisateurs</strong> voient uniquement ce qui est utile à une opération : le
            Transporteur voit la description de la marchandise, les points de départ et de destination et, après
            confirmation, les coordonnées du Client ; le Client voit le profil, les véhicules, les trajets et les
            évaluations du Transporteur. En cas de mutualisation, les clients ne voient ni les coordonnées ni les
            montants des autres clients.
          </li>
          <li>
            <strong>L’équipe d’administration</strong> accède aux données nécessaires à la gestion de la plateforme,
            avec des accès contrôlés selon le type de compte.
          </li>
          <li>
            <strong>Les prestataires techniques</strong> (article 5).
          </li>
          <li>
            <strong>Les autorités</strong>, lorsque la loi l’exige.
          </li>
        </UL>
        <P>{LEGAL.brand} ne vend pas vos données personnelles.</P>
      </>
    ),
  },
  {
    id: 'prestataires',
    title: 'Article 5 – Prestataires et transferts de données',
    content: (
      <>
        {/* DÉCISION D11 : hébergeur et prestataires réels à renseigner. */}
        <P>
          Pour fournir le service, {LEGAL.brand} peut recourir à des prestataires qui traitent des données pour son
          compte : l’hébergement et les sauvegardes (<V>{LEGAL.host.name}</V>), les passerelles de paiement et Mobile
          Money (par exemple FedaPay ou Kkiapay, selon la solution retenue), la cartographie (Google Maps, prévu pour la
          traçabilité des trajets) et l’envoi d’e-mails, puis de SMS ou WhatsApp lors d’une évolution ultérieure.
        </P>
        <P>
          Certains prestataires peuvent être situés hors du Bénin. {LEGAL.brand} s’engage à ne recourir qu’à des
          prestataires présentant des garanties de sécurité suffisantes et à respecter les règles applicables aux
          transferts de données.
        </P>
      </>
    ),
  },
  {
    id: 'conservation',
    title: 'Article 6 – Durées de conservation',
    content: (
      <>
        {/* DÉCISION D8 : durées à valider. */}
        <UL>
          <li>
            Données du compte : pendant l’utilisation du compte, puis <V>{params.accountRetentionYears}</V> an(s) après
            sa fermeture pour gérer d’éventuels litiges.
          </li>
          <li>
            Opérations, paiements, commissions et reçus : {params.accountingRetentionYears} ans, pour répondre aux
            obligations comptables et fiscales.
          </li>
          <li>Journaux de connexion et d’actions importantes : {params.logsRetentionMonths} mois.</li>
          <li>
            Documents et photos joints aux demandes : <V>{params.attachmentsRetentionMonths}</V> mois après la fin de
            l’opération.
          </li>
          <li>Données de prospection : jusqu’au retrait de votre accord.</li>
        </UL>
        <P>À l’issue de ces durées, les données sont supprimées ou anonymisées.</P>
      </>
    ),
  },
  {
    id: 'securite',
    title: 'Article 7 – Sécurité',
    content: (
      <>
        <P>
          {LEGAL.brand} met en œuvre une authentification sécurisée, le chiffrement des mots de passe, un contrôle des
          accès selon le type de compte, des connexions chiffrées (HTTPS), des sauvegardes régulières, une protection
          contre les accès non autorisés, la journalisation des actions importantes et un système de récupération de
          compte.
        </P>
        <P>
          Aucun système n’étant infaillible, {LEGAL.brand} informera les personnes concernées et l’autorité compétente
          en cas de violation de données, selon la réglementation applicable.
        </P>
      </>
    ),
  },
  {
    id: 'droits',
    title: 'Article 8 – Vos droits',
    content: (
      <>
        <P>
          Vous pouvez demander l’accès à vos données, leur rectification, leur suppression, la limitation ou
          l’opposition à certains traitements, et retirer à tout moment un consentement donné. Écrivez à{' '}
          <V>{contact.privacy}</V> ou utilisez la page « Mon profil » pour les modifications courantes. {LEGAL.brand}{' '}
          répond dans un délai de {params.rightsReplyDays} jours. Une pièce d’identité peut être demandée pour éviter
          qu’une personne ne se fasse passer pour une autre. Vous pouvez aussi saisir {LEGAL.authority}.
        </P>
        <P>
          Les données nécessaires à la gestion des opérations, des paiements et des litiges peuvent être conservées
          malgré une demande de suppression, pendant les durées légales.
        </P>
      </>
    ),
  },
  {
    id: 'accessibilite',
    title: 'Article 9 – Besoin d’aide pour comprendre ces règles',
    content: (
      <P>
        Si vous avez besoin d’aide pour comprendre ces règles ou exercer vos droits, contactez {LEGAL.brand} par
        téléphone au <V>{contact.phone}</V>. À moyen terme, des relais locaux, des messages vocaux et des explications
        en langues locales pourront être proposés.
      </P>
    ),
  },
  {
    id: 'modification',
    title: 'Article 10 – Modification de cette politique',
    content: (
      <P>
        Cette politique peut évoluer. La date de dernière mise à jour figure en tête de page et les changements
        importants sont notifiés.
      </P>
    ),
  },
]

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      currentPath="/politique-de-confidentialite"
      intro={
        <P>
          Cette page explique quelles données {LEGAL.brand} collecte, pourquoi, qui peut les voir, combien de temps
          elles sont gardées et comment exercer vos droits.
        </P>
      }
      sections={sections}
    />
  )
}
