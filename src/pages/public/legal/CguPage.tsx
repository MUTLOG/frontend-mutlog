import { LegalLayout, P, UL, V, Note, type LegalSectionData } from './LegalLayout'
import { LEGAL } from '@/features/legal/config'

const { editor, params } = LEGAL

const sections: LegalSectionData[] = [
  {
    id: 'article-1',
    title: 'Article 1 – Objet',
    content: (
      <>
        <P>
          Les présentes conditions générales d’utilisation (« CGU ») régissent l’accès et l’utilisation de la plateforme{' '}
          {LEGAL.brand}, accessible à l’adresse <V>{LEGAL.domain}</V>, par toute personne qui la consulte ou y crée un
          compte. La plateforme est éditée par {editor.name} et a été réalisée par {LEGAL.developer.name}.
        </P>
        <P>
          {LEGAL.brand} est une plateforme numérique qui met en relation les personnes ou entreprises ayant des
          marchandises à transporter et les transporteurs disposant de capacités de transport disponibles. Son objectif
          est de permettre à plusieurs clients dont les marchandises et les itinéraires sont compatibles de partager un
          même véhicule et les coûts du transport. Le service est lancé au Bénin.
        </P>
      </>
    ),
  },
  {
    id: 'article-2',
    title: 'Article 2 – Définitions',
    content: (
      <UL>
        <li>
          <strong>Plateforme</strong> : le site web responsive {LEGAL.brand} et ses espaces public, client, transporteur
          et administration.
        </li>
        <li>
          <strong>Client</strong> ou <strong>Expéditeur</strong> : producteur agricole, coopérative, commerçant,
          grossiste, PME ou toute autre personne ayant une marchandise à transporter.
        </li>
        <li>
          <strong>Transporteur</strong> : propriétaire de camion, entreprise de transport, gestionnaire de flotte ou
          transporteur indépendant proposant une capacité de transport.
        </li>
        <li>
          <strong>Administrateur</strong> : l’équipe {LEGAL.brand} chargée de gérer la plateforme, les utilisateurs, les
          demandes, les transporteurs, les opérations et les commissions.
        </li>
        <li>
          <strong>Demande</strong> : besoin de transport publié par un Client.
        </li>
        <li>
          <strong>Offre</strong> ou <strong>Trajet</strong> : capacité de transport publiée par un Transporteur.
        </li>
        <li>
          <strong>Matching</strong> : comparaison automatique des Demandes et des Offres.
        </li>
        <li>
          <strong>Mutualisation</strong> : regroupement de plusieurs Demandes compatibles dans un même véhicule.
        </li>
        <li>
          <strong>Réservation</strong> : demande d’un Client de réserver une capacité sur un trajet.
        </li>
        <li>
          <strong>Opération</strong> : transport suivi sous un identifiant unique (par exemple MUT-2026-000125).
        </li>
        <li>
          <strong>Utilisateur</strong> : toute personne disposant d’un compte.
        </li>
      </UL>
    ),
  },
  {
    id: 'article-3',
    title: 'Article 3 – Acceptation et modification des CGU',
    content: (
      <>
        <P>
          L’inscription sur la plateforme vaut acceptation des CGU, des conditions commerciales, de la politique de
          confidentialité et de la charte d’utilisation. Cette acceptation est enregistrée avec sa date et la version
          des textes acceptés.
        </P>
        <P>
          {LEGAL.brand} peut modifier ces textes. Les changements importants sont notifiés dans la plateforme et, si une
          adresse e-mail a été renseignée, par e-mail. La poursuite de l’utilisation après l’entrée en vigueur d’une
          nouvelle version vaut acceptation.
        </P>
      </>
    ),
  },
  {
    id: 'article-4',
    title: 'Article 4 – Rôle de MUTLOG',
    content: (
      <>
        {/* DÉCISION D2 : qualification juridique (simple intermédiaire) à faire confirmer par un juriste. */}
        <P>
          {LEGAL.brand} est un intermédiaire technique de mise en relation. {LEGAL.brand} n’est pas transporteur, ne
          possède pas de véhicule et n’exécute pas le transport. Le transport est réalisé par le Transporteur sous sa
          seule responsabilité.
        </P>
        <P>
          {LEGAL.brand} fournit les outils de publication, de recherche, de matching, de mutualisation, de réservation,
          de suivi, de calcul du prix et de la commission, de notification et d’évaluation. L’équipe d’administration
          contrôle les opérations.
        </P>
      </>
    ),
  },
  {
    id: 'article-5',
    title: 'Article 5 – Création et gestion du compte',
    content: (
      <>
        <P>
          <strong>Conditions.</strong> L’inscription est réservée aux personnes majeures (18 ans révolus) ou aux
          personnes morales valablement représentées.
        </P>
        <P>
          <strong>Informations demandées.</strong> L’Utilisateur choisit son profil (Client ou Transporteur) et
          renseigne au minimum : nom et prénom, numéro de téléphone, adresse, ville ou localité, type d’utilisateur et
          mot de passe. L’adresse e-mail est facultative.
        </P>
        <P>
          <strong>Connexion.</strong> La connexion s’effectue par numéro de téléphone et mot de passe. Une connexion par
          code à usage unique (OTP) pourra être ajoutée ultérieurement.
        </P>
        <P>
          <strong>Exactitude et sécurité.</strong> L’Utilisateur fournit des informations exactes et à jour, garde ses
          identifiants confidentiels et prévient {LEGAL.brand} sans délai en cas d’utilisation frauduleuse. Il est
          responsable des actions réalisées avec son compte.
        </P>
        <P>
          <strong>Récupération.</strong> Un dispositif de récupération de compte est prévu en cas d’oubli du mot de
          passe.
        </P>
        <P>
          <strong>Un compte par profil.</strong> Chaque personne ou entreprise ne peut détenir qu’un compte par type de
          profil.
        </P>
      </>
    ),
  },
  {
    id: 'article-6',
    title: 'Article 6 – Transporteurs : profil, véhicules et vérification',
    content: (
      <>
        <P>
          Le Transporteur renseigne son nom ou celui de son entreprise, son téléphone, son adresse, sa ville, son numéro
          d’identification si applicable et, si nécessaire, les documents de son entreprise. Il peut enregistrer
          plusieurs véhicules (type, marque, immatriculation, capacité en tonnes, volume disponible, type de
          marchandises accepté, disponibilité).
        </P>
        <P>
          L’Administrateur peut vérifier ces informations et ces véhicules, puis valider ou suspendre un Transporteur.
          Un Transporteur non validé ou suspendu ne peut pas publier d’Offre.
        </P>
        <P>
          Le Transporteur déclare disposer des autorisations, permis, assurances et documents exigés par la
          réglementation béninoise pour le transport routier de marchandises, et s’engage à les maintenir valides.
        </P>
      </>
    ),
  },
  {
    id: 'article-7',
    title: 'Article 7 – Demandes de transport',
    content: (
      <>
        <P>
          Le Client publie une Demande en indiquant le point de départ, la destination, la date souhaitée, le type de
          marchandise, le poids, le volume si nécessaire, le nombre de colis, une description, ses exigences
          particulières et ses coordonnées. Il peut joindre une photo ou un document.
        </P>
        <P>
          Le Client garantit l’exactitude de ces informations. Une description inexacte (nature, poids, volume,
          conditionnement) peut entraîner le refus, l’annulation ou la requalification de l’opération, sans
          remboursement des frais engagés par le Transporteur.
        </P>
      </>
    ),
  },
  {
    id: 'article-8',
    title: 'Article 8 – Offres de transport',
    content: (
      <P>
        Le Transporteur publie une Offre en indiquant le lieu de départ, la destination, la date, la capacité totale, la
        capacité disponible, le type de véhicule, les marchandises acceptées, le tarif ou le mode de tarification et
        toute information complémentaire. Il garantit que le véhicule et la capacité annoncés sont réellement
        disponibles.
      </P>
    ),
  },
  {
    id: 'article-9',
    title: 'Article 9 – Recherche et matching',
    content: (
      <>
        <P>
          La plateforme compare les Demandes et les Offres selon l’origine, la destination, la date, la capacité, le
          type de marchandise et la disponibilité, puis affiche les correspondances pertinentes. Un pourcentage de
          compatibilité peut être affiché à titre indicatif.
        </P>
        <P>
          Une correspondance est une suggestion. Elle ne crée aucun engagement tant que la Réservation n’est pas
          confirmée.
        </P>
      </>
    ),
  },
  {
    id: 'article-10',
    title: 'Article 10 – Mutualisation',
    content: (
      <>
        <P>
          Lorsque plusieurs Demandes présentent des caractéristiques compatibles (départ et destination identiques ou
          compatibles, date proche, capacité du véhicule, nature des marchandises, contraintes particulières),{' '}
          {LEGAL.brand} peut proposer de les regrouper dans un même véhicule.
        </P>
        <P>
          Dans la version actuelle de la plateforme,{' '}
          <strong>le regroupement est validé par l’Administrateur avant toute confirmation définitive</strong>.
          L’Administrateur peut créer, modifier, valider ou refuser un regroupement.
        </P>
        <P>
          En utilisant la plateforme, le Client accepte que sa marchandise puisse voyager avec celles d’autres clients
          dans le même véhicule et que le coût du transport soit réparti entre eux selon la règle exposée dans les
          conditions commerciales. {LEGAL.brand} ne garantit pas qu’une mutualisation sera trouvée pour une Demande
          donnée.
        </P>
      </>
    ),
  },
  {
    id: 'article-11',
    title: 'Article 11 – Réservation et confirmation',
    content: (
      <P>
        Le Client peut réserver une capacité sur un trajet. Le Transporteur peut accepter ou refuser une demande.
        Lorsque le transport est confirmé, les clients concernés sont notifiés. Une Réservation n’est définitive
        qu’après acceptation du Transporteur et, en cas de mutualisation, validation de l’Administrateur.
      </P>
    ),
  },
  {
    id: 'article-12',
    title: 'Article 12 – Suivi et statuts d’une Opération',
    content: (
      <>
        <P>Chaque Opération reçoit un identifiant unique. Son statut évolue selon le cycle suivant :</P>
        <P>
          Demande créée → En recherche de transport → Mutualisation en cours → Transport confirmé → Transport en cours →
          Arrivé à destination → Livré → Terminé.
        </P>
        <P>Une Opération peut aussi être Annulée.</P>
        <P>
          L’historique des demandes, offres, transports, paiements, reçus et évaluations reste consultable par chaque
          Utilisateur dans son espace.
        </P>
      </>
    ),
  },
  {
    id: 'article-13',
    title: 'Article 13 – Notifications',
    content: (
      <P>
        Les Utilisateurs reçoivent des notifications aux principales étapes : nouvelle correspondance, demande acceptée
        ou refusée, mutualisation confirmée, paiement confirmé, départ du véhicule, livraison, annulation. Elles sont
        envoyées dans la plateforme et par e-mail lorsqu’une adresse a été fournie. Des notifications par SMS ou
        WhatsApp pourront être ajoutées ultérieurement.
      </P>
    ),
  },
  {
    id: 'article-14',
    title: 'Article 14 – Évaluations et signalements',
    content: (
      <P>
        Après une Opération terminée, le Client peut noter le Transporteur et laisser un commentaire ; le Transporteur
        peut également évaluer le Client. Les avis doivent être honnêtes, respectueux et fondés sur une expérience
        réelle. L’Administrateur peut consulter les évaluations et les signalements et retirer tout avis injurieux,
        diffamatoire ou sans rapport avec l’opération.
      </P>
    ),
  },
  {
    id: 'article-15',
    title: 'Article 15 – Engagements des Utilisateurs',
    content: (
      <>
        {/* DÉCISION D3 : la clause anti-contournement dépend du modèle de commission retenu. */}
        <P>
          L’Utilisateur s’engage à respecter la loi, la charte d’utilisation et les droits des autres Utilisateurs. Il
          lui est notamment interdit de fournir de fausses informations, d’usurper une identité, de contourner la
          plateforme pour éviter la commission sur une opération qu’elle a permis de conclure, de publier des
          marchandises interdites, de perturber le fonctionnement de la plateforme ou d’accéder à des données qui ne le
          concernent pas.
        </P>
      </>
    ),
  },
  {
    id: 'article-16',
    title: 'Article 16 – Suspension et suppression de compte',
    content: (
      <>
        <P>
          L’Administrateur peut suspendre ou supprimer un compte en cas de manquement aux CGU, de fraude, d’informations
          fausses ou de comportement portant atteinte aux autres Utilisateurs ou à la plateforme. Les opérations en
          cours sont traitées selon leur état et les conditions commerciales.
        </P>
        <P>
          L’Utilisateur peut demander la fermeture de son compte à tout moment. Certaines données sont alors conservées
          pendant les durées légales ou nécessaires à la gestion des litiges (voir la politique de confidentialité).
        </P>
      </>
    ),
  },
  {
    id: 'article-17',
    title: 'Article 17 – Responsabilité',
    content: (
      <>
        {/* DÉCISION D6 : responsabilité et assurance des marchandises, à valider avec un juriste. */}
        <P>
          {LEGAL.brand} met en œuvre les moyens raisonnables pour assurer le bon fonctionnement de la plateforme, sans
          garantie de disponibilité continue.
        </P>
        <P>
          {LEGAL.brand} n’est pas partie au contrat de transport conclu entre le Client et le Transporteur. Sauf faute
          lourde ou dol de {LEGAL.brand}, {LEGAL.brand} n’est pas responsable de la perte, de l’avarie ou du retard de
          la marchandise, de l’inexécution du transport, de la qualité des prestations du Transporteur ni de
          l’exactitude des informations fournies par les Utilisateurs. Le Transporteur répond de la marchandise qui lui
          est confiée dans les conditions prévues par la réglementation applicable au transport routier de marchandises.
          Le Client est invité à assurer sa marchandise de valeur.
        </P>
        <P>Ces limitations ne s’appliquent pas dans la mesure où la loi les interdit.</P>
      </>
    ),
  },
  {
    id: 'article-18',
    title: 'Article 18 – Disponibilité du service',
    content: (
      <P>
        L’accès peut être interrompu pour maintenance, évolution ou incident technique. {LEGAL.brand} effectue des
        sauvegardes régulières et met en place un dispositif de reprise après panne.
      </P>
    ),
  },
  {
    id: 'article-19',
    title: 'Article 19 – Propriété intellectuelle',
    content: (
      <P>
        L’Utilisateur n’acquiert aucun droit sur la marque, le code ou les contenus de la plateforme. Voir les mentions
        légales.
      </P>
    ),
  },
  {
    id: 'article-20',
    title: 'Article 20 – Données personnelles',
    content: (
      <P>
        Le traitement des données personnelles est décrit dans la politique de confidentialité, qui fait partie
        intégrante des présentes CGU.
      </P>
    ),
  },
  {
    id: 'article-21',
    title: 'Article 21 – Droit applicable et litiges',
    content: (
      <>
        {/* DÉCISION D10 : juridiction (tribunaux de Cotonou proposés). */}
        <P>
          Les CGU sont soumises au droit béninois. En cas de différend, les parties recherchent d’abord une solution
          amiable en contactant {LEGAL.brand}. À défaut d’accord sous {params.amicableDays} jours, le litige peut être
          porté devant les tribunaux compétents de Cotonou, sous réserve des règles impératives de protection des
          consommateurs.
        </P>
      </>
    ),
  },
  {
    id: 'article-22',
    title: 'Article 22 – Contact',
    content: (
      <>
        <P>
          Pour toute question : <V>{LEGAL.contact.general}</V> – téléphone : <V>{LEGAL.contact.phone}</V>.
        </P>
        <Note>
          Éditeur : {editor.name}, représenté par {editor.director}, {editor.directorTitle}. RCCM : <V>{editor.rccm}</V>{' '}
          – IFU : <V>{editor.ifu}</V>.
        </Note>
      </>
    ),
  },
]

export default function CguPage() {
  return (
    <LegalLayout
      title="Conditions générales d’utilisation"
      currentPath="/conditions-utilisation"
      intro={
        <P>
          Ces conditions expliquent comment utiliser {LEGAL.brand}, ce que la plateforme fait et ne fait pas, et les
          engagements de chacun. Merci de les lire avant de créer un compte.
        </P>
      }
      sections={sections}
    />
  )
}
